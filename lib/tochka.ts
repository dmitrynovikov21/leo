import { jwtVerify, importSPKI, type CryptoKey, type KeyObject } from 'jose'

interface CreateSubscriptionParams {
  amount: number // Price in RUB (kopecks not needed — Tochka uses rubles)
  purpose: string
  redirectUrl: string
  failRedirectUrl: string
  email: string
  itemName: string
  trancheCount?: number
}

interface SubscriptionResponse {
  operationId: string
  paymentLink: string
  status: string
}

interface WebhookPayload {
  operationId: string
  status: string
  amount: number
  paymentType: string
  webhookType: string
  merchantId: string
}

let cachedPublicKey: CryptoKey | KeyObject | null = null
let publicKeyCachedAt = 0
const PUBLIC_KEY_TTL = 24 * 60 * 60 * 1000 // 24 hours

export class TochkaService {
  private baseUrl = 'https://enter.tochka.com/uapi'
  private token: string
  private clientId: string
  private customerCode: string

  constructor() {
    this.token = process.env.TOCHKA_CLIENT_TOKEN || ''
    this.clientId = process.env.TOCHKA_CLIENT_ID || ''
    this.customerCode = process.env.TOCHKA_CUSTOMER_CODE || ''

    if (!this.token || !this.clientId) {
      console.error('[Tochka] Missing TOCHKA_CLIENT_TOKEN or TOCHKA_CLIENT_ID')
    }
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    }
  }

  /**
   * Create subscription with receipt (fiscalization)
   * Uses recurring=false — Tochka auto-charges monthly
   */
  async createSubscriptionWithReceipt(params: CreateSubscriptionParams): Promise<SubscriptionResponse> {
    const url = `${this.baseUrl}/acquiring/v1.0/subscriptions-with-receipt`

    const body = {
      customerCode: this.customerCode,
      amount: params.amount,
      purpose: params.purpose,
      redirectUrl: params.redirectUrl,
      failRedirectUrl: params.failRedirectUrl,
      recurring: false,
      options: {
        period: 'Month',
        trancheCount: params.trancheCount || 12,
      },
      client: {
        email: params.email,
      },
      items: [
        {
          name: params.itemName,
          amount: params.amount,
          quantity: 1,
          vatType: 'None',
        },
      ],
      taxSystemCode: 'usn_income',
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Tochka] Create subscription error:', response.status, errorText)
      throw new Error(`Tochka API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return {
      operationId: data.operationId,
      paymentLink: data.paymentLink,
      status: data.status,
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(operationId: string): Promise<{ status: string }> {
    const url = `${this.baseUrl}/acquiring/v1.0/subscriptions/${operationId}/status`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tochka API error: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  /**
   * Cancel subscription (irreversible)
   */
  async cancelSubscription(operationId: string): Promise<void> {
    const url = `${this.baseUrl}/acquiring/v1.0/subscriptions/${operationId}/status`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ status: 'Cancelled' }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tochka API error: ${response.status} ${errorText}`)
    }
  }

  /**
   * Charge subscription manually (for recurring=true mode, future use)
   */
  async chargeSubscription(operationId: string, amount: number): Promise<void> {
    const url = `${this.baseUrl}/acquiring/v1.0/subscriptions/${operationId}/charge`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ amount }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tochka API error: ${response.status} ${errorText}`)
    }
  }

  /**
   * Get customer codes (one-time use to find customerCode)
   */
  async getCustomers(): Promise<any[]> {
    const url = `${this.baseUrl}/open-banking/v2.0/customers`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tochka API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.customers || data.data || data
  }

  /**
   * Register webhook for acquiring payment notifications
   */
  async registerWebhook(webhookUrl: string, eventType: string = 'acquiringInternetPayment'): Promise<any> {
    const url = `${this.baseUrl}/webhook/v1.0/${this.clientId}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        url: webhookUrl,
        webhookType: eventType,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tochka API error: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  /**
   * Fetch and cache Tochka's public key for JWT verification
   */
  private async getPublicKey(): Promise<CryptoKey | KeyObject> {
    const now = Date.now()
    if (cachedPublicKey && now - publicKeyCachedAt < PUBLIC_KEY_TTL) {
      return cachedPublicKey
    }

    const response = await fetch('https://enter.tochka.com/doc/openapi/static/keys/public')
    if (!response.ok) {
      throw new Error(`Failed to fetch Tochka public key: ${response.status}`)
    }

    const publicKeyPem = await response.text()
    cachedPublicKey = await importSPKI(publicKeyPem.trim(), 'RS256')
    publicKeyCachedAt = now

    return cachedPublicKey
  }

  /**
   * Verify and decode JWT from webhook body
   * Tochka sends webhook body as a JWT string (Content-Type: text/plain)
   */
  async verifyWebhookJwt(jwtToken: string): Promise<WebhookPayload> {
    const publicKey = await this.getPublicKey()

    const { payload } = await jwtVerify(jwtToken, publicKey, {
      algorithms: ['RS256'],
    })

    return payload as unknown as WebhookPayload
  }
}

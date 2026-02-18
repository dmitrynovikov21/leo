import crypto from 'crypto'

interface InitPaymentParams {
    merchantPaymentReference: string
    amount: number
    currency?: string
    returnUrl: string
    description?: string
    customer: {
        email?: string
        phone?: string
        id?: string
    }
    items?: {
        name: string
        price: number
        quantity: number
        amount: number
        vatType?: string
    }[]
}

interface YpmnConfig {
    merchantId: string
    secretKey: string
    // sandbox or secure
    baseUrl: string
}

export class YpmnService {
    private config: YpmnConfig

    constructor(config?: Partial<YpmnConfig>) {
        this.config = {
            merchantId: config?.merchantId || process.env.YPMN_MERCHANT_ID || '',
            secretKey: config?.secretKey || process.env.YPMN_SECRET_KEY || '',
            baseUrl:
                config?.baseUrl ||
                (process.env.NODE_ENV === 'production'
                    ? 'https://secure.ypmn.ru/api'
                    : 'https://sandbox.ypmn.ru/api'),
        }

        if (!this.config.merchantId || !this.config.secretKey) {
            console.error('YPMN credentials not found')
        }
    }

    private calculateMd5(body: string): string {
        return crypto.createHash('md5').update(body).digest('hex').toLowerCase()
    }

    /**
     * Signature generation:
     * HMAC-SHA256(
     *   X-Header-Merchant +
     *   X-Header-Date +
     *   Method +
     *   Path +
     *   QueryString +
     *   MD5(Body)
     * , SecretKey)
     */
    public calculateSignature(
        method: string,
        path: string,
        date: string,
        body: string,
        queryString: string = ''
    ): string {
        // Ensure path starts with / and doesn't have trailing slash? 
        // Docs say: "base path from API call URL. (eg /api/v4/payments/authorize)"

        const signatureString =
            this.config.merchantId +
            date +
            method.toUpperCase() +
            path +
            queryString +
            this.calculateMd5(body)

        return crypto
            .createHmac('sha256', this.config.secretKey)
            .update(signatureString)
            .digest('hex')
            .toLowerCase()
    }

    public async initPayment(params: InitPaymentParams) {
        const path = '/v4/payments/authorize'
        const fullUrl = `${this.config.baseUrl}${path}`
        const date = new Date().toISOString() // format: YYYY-MM-DDTHH:mm:ss.sssZ, but docs say ISO 8601. 
        // Check docs example: '2032-01-01T11:22:33+03:00'. JS toISOString returns UTC (Z). 
        // Ideally we should keep it simple, UTC is valid ISO 8601.

        const bodyObj = {
            merchantPaymentReference: params.merchantPaymentReference,
            amount: params.amount,
            currency: params.currency || 'RUB',
            returnUrl: params.returnUrl,
            authorization: {
                usePaymentPage: 'YES',
                // 'paymentMethod' is optional, strict false by default
            },
            client: {
                id: params.customer.id,
                email: params.customer.email,
                phone: params.customer.phone,
            },
            // If we have items for fiscalization
            products: params.items?.map((item, idx) => ({
                name: item.name,
                sku: `sku-${idx}`,
                unitPrice: item.price,
                quantity: item.quantity,
            })),
            description: params.description,
        }

        const bodyStr = JSON.stringify(bodyObj)

        const signature = this.calculateSignature(
            'POST',
            `/api${path}`, // NOTE: config.baseUrl usually includes /api, but signature calc usually requires the path component.
            // Wait, the baseUrl in config is `.../api`.
            // The path in `initPayment` is `/v4/...`.
            // So the full URL is `.../api/v4/...`.
            // The signature doc says "base path from API call URL. (eg /api/v4/payments/authorize)".
            // So I must include `/api` if it's part of the path.
            date,
            bodyStr
        )

        // NOTE on path: if baseUrl is `https://sandbox.ypmn.ru/api`, and path is `/v4/payments/authorize`,
        // the value passed to signature MUST be `/api/v4/payments/authorize`.

        const headers = {
            'Content-Type': 'application/json',
            'X-Header-Merchant': this.config.merchantId,
            'X-Header-Date': date,
            'X-Header-Signature': signature,
        }

        try {
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers,
                body: bodyStr,
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('YPMN Init Error:', response.status, errorText)
                throw new Error(`YPMN API Error: ${response.status} ${errorText}`)
            }

            const data = await response.json()
            return data
        } catch (error) {
            console.error('YPMN request failed', error)
            throw error
        }
    }

    /**
     * Verify signature from incoming webhook
     */
    public verifyWebhookSignature(
        method: string,
        url: string, // Full URL or path?
        headers: Record<string, string>,
        body: string
    ): boolean {
        // Extract pieces
        const merchant = headers['x-header-merchant'] || headers['X-Header-Merchant']
        const date = headers['x-header-date'] || headers['X-Header-Date']
        const signature = headers['x-header-signature'] || headers['X-Header-Signature']

        if (!merchant || !date || !signature) return false

        // URL parsing to get path and query
        // This is tricky if we don't know the exact host/proto viewed by the app.
        // However, usually we can pass the request path.
        // Example: /api/ypmn/webhook
        // Docs say: "base path from API call URL"

        // In nextjs Route Handlers we can get nextUrl.pathname

        const urlObj = new URL(url, 'http://localhost') // dummy base if relative
        const path = urlObj.pathname
        const query = urlObj.search // includes ?

        // Re-construct the signature string
        const mySignature = crypto
            .createHmac('sha256', this.config.secretKey)
            .update(
                merchant +
                date +
                method.toUpperCase() +
                path +
                query +
                this.calculateMd5(body)
            )
            .digest('hex')
            .toLowerCase()

        return mySignature === signature
    }
}

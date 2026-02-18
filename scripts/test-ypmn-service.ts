
import { YpmnService } from '../lib/ypmn'
import assert from 'assert'

// Mock environment
process.env.YPMN_MERCHANT_ID = 'test-merchant'
process.env.YPMN_SECRET_KEY = 'test-secret'

async function run() {
    console.log('Testing YpmnService...')

    const service = new YpmnService()

    // Test Signature Generation
    const method = 'POST'
    const path = '/api/ypmn/webhook'
    const date = new Date().toISOString()
    const body = JSON.stringify({ test: 'value' })
    const query = '?foo=bar'

    console.log('Generating signature...')
    const signature = service.calculateSignature(method, path, date, body, query)
    console.log('Signature:', signature)

    assert.ok(signature, 'Signature should be generated')
    assert.match(signature, /^[a-f0-9]{64}$/, 'Signature should be 64 char hex (SHA256)')

    // Test Verify
    console.log('Verifying signature...')
    const headers = {
        'x-header-merchant': 'test-merchant',
        'x-header-date': date,
        'x-header-signature': signature
    }

    // Note: verifyWebhookSignature expects full URL or path. 
    // In our implementation we extract path from URL.
    // We passed `path` to calculateSignature.
    // If we pass `http://localhost/api/ypmn/webhook?foo=bar` to verify,
    // it should extract `/api/ypmn/webhook` and `?foo=bar`.

    const isValid = service.verifyWebhookSignature(
        method,
        `http://localhost${path}${query}`,
        headers,
        body
    )

    console.log('Is Valid:', isValid)
    assert.strictEqual(isValid, true, 'Signature verification failed')

    // Test Invalid Signature
    const invalidHeaders = { ...headers, 'x-header-signature': 'wrong' }
    const isInvalid = service.verifyWebhookSignature(
        method,
        `http://localhost${path}${query}`,
        invalidHeaders,
        body
    )
    assert.strictEqual(isInvalid, false, 'Invalid signature should fail')

    console.log('All tests passed!')
}

run().catch(console.error)

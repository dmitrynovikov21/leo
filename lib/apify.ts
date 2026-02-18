

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN
const APIFY_ACTOR_ID = "apify~website-content-crawler" // API expects username~actorname

interface ApifyRunOptions {
    url: string
}

export async function runApifyCrawler(url: string) {
    if (!APIFY_API_TOKEN) {
        throw new Error("Misconfigured: APIFY_API_TOKEN is missing")
    }

    const input = {
        "aggressivePrune": false,
        "blockMedia": true,
        "clickElementsCssSelector": "[aria-expanded=\"false\"]",
        "clientSideMinChangePercentage": 15,
        "crawlerType": "playwright:adaptive",
        "debugLog": false,
        "debugMode": false,
        "dynamicContentWaitSecs": 10,
        "expandIframes": true,
        "ignoreCanonicalUrl": false,
        "ignoreHttpsErrors": false,
        "keepUrlFragments": false,
        "maxCrawlDepth": 0,
        "proxyConfiguration": {
            "useApifyProxy": true,
            "apifyProxyGroups": [
                "RESIDENTIAL"
            ],
            "apifyProxyCountry": "RU"
        },
        "readableTextCharThreshold": 100,
        "removeCookieWarnings": true,
        "removeElementsCssSelector": "nav, footer, script, style, noscript, svg, img[src^='data:'],\n[role=\"alert\"],\n[role=\"banner\"],\n[role=\"dialog\"],\n[role=\"alertdialog\"],\n[role=\"region\"][aria-label*=\"skip\" i],\n[aria-modal=\"true\"]",
        "renderingTypeDetectionPercentage": 10,
        "respectRobotsTxtFile": false,
        "reuseStoredDetectionResults": false,
        "saveFiles": false,
        "saveHtml": true,
        "saveHtmlAsFile": true,
        "saveMarkdown": false,
        "saveScreenshots": true,
        "signHttpRequests": false,
        "startUrls": [
            {
                "url": url,
                "method": "GET"
            }
        ],
        "storeSkippedUrls": false,
        "useLlmsTxt": false,
        "useSitemaps": false
    }

    console.log(`[Apify] Starting crawler for ${url}`)

    // 1. Start the actor
    const runResponse = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
    })

    if (!runResponse.ok) {
        const errorText = await runResponse.text()
        throw new Error(`Failed to start Apify actor: ${runResponse.status} ${errorText}`)
    }

    const runData = await runResponse.json()
    const runId = runData.data.id
    console.log(`[Apify] Actor started with runId: ${runId}`)

    // 2. Poll for completion
    let status = runData.data.status
    while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && status !== 'TIMED-OUT') {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

        const statusResponse = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs/${runId}?token=${APIFY_API_TOKEN}`)
        if (!statusResponse.ok) {
            console.warn(`[Apify] Check status failed: ${statusResponse.status}`)
            continue;
        }
        const statusData = await statusResponse.json()
        status = statusData.data.status
        console.log(`[Apify] Status: ${status}`)
    }

    if (status !== 'SUCCEEDED') {
        throw new Error(`Apify run failed with status: ${status}`)
    }

    // 3. Fetch results
    const datasetId = runData.data.defaultDatasetId
    console.log(`[Apify] Fetching dataset ${datasetId}`)

    const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}`)
    if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`)
    }

    const items = await datasetResponse.json()
    return items
}

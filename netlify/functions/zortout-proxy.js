exports.handler = async (event, context) => {
  // Only allow POST and GET
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Parse query string
  const queryString = event.queryStringParameters
  const queryParams = new URLSearchParams(queryString).toString()
  
  // Build target URL
  let targetUrl = 'https://open-api.zortout.com/v4/PurchaseOrder/AddPurchaseOrder'
  if (queryParams) {
    targetUrl += '?' + queryParams
  }

  console.log('Proxying request to:', targetUrl)
  console.log('Method:', event.httpMethod)

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'storename': event.headers['storename'],
        'apikey': event.headers['apikey'],
        'apisecret': event.headers['apisecret'],
      },
      body: event.httpMethod === 'POST' ? event.body : undefined
    })

    const data = await response.json()

    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, storename, apikey, apisecret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: error.message })
    }
  }
}

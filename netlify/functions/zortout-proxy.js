const fetch = require('node-fetch')

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, storename, apikey, apisecret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    }
  }

  // Only allow POST and GET
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Parse query string
  const queryString = event.queryStringParameters || {}
  
  // Extract the path parameter (e.g., /Product/GetProducts)
  const path = queryString.path || '/PurchaseOrder/AddPurchaseOrder'
  
  // Build remaining query params (excluding path)
  const otherParams = { ...queryString }
  delete otherParams.path
  
  const remainingQuery = new URLSearchParams(otherParams).toString()
  
  // Build target URL
  let targetUrl = `https://open-api.zortout.com/v4${path}`
  if (remainingQuery) {
    targetUrl += '?' + remainingQuery
  }

  // Get headers (handle case variations)
  const getHeader = (name) => {
    const lower = name.toLowerCase()
    return event.headers[lower] || event.headers[name] || event.headers[lower.replace('-', '_')]
  }

  const storename = getHeader('storename')
  const apikey = getHeader('apikey')
  const apisecret = getHeader('apisecret')

  console.log('=== ZORTOUT PROXY REQUEST ===')
  console.log('URL:', targetUrl)
  console.log('Method:', event.httpMethod)
  console.log('Headers:', { storename, apikey: apikey?.slice(0, 10) + '...', apisecret: apisecret?.slice(0, 10) + '...' })
  console.log('Body:', event.body)

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'storename': storename,
        'apikey': apikey,
        'apisecret': apisecret,
      },
      body: event.httpMethod === 'POST' ? event.body : undefined
    })

    const responseText = await response.text()
    
    console.log('=== ZORTOUT RESPONSE ===')
    console.log('Status:', response.status)
    console.log('Raw response:', responseText.substring(0, 500))

    // Try to parse as JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      // If not JSON, return raw text
      data = { 
        res: response.status, 
        resDesc: responseText || 'Empty response',
        rawResponse: responseText.substring(0, 200)
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, storename, apikey, apisecret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('=== PROXY ERROR ===', error)
    console.error('Error stack:', error.stack)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        type: error.name,
        stack: error.stack?.substring(0, 500)
      })
    }
  }
}

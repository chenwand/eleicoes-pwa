export default async function handler(req, res) {
  // Reconstruct the target URL
  const path = req.url.split('/tse-api/')[1] || '';
  const url = `https://resultados.tse.jus.br/${path}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://resultados.tse.jus.br',
        'Referer': 'https://resultados.tse.jus.br/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      }
    });

    const contentType = response.headers.get('content-type');
    
    // Copy relevant headers back
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Status: ${response.status}, Body: ${errorText.substring(0, 100)}`);
        return res.status(response.status).send(errorText);
    }

    const data = await response.arrayBuffer();
    res.status(200).send(Buffer.from(data));

  } catch (error) {
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: error.message,
      target: url 
    });
  }
}

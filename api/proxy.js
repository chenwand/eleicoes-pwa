export default async function handler(req, res) {
  const path = req.url.split('/tse-api/')[1] || '';
  const url = `https://resultados.tse.jus.br/${path}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).send(errorText);
    }

    const data = await response.arrayBuffer();
    res.status(200).send(Buffer.from(data));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

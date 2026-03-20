export default async function handler(req, res) {
  // O Vercel passa a URL original no req.url quando usamos um rewrite
  // Ex: /tse-api/oficial/comum/config/ele-c.json
  const path = req.url.replace('/tse-api/', '');
  const url = `https://resultados.tse.jus.br/${path}`;

  console.log(`[Proxy] Forwarding to: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://resultados.tse.jus.br/'
      }
    });

    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (!response.ok) {
      console.error(`[Proxy] Error from TSE: ${response.status}`);
      return res.status(response.status).send(await response.text());
    }

    // Para JSON, enviamos como JSON. Para outros (fotos/icones), enviamos como buffer/stream se necessário.
    if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
      const data = await response.text();
      try {
        res.status(200).json(JSON.parse(data));
      } catch {
        res.status(200).send(data);
      }
    } else {
      const buffer = await response.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error(`[Proxy] Fatal Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
}

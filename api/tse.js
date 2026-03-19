// api/tse.js
export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.status(200).end();
    return;
  }

  try {
    // Pega pathname e search corretamente
    const { pathname, search } = new URL(`http://dummy${req.url}`);
    
    // Remove /tse do início, mantém o resto
    const cleanPath = pathname.replace(/^\/tse/, '');
    const fullUrl = `https://resultados.tse.jus.br${cleanPath}${search}`;
    
    console.log(`Proxy TSE: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`TSE ${response.status}`);
    }
    
    const data = await response.json();
    
    // Headers CORS para resposta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    res.status(200).json(data);
  } catch (error) {
    console.error('TSE Proxy Error:', error);
    res.status(500).json({ error: 'Erro TSE Proxy' });
  }
}

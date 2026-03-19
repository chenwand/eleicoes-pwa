// api/tse.js - VERSÃO FINAL
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(200).end();
    return;
  }

  try {
    const { pathname, search } = new URL(`http://dummy${req.url}`);
    const cleanPath = pathname.replace(/^\/tse/, '');
    const fullUrl = `https://resultados.tse.jus.br${cleanPath}${search}`;
    
    console.log('Proxy →', fullUrl);
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`TSE ${response.status}`);
    }
    
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('TSE Error:', error);
    res.status(500).json({ error: 'TSE indisponível' });
  }
}

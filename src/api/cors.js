// api/cors.js
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fullUrl = `https://resultados.tse.jus.br${url.pathname}${url.search}`;
    
    const response = await fetch(fullUrl);
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro cors' });
  }
}

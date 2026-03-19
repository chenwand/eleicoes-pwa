// api/tse.js - TESTE MÍNIMO
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(200).end();
    return;
  }

  console.log('TSE PROXY HIT:', req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    ok: true,
    message: 'Proxy TSE OK!',
    path: req.url,
    timestamp: new Date().toISOString()
  });
}

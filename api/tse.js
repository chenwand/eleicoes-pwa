// api/tse.js - DEBUG FINAL
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.status(200).end();
    return;
  }

  try {
    console.log('=== TSE PROXY DEBUG ===');
    console.log('1. req.url:', req.url);
    
    const { pathname, search } = new URL(`http://dummy${req.url}`);
    console.log('2. pathname:', pathname, 'search:', search);
    
    const cleanPath = pathname.replace(/^\/tse/, '');
    console.log('3. cleanPath:', cleanPath);
    
    const fullUrl = `https://resultados.tse.jus.br${cleanPath}${search}`;
    console.log('4. fullUrl:', fullUrl);
    
    const response = await fetch(fullUrl);
    console.log('5. TSE response.status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('6. TSE response.text:', text.substring(0, 200));
      throw new Error(`TSE ${response.status}`);
    }
    
    const data = await response.json();
    console.log('7. Data OK, size:', JSON.stringify(data).length);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('8. ERRO FINAL:', error.message);
    res.status(500).json({ error: error.message });
  }
}

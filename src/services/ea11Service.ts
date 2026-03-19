import type { EA11Response } from '../types/ea11';

export async function fetchEA11(ambiente: string = 'oficial', host: string = 'https://resultados.tse.jus.br'): Promise<EA11Response> {
  // Detecta se é host TSE oficial (precisa proxy)
  const isTSEHost = host.includes('resultados.tse.jus.br');
  const baseUrl = isTSEHost ? '/tse' : host;
  
  const url = `${baseUrl}/${ambiente}/comum/config/ele-c.json`;
  console.log(`[EA11 Request] ${url}`);
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch EA11: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}


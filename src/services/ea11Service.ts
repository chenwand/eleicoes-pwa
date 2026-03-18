import type { EA11Response } from '../types/ea11';

export async function fetchEA11(ambiente: string = 'oficial'): Promise<EA11Response> {
  const url = `https://resultados.tse.jus.br/${ambiente}/comum/config/ele-c.json`;
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


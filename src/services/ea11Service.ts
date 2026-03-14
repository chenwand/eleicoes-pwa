import type { EA11Response } from '../types/ea11';

const EA11_URL = 'https://resultados.tse.jus.br/oficial/comum/config/ele-c.json';

export async function fetchEA11(): Promise<EA11Response> {
  const response = await fetch(EA11_URL, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch EA11: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

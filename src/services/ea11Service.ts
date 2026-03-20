import type { EA11Response } from '../types/ea11';
import { DEFAULT_TSE_HOST, DEFAULT_AMBIENTE } from './config';

export async function fetchEA11(ambiente: string = DEFAULT_AMBIENTE, host: string = DEFAULT_TSE_HOST): Promise<EA11Response> {
  const url = `${host}/${ambiente}/comum/config/ele-c.json`;
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


import type { EA14Response } from '../types/ea14';

export interface EA14ValidationResult {
  cdabr: string;
  errors: string[];
}

export function validateEA14(data: EA14Response): EA14ValidationResult[] {
  const results: EA14ValidationResult[] = [];

  // Helper to parse numbers
  const parseNum = (val: string) => parseInt(val, 10) || 0;

  // Helper to parse percentages that come securely with commands like "100,00"
  const parsePct = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  // Track finished UFs for the BR validation rule
  let finishedUFsCount = 0;

  for (const abr of data.abr) {
    const errors: string[] = [];
    const isBr = abr.cdabr === 'br';

    if (!isBr && abr.and === 'f') {
      finishedUFsCount++;
    }

    // 1. te = est + esnt
    const te = parseNum(abr.e.te);
    const est = parseNum(abr.e.est);
    const esnt = parseNum(abr.e.esnt);
    if (te !== est + esnt) {
      errors.push(`Total de eleitores (te=${te}) não corresponde à soma de eleitores em seções totalizadas e não totalizadas (est=${est} + esnt=${esnt}).`);
    }

    // 2. ts = st + snt
    const ts = parseNum(abr.s.ts);
    const st = parseNum(abr.s.st);
    const snt = parseNum(abr.s.snt);
    if (ts !== st + snt) {
      errors.push(`Total de seções (ts=${ts}) não corresponde à soma de seções totalizadas e não totalizadas (st=${st} + snt=${snt}).`);
    }

    // 3. c + a = te
    const c = parseNum(abr.e.c);
    const a = parseNum(abr.e.a);
    if (c + a !== te) {
      errors.push(`Soma de comparecimento e abstenção (c=${c} + a=${a}) difere do total de eleitores (te=${te}).`);
    }

    // 4. pmunf + pmunpt + pmunnr ≈ 100%
    if (!isBr) {
      const pmunf = parsePct(abr.pmunf);
      const pmunpt = parsePct(abr.pmunpt);
      const pmunnr = parsePct(abr.pmunnr);
      const sum = pmunf + pmunpt + pmunnr;
      // Precision tolerance of 0.1 for float sums
      if (Math.abs(sum - 100) > 0.1) {
        errors.push(`Soma dos percentuais de municípios (pmunf=${pmunf}% + pmunpt=${pmunpt}% + pmunnr=${pmunnr}%) não totaliza 100% (soma = ${sum.toFixed(2)}%).`);
      }
    }

    // 5. Finalized 'and = f' implies pst = 100 and st = ts
    if (abr.and === 'f') {
      const pst = parsePct(abr.s.pst);
      if (Math.abs(pst - 100) > 0.01) {
        errors.push(`Andamento indica finalizado (and=f), mas percentual de seções totalizadas (pst) não é 100% (atual: ${abr.s.pst}%).`);
      }
      if (ts !== st) {
        errors.push(`Andamento indica finalizado (and=f), mas Total de de seções (ts=${ts}) difere das Seções totalizadas (st=${st}).`);
      }
    }

    // 6. BR level specific checks
    if (isBr) {
      const ufsf = parseNum((abr as any).ufsf || '0');
      // We process the validation of 'ufsf' after the loop, but we can temporarily store the expected value
      (abr as any)._expectedUfsf = ufsf;
    }

    if (errors.length > 0) {
      results.push({ cdabr: abr.cdabr, errors });
    }
  }

  // Final cross-check for 'br' encompassing UFs logic
  const brNode = data.abr.find(a => a.cdabr === 'br');
  if (brNode) {
    const declaredUfsf = (brNode as any)._expectedUfsf || 0;
    if (declaredUfsf !== finishedUFsCount) {
      const brResult = results.find(r => r.cdabr === 'br');
      const errStr = `Campo 'ufsf' (UFs finalizadas=${declaredUfsf}) diverge da quantidade real de UFs com (and='f') encontradas no json (${finishedUFsCount}).`;
      if (brResult) {
        brResult.errors.push(errStr);
      } else {
        results.push({ cdabr: 'br', errors: [errStr] });
      }
    }
  }

  return results;
}

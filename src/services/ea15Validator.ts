import type { EA14Response } from '../types/ea14';

export interface EA15ValidationResult {
  cdabr: string;
  errors: string[];
}

export function validateEA15(data: EA14Response): EA15ValidationResult[] {
  const results: EA15ValidationResult[] = [];

  const parseNum = (val: string) => parseInt(val, 10) || 0;
  const parsePct = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  // Identify which record is the UF summary (not a municipality)
  const ufEntry = data.abr.find(a => a.tpabr === 'uf' || (a.tpabr !== 'mun' && a.cdabr !== 'br'));
  let finishedMunsCount = 0;

  for (const abr of data.abr) {
    const errors: string[] = [];
    const isUf = abr === ufEntry;

    if (!isUf && abr.and === 'f') {
      finishedMunsCount++;
    }

    // 1. te = est + esnt
    const te = parseNum(abr.e.te);
    const est = parseNum(abr.e.est);
    const esnt = parseNum(abr.e.esnt);
    if (te !== est + esnt) {
      errors.push(`Total de eleitores (te=${te}) ≠ est(${est}) + esnt(${esnt}).`);
    }

    // 2. ts = st + snt
    const ts = parseNum(abr.s.ts);
    const st = parseNum(abr.s.st);
    const snt = parseNum(abr.s.snt);
    if (ts !== st + snt) {
      errors.push(`Total de seções (ts=${ts}) ≠ st(${st}) + snt(${snt}).`);
    }

    // 3. c + a = est (comparecimento + abstenção = eleitores em seções totalizadas)
    const c = parseNum(abr.e.c);
    const a = parseNum(abr.e.a);
    if (est > 0 && c + a !== est) {
      errors.push(`Comparecimento + abstenção (${c} + ${a}) ≠ eleitores totalizados (est=${est}).`);
    }

    // 4. pst ≈ (st / ts) * 100  — only when ts > 0
    if (ts > 0) {
      const expectedPst = (st / ts) * 100;
      const actualPst = parsePct(abr.s.pst);
      if (Math.abs(expectedPst - actualPst) > 0.1) {
        errors.push(`Percentual de seções (pst=${abr.s.pst}%) diverge do calculado (${expectedPst.toFixed(2)}%).`);
      }
    }

    // 5. pest ≈ (est / te) * 100 — only when te > 0
    if (te > 0) {
      const expectedPest = (est / te) * 100;
      const actualPest = parsePct(abr.e.pest);
      if (Math.abs(expectedPest - actualPest) > 0.1) {
        errors.push(`Percentual de eleitores totalizados (pest=${abr.e.pest}%) diverge do calculado (${expectedPest.toFixed(2)}%).`);
      }
    }

    // 6. pc ≈ (c / est) * 100 — only when est > 0
    if (est > 0) {
      const expectedPc = (c / est) * 100;
      const actualPc = parsePct(abr.e.pc);
      if (Math.abs(expectedPc - actualPc) > 0.2) {
        errors.push(`Comparecimento% (pc=${abr.e.pc}%) diverge do calculado (${expectedPc.toFixed(2)}%).`);
      }
    }

    // 7. pa ≈ (a / est) * 100 — only when est > 0
    if (est > 0) {
      const expectedPa = (a / est) * 100;
      const actualPa = parsePct(abr.e.pa);
      if (Math.abs(expectedPa - actualPa) > 0.2) {
        errors.push(`Abstenção% (pa=${abr.e.pa}%) diverge do calculado (${expectedPa.toFixed(2)}%).`);
      }
    }

    // 8. 'and = f' implies pst = 100 and st = ts
    if (abr.and === 'f') {
      const pst = parsePct(abr.s.pst);
      if (Math.abs(pst - 100) > 0.01) {
        errors.push(`Andamento finalizado (and=f), mas pst=${abr.s.pst}% (esperado 100%).`);
      }
      if (ts > 0 && ts !== st) {
        errors.push(`Andamento finalizado (and=f), mas ts(${ts}) ≠ st(${st}).`);
      }
    }

    // 9. UF-level: pmunf + pmunpt + pmunnr ≈ 100%
    if (isUf) {
      const pmunf = parsePct((abr as any).pmunf || '0');
      const pmunpt = parsePct((abr as any).pmunpt || '0');
      const pmunnr = parsePct((abr as any).pmunnr || '0');
      const sum = pmunf + pmunpt + pmunnr;
      if (Math.abs(sum - 100) > 0.1) {
        errors.push(`Soma dos percentuais de municípios (pmunf + pmunpt + pmunnr = ${sum.toFixed(2)}%) ≠ 100%.`);
      }

      // 10. Cross-check munf count against actual finished municipalities
      const declaredMunf = parseNum((abr as any).munf || '0');
      (abr as any)._declaredMunf = declaredMunf;
    }

    if (errors.length > 0) {
      results.push({ cdabr: abr.cdabr, errors });
    }
  }

  // Final cross-check: ufEntry.munf should match actual count of and='f' municipalities
  if (ufEntry) {
    const declaredMunf = (ufEntry as any)._declaredMunf || 0;
    if (declaredMunf !== finishedMunsCount) {
      const errMsg = `Campo munf (${declaredMunf} municípios finalizados declarados) diverge do número real de municípios com and='f' encontrados (${finishedMunsCount}).`;
      const existing = results.find(r => r.cdabr === ufEntry.cdabr);
      if (existing) {
        existing.errors.push(errMsg);
      } else {
        results.push({ cdabr: ufEntry.cdabr, errors: [errMsg] });
      }
    }
  }

  return results;
}

// Helper: get errors for a specific cdabr from results array
export function getEA15ErrorsForAbr(results: EA15ValidationResult[], cdabr: string): string[] {
  return results.find(r => r.cdabr === cdabr)?.errors ?? [];
}

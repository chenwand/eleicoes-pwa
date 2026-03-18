import type { EA20Response, EA20Candidato } from '../types/ea20';

export interface EA20ValidationResult {
  cargo: string;  // nome ou código do cargo
  errors: string[];
}

export function validateEA20(data: EA20Response): EA20ValidationResult[] {
  const results: EA20ValidationResult[] = [];
  const parseNum = (val: string) => parseInt(val, 10) || 0;
  const parsePct = (val: string) => parseFloat((val || '0').replace(',', '.')) || 0;

  // ─── Section/Elector level (applies to the whole file) ───────────────────
  const globalErrors: string[] = [];

  const ts = parseNum(data.s.ts);
  const st = parseNum(data.s.st);
  const snt = parseNum(data.s.snt);
  if (ts > 0 && st + snt !== ts) {
    globalErrors.push(`Seções: st(${st}) + snt(${snt}) ≠ ts(${ts}).`);
  }

  const est = parseNum(data.e.est);
  const c = parseNum(data.e.c);
  const a = parseNum(data.e.a);
  if (est > 0 && c + a !== est) {
    globalErrors.push(`Eleitores: comparecimento(${c}) + abstenção(${a}) ≠ est(${est}).`);
  }

  const tv = parseNum(data.v.tv);
  const vvc = parseNum(data.v.vvc);
  const vb = parseNum(data.v.vb);
  const tvn = parseNum(data.v.tvn);
  const vscv = parseNum(data.v.vscv);
  const van = parseNum(data.v.van);
  const vansj = parseNum(data.v.vansj);
  const vv = parseNum(data.v.vv);
  const vnom = parseNum(data.v.vnom);
  const vl = parseNum(data.v.vl);
  const vn = parseNum(data.v.vn);
  const vnt = parseNum(data.v.vnt);

  // 1. tv = vvc + vb + tvn + vscv
  if (vvc + vb + tvn + vscv !== tv) {
    globalErrors.push(`Votos: vvc(${vvc}) + vb(${vb}) + tvn(${tvn}) + vscv(${vscv}) ≠ tv(${tv}).`);
  }

  // 2. vvc = van + vansj + vv
  if (van + vansj + vv !== vvc) {
    globalErrors.push(`Votos: van(${van}) + vansj(${vansj}) + vv(${vv}) ≠ vvc(${vvc}).`);
  }

  // 3. vv = vnom + vl
  if (vnom + vl !== vv) {
    globalErrors.push(`Votos: vnom(${vnom}) + vl(${vl}) ≠ vv(${vv}).`);
  }

  // 4. tvn = vn + vnt
  if (vn + vnt !== tvn) {
    globalErrors.push(`Votos: vn(${vn}) + vnt(${vnt}) ≠ tvn(${tvn}).`);
  }

  // 5. tv ≈ c (comparecimento)
  if (c > 0 && Math.abs(tv - c) > 1) {
    globalErrors.push(`Total de votos (tv=${tv}) difere do comparecimento (c=${c}).`);
  }

  if (globalErrors.length > 0) {
    results.push({ cargo: 'Totais Gerais', errors: globalErrors });
  }

  // ─── Per-cargo validation ─────────────────────────────────────────────────
  for (const carg of data.carg) {
    const cargoErrors: string[] = [];
    const cargoLabel = `${carg.nmn} (cd=${carg.cd})`;

    // Sum all candidate votes across all alliances/parties
    const allCandidates: EA20Candidato[] = carg.agr.flatMap(agr =>
      agr.par.flatMap(par => par.cand)
    );

    const totalCandVotes = allCandidates.reduce((sum, cand) => sum + parseNum(cand.vap), 0);

    // Sum group-level totals
    const totalAgrVotes = carg.agr.reduce((sum, agr) => sum + parseNum(agr.tvtn), 0);

    if (totalAgrVotes > 0 && Math.abs(totalCandVotes - totalAgrVotes) > 2) {
      cargoErrors.push(
        `Soma dos votos dos candidatos (${totalCandVotes}) diverge do total declarado nas coligações (${totalAgrVotes}).`
      );
    }

    // Check percentages for each candidate
    for (const cand of allCandidates) {
      const vap = parseNum(cand.vap);
      const pvap = parsePct(cand.pvap);
      if (totalAgrVotes > 0) {
        const expectedPvap = (vap / totalAgrVotes) * 100;
        if (Math.abs(expectedPvap - pvap) > 0.2) {
          cargoErrors.push(
            `Candidato ${cand.nmu}: pvap(${cand.pvap}%) ≠ calculado (${expectedPvap.toFixed(2)}%).`
          );
        }
      }
    }

    // Warn if cargo is declared finalised but section % is less than 100
    const pst = parsePct(data.s.pst);
    if (carg.agr.length > 0 && data.and === 'f' && pst < 99.9) {
      cargoErrors.push(`Andamento declarado como finalizado (and=f), mas pst=${data.s.pst}%.`);
    }

    if (cargoErrors.length > 0) {
      results.push({ cargo: cargoLabel, errors: cargoErrors });
    }
  }

  return results;
}

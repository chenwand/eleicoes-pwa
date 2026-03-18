import type { EA20Response } from '../types/ea20';

export interface EA20ValidationResult {
  cargo: string;  // nome ou código do cargo
  errors: string[];
}

export function validateEA20(data: EA20Response): EA20ValidationResult[] {
  const results: EA20ValidationResult[] = [];
  const parseNum = (val: any) => parseInt(val || '0', 10) || 0;
  const parsePct = (val: any) => parseFloat((val || '0').replace(',', '.')) || 0;

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

  // 2. vvc = van + vansj + vv (Skip for Popular Consultations if vv is missing)
  const isConsultaPopular = !!data.perg;
  if (!isConsultaPopular && van + vansj + vv !== vvc) {
    globalErrors.push(`Votos: van(${van}) + vansj(${vansj}) + vv(${vv}) ≠ vvc(${vvc}).`);
  }

  // 3. vv = vnom + vl (Skip for Popular Consultations)
  if (!isConsultaPopular && vnom + vl !== vv) {
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
  if (data.carg) {
    for (const carg of data.carg) {
      const cargoErrors: string[] = [];
      const cargoLabel = `${carg.nmn} (cd=${carg.cd})`;

      let totalCargoTvan = 0;
      let totalCargoTval = 0;

      for (const agr of carg.agr) {
        const isIsolated = agr.tp === 'i';
        let agrTvan = parseNum(agr.tvan);
        let agrTval = parseNum(agr.tval);

        let sumParTvan = 0;
        let sumParTval = 0;

        for (const par of agr.par) {
          const parTvan = parseNum(par.tvan);
          const parTval = parseNum(par.tval);
          sumParTvan += parTvan;
          sumParTval += parTval;

          // par.tvan should match sum of candidate vap
          const sumCandVap = par.cand.reduce((sum, cand) => sum + parseNum(cand.vap), 0);
          if (parTvan !== sumCandVap) {
            cargoErrors.push(
              `Partido ${par.sg}: tvan(${parTvan}) ≠ soma vap dos candidatos (${sumCandVap}).`
            );
          }
        }

        // In isolated parties, use the party totals as grouping totals if agr totals are missing
        if (isIsolated && agrTvan === 0 && agrTval === 0) {
          agrTvan = sumParTvan;
          agrTval = sumParTval;
        }

        totalCargoTvan += agrTvan;
        totalCargoTval += agrTval;

        // agr.tvan should match sum of par.tvan (only if not isolated or if we want to confirm they matched)
        if (!isIsolated && agrTvan !== sumParTvan) {
          cargoErrors.push(
            `Agrupamento ${agr.nm || agr.n}: tvan(${agrTvan}) ≠ soma tvan dos partidos (${sumParTvan}).`
          );
        }

        // agr.tval should match sum of par.tval
        if (!isIsolated && agrTval !== sumParTval) {
          cargoErrors.push(
            `Agrupamento ${agr.nm || agr.n}: tval(${agrTval}) ≠ soma tval dos partidos (${sumParTval}).`
          );
        }
      }

      // Global cargo check against vnom and vl
      if (data.carg.length === 1) {
        if (totalCargoTvan !== vvc - vl) {
          cargoErrors.push(`Votos Nominais: total do cargo (${totalCargoTvan}) ≠ total do arquivo (${vvc - vl}).`);
        }
        if (totalCargoTval !== vl) {
          cargoErrors.push(`Votos Legenda: total do cargo (${totalCargoTval}) ≠ total do arquivo (${vl}).`);
        }
      }

      // Check percentages
      if (vvc > 0) {
        for (const agr of carg.agr) {
          for (const par of agr.par) {
            for (const cand of par.cand) {
              const vap = parseNum(cand.vap);
              const pvap = parsePct(cand.pvap);
              const expectedPvap = (vap / vvc) * 100;
              if (Math.abs(expectedPvap - pvap) > 0.2) {
                cargoErrors.push(
                  `Candidato ${cand.nmu}: pvap(${cand.pvap}%) ≠ calculado sobre total vvc (${expectedPvap.toFixed(2)}%).`
                );
              }
            }
          }
        }
      }

      const pst = parsePct(data.s.pst);
      if (carg.agr.length > 0 && data.and === 'f' && pst < 99.9) {
        cargoErrors.push(`Andamento declarado como finalizado (and=f), mas pst=${data.s.pst}%.`);
      }

      if (cargoErrors.length > 0) {
        results.push({ cargo: cargoLabel, errors: cargoErrors });
      }
    }
  }

  // ─── Per-pergunta validation (Popular Consultation) ───────────────────
  if (data.perg) {
    for (const perg of data.perg) {
      const pergErrors: string[] = [];
      const pergLabel = `Pergunta: ${perg.ds} (cd=${perg.cd})`;

      const sumRespVap = perg.resp.reduce((sum, r) => sum + parseNum(r.vap), 0);
      if (sumRespVap !== vvc) {
        pergErrors.push(`Soma dos votos das respostas (${sumRespVap}) ≠ total vvc do arquivo (${vvc}).`);
      }

      // Check percentages for responses
      if (vvc > 0) {
        for (const resp of perg.resp) {
          const vap = parseNum(resp.vap);
          const pvap = parsePct(resp.pvap);
          const expectedPvap = (vap / vvc) * 100;
          if (Math.abs(expectedPvap - pvap) > 0.2) {
            pergErrors.push(
              `Resposta ${resp.nmu}: pvap(${resp.pvap}%) ≠ calculado sobre total vvc (${expectedPvap.toFixed(2)}%).`
            );
          }
        }
      }

      if (pergErrors.length > 0) {
        results.push({ cargo: pergLabel, errors: pergErrors });
      }
    }
  }

  // ─── Global sums for Annulled/Sub Judice candidates ───────────────
  let sumGlobalAnnulled = 0;
  let sumGlobalSubJudice = 0;

  if (data.carg) {
    for (const carg of data.carg) {
      for (const agr of carg.agr) {
        for (const par of agr.par) {
          for (const cand of par.cand) {
            const vap = parseNum(cand.vap);
            if (cand.dvt === 'Anulado') {
              sumGlobalAnnulled += vap;
            } else if (cand.dvt === 'Anulado sub judice') {
              sumGlobalSubJudice += vap;
            }
          }
        }
      }
    }
  }

  const extraGlobalErrors: string[] = [];
  if (sumGlobalAnnulled > 0 && sumGlobalAnnulled !== van) {
    extraGlobalErrors.push(`Votos Anulados: soma dos candidatos (${sumGlobalAnnulled}) ≠ v.van (${van}).`);
  }
  if (sumGlobalSubJudice > 0 && sumGlobalSubJudice !== vansj) {
    extraGlobalErrors.push(`Votos Anulados Sub Judice: soma dos candidatos (${sumGlobalSubJudice}) ≠ v.vansj (${vansj}).`);
  }

  if (extraGlobalErrors.length > 0) {
    const existing = results.find(r => r.cargo === 'Totais Gerais');
    if (existing) {
      existing.errors.push(...extraGlobalErrors);
    } else {
      results.unshift({ cargo: 'Totais Gerais', errors: extraGlobalErrors });
    }
  }

  return results;
}

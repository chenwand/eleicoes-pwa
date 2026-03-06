import { useMemo } from 'react';
import type { ElectionData, RegionData, Region } from '../types/election';
import { regionUFMapping, regionNames } from '../data/regions';
import type { UF } from '../types/election';

export function useRegionAggregation(dataByUF: Map<UF, ElectionData>): RegionData[] {
  return useMemo(() => {
    const regions: Region[] = ['norte', 'nordeste', 'sudeste', 'sul', 'centro-oeste', 'exterior'];
    
    return regions.map(region => {
      const ufs = regionUFMapping[region];
      
      let totalVotes = 0;
      let totalElectorate = 0;
      const candidateVotes: Map<number, { name: string; party: string; votes: number }> = new Map();
      
      for (const uf of ufs) {
        const data = dataByUF.get(uf);
        if (!data) continue;
        
        totalVotes += data.v;
        totalElectorate += data.s;
        
        for (const cargo of data.carg) {
          for (const cand of cargo.cand) {
            const existing = candidateVotes.get(cand.sqcand) || {
              name: cand.nm,
              party: cand.cc,
              votes: 0
            };
            existing.votes += cand.vap;
            candidateVotes.set(cand.sqcand, existing);
          }
        }
      }
      
      const candidates = Array.from(candidateVotes.entries())
        .map(([id, info]) => ({
          candidateId: id,
          ...info,
          percentage: totalVotes > 0 ? (info.votes / totalVotes) * 100 : 0
        }))
        .sort((a, b) => b.votes - a.votes);
      
      const leaderCandidateId = candidates[0]?.candidateId;
      
      return {
        region,
        regionName: regionNames[region],
        totalVotes,
        percentageTotalized: totalElectorate > 0 ? (totalVotes / totalElectorate) * 100 : 0,
        candidates,
        leaderCandidateId
      };
    });
  }, [dataByUF]);
}

export function useUFDataByRegion(ufData: (ElectionData | undefined)[]): Map<UF, ElectionData> {
  return useMemo(() => {
    const map = new Map<UF, ElectionData>();
    
    const ufs: UF[] = ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO', 'AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE', 'ES', 'MG', 'RJ', 'SP', 'PR', 'RS', 'SC', 'DF', 'GO', 'MT', 'MS'];
    
    ufData.forEach((data, index) => {
      if (data && ufs[index]) {
        map.set(ufs[index], data);
      }
    });
    
    return map;
  }, [ufData]);
}

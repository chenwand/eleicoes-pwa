import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { ByRegion } from './pages/ByRegion';
import { Dashboard } from './pages/Dashboard';
import { EA20Viewer } from './components/EA20Viewer';
import { EA14Viewer } from './components/EA14Viewer';
import { EA15Viewer } from './components/EA15Viewer';
import type { Turno } from './types/election';

import { ThemeProvider } from './context/ThemeContext';
import { EnvironmentProvider } from './context/EnvironmentContext';
import { ElectionProvider, useElection } from './context/ElectionContext';
import type { EleicaoEA11 } from './types/ea11';
import { queryClient } from './queryClient';

export function AppContent({ onLocalFileLoaded, localFile, setLocalFile, turno }: { 
  onLocalFileLoaded: (file: { type: 'EA11' | 'EA14' | 'EA15' | 'EA20'; data: unknown }) => void; 
  localFile: { type: 'EA11' | 'EA14' | 'EA15' | 'EA20'; data: any } | null; 
  setLocalFile: (val: { type: 'EA11' | 'EA14' | 'EA15' | 'EA20'; data: any } | null) => void;
  turno: Turno;
}) {
  const { selectedEleicao, selectedAbrangencia, ciclo, selectEleicao } = useElection();
  const [openEA14, setOpenEA14] = useState(false);
  const [openEA15, setOpenEA15] = useState(false);
  const [openEA20, setOpenEA20] = useState(false);

  const cargosDisponiveis = useMemo(() => {
    if (!selectedEleicao?.abr) return [];
    const allCargos = selectedEleicao.abr.flatMap(a => a.cp || []).map(cp => ({ cd: cp.cd, nm: cp.ds }));
    const seen = new Set();
    return allCargos.filter(c => {
      const duplicate = seen.has(c.cd);
      seen.add(c.cd);
      return !duplicate;
    });
  }, [selectedEleicao]);

  useEffect(() => {
    const handleOpenEA14 = () => setOpenEA14(true);
    const handleOpenEA15 = () => setOpenEA15(true);
    const handleOpenEA20 = () => setOpenEA20(true);
    window.addEventListener('open-ea14', handleOpenEA14);
    window.addEventListener('open-ea15', handleOpenEA15);
    window.addEventListener('open-ea20', handleOpenEA20);
    return () => {
      window.removeEventListener('open-ea14', handleOpenEA14);
      window.removeEventListener('open-ea15', handleOpenEA15);
      window.removeEventListener('open-ea20', handleOpenEA20);
    };
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Header onLocalFileLoaded={onLocalFileLoaded} />
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resultados" element={<Home turno={turno} />} />
          <Route path="/regioes" element={<ByRegion turno={turno} />} />
        </Routes>
      </main>

      {openEA14 && selectedEleicao && (
        <EA14Viewer 
          ciclo={ciclo} 
          eleicaoCd={selectedEleicao.cd} 
          eleicaoNome={selectedEleicao.nm.replace(/&#186;/g, 'º')} 
          cargosDisponiveis={cargosDisponiveis}
          onClose={() => setOpenEA14(false)} 
        />
      )}
      {openEA15 && selectedEleicao && selectedAbrangencia && (
        <EA15Viewer 
          ciclo={ciclo} 
          eleicaoCd={selectedEleicao.cd} 
          uf={selectedAbrangencia.ufCd} 
          cargosDisponiveis={cargosDisponiveis}
          onBack={() => setOpenEA15(false)} 
        />
      )}
      {openEA20 && selectedEleicao && selectedAbrangencia && (
        <EA20Viewer 
          ciclo={ciclo} 
          eleicaoCd={selectedEleicao.cd} 
          uf={selectedAbrangencia.ufCd} 
          cdMun={selectedAbrangencia.munCdTse} 
          munNome={selectedAbrangencia.munNome}
          cargosDisponiveis={cargosDisponiveis}
          isFederal={selectedEleicao.abr.some(a => a.cd === 'br')}
          onBack={() => setOpenEA20(false)} 
        />
      )}

      {localFile?.type === 'EA20' && (
        <EA20Viewer 
          initialLocalData={localFile.data} 
          onBack={() => setLocalFile(null)} 
        />
      )}

      {localFile?.type === 'EA14' && (
        <EA14Viewer 
          ciclo="" 
          eleicaoCd="" 
          eleicaoNome="Arquivo Local EA14" 
          initialLocalData={localFile.data} 
          onClose={() => setLocalFile(null)} 
        />
      )}

      {localFile?.type === 'EA15' && (
        <EA15Viewer 
          ciclo="" 
          eleicaoCd="" 
          uf="" 
          initialLocalData={localFile.data} 
          onBack={() => setLocalFile(null)} 
        />
      )}

      {localFile?.type === 'EA11' && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                Arquivo EA11 Local — Lista de Eleições
              </h2>
              <button onClick={() => setLocalFile(null)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18"></path></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                Este é o conteúdo do arquivo de configuração (EA11) que você carregou. Mostrando pleitos e eleições disponíveis:
              </p>
              {localFile.data.pl?.map((pl: { cd: string; dt: string; e: any[] }) => (
                <div key={pl.cd} className="border border-gray-100 dark:border-slate-800 rounded-lg p-3 bg-gray-50/50 dark:bg-slate-800/30">
                  <div className="font-bold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider mb-2 flex justify-between">
                    <span>Pleito {pl.cd}</span>
                    <span>{pl.dt}</span>
                  </div>
                  <div className="space-y-2">
                    {pl.e?.map((e: { cd: string; nm: string; t: string; tp: string }) => (
                      <div 
                        key={e.cd} 
                        className="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => {
                          selectEleicao(e as EleicaoEA11, localFile.data.c);
                          setLocalFile(null);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-gray-100">{e.nm.replace(/&#186;/g, 'º')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Código: {e.cd} • Turno: {e.t} • Tipo: {e.tp}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [turno] = useState<Turno>(1);
  const [localFile, setLocalFile] = useState<{ type: 'EA11' | 'EA14' | 'EA15' | 'EA20', data: any } | null>(null);

  return (
    <EnvironmentProvider>
      <QueryClientProvider client={queryClient}>
        <ElectionProvider>
          <ThemeProvider>
            <BrowserRouter>
              <AppContent 
                onLocalFileLoaded={setLocalFile} 
                localFile={localFile} 
                setLocalFile={setLocalFile} 
                turno={turno} 
              />
            </BrowserRouter>
          </ThemeProvider>
        </ElectionProvider>
      </QueryClientProvider>
    </EnvironmentProvider>
  );
}


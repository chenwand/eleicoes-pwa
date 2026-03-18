import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { ByRegion } from './pages/ByRegion';
import { Timeline } from './pages/Timeline';
import { Validator } from './pages/Validator';
import { EA20Viewer } from './components/EA20Viewer';
import type { Turno } from './types/election';
import type { EA20Response } from './types/ea20';

import { ThemeProvider } from './context/ThemeContext';
import { EnvironmentProvider } from './context/EnvironmentContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

export default function App() {
  const [turno] = useState<Turno>(1);
  const [localData, setLocalData] = useState<EA20Response | null>(null);

  return (
    <EnvironmentProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
              <Header onLocalFileLoaded={setLocalData} />
              <main className="container mx-auto px-4 py-6">
                <Routes>
                  <Route path="/" element={<Validator />} />
                  <Route path="/resultados" element={<Home turno={turno} />} />
                  <Route path="/regioes" element={<ByRegion turno={turno} />} />
                  <Route path="/timeline" element={<Timeline turno={turno} />} />
                </Routes>
              </main>

              {localData && (
                <EA20Viewer 
                  initialLocalData={localData} 
                  onBack={() => setLocalData(null)} 
                />
              )}
            </div>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </EnvironmentProvider>
  );
}

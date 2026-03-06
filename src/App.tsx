import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { ByRegion } from './pages/ByRegion';
import { Timeline } from './pages/Timeline';
import type { Turno } from './types/election';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});

function App() {
  const [turno, setTurno] = useState<Turno>(1);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <Header turno={turno} onTurnoChange={setTurno} />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Home turno={turno} />} />
              <Route path="/regioes" element={<ByRegion turno={turno} />} />
              <Route path="/timeline" element={<Timeline turno={turno} />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

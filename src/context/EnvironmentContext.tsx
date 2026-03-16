import { createContext, useContext, useState, type ReactNode } from 'react';

export type Ambiente = 'oficial' | 'simulado';

interface EnvironmentContextType {
  ambiente: Ambiente;
  setAmbiente: (a: Ambiente) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [ambiente, setAmbiente] = useState<Ambiente>(() => {
    return (localStorage.getItem('ambiente') as Ambiente) || 'oficial';
  });

  const handleSetAmbiente = (a: Ambiente) => {
    localStorage.setItem('ambiente', a);
    setAmbiente(a);
  };

  return (
    <EnvironmentContext.Provider value={{ ambiente, setAmbiente: handleSetAmbiente }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}

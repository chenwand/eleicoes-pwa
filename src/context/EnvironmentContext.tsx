import { createContext, useContext, useState, type ReactNode } from 'react';

export type Ambiente = string;

interface EnvironmentContextType {
  ambiente: Ambiente;
  setAmbiente: (a: Ambiente) => void;
  host: string;
  setHost: (h: string) => void;
  availableEnvironments: string[];
  setAvailableEnvironments: (envs: string[]) => void;
}

const DEFAULT_ENVIRONMENTS = ['oficial', 'simulado', 'teste', 'formacao'];
const DEFAULT_HOST = import.meta.env.VITE_TSE_API_HOST || '/tse-api';

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [ambiente, setAmbiente] = useState<Ambiente>(() => {
    return localStorage.getItem('ambiente') || 'oficial';
  });

  const [host, setHost] = useState<string>(() => {
    return localStorage.getItem('api_host') || DEFAULT_HOST;
  });

  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>(() => {
    const saved = localStorage.getItem('available_environments');
    return saved ? JSON.parse(saved) : DEFAULT_ENVIRONMENTS;
  });

  const handleSetAmbiente = (a: Ambiente) => {
    localStorage.setItem('ambiente', a);
    setAmbiente(a);
  };

  const handleSetHost = (h: string) => {
    localStorage.setItem('api_host', h);
    setHost(h);
  };

  const handleSetAvailableEnvironments = (envs: string[]) => {
    localStorage.setItem('available_environments', JSON.stringify(envs));
    setAvailableEnvironments(envs);
  };

  return (
    <EnvironmentContext.Provider value={{ 
      ambiente, 
      setAmbiente: handleSetAmbiente,
      host,
      setHost: handleSetHost,
      availableEnvironments,
      setAvailableEnvironments: handleSetAvailableEnvironments
    }}>
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

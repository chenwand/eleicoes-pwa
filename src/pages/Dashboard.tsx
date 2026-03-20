import { useElection } from '../context/ElectionContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EA11Viewer } from '../components/EA11Viewer';
import { SettingsModal } from '../components/SettingsModal';

interface DashboardButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  description?: string;
  visible?: boolean;
}

function DashboardButton({ label, icon, onClick, description, visible = true }: DashboardButtonProps) {
  if (!visible) return null;
  
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-500/50 overflow-hidden"
    >
      <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="text-blue-600 dark:text-blue-400 mb-4 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center leading-tight">
        {label}
      </span>
      {description && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
          {description}
        </span>
      )}
    </button>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { hasSelection, isOrdinary, selectedEleicao, selectedAbrangencia } = useElection();
  const [isEA11Open, setIsEA11Open] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ea11InitialCd, setEa11InitialCd] = useState<string | null | undefined>();

  const openEA11 = (cd?: string | null) => {
    setEa11InitialCd(cd);
    setIsEA11Open(true);
  };

  const handleLocalFileClick = () => {
    const input = document.getElementById('local-file-input');
    if (input) (input as HTMLInputElement).click();
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 1. Seleção de eleição (EA11) */}
        <DashboardButton
          label="Seleção de Eleição (EA11)"
          description="Acesse a lista oficial de eleições do TSE"
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          }
          onClick={() => openEA11(null)}
        />

        {/* 2. Seleção de abrangência (EA12) */}
        <DashboardButton
          label="Seleção de Abrangência (EA12)"
          description="Altere o município ou estado selecionado"
          visible={hasSelection}
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          }
          onClick={() => openEA11(selectedEleicao?.cd)}
        />

        {/* 3. Acompanhamento BR (EA14) */}
        <DashboardButton
          label="Acompanhamento BR (EA14)"
          description="Visualização consolidada do Brasil"
          visible={isOrdinary}
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 012.5 2.5v.658m-11 0a2.25 2.25 0 00-.166.348c-.074.232-.014.487.168.669l.407.408a2.25 2.25 0 01.659 1.591v.659M19.5 12h-1.5a2 2 0 00-2 2v1.5a2 2 0 01-2 2h-1.5a2.25 2.25 0 01-2.25-2.25v-1.125a2.25 2.25 0 00-2.25-2.25h-1.125A2.25 2.25 0 0110 5.625V4.5A2.25 2.25 0 0112.25 2.25h1.5A2.25 2.25 0 0116 4.5v.75m3.5 1.5l-1.5 1.5m1.5-1.5l1.5-1.5M10 21h4"></path></svg>
          }
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-ea14'));
          }}
        />

        {/* 4. Acompanhamento UF (EA15) */}
        <DashboardButton
          label="Acompanhamento UF (EA15)"
          description={`Visualização consolidada de ${selectedAbrangencia?.ufCd || 'UF'}`}
          visible={isOrdinary && (!selectedAbrangencia || selectedAbrangencia.ufCd.toLowerCase() !== 'br')}
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7l5-2.5 5.553 2.776a1 1 0 01.447.894v10.764a1 1 0 01-1.447.894L14 17l-5 3z" /></svg>
          }
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-ea15'));
          }}
        />

        {/* 4. Arquivo unificado (EA20) */}
        <DashboardButton
          label="Arquivo Unificado (EA20)"
          description="Validação detalhada de dados"
          visible={hasSelection}
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
          }
          onClick={() => {
            if (selectedAbrangencia) {
              window.dispatchEvent(new CustomEvent('open-ea20'));
            } else {
              openEA11(selectedEleicao?.cd);
            }
          }}
        />

        {/* 4. Visualização de arquivos locais */}
        <DashboardButton
          label="Arquivos Locais"
          description="Validar JSON baixado do TSE"
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          }
          onClick={handleLocalFileClick}
        />

        {/* 5. Painel de configurações */}
        <DashboardButton
          label="Configurações"
          description="Ambiente e servidor de dados"
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          }
          onClick={() => setIsSettingsOpen(true)}
        />

        {/* 6. Por Região */}
        <DashboardButton
          label="Votação por Região"
          description="Mapa e dados agregados"
          visible={isOrdinary}
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 012.5 2.5v.658m-11 0a2.25 2.25 0 00-.166.348c-.074.232-.014.487.168.669l.407.408a2.25 2.25 0 01.659 1.591v.659M19.5 12h-1.5a2 2 0 00-2 2v1.5a2 2 0 01-2 2h-1.5a2.25 2.25 0 01-2.25-2.25v-1.125a2.25 2.25 0 00-2.25-2.25h-1.125A2.25 2.25 0 0110 5.625V4.5A2.25 2.25 0 0112.25 2.25h1.5A2.25 2.25 0 0116 4.5v.75m3.5 1.5l-1.5 1.5m1.5-1.5l1.5-1.5M10 21h4"></path></svg>
          }
          onClick={() => navigate('/regioes')}
        />
      </div>

      <EA11Viewer 
        isOpen={isEA11Open} 
        onClose={() => setIsEA11Open(false)} 
        initialEleicaoCd={ea11InitialCd} 
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}

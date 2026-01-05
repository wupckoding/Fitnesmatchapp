
import React, { useState } from 'react';
import { Home } from './Home';
import { Search } from './Search';
import { ChatSystem } from './ChatSystem';
import { ProfessionalDetail } from './ProfessionalDetail';
import { AdminDashboard } from './AdminDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { ClientPortal } from './ClientPortal';
import { AppState, ProfessionalProfile, User, UserRole, TimeSlot, Booking } from '../types';

interface MainAppProps {
  user: User;
  onLogout: () => void;
}

type Tab = 'inicio' | 'buscar' | 'reservas' | 'mensagens' | 'perfil';

export const MainApp: React.FC<MainAppProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('inicio');
  const [selectedPro, setSelectedPro] = useState<ProfessionalProfile | null>(null);

  const handleBookingConfirm = (booking: Booking) => {
    setSelectedPro(null);
    setActiveTab('reservas');
  };

  const renderContent = () => {
    if (user.role === UserRole.ADMIN) return <AdminDashboard onLogout={onLogout} />;
    
    // Lógica para Instrutores (Teacher)
    if (user.role === UserRole.TEACHER) {
        switch(activeTab) {
            case 'buscar':
                // O instrutor agora vê o Gestor de Agenda na aba de Busca
                return <TeacherDashboard user={user} onLogout={onLogout} initialTab="gestor" onTabChange={(t) => setActiveTab(t as Tab)} />;
            case 'mensagens':
                return <ChatSystem currentUser={user} />;
            case 'reservas':
                return <TeacherDashboard user={user} onLogout={onLogout} initialTab="reservas" onTabChange={(t) => setActiveTab(t as Tab)} />;
            case 'perfil':
                return <TeacherDashboard user={user} onLogout={onLogout} initialTab="perfil" onTabChange={(t) => setActiveTab(t as Tab)} />;
            case 'inicio':
            default:
                return <TeacherDashboard user={user} onLogout={onLogout} initialTab="agenda" onTabChange={(t) => setActiveTab(t as Tab)} />;
        }
    }

    // Lógica para Clientes
    if (selectedPro) {
      return (
        <ProfessionalDetail 
          professional={selectedPro} 
          currentUser={user}
          onBack={() => setSelectedPro(null)} 
          onBook={handleBookingConfirm} 
        />
      );
    }

    switch (activeTab) {
      case 'inicio':
        return <Home currentUser={user} onSelectProfessional={setSelectedPro} />;
      case 'buscar':
        return <Search onSelectProfessional={setSelectedPro} />;
      case 'mensagens':
        return <ChatSystem currentUser={user} />;
      case 'reservas':
      case 'perfil':
        return <ClientPortal user={user} onLogout={onLogout} activeTab={activeTab} onNavigate={setActiveTab} />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center animate-fade-in">
            <h2 className="text-xl font-black text-slate-900 mb-2 capitalize">{activeTab}</h2>
            <p className="text-slate-400 text-sm font-medium">Esta sección está en mantenimiento.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>

      {!selectedPro && (user.role !== UserRole.ADMIN) && (
        <nav className="h-24 bg-white/90 backdrop-blur-xl flex items-center justify-around px-4 border-t border-slate-100 z-[50] shrink-0">
          <NavButton active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} label="Inicio" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} />
          <NavButton active={activeTab === 'buscar'} onClick={() => setActiveTab('buscar')} label={user.role === UserRole.TEACHER ? "Gestión" : "Buscar"} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
          <NavButton active={activeTab === 'reservas'} onClick={() => setActiveTab('reservas')} label="Reservas" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
          <NavButton active={activeTab === 'mensagens'} onClick={() => setActiveTab('mensagens')} label="Chat" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} />
          <NavButton active={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')} label="Perfil" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
        </nav>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-90 relative group ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-tighter transition-all duration-200 ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    {active && (
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full animate-bounce-in"></div>
    )}
  </button>
);

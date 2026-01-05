
import React, { useState, useEffect, useCallback } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MainApp } from './components/MainApp';
import { LoginPage } from './components/LoginPage';
import { AppState, User, UserRole } from './types';
import { DB } from './services/databaseService';
import { initPushNotifications } from './services/pushNotificationService';

// Chave para salvar sessão no localStorage
const SESSION_KEY = 'fm_session_user';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Função para sincronizar o usuário atual com o que está no banco de dados
  const syncUser = useCallback(() => {
    if (currentUser) {
      const pros = DB.getPros();
      const clients = DB.getClients();
      const updated = pros.find(p => p.id === currentUser.id) || clients.find(c => c.id === currentUser.id);
      if (updated) {
        // Só atualiza se houver mudança real para evitar loops infinitos
        if (JSON.stringify(updated) !== JSON.stringify(currentUser)) {
          setCurrentUser(updated);
          // Atualizar sessão salva também
          localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        }
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const initializeApp = async () => {
      // Inicializar banco de dados e aguardar sincronização
      DB.init();
      
      // Inicializar notificações push (só funciona em dispositivos nativos)
      initPushNotifications().then(success => {
        if (success) {
          console.log('🔔 Push notifications enabled');
        }
      });
      
      // Aguardar um pouco para dar tempo da sincronização inicial
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Forçar sincronização para garantir dados atualizados
      await DB.forceSync();
      
      // Verificar se existe sessão salva
      const savedSession = localStorage.getItem(SESSION_KEY);
      
      if (savedSession) {
        try {
          const user = JSON.parse(savedSession) as User;
          // Verificar se o usuário ainda existe no banco (após sync)
          const pros = DB.getPros();
          const clients = DB.getClients();
          const exists = pros.find(p => p.id === user.id) || clients.find(c => c.id === user.id);
          
          if (exists) {
            console.log('✅ Sessão restaurada para:', exists.name, '| planActive:', (exists as any).planActive);
            setCurrentUser(exists);
            setAppState(AppState.MAIN);
          } else {
            // USUÁRIO NÃO EXISTE NO BANCO - FORÇAR NOVO LOGIN
            console.log('❌ Usuário NÃO encontrado no banco de dados! Forçando novo login...');
            console.log('   ID buscado:', user.id);
            console.log('   Pros no banco:', pros.length);
            console.log('   Clients no banco:', clients.length);
            localStorage.removeItem(SESSION_KEY);
            setAppState(AppState.WELCOME);
          }
        } catch (e) {
          console.error('Erro ao restaurar sessão:', e);
          localStorage.removeItem(SESSION_KEY);
          setAppState(AppState.WELCOME);
        }
      } else {
        setAppState(AppState.WELCOME);
      }
    };
    
    initializeApp();
  }, []);

  // Escuta atualizações do banco de dados (como salvar perfil)
  useEffect(() => {
    const unsub = DB.subscribe(syncUser);
    return () => unsub();
  }, [syncUser]);

  const handleLogin = (user: User) => {
    // Salvar sessão no localStorage
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    console.log('💾 Sessão salva para:', user.name);
    setCurrentUser(user);
    setAppState(AppState.MAIN);
  };

  const handleLogout = () => {
    // Limpar sessão do localStorage
    localStorage.removeItem(SESSION_KEY);
    console.log('🚪 Sessão encerrada');
    setCurrentUser(null);
    setAppState(AppState.WELCOME);
  };

  return (
    <div className="h-dvh w-full bg-[#111] flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-lg bg-white relative flex flex-col overflow-hidden sm:rounded-[60px] sm:my-8 sm:h-[92dvh] shadow-[0_0_100px_rgba(0,0,0,0.5)]">
        {appState === AppState.LOADING && <SplashScreen />}
        {(appState === AppState.WELCOME || appState === AppState.LOGIN) && (
          <LoginPage onLogin={handleLogin} startAtWelcome={appState === AppState.WELCOME} />
        )}
        {appState === AppState.MAIN && currentUser && (
          <MainApp user={currentUser} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
};

export default App;

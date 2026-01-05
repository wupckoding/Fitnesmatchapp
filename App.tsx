
import React, { useState, useEffect, useCallback } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MainApp } from './components/MainApp';
import { LoginPage } from './components/LoginPage';
import { AppState, User, UserRole } from './types';
import { DB } from './services/databaseService';
import { initPushNotifications } from './services/pushNotificationService';

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
        }
      }
    }
  }, [currentUser]);

  useEffect(() => {
    DB.init();
    
    // Inicializar notificações push (só funciona em dispositivos nativos)
    initPushNotifications().then(success => {
      if (success) {
        console.log('🔔 Push notifications enabled');
      }
    });
    
    const timer = setTimeout(() => {
      setAppState(AppState.WELCOME);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Escuta atualizações do banco de dados (como salvar perfil)
  useEffect(() => {
    const unsub = DB.subscribe(syncUser);
    return () => unsub();
  }, [syncUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAppState(AppState.MAIN);
  };

  const handleLogout = () => {
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


import React, { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { MainApp } from './components/MainApp';
import { LoginPage } from './components/LoginPage';
import { AppState, User, UserRole } from './types';
import { DB } from './services/databaseService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    DB.init();
    const timer = setTimeout(() => {
      setAppState(AppState.WELCOME);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

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


import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    // Animação de entrada do logo
    setTimeout(() => setShowLogo(true), 200);
    
    const interval = setInterval(() => {
      setProgress(p => p < 100 ? p + 2 : 100);
    }, 25);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-between bg-gradient-to-b from-black via-slate-900 to-black p-12 py-32">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* LOGO ANIMADO */}
        <div className={`relative transition-all duration-700 ease-out ${showLogo ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
          <div className="w-28 h-28 rounded-[36px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30 relative overflow-hidden">
            {/* Logo oficial do app */}
            <img 
              src="/apple-touch-icon.png" 
              alt="FitnessMatch Logo" 
              className="w-full h-full object-cover rounded-[36px]"
            />
            {/* Efeito de brilho */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-pulse rounded-[36px]"></div>
          </div>
          {/* Círculos decorativos */}
          <div className="absolute -inset-4 border-2 border-blue-500/20 rounded-[44px] animate-ping"></div>
        </div>
        
        <h1 className={`text-4xl font-extrabold text-white tracking-tighter mb-3 transition-all duration-500 delay-300 ${showLogo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          FITNESS<span className="text-blue-500">MATCH</span>
        </h1>
        <div className={`h-[2px] w-12 bg-gradient-to-r from-blue-600 to-blue-400 mb-3 rounded-full transition-all duration-500 delay-400 ${showLogo ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
        <p className={`text-white/40 text-[9px] uppercase tracking-[0.5em] font-bold transition-all duration-500 delay-500 ${showLogo ? 'opacity-100' : 'opacity-0'}`}>
          Costa Rica Edition
        </p>
      </div>
      
      <div className="w-full max-w-[200px] flex flex-col items-center space-y-6">
        <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out rounded-full shadow-lg shadow-blue-500/50" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-center">
          <p className="text-white/30 text-[8px] font-black tracking-[0.3em] uppercase mb-1">
            {progress < 100 ? 'Preparando tu experiencia...' : '¡Listo!'}
          </p>
          <div className="mt-6 flex flex-col items-center">
            <span className="text-white/15 text-[6px] font-bold tracking-[0.4em] uppercase mb-1">Developed by</span>
            <p className="jbnexo-branding text-[11px] font-black tracking-[0.5em] uppercase">
              JBNEXO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

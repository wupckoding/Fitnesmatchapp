
import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => p < 100 ? p + 2 : 100);
    }, 25);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-between bg-black p-12 py-32">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 border-[1.5px] border-white/20 rounded-[32px] flex items-center justify-center mb-8 bg-white/5 backdrop-blur-3xl">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tighter mb-2">FITNESSMATCH</h1>
        <div className="h-[1px] w-8 bg-blue-600 mb-2"></div>
        <p className="text-white/40 text-[9px] uppercase tracking-[0.6em] font-bold">Costa Rica Edition</p>
      </div>
      
      <div className="w-full max-w-[200px] flex flex-col items-center space-y-6">
        <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-center group">
          <p className="text-white/20 text-[8px] font-black tracking-[0.3em] uppercase">Cargando Experiencia</p>
          <div className="mt-6 flex flex-col items-center">
            <span className="text-white/10 text-[6px] font-bold tracking-[0.4em] uppercase mb-1">Developed by</span>
            <p className="jbnexo-branding text-[11px] font-black tracking-[0.5em] uppercase">
              JBNEXO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

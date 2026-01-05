import React, { useEffect, useState } from "react";

export const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    // Animações em sequência
    setTimeout(() => setShowLogo(true), 300);
    setTimeout(() => setShowText(true), 800);
    setTimeout(() => setShowProgress(true), 1200);

    const interval = setInterval(() => {
      setProgress((p) => (p < 100 ? p + 1.5 : 100));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-between bg-gradient-to-b from-black via-slate-900 to-black p-12 py-24 relative overflow-hidden">
      {/* Partículas de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl animate-float-slower"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* LOGO GRANDE SVG */}
        <div
          className={`relative transition-all duration-1000 ease-out ${
            showLogo ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
        >
          {/* Círculo com borda e ícone dentro */}
          <div className="w-36 h-36 rounded-full border border-white/20 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Texto */}
        <div
          className={`mt-12 text-center transition-all duration-700 ${
            showText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h1 className="text-5xl font-black text-white tracking-tighter mb-3">
            FITNESS<span className="text-blue-500">MATCH</span>
          </h1>
          <div
            className={`h-1 w-16 bg-gradient-to-r from-blue-600 to-blue-400 mx-auto mb-4 rounded-full transition-all duration-700 delay-200 ${
              showText ? "opacity-100 scale-100" : "opacity-0 scale-0"
            }`}
          ></div>
          <p
            className={`text-white/40 text-[10px] uppercase tracking-[0.5em] font-bold transition-all duration-500 delay-300 ${
              showText ? "opacity-100" : "opacity-0"
            }`}
          >
            Costa Rica Edition
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className={`w-full max-w-[240px] flex flex-col items-center space-y-6 transition-all duration-700 ${
          showProgress ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-500 ease-out rounded-full shadow-lg shadow-blue-500/50"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-center">
          <p className="text-white/40 text-[9px] font-bold tracking-[0.2em] uppercase mb-1">
            {progress < 100 ? "Preparando tu experiencia..." : "¡Listo!"}
          </p>
          <div className="mt-8 flex flex-col items-center">
            <span className="text-white/20 text-[7px] font-bold tracking-[0.4em] uppercase mb-1">
              Developed by
            </span>
            <p className="jbnexo-branding text-[12px] font-black tracking-[0.5em] uppercase">
              JBNEXO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

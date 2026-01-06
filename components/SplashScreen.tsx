import React, { useEffect, useState } from "react";

export const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    // Animações simplificadas - apenas opacity para melhor performance
    requestAnimationFrame(() => {
      setShowLogo(true);
      setTimeout(() => setShowText(true), 400);
      setTimeout(() => setShowProgress(true), 700);
    });

    const interval = setInterval(() => {
      setProgress((p) => (p < 100 ? p + 2 : 100));
    }, 25);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-between bg-black p-12 py-24">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* LOGO - animação simples de opacity */}
        <div
          style={{
            opacity: showLogo ? 1 : 0,
            transition: "opacity 0.5s ease-out",
          }}
        >
          <div className="w-32 h-32 rounded-full border border-white/20 flex items-center justify-center">
            <svg
              className="w-14 h-14 text-white"
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

        {/* Texto - animação simples */}
        <div
          className="mt-10 text-center"
          style={{
            opacity: showText ? 1 : 0,
            transition: "opacity 0.4s ease-out",
          }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            FITNESS<span className="text-blue-500">MATCH</span>
          </h1>
          <div
            className="h-0.5 w-12 bg-blue-500 mx-auto mb-3"
            style={{
              transform: showText ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 0.3s ease-out 0.2s",
            }}
          />
          <p className="text-white/30 text-[9px] uppercase tracking-[0.4em] font-semibold">
            Costa Rica Edition
          </p>
        </div>
      </div>

      {/* Progress bar - sem blur, sem shadow */}
      <div
        className="w-full max-w-[200px] flex flex-col items-center space-y-4"
        style={{
          opacity: showProgress ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      >
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{
              width: `${progress}%`,
              transition: "width 0.1s linear",
            }}
          />
        </div>
        <p className="text-white/30 text-[8px] font-semibold tracking-widest uppercase">
          {progress < 100 ? "Cargando..." : "¡Listo!"}
        </p>
        <div className="mt-6 text-center">
          <span className="text-white/15 text-[6px] font-bold tracking-[0.3em] uppercase">
            Developed by
          </span>
          <p className="text-white/40 text-[10px] font-black tracking-[0.4em] uppercase mt-0.5">
            JBNEXO
          </p>
        </div>
      </div>
    </div>
  );
};

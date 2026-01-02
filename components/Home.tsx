
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ProfessionalProfile } from '../types';
import { DB } from '../services/databaseService';

interface HomeProps {
  onSelectProfessional: (p: ProfessionalProfile) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectProfessional }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [pros, setPros] = useState<ProfessionalProfile[]>([]);
  const [cats, setCats] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setPros([...DB.getPros().filter(p => p.status === 'active' && p.planActive)]);
    setCats(['Todos', ...DB.getCategories().filter(c => c.isActive).map(c => c.name)]);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [refresh]);

  const filtered = useMemo(() => {
    return pros.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.areas.some(a => a.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === 'Todos' || p.areas.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory, pros]);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <header className="px-10 pt-16 pb-8 bg-white/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-5xl font-extrabold text-black tracking-tighter leading-tight">Tu Mejor<br/>Versión.</h1>
            <p className="text-slate-300 font-bold text-[9px] uppercase tracking-[0.4em] mt-2">Entrenadores Verificados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 6h16M4 12h16m-7 6h7"/></svg>
          </div>
        </div>
        
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Busca disciplinas o nombres..."
            className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 pl-14 pr-6 text-black placeholder:text-slate-400 font-bold text-sm focus:ring-1 focus:ring-black focus:border-black transition-all outline-none shadow-inner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-6 top-6 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-10 no-scrollbar pb-32">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-6">
          {cats.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                selectedCategory === cat 
                ? 'bg-black text-white shadow-xl' 
                : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-4">
          {filtered.map((p, idx) => (
            <div 
              key={p.id}
              onClick={() => onSelectProfessional(p)}
              className="bg-white p-8 rounded-[40px] border border-slate-100 flex items-center gap-8 active:scale-[0.97] transition-all cursor-pointer group animate-spring-up shadow-sm"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="relative shrink-0">
                <img src={p.image} className="w-24 h-24 rounded-[32px] object-cover grayscale group-hover:grayscale-0 transition-all duration-500 shadow-md" alt="" />
                <div className="absolute -bottom-2 -right-2 bg-black text-white px-3 py-1.5 rounded-xl font-black text-[9px] border-4 border-white">
                   {p.rating}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-extrabold text-black tracking-tighter truncate">{p.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                   {p.areas.slice(0, 2).map(a => (
                     <span key={a} className="text-[8px] font-black uppercase text-slate-400 tracking-widest border border-slate-100 px-2 py-0.5 rounded-md">{a}</span>
                   ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                   <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                      {p.location}
                   </p>
                   <p className="font-black text-black text-sm tracking-tight">₡{p.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-20 text-center opacity-20">
               <p className="text-black font-black uppercase text-[10px] tracking-[0.5em]">No se encontraron resultados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

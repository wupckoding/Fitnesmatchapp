
import React, { useState, useMemo, useEffect } from 'react';
import { ProfessionalProfile, Category } from '../types';
import { DB } from '../services/databaseService';

interface SearchProps {
  onSelectProfessional: (p: ProfessionalProfile) => void;
}

export const Search: React.FC<SearchProps> = ({ onSelectProfessional }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [pros, setPros] = useState<ProfessionalProfile[]>([]);
  const [cats, setCats] = useState<string[]>([]);

  useEffect(() => {
    setPros(DB.getPros().filter(p => p.status === 'active' && p.planActive));
    setCats(['Todos', ...DB.getCategories().filter(c => c.isActive).map(c => c.name)]);
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return pros.filter(p => {
      // Busca flexível em nome, áreas e agora LOCALIZAÇÃO
      const match = p.name.toLowerCase().includes(term) || 
                    p.lastName.toLowerCase().includes(term) ||
                    p.location.toLowerCase().includes(term) ||
                    p.areas.some(a => a.toLowerCase().includes(term));
      
      const matchCat = selectedCategory === 'Todos' || p.areas.includes(selectedCategory);
      return match && matchCat;
    });
  }, [search, selectedCategory, pros]);

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden animate-fade-in">
      <header className="px-8 pt-12 pb-6 shrink-0">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-6">Explorar</h2>
        
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Disciplinas, nombres o ubicación..."
            className="w-full bg-slate-50 border border-slate-100 rounded-[28px] py-5 pl-14 pr-6 text-sm font-extrabold text-black placeholder:text-slate-300 outline-none focus:ring-1 focus:ring-black/5 transition-all shadow-inner"
            style={{ color: '#000' }} // Forçar cor preta para garantir visibilidade
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-6 top-5 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
           {cats.map(cat => (
             <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedCategory === cat ? 'bg-black text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
             >
               {cat}
             </button>
           ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 no-scrollbar pb-32">
         <div className="grid grid-cols-1 gap-4">
            {filtered.map((p, idx) => (
              <div 
                key={p.id} 
                onClick={() => onSelectProfessional(p)}
                className="bg-white border border-slate-100 rounded-[36px] p-6 flex items-center gap-6 active:scale-[0.98] transition-all animate-spring-up shadow-sm group"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                 <img src={p.image} className="w-20 h-20 rounded-[28px] object-cover shadow-md group-hover:scale-105 transition-transform" alt="" />
                 <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-900 tracking-tight truncate">{p.name} {p.lastName}</h4>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 truncate">{p.areas.join(' • ')}</p>
                    <div className="flex items-center gap-4 mt-3">
                       <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                          <span className="text-xs font-black text-slate-900">{p.rating}</span>
                       </div>
                       <div className="flex items-center gap-1 text-slate-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/></svg>
                          <span className="text-[10px] font-bold uppercase tracking-tighter truncate">{p.location}</span>
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Desde</p>
                    <p className="text-sm font-black text-slate-900">₡{p.price.toLocaleString()}</p>
                 </div>
              </div>
            ))}
            
            {filtered.length === 0 && (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                 <span className="text-4xl mb-4">🔍</span>
                 <p className="font-black uppercase text-[10px] tracking-[0.3em]">Sin resultados para "{search}"</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

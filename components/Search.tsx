
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ProfessionalProfile } from '../types';
import { DB } from '../services/databaseService';

interface SearchProps {
  onSelectProfessional: (p: ProfessionalProfile) => void;
}

export const Search: React.FC<SearchProps> = ({ onSelectProfessional }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [pros, setPros] = useState<ProfessionalProfile[]>([]);
  const [cats, setCats] = useState<{name: string, icon: string}[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'name'>('rating');

  const refresh = useCallback(() => {
    setPros(DB.getPros().filter(p => p.status === 'active' && p.planActive));
    setCats([
      { name: 'Todos', icon: '✨' },
      ...DB.getCategories().filter(c => c.isActive).map(c => ({ name: c.name, icon: c.iconClass }))
    ]);
  }, []);

  // Carregar dados frescos do Supabase
  const loadFreshData = useCallback(async () => {
    try {
      await DB.forceSync();
      refresh();
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    loadFreshData();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [loadFreshData, refresh]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    let result = pros.filter(p => {
      const match = p.name.toLowerCase().includes(term) || 
                    p.lastName.toLowerCase().includes(term) ||
                    p.location.toLowerCase().includes(term) ||
                    p.areas.some(a => a.toLowerCase().includes(term));
      
      const matchCat = selectedCategory === 'Todos' || p.areas.includes(selectedCategory);
      return match && matchCat;
    });

    // Ordenar
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [search, selectedCategory, pros, sortBy]);

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden animate-fade-in">
      <header className="px-6 pt-14 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight">Explorar</h2>
            <p className="text-xs text-slate-400 mt-0.5">{pros.length} profesionales disponibles</p>
          </div>
          
          {/* Sort Button */}
          <div className="flex items-center gap-2">
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
            >
              <option value="rating">⭐ Rating</option>
              <option value="price">💰 Precio</option>
              <option value="name">🔤 Nombre</option>
            </select>
          </div>
        </div>
        
        {/* Barra de Busca Premium */}
        <div className={`relative transition-all duration-300 mb-4 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
          <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl blur-xl transition-opacity duration-300 ${isSearchFocused ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar por nombre, disciplina o ubicación..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-blue-300 focus:shadow-lg focus:shadow-blue-50/50 transition-all duration-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <svg className={`absolute left-4 top-4 w-5 h-5 transition-colors ${isSearchFocused ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-4 top-4 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {cats.map((cat, idx) => (
            <button 
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 whitespace-nowrap animate-slide-up ${
                selectedCategory === cat.name 
                  ? 'bg-black text-white shadow-lg shadow-slate-300' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <span className="text-sm">{cat.icon}</span>
              <span className="text-xs font-bold">{cat.name}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-32">
        {/* Resultados */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
            {search && ` para "${search}"`}
          </p>
        </div>

        <div className="space-y-3">
          {filtered.map((p, idx) => (
            <div 
              key={p.id} 
              onClick={() => onSelectProfessional(p)}
              className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all animate-spring-up shadow-sm hover:shadow-md hover:border-slate-200 group cursor-pointer"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="relative">
                <img src={p.image} className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all" alt="" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7"/></svg>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-black text-sm truncate">{p.name} {p.lastName}</h4>
                  <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md">
                    <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <span className="text-[10px] font-bold text-yellow-700">{p.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 font-semibold truncate">{p.areas.join(' · ')}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                  {p.location} · {p.reviews} reseñas
                </p>
              </div>
              
              <div className="text-right shrink-0">
                <p className="font-black text-black text-lg">₡{p.price.toLocaleString()}</p>
                <p className="text-[9px] text-slate-400 font-medium">por sesión</p>
              </div>
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">🔍</div>
              <p className="text-sm font-bold text-slate-400">No encontramos resultados</p>
              <p className="text-xs text-slate-300 mt-1">
                {search ? `No hay resultados para "${search}"` : 'Intenta con otra categoría'}
              </p>
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

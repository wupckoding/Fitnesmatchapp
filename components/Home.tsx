
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ProfessionalProfile, User, Notification, PlanType } from '../types';
import { DB } from '../services/databaseService';

interface HomeProps {
  currentUser: User;
  onSelectProfessional: (p: ProfessionalProfile) => void;
}

export const Home: React.FC<HomeProps> = ({ currentUser, onSelectProfessional }) => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [pros, setPros] = useState<ProfessionalProfile[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const refresh = useCallback(() => {
    setPros([...DB.getPros().filter(p => p.status === 'active' && p.planActive)]);
    setCats([{ name: 'Todos', icon: '✨' }, ...DB.getCategories().filter(c => c.isActive).map(c => ({ name: c.name, icon: c.iconClass }))]);
    setNotifs(DB.getNotifications(currentUser.id));
  }, [currentUser.id]);

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

  const unreadCount = useMemo(() => notifs.filter(n => !n.isRead).length, [notifs]);

  // Filtra destacados: Profesional ou Premium
  const featuredPros = useMemo(() => {
    return pros.filter(p => 
      p.planType === PlanType.PROFESIONAL || 
      p.planType === PlanType.PREMIUM ||
      p.planType === PlanType.TRIMESTRAL || 
      p.planType === PlanType.ANUAL
    );
  }, [pros]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return pros.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(term) || 
                          p.lastName.toLowerCase().includes(term) ||
                          p.location.toLowerCase().includes(term) ||
                          p.areas.some(a => a.toLowerCase().includes(term));
      const matchCat = selectedCategory === 'Todos' || p.areas.includes(selectedCategory);
      return matchSearch && matchCat;
    });
  }, [selectedCategory, search, pros]);

  const handleOpenNotifs = () => {
    setShowNotifications(true);
    DB.markNotificationsRead(currentUser.id);
  };

  // Greeting baseado na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-slate-50 to-white overflow-hidden relative">
      {/* Header com saudação personalizada */}
      <header className="px-6 pt-14 pb-4 shrink-0">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest animate-fade-in">
              {getGreeting()}, {currentUser.name}
            </p>
            <h1 className="text-[32px] font-black text-black leading-tight tracking-tight animate-slide-up">
              Encuentra tu<br/>
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                entrenador ideal
              </span>
            </h1>
          </div>
          
          <div className="flex gap-3">
            {/* Avatar do usuário */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-lg animate-scale-in">
              {currentUser.image ? (
                <img src={currentUser.image} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-lg">
                  {currentUser.name[0]}
                </div>
              )}
            </div>
            
            {/* Notificações */}
            <button 
              onClick={handleOpenNotifs}
              className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-all relative animate-scale-in"
              style={{ animationDelay: '0.1s' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center animate-bounce shadow-lg shadow-red-200">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de Busca Premium */}
        <div className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
          <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 rounded-2xl blur-xl transition-opacity duration-300 ${isSearchFocused ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar entrenadores, disciplinas..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-blue-300 focus:shadow-lg focus:shadow-blue-100/50 transition-all duration-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <svg className={`absolute left-4 top-4 w-5 h-5 transition-colors ${isSearchFocused ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Categorías Horizontais */}
        <section className="px-6 py-4">
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
                <span className="text-base">{cat.icon}</span>
                <span className="text-xs font-bold">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Stats Rápidas */}
        {!search && (
          <section className="px-6 mb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-200">
                <p className="text-2xl font-black">{pros.length}</p>
                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wide">Profesionales</p>
              </div>
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-4 rounded-2xl text-white shadow-lg shadow-violet-200">
                <p className="text-2xl font-black">{cats.length - 1}</p>
                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wide">Disciplinas</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-200">
                <p className="text-2xl font-black">5.0</p>
                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wide">Rating Prom.</p>
              </div>
            </div>
          </section>
        )}

        {/* Seção Destacados - Cards Premium */}
        {!search && featuredPros.length > 0 && (
          <section className="mb-8">
            <div className="flex justify-between items-center px-6 mb-4">
              <div>
                <h3 className="text-lg font-black text-black">Destacados</h3>
                <p className="text-xs text-slate-400">Profesionales premium verificados</p>
              </div>
              <button className="text-xs font-bold text-blue-600">Ver todos →</button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 py-2">
              {featuredPros.map((p, idx) => (
                <div 
                  key={p.id}
                  onClick={() => onSelectProfessional(p)}
                  className="min-w-[260px] bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 active:scale-[0.98] transition-all duration-300 group animate-scale-in border border-slate-100"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <div className="h-40 relative overflow-hidden">
                    <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Badge Premium */}
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span className="text-[9px] font-bold text-white uppercase">Premium</span>
                    </div>
                    
                    {/* Rating */}
                    <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <span className="text-xs font-bold text-white">{p.rating}</span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-black text-base leading-tight">{p.name} {p.lastName}</h4>
                        <p className="text-xs text-slate-400 font-medium">{p.areas[0]}</p>
                      </div>
                      <p className="text-lg font-black text-blue-600">₡{p.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                      <span className="text-xs font-medium">{p.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lista de Todos os Profissionais */}
        <section className="px-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-black text-black">
                {search ? `Resultados` : 'Todos los profesionales'}
              </h3>
              <p className="text-xs text-slate-400">{filtered.length} disponibles</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {filtered.map((p, idx) => (
              <div 
                key={p.id}
                onClick={() => onSelectProfessional(p)}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:shadow-md hover:border-slate-200 group animate-spring-up"
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div className="relative">
                  <img src={p.image} className="w-14 h-14 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all" alt={p.name} />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7"/></svg>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-black text-sm truncate">{p.name} {p.lastName}</h4>
                    <div className="flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      <span className="text-[10px] font-bold text-slate-500">{p.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 font-semibold truncate">{p.areas.join(' · ')}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                    {p.location}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-black text-black text-base">₡{p.price.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 font-medium">por sesión</p>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">🔍</div>
                <p className="text-sm font-bold text-slate-400">No encontramos resultados</p>
                <p className="text-xs text-slate-300 mt-1">Intenta con otra búsqueda</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal de Notificações */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-[32px] animate-spring-up max-w-lg mx-auto shadow-2xl h-[75vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-black">Notificaciones</h2>
                <p className="text-xs text-slate-400">{notifs.length} avisos</p>
              </div>
              <button 
                onClick={() => setShowNotifications(false)} 
                className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-3">
              {notifs.map((n, idx) => (
                <div 
                  key={n.id} 
                  className="bg-slate-50 p-4 rounded-2xl flex gap-3 animate-spring-up"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === 'booking' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
                  }`}>
                    {n.type === 'booking' ? '📅' : '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-black text-sm truncate">{n.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {notifs.length === 0 && (
                <div className="py-16 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-4">🔔</div>
                  <p className="text-sm font-bold text-slate-400">Sin notificaciones</p>
                  <p className="text-xs text-slate-300 mt-1">Cuando tengas avisos aparecerán aquí</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

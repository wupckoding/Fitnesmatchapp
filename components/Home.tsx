
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

  const refresh = useCallback(() => {
    setPros([...DB.getPros().filter(p => p.status === 'active' && p.planActive)]);
    setCats([{ name: 'Todos', icon: '✨' }, ...DB.getCategories().filter(c => c.isActive).map(c => ({ name: c.name, icon: c.iconClass }))]);
    setNotifs(DB.getNotifications(currentUser.id));
  }, [currentUser.id]);

  useEffect(() => {
    refresh();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [refresh]);

  const unreadCount = useMemo(() => notifs.filter(n => !n.isRead).length, [notifs]);

  // Filtra apenas se o plano for trimestral ou anual (> 3 meses)
  const featuredPros = useMemo(() => {
    return pros.filter(p => p.planType === PlanType.TRIMESTRAL || p.planType === PlanType.ANUAL);
  }, [pros]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return pros.filter(p => {
      // Busca flexível em nome, localização e áreas
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

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden animate-fade-in relative">
      {/* Header Premium - Título Maior e Editorial */}
      <header className="px-8 pt-16 pb-6 shrink-0 bg-white">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-1">
            <h1 className="text-[44px] font-black text-black leading-[0.95] tracking-tighter">
              Tu Mejor<br/>Versión.
            </h1>
            <p className="text-slate-300 font-black text-[9px] uppercase tracking-[0.4em] pt-2">
              Profesionales verificados en CR
            </p>
          </div>
          <button 
            onClick={handleOpenNotifs}
            className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-[22px] flex items-center justify-center text-black shadow-sm active:scale-90 transition-all relative"
          >
             <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
             {unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full text-[9px] text-white font-black flex items-center justify-center animate-bounce">
                 {unreadCount}
               </span>
             )}
          </button>
        </div>

        {/* Barra de Busca Integrada na Home */}
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Busca por nombre, disciplina o lugar..."
            className="w-full bg-slate-50 border border-slate-100 rounded-[28px] py-6 pl-14 pr-6 text-[13px] font-extrabold text-black placeholder:text-slate-300 outline-none focus:ring-1 focus:ring-black/5 transition-all shadow-inner"
            style={{ color: '#000' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="absolute left-6 top-6 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Seção Discovery - Categorias com Ícones */}
        <section className="px-8 mb-10">
           <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-6">Disciplinas Populares</h3>
           <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
              {cats.map((cat) => (
                <button 
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex flex-col items-center gap-3 transition-all active:scale-95 ${selectedCategory === cat.name ? 'scale-105' : 'opacity-60'}`}
                >
                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl shadow-sm border ${selectedCategory === cat.name ? 'bg-black border-black text-white shadow-xl shadow-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    {cat.icon}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${selectedCategory === cat.name ? 'text-black' : 'text-slate-400'}`}>{cat.name}</span>
                </button>
              ))}
           </div>
        </section>

        {/* Seção Recomendados - Filtrado por Plano > 3 meses */}
        {!search && featuredPros.length > 0 && (
          <section className="px-8 mb-12">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Destacados para ti</h3>
                <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Ver todos</button>
             </div>
             
             <div className="flex gap-5 overflow-x-auto no-scrollbar py-2">
                {featuredPros.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => onSelectProfessional(p)}
                    className="min-w-[280px] bg-slate-900 rounded-[44px] p-8 relative overflow-hidden group active:scale-95 transition-all shadow-2xl shadow-slate-200"
                  >
                     <img src={p.image} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                     
                     <div className="relative h-48 flex flex-col justify-end">
                        <div className="flex gap-2 mb-4">
                           {p.areas.slice(0, 1).map(a => (
                             <span key={a} className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest border border-white/10">{a}</span>
                           ))}
                        </div>
                        <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-2">{p.name} {p.lastName}</h4>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1.5">
                              <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                              <span className="text-[11px] font-black text-white/80">{p.rating}</span>
                           </div>
                           <p className="text-base font-black text-white tracking-tighter">₡{p.price.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </section>
        )}

        {/* Seção Explorar Tudo - Cards Compactos */}
        <section className="px-8">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Explorar Disciplinas</h3>
              {search && <span className="text-[9px] font-black text-slate-300">{filtered.length} resultados</span>}
           </div>
           
           <div className="space-y-4">
              {filtered.map((p, idx) => (
                <div 
                  key={p.id}
                  onClick={() => onSelectProfessional(p)}
                  className="bg-white p-5 rounded-[36px] border border-slate-100 flex items-center gap-5 active:scale-[0.98] transition-all group animate-spring-up shadow-sm hover:border-black/5"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <img src={p.image} className="w-16 h-16 rounded-[24px] object-cover shadow-sm group-hover:scale-105 transition-transform" alt={p.name} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-black text-slate-900 tracking-tight leading-none mb-1.5 truncate">{p.name} {p.lastName}</h4>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2 opacity-60 truncate">{p.areas.join(' • ')}</p>
                    <div className="flex items-center gap-4 text-slate-300">
                       <div className="flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                          <span className="text-[8px] font-black uppercase tracking-widest truncate">{p.location}</span>
                       </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm tracking-tighter">₡{p.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4 text-2xl">🔍</div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No encontramos resultados</p>
                </div>
              )}
           </div>
        </section>
      </div>

      {/* Modal de Notificações */}
      {showNotifications && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end">
           <div className="w-full bg-white rounded-t-[44px] p-8 animate-spring-up max-w-lg mx-auto shadow-2xl h-[70vh] flex flex-col">
              <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-8 shrink-0" />
              <div className="flex justify-between items-center mb-8 shrink-0">
                 <h2 className="text-2xl font-black text-black tracking-tight">Notificaciones</h2>
                 <button onClick={() => setShowNotifications(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
                 {notifs.map((n) => (
                   <div key={n.id} className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 flex gap-4 animate-spring-up">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                         {n.type === 'booking' ? '📅' : '💬'}
                      </div>
                      <div className="flex-1">
                         <h4 className="font-black text-slate-900 text-sm">{n.title}</h4>
                         <p className="text-xs font-medium text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                         <p className="text-[8px] font-black text-slate-300 uppercase mt-3 tracking-widest">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                      </div>
                   </div>
                 ))}
                 {notifs.length === 0 && (
                   <div className="py-20 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-4 grayscale opacity-40">🔔</div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No tienes avisos nuevos</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

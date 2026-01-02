
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Plan, ProfessionalProfile, Category } from '../types';
import { DB } from '../services/databaseService';

type AdminView = 'dashboard' | 'users' | 'trainers' | 'plans' | 'categories';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [view, setView] = useState<AdminView>('dashboard');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trainers, setTrainers] = useState<ProfessionalProfile[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isEditingPlan, setIsEditingPlan] = useState<Plan | null>(null);
  const [isEditingCat, setIsEditingCat] = useState<Category | null>(null);
  const [isManagingTrainer, setIsManagingTrainer] = useState<ProfessionalProfile | null>(null);
  
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const refresh = useCallback(() => {
    setPlans([...DB.getPlans()]);
    setTrainers([...DB.getPros()]);
    setClients([...DB.getClients()]);
    setCategories([...DB.getCategories()].sort((a,b) => a.displayOrder - b.displayOrder));
    
    // Atualizar o treinador que está sendo gerenciado no momento para refletir mudanças do DB
    if (isManagingTrainer) {
      const updated = DB.getPros().find(p => p.id === isManagingTrainer.id);
      if (updated) setIsManagingTrainer(updated);
    }
  }, [isManagingTrainer]);

  useEffect(() => {
    refresh();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [refresh]);

  const showToast = (msg: string) => {
    setToast({ msg, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = (fn: () => void, msg: string) => {
    fn();
    refresh();
    showToast(msg);
  };

  const handleLogout = () => {
    setIsExiting(true);
    setTimeout(onLogout, 300);
  };

  const getDaysLeft = (expiryDate?: string) => {
    if (!expiryDate) return 0;
    const now = new Date();
    const exp = new Date(expiryDate);
    const diff = exp.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className={`flex-1 bg-white flex flex-col overflow-hidden relative transition-all duration-300 ${isExiting ? 'animate-exit' : ''}`}>
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[360px]">
           <div className="bg-black text-white p-5 rounded-2xl shadow-2xl flex items-center justify-between animate-spring-up">
             <span className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</span>
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
           </div>
        </div>
      )}

      <header className="px-8 pt-16 pb-8 bg-white border-b border-slate-100 sticky top-0 z-50 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-black tracking-tighter">Panel</h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">Suite de Gestión</p>
        </div>
        <div className="flex gap-2">
          {view !== 'dashboard' && (
            <button onClick={() => setView('dashboard')} className="w-12 h-12 border border-slate-100 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm">
               <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
            </button>
          )}
          <button onClick={handleLogout} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
        {view === 'dashboard' && (
          <div className="animate-spring-up space-y-10">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-black p-8 rounded-[32px] text-white flex justify-between items-center shadow-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Ingresos de Hoy</p>
                  <p className="text-3xl font-black tracking-tighter mt-1">₡285,000</p>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3m0-3v3m0 12v3"/></svg>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <KPICard label="Usuarios" value={trainers.length + clients.length} />
                <KPICard label="Entrenadores Pro" value={trainers.filter(t => t.planActive).length} highlight />
              </div>
            </div>

            <div className="space-y-2">
               <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] px-2 mb-4">Operaciones</h2>
               <ActionRow label="Planes de Suscripción" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h10"/></svg>} onClick={() => setView('plans')} />
               <ActionRow label="Red de Profesionales" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} onClick={() => setView('trainers')} />
               <ActionRow label="Disciplinas" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M7 7h10v10H7zM7 12h10"/></svg>} onClick={() => setView('categories')} />
               <ActionRow label="Base de Clientes" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>} onClick={() => setView('users')} />
            </div>
          </div>
        )}

        {view === 'trainers' && (
          <div className="animate-spring-up space-y-6">
            <div className="flex justify-between items-center px-2">
               <div>
                 <h2 className="text-2xl font-black text-black tracking-tight">Profesionales</h2>
                 <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Control de Membresías</p>
               </div>
            </div>
            
            <div className="space-y-4">
              {trainers.map((pro) => (
                <div 
                  key={pro.id} 
                  onClick={() => setIsManagingTrainer(pro)}
                  className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col gap-4 shadow-sm hover:border-black transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <img src={pro.image} className="w-14 h-14 rounded-2xl object-cover shadow-md" alt="" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-black tracking-tight truncate">{pro.name} {pro.lastName}</h4>
                      <div className="flex gap-2 items-center mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${pro.planActive ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-400'}`}>
                          {pro.planActive ? 'Pro Activo' : 'Sin Plan'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${pro.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-400'}`}>
                          {pro.status === 'active' ? 'Operativo' : 'Oculto'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Días restantes</p>
                       <p className={`text-lg font-black tracking-tighter ${getDaysLeft(pro.planExpiry) < 5 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                         {getDaysLeft(pro.planExpiry)}
                       </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'plans' && (
          <div className="animate-spring-up space-y-8">
            <div className="flex justify-between items-center px-2">
               <h2 className="text-2xl font-black text-black tracking-tight">Planes</h2>
               <button onClick={() => setIsEditingPlan({ id: `p-${Date.now()}`, name: '', price: 0, durationMonths: 1, features: [], isActive: true, isFeatured: false, displayOrder: 0, maxPhotos: 1, description: '', includesAnalytics: false, prioritySupport: false })} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Crear Nuevo</button>
            </div>
            <div className="space-y-4">
              {plans.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="font-extrabold text-black text-lg">{p.name}</h4>
                    <p className="text-slate-400 font-bold text-xs mt-1">
                      ₡{p.price.toLocaleString()} / {p.durationMonths} Meses
                    </p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => setIsEditingPlan(p)} className="w-12 h-12 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-black active:scale-90 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                     </button>
                     <button onClick={() => handleAction(() => DB.deletePlan(p.id), "Plan Eliminado")} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'categories' && (
          <div className="animate-spring-up space-y-8">
            <div className="flex justify-between items-center px-2">
               <div>
                 <h2 className="text-2xl font-black text-black tracking-tight">Categorías</h2>
               </div>
               <button onClick={() => setIsEditingCat({ id: `c-${Date.now()}`, name: '', slug: '', description: '', iconClass: '', colorHex: '#3B82F6', displayOrder: categories.length + 1, isActive: true, metaTitle: '', metaDescription: '' })} className="bg-black text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-xl">+ Nueva</button>
            </div>

            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col gap-4 shadow-sm group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {cat.iconClass || '⭐'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{cat.displayOrder}</span>
                           <h4 className="font-black text-black text-lg tracking-tight">{cat.name}</h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{cat.slug}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${cat.isActive ? 'bg-green-50 text-green-500' : 'bg-slate-50 text-slate-300'}`}>
                      {cat.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setIsEditingCat(cat)} className="flex-1 bg-slate-50 text-slate-400 hover:text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95">Editar</button>
                    <button onClick={() => handleAction(() => DB.deleteCategory(cat.id), "Categoría Eliminada")} className="w-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isManagingTrainer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[1100] flex items-end">
           <div className="w-full bg-white rounded-t-[48px] p-8 animate-spring-up max-w-lg mx-auto shadow-2xl border-t border-slate-100 flex flex-col max-h-[95vh]">
              <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-10 shrink-0" />
              
              <div className="flex items-center gap-6 mb-10 shrink-0">
                 <img src={isManagingTrainer.image} className="w-20 h-20 rounded-[32px] object-cover shadow-2xl border-4 border-slate-50" alt="" />
                 <div>
                    <h3 className="text-3xl font-black text-black tracking-tighter leading-none">{isManagingTrainer.name}</h3>
                    <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">{isManagingTrainer.email}</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-10 no-scrollbar pr-2 pb-10">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">Plan de Membresía</h4>
                    <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex justify-between items-center mb-6">
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Activo actualmente</p>
                          <p className="text-xl font-black text-black tracking-tight">{isManagingTrainer.planType || 'Sin Plan Asignado'}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">Expira: {isManagingTrainer.planExpiry ? new Date(isManagingTrainer.planExpiry).toLocaleDateString() : 'N/A'}</p>
                       </div>
                       <div className={`w-3 h-3 rounded-full shrink-0 ml-4 ${isManagingTrainer.planActive ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]' : 'bg-red-400 animate-pulse'}`}></div>
                    </div>
                    
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Asignar nuevo plan:</p>
                    <div className="grid grid-cols-2 gap-3">
                       {plans.map(p => (
                         <button 
                          key={p.id}
                          onClick={() => handleAction(() => DB.assignPlanToTrainer(isManagingTrainer.id, p.id), `Plan ${p.name} asignado`)}
                          className={`p-4 rounded-2xl border transition-all text-left active:scale-[0.97] ${isManagingTrainer.planType === p.name ? 'border-black bg-black text-white' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                         >
                            <p className="text-[9px] font-black uppercase tracking-tighter">{p.name}</p>
                            <p className="text-[10px] font-bold opacity-60">₡{p.price.toLocaleString()}</p>
                         </button>
                       ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                       <button 
                        onClick={() => handleAction(() => DB.updateTrainerPlan(isManagingTrainer.id, !isManagingTrainer.planActive), isManagingTrainer.planActive ? "Membresía Desactivada" : "Membresía Activada")}
                        className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isManagingTrainer.planActive ? 'bg-red-50 text-red-500' : 'bg-blue-600 text-white shadow-xl'}`}
                       >
                         {isManagingTrainer.planActive ? 'Suspender Plan' : 'Activar Cuenta'}
                       </button>
                       <button 
                        onClick={() => handleAction(() => DB.renewTrainerExpiry(isManagingTrainer.id), "+30 días de acceso")}
                        className="py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-xl"
                       >
                         Renovar Fecha
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">Visibilidad en Marketplace</h4>
                    <div className={`p-6 rounded-[32px] border transition-all flex justify-between items-center ${isManagingTrainer.status === 'active' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                       <div>
                          <p className={`text-lg font-black tracking-tight ${isManagingTrainer.status === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                            {isManagingTrainer.status === 'active' ? 'VISIBLE' : 'OCULTO'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {isManagingTrainer.status === 'active' ? 'Aparece en las búsquedas de clientes' : 'No es visible para el público'}
                          </p>
                       </div>
                       <button 
                        onClick={() => handleAction(() => DB.updateUserStatus(isManagingTrainer.id, UserRole.TEACHER, isManagingTrainer.status === 'active' ? 'deactivated' : 'active'), isManagingTrainer.status === 'active' ? "Ocultado del Marketplace" : "Visible en Marketplace")}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-sm ${isManagingTrainer.status === 'active' ? 'bg-white text-orange-500' : 'bg-black text-white'}`}
                       >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            {isManagingTrainer.status === 'active' ? (
                              <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            ) : (
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                       </button>
                    </div>
                 </div>

                 <div className="pt-6">
                    <button 
                      onClick={() => { if(confirm("¿Eliminar entrenador permanentemente?")) handleAction(() => { DB.deleteUser(isManagingTrainer.id, UserRole.TEACHER); setIsManagingTrainer(null); }, "Entrenador Eliminado"); }}
                      className="w-full py-6 bg-red-50 text-red-500 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                    >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                       Borrar Definitivamente
                    </button>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 shrink-0">
                 <button onClick={() => setIsManagingTrainer(null)} className="w-full py-6 bg-slate-50 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                    Cerrar Panel de Control
                 </button>
              </div>
           </div>
        </div>
      )}

      {isEditingCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[1000] flex items-end">
           <div className="w-full bg-white rounded-t-[40px] p-8 animate-spring-up max-w-lg mx-auto shadow-2xl h-[85vh] flex flex-col">
             <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8 shrink-0" />
             <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-10">
                <Input label="Nombre" value={isEditingCat.name} onChange={(e: any) => setIsEditingCat({...isEditingCat, name: e.target.value})} />
                <Input label="Slug" value={isEditingCat.slug} onChange={(e: any) => setIsEditingCat({...isEditingCat, slug: e.target.value})} />
                <textarea value={isEditingCat.description} onChange={e => setIsEditingCat({...isEditingCat, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-6 rounded-2xl font-bold h-32 resize-none" placeholder="Descripción..." />
                <CheckField label="Activa" checked={isEditingCat.isActive} onChange={v => setIsEditingCat({...isEditingCat, isActive: v})} />
             </div>
             <div className="flex gap-4 pt-6 shrink-0">
                <button onClick={() => setIsEditingCat(null)} className="flex-1 py-5 font-black text-slate-400 text-xs uppercase">Cancelar</button>
                <button onClick={() => handleAction(() => { DB.saveCategory(isEditingCat); setIsEditingCat(null); }, "Categoría Guardada")} className="flex-[2] py-5 bg-black text-white rounded-2xl font-black text-xs uppercase shadow-xl">Guardar</button>
             </div>
           </div>
        </div>
      )}

      {isEditingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[1000] flex items-end">
           <div className="w-full bg-white rounded-t-[40px] p-8 animate-spring-up max-w-lg mx-auto h-[85vh] flex flex-col">
             <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-8 shrink-0" />
             <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-10">
                <Input label="Nombre del plan" value={isEditingPlan.name} onChange={(e: any) => setIsEditingPlan({...isEditingPlan, name: e.target.value})} />
                <Input label="Precio (₡)" type="number" value={isEditingPlan.price} onChange={(e: any) => setIsEditingPlan({...isEditingPlan, price: Number(e.target.value)})} />
                <Input label="Duración (meses)" type="number" value={isEditingPlan.durationMonths} onChange={(e: any) => setIsEditingPlan({...isEditingPlan, durationMonths: Number(e.target.value)})} />
             </div>
             <div className="flex gap-4 pt-6 shrink-0">
                <button onClick={() => setIsEditingPlan(null)} className="flex-1 py-5 font-black text-slate-400 text-xs uppercase">Cancelar</button>
                <button onClick={() => handleAction(() => { DB.savePlan(isEditingPlan); setIsEditingPlan(null); }, "Plan Guardado")} className="flex-[2] py-5 bg-black text-white rounded-2xl font-black text-xs uppercase shadow-xl">Guardar</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ label, value, highlight }: { label: string, value: number, highlight?: boolean }) => (
  <div className={`p-6 rounded-[28px] border border-slate-100 flex flex-col gap-1 active:scale-95 transition-transform ${highlight ? 'bg-slate-50' : 'bg-white shadow-sm'}`}>
     <p className={`text-3xl font-black tracking-tighter ${highlight ? 'text-black' : 'text-slate-800'}`}>{value}</p>
     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
  </div>
);

const ActionRow = ({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) => (
  <button onClick={onClick} className="w-full bg-white p-6 rounded-[24px] border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
     <div className="flex items-center gap-5">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-black transition-colors">{icon}</div>
        <span className="font-extrabold text-black text-sm tracking-tight">{label}</span>
     </div>
     <svg className="w-4 h-4 text-slate-200 group-hover:text-black transition-all transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M9 5l7 7-7 7"/></svg>
  </button>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      {...props} 
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 px-6 font-bold text-black outline-none focus:ring-1 focus:ring-black transition-all shadow-inner" 
    />
  </div>
);

const CheckField = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
  <button 
    onClick={() => onChange(!checked)}
    className="flex items-center gap-4 py-2 group active:scale-[0.98] transition-all"
  >
    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-black border-black' : 'border-slate-200 bg-white'}`}>
      {checked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7"/></svg>}
    </div>
    <span className={`text-xs font-bold uppercase tracking-widest ${checked ? 'text-black' : 'text-slate-400 group-hover:text-slate-600'}`}>{label}</span>
  </button>
);

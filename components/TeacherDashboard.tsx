
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Booking, BookingStatus, Plan } from '../types';
import { DB } from '../services/databaseService';

interface TeacherProps {
  user: User;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherProps> = ({ user, onLogout }) => {
  const [hasPlan, setHasPlan] = useState(user.planActive);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'reservas' | 'perfil'>('reservas');

  const refreshData = useCallback(() => {
    setPlans(DB.getPlans().filter(p => p.isActive));
    setBookings(DB.getTeacherBookings(user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    // Re-check plan status
    const me = DB.getPros().find(p => p.id === user.id);
    if (me) setHasPlan(me.planActive);
  }, [user.id]);

  useEffect(() => {
    refreshData();
    const unsub = DB.subscribe(refreshData);
    return () => unsub();
  }, [refreshData]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === BookingStatus.CONFIRMADA);
    return {
      earned: confirmed.reduce((acc, curr) => acc + curr.price, 0),
      count: bookings.length
    };
  }, [bookings]);

  if (!hasPlan) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center p-10 animate-spring-up">
        <div className="mt-20 w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mb-8">
           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2z" strokeWidth="2.5"/></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900 text-center tracking-tighter">Tu Perfil está oculto</h2>
        <p className="text-slate-400 text-center mt-4 mb-12 font-medium">Elige un plan profesional para empezar a recibir clientes hoy.</p>
        
        <div className="w-full space-y-4">
           {plans.map(p => (
             <button key={p.id} onClick={() => { DB.updateTrainerPlan(user.id, true); refreshData(); }} className="w-full bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex justify-between items-center active:scale-95 transition-all">
                <div className="text-left">
                   <p className="font-black text-slate-900">{p.name}</p>
                   <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mt-1">₡{p.price.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                   <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                </div>
             </button>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F9F9F9] flex flex-col overflow-hidden">
      <header className="p-8 pt-16 bg-white rounded-b-[48px] shadow-sm shrink-0 border-b border-slate-100">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Pro Panel</h1>
            <p className="text-green-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Activo y Visible</p>
          </div>
          <button onClick={onLogout} className="w-12 h-12 bg-red-50 text-red-500 rounded-[18px] flex items-center justify-center active:scale-90 transition-all">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl shadow-blue-100">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Ingresos</p>
              <p className="text-2xl font-black mt-1">₡{stats.earned.toLocaleString()}</p>
           </div>
           <div className="bg-black p-6 rounded-[32px] text-white shadow-xl shadow-slate-200">
              <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Reservas</p>
              <p className="text-2xl font-black mt-1">{stats.count}</p>
           </div>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-[20px] gap-1">
           <button onClick={() => setActiveTab('reservas')} className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reservas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Agenda</button>
           <button onClick={() => setActiveTab('perfil')} className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'perfil' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Perfil</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
         {activeTab === 'reservas' ? (
           <div className="space-y-4">
              {bookings.map(b => (
                <div key={b.id} className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm animate-spring-up">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h4 className="font-black text-slate-900 text-lg leading-tight">{b.clientName}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(b.date).getHours()}:00h • {new Date(b.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${b.status === BookingStatus.CONFIRMADA ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'}`}>{b.status}</span>
                   </div>
                   {b.status === BookingStatus.PENDIENTE && (
                     <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={() => DB.updateBookingStatus(b.id, BookingStatus.RECHAZADA)} className="py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Ignorar</button>
                        <button onClick={() => DB.updateBookingStatus(b.id, BookingStatus.CONFIRMADA)} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-50">Confirmar</button>
                     </div>
                   )}
                </div>
              ))}
              {bookings.length === 0 && (
                <div className="py-20 text-center opacity-30">
                   <p className="font-black uppercase text-xs tracking-widest">No hay reservas</p>
                </div>
              )}
           </div>
         ) : (
           <div className="bg-white p-10 rounded-[40px] border border-slate-50 text-center space-y-4 shadow-sm animate-spring-up">
              <div className="w-24 h-24 bg-slate-50 rounded-[32px] mx-auto flex items-center justify-center text-3xl font-black text-slate-300">
                {user.name[0]}
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{user.name}</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{user.phone}</p>
              <button className="w-full py-5 bg-black text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">Editar Perfil Nativo</button>
           </div>
         )}
      </div>
    </div>
  );
};

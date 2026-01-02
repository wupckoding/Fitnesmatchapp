
import React, { useState, useEffect } from 'react';
import { User, Booking, BookingStatus } from '../types';
import { DB } from '../services/databaseService';

interface ClientPortalProps {
  user: User;
  onLogout: () => void;
  activeTab?: string;
  onNavigate?: (tab: 'inicio' | 'buscar' | 'reservas' | 'mensagens' | 'perfil') => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ user, onLogout, activeTab = 'perfil', onNavigate }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    setBookings(DB.getClientBookings(user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [user.id]);

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden animate-fade-in">
      <header className="p-8 pt-12 shrink-0">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          {activeTab === 'reservas' ? 'Mis Reservas' : 'Mi Perfil'}
        </h1>
        <p className="text-slate-400 font-medium mt-1">
          {activeTab === 'reservas' ? 'Seguimiento de tus entrenamientos' : 'Gestiona tu actividad fitness'}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 space-y-8 no-scrollbar pb-12">
        {activeTab === 'perfil' && (
          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center gap-4">
             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-100">
               {user.name[0]}
             </div>
             <div>
               <h3 className="font-black text-slate-900 text-lg leading-none">{user.name} {user.lastName}</h3>
               <p className="text-slate-400 text-xs font-bold mt-1.5 uppercase tracking-widest">{user.phone}</p>
               <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-green-600 font-black uppercase tracking-widest">Cuenta Verificada</span>
               </div>
             </div>
          </div>
        )}

        <div>
          {activeTab === 'perfil' && <h2 className="text-xl font-black text-slate-900 mb-6">Actividad Reciente</h2>}
          <div className="space-y-4">
            {bookings.length > 0 ? bookings.map(b => (
              <div key={b.id} className="bg-white border border-slate-100 p-5 rounded-[32px] shadow-sm animate-spring-up">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Profesor</p>
                    <h4 className="font-bold text-slate-900">{b.teacherName}</h4>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                    b.status === BookingStatus.CONFIRMADA ? 'bg-green-50 text-green-600' :
                    b.status === BookingStatus.RECHAZADA ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
                  {new Date(b.date).toLocaleDateString()} • {new Date(b.date).getHours()}:00h
                </div>
                <div className="mt-3 flex justify-between items-center">
                   <p className="text-slate-900 font-black text-sm">₡{b.price.toLocaleString()}</p>
                   {b.status === BookingStatus.CONFIRMADA && <button className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Ver ubicación</button>}
                </div>
              </div>
            )) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-100 p-10 rounded-[44px] text-center flex flex-col items-center">
                 <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest mb-6">Aún no has realizado reservas</p>
                 <button 
                  onClick={() => onNavigate && onNavigate('buscar')}
                  className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-5 rounded-[22px] shadow-xl shadow-blue-100 active:scale-95 transition-all"
                 >
                   Explorar Entrenadores
                 </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'perfil' && (
          <div className="pt-4 space-y-3 pb-20">
            <button className="w-full text-left py-6 px-8 rounded-[32px] bg-slate-50 border border-slate-100/50 flex items-center justify-between group active:scale-95 transition-all">
               <span className="font-black text-slate-700 text-[10px] uppercase tracking-widest">Ajustes de Cuenta</span>
               <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
            </button>
            <button onClick={onLogout} className="w-full text-left py-6 px-8 rounded-[32px] bg-red-50 flex items-center justify-between group active:scale-95 transition-all">
               <span className="font-black text-red-600 text-[10px] uppercase tracking-widest">Cerrar Sesión</span>
               <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="3"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

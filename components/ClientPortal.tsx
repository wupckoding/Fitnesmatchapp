
import React, { useState, useEffect, useRef } from 'react';
import { User, Booking, BookingStatus } from '../types';
import { DB } from '../services/databaseService';

interface ClientPortalProps {
  user: User;
  onLogout: () => void;
  activeTab?: string;
  onNavigate?: (tab: 'inicio' | 'buscar' | 'reservas' | 'mensagens' | 'perfil') => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ user: initialUser, onLogout, activeTab = 'perfil', onNavigate }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados de edição
  const [editName, setEditName] = useState(user.name);
  const [editLastName, setEditLastName] = useState(user.lastName);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editImage, setEditImage] = useState(user.image || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza se o prop mudar externamente
  useEffect(() => {
    setUser(initialUser);
    setEditName(initialUser.name);
    setEditLastName(initialUser.lastName);
    setEditEmail(initialUser.email);
    setEditPhone(initialUser.phone);
    setEditImage(initialUser.image || '');
  }, [initialUser]);

  useEffect(() => {
    setBookings(DB.getClientBookings(user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [user.id]);

  const handleSave = () => {
    const updatedUser: User = {
      ...user,
      name: editName,
      lastName: editLastName,
      email: editEmail,
      phone: editPhone,
      image: editImage
    };
    DB.saveUser(updatedUser);
    setUser(updatedUser);
    setIsEditing(false);
    // Removido reload para evitar o erro de arquivo não encontrado
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setEditImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isEditing) {
    return (
      <div className="flex-1 bg-white flex flex-col overflow-hidden animate-fade-in">
        <header className="px-8 pt-16 pb-6 flex items-center justify-between shrink-0 border-b border-slate-50">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Editar Perfil</h1>
           </div>
           <button onClick={handleSave} className="text-blue-600 font-black text-xs uppercase tracking-widest active:scale-95">Guardar</button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-10 no-scrollbar space-y-10">
           {/* Photo Section */}
           <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-[44px] bg-slate-100 overflow-hidden border-4 border-slate-50 shadow-xl">
                   {editImage ? (
                     <img src={editImage} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-300 bg-blue-50">
                        {editName[0]}
                     </div>
                   )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              {editImage && (
                <button onClick={removeImage} className="mt-4 text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">Eliminar Foto</button>
              )}
           </div>

           <div className="space-y-6">
              <InputEdit label="Nombre" value={editName} onChange={setEditName} />
              <InputEdit label="Apellidos" value={editLastName} onChange={setEditLastName} />
              <InputEdit label="Correo Electrónico" value={editEmail} onChange={setEditEmail} />
              <InputEdit label="Teléfono" value={editPhone} onChange={setEditPhone} />
           </div>

           <div className="pt-8">
              <button 
                onClick={handleSave}
                className="w-full py-6 bg-black text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all"
              >
                Actualizar Información
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden animate-fade-in">
      <header className="p-8 pt-16 shrink-0">
        <h1 className="text-[34px] font-black text-slate-900 tracking-tight leading-none">
          {activeTab === 'reservas' ? 'Mis Reservas' : 'Mi Perfil'}
        </h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 opacity-60">
          {activeTab === 'reservas' ? 'Seguimiento de tus entrenamientos' : 'Gestiona tu actividad fitness'}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 space-y-8 no-scrollbar pb-32">
        {activeTab === 'perfil' && (
          <div className="bg-white border border-slate-100 p-6 rounded-[36px] flex items-center gap-5 shadow-sm">
             <div className="w-16 h-16 rounded-[24px] overflow-hidden border border-slate-50">
               {user.image ? (
                 <img src={user.image} className="w-full h-full object-cover" alt="" />
               ) : (
                 <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-2xl font-black">
                   {user.name[0]}
                 </div>
               )}
             </div>
             <div>
               <h3 className="font-black text-slate-900 text-lg leading-tight tracking-tight">{user.name} {user.lastName}</h3>
               <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{user.phone}</p>
               <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                  <span className="text-[8px] text-green-600 font-black uppercase tracking-widest">Cuenta Verificada</span>
               </div>
             </div>
          </div>
        )}

        <div>
          {activeTab === 'perfil' && <h2 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6 px-2">Actividad Reciente</h2>}
          <div className="space-y-4">
            {bookings.length > 0 ? bookings.map(b => (
              <div key={b.id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm animate-spring-up">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 opacity-60">Profesor</p>
                    <h4 className="font-black text-slate-900 text-lg tracking-tight leading-none">{b.teacherName}</h4>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    b.status === BookingStatus.CONFIRMADA ? 'bg-green-50 text-green-600' :
                    b.status === BookingStatus.RECHAZADA ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="3"/></svg>
                  {new Date(b.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(b.date).getHours()}:00h
                </div>
                <div className="mt-5 flex justify-between items-center">
                   <p className="text-slate-900 font-black text-lg tracking-tighter leading-none">₡{b.price.toLocaleString()}</p>
                   {b.status === BookingStatus.CONFIRMADA && <button className="text-blue-600 text-[9px] font-black uppercase tracking-[0.2em] underline underline-offset-4 decoration-2">Ver ubicación</button>}
                </div>
              </div>
            )) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-100 p-12 rounded-[48px] text-center flex flex-col items-center">
                 <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.3em] mb-8">No tienes citas activas</p>
                 <button 
                  onClick={() => onNavigate && onNavigate('buscar')}
                  className="bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] px-10 py-5 rounded-[24px] shadow-2xl active:scale-95 transition-all"
                 >
                   Explorar Entrenadores
                 </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'perfil' && (
          <div className="pt-6 space-y-3 pb-32">
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full py-6 px-8 rounded-[32px] bg-slate-50 border border-slate-100/50 flex items-center justify-between group active:scale-[0.98] transition-all"
            >
               <span className="font-black text-slate-700 text-[11px] uppercase tracking-[0.2em]">Ajustes de Cuenta</span>
               <svg className="w-5 h-5 text-slate-300 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M9 5l7 7-7 7"/></svg>
            </button>
            <button onClick={onLogout} className="w-full py-6 px-8 rounded-[32px] bg-red-50 flex items-center justify-between group active:scale-[0.98] transition-all">
               <span className="font-black text-red-600 text-[11px] uppercase tracking-[0.2em]">Cerrar Sesión</span>
               <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M17 16l4-4m0 0l-4-4m4 4H7"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const InputEdit = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">{label}</label>
    <input 
      type="text" 
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-100 rounded-[24px] py-5 px-6 font-bold text-slate-900 outline-none focus:ring-1 focus:ring-black/5 transition-all shadow-inner"
    />
  </div>
);

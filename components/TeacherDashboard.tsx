
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Booking, BookingStatus, Plan, ProfessionalProfile, TimeSlot, Category } from '../types';
import { DB } from '../services/databaseService';

interface TeacherProps {
  user: User;
  onLogout: () => void;
  initialTab?: 'agenda' | 'reservas' | 'perfil' | 'gestor';
  onTabChange?: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherProps> = ({ user: initialUser, onLogout, initialTab = 'agenda', onTabChange }) => {
  const [pro, setPro] = useState<ProfessionalProfile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [activeTab, setActiveTab] = useState<'agenda' | 'reservas' | 'perfil' | 'gestor'>(initialTab);
  
  // States para edição rápida de slot no Gestor
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editSlotCapacity, setEditSlotCapacity] = useState('');
  const [editSlotPrice, setEditSlotPrice] = useState('');

  // Atualizar aba quando prop mudar
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabClick = (tab: 'agenda' | 'reservas' | 'perfil' | 'gestor') => {
    setActiveTab(tab);
    if (onTabChange) {
        const navMap = { agenda: 'inicio', gestor: 'buscar', reservas: 'reservas', perfil: 'perfil' };
        onTabChange(navMap[tab]);
    }
  };

  // States para criação de slot
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotTimeStart, setSlotTimeStart] = useState('');
  const [slotTimeEnd, setSlotTimeEnd] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('1');
  const [slotType, setSlotType] = useState<'grupo' | 'individual'>('individual');
  const [slotPrice, setSlotPrice] = useState('10000');
  const [slotLocation, setSlotLocation] = useState('');

  // States para edição de perfil
  const [editName, setEditName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPrice, setEditPrice] = useState('0');
  const [editLocation, setEditLocation] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editAreas, setEditAreas] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const refreshData = useCallback(() => {
    const currentPro = DB.getPros().find(p => p.id === initialUser.id);
    if (currentPro) {
      setPro(currentPro);
      setEditName(currentPro.name);
      setEditLastName(currentPro.lastName);
      setEditBio(currentPro.bio);
      setEditPrice(currentPro.price.toString());
      setEditLocation(currentPro.location);
      if (!slotLocation) setSlotLocation(currentPro.location);
      setEditImage(currentPro.image || '');
      setEditAreas(currentPro.areas);
    }
    setPlans(DB.getPlans().filter(p => p.isActive));
    setBookings(DB.getTeacherBookings(initialUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    
    // Slots com contagem de cupos real
    const allBookings = DB.getBookings();
    const rawSlots = DB.getSlotsByTeacher(initialUser.id);
    const enrichedSlots = rawSlots.map(s => {
        const booked = allBookings.filter(b => b.slotId === s.id && (b.status === BookingStatus.PENDIENTE || b.status === BookingStatus.CONFIRMADA)).length;
        return { ...s, capacityBooked: booked };
    });
    setSlots(enrichedSlots.sort((a,b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    
    setCategories(DB.getCategories().filter(c => c.isActive));
  }, [initialUser.id]);

  useEffect(() => {
    refreshData();
    const unsub = DB.subscribe(refreshData);
    return () => unsub();
  }, [refreshData]);

  const handleUpdateSlotQuick = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    const updatedSlot: TimeSlot = {
      ...slot,
      capacityTotal: parseInt(editSlotCapacity) || slot.capacityTotal,
      price: parseInt(editSlotPrice) || slot.price
    };

    // No databaseService, o saveSlot já lida com update se existir id (assumindo lógica padrão de DB)
    // Mas para garantir no nosso mock, deletamos e salvamos ou atualizamos
    const currentSlots = DB.getSlots();
    const idx = currentSlots.findIndex(s => s.id === slotId);
    if (idx > -1) {
        currentSlots[idx] = updatedSlot;
        localStorage.setItem('fm_slots_v3', JSON.stringify(currentSlots));
        window.dispatchEvent(new CustomEvent('fm-db-update'));
    }
    setEditingSlotId(null);
  };

  const handleToggleSlotStatus = (slotId: string) => {
    const currentSlots = DB.getSlots();
    const idx = currentSlots.findIndex(s => s.id === slotId);
    if (idx > -1) {
        currentSlots[idx].status = currentSlots[idx].status === 'active' ? 'cancelled' : 'active';
        localStorage.setItem('fm_slots_v3', JSON.stringify(currentSlots));
        window.dispatchEvent(new CustomEvent('fm-db-update'));
    }
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotTimeStart || !slotTimeEnd) return;
    
    const start = new Date(`${slotDate}T${slotTimeStart}`);
    const end = new Date(`${slotDate}T${slotTimeEnd}`);

    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      proUserId: initialUser.id,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      capacityTotal: parseInt(slotCapacity),
      capacityBooked: 0,
      type: slotType,
      location: slotLocation || pro?.location || 'Costa Rica',
      price: parseInt(slotPrice),
      status: 'active'
    };

    DB.saveSlot(newSlot);
    setShowAddSlot(false);
    setSlotTimeStart('');
    setSlotTimeEnd('');
  };

  const daysLeft = useMemo(() => {
    if (!pro?.planExpiry) return 0;
    const diff = new Date(pro.planExpiry).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [pro]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === BookingStatus.CONFIRMADA);
    return {
      earned: confirmed.reduce((acc, curr) => acc + curr.price, 0),
      count: bookings.length,
      pending: bookings.filter(b => b.status === BookingStatus.PENDIENTE).length
    };
  }, [bookings]);

  const handleSaveProfile = () => {
    if (!pro) return;
    const updated: ProfessionalProfile = {
      ...pro,
      name: editName,
      lastName: editLastName,
      bio: editBio,
      price: parseInt(editPrice),
      location: editLocation,
      image: editImage,
      areas: editAreas
    };
    DB.saveUser(updated);
    alert('Perfil actualizado con éxito');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleArea = (areaName: string) => {
    setEditAreas(prev => prev.includes(areaName) ? prev.filter(a => a !== areaName) : [...prev, areaName]);
  };

  if (!pro?.planActive) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center p-8 animate-spring-up overflow-y-auto no-scrollbar">
        <div className="mt-16 w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2z" strokeWidth="2.5"/></svg>
        </div>
        <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                {pro?.bio === 'Pendiente de activación por Admin' ? 'Esperando Aprobación' : 'Activa tu Perfil'}
            </h2>
            <p className="text-slate-400 font-medium px-4">
                {pro?.bio === 'Pendiente de activación por Admin' 
                  ? 'Ya seleccionaste tu plan. El administrador revisará tu conta y la activará em breve.' 
                  : 'Para aparecer em las búsquedas y gestionar clientes, necesitas una membresía activa.'}
            </p>
        </div>
        {pro?.bio !== 'Pendiente de activación por Admin' && (
            <div className="w-full space-y-4 pb-20">
               {plans.map(p => (
                 <button 
                    key={p.id} 
                    onClick={() => DB.assignPlanToTrainer(initialUser.id, p.id)} 
                    className="w-full bg-slate-50 p-6 rounded-[36px] border border-slate-100 flex justify-between items-center active:scale-95 transition-all group"
                 >
                    <div className="text-left">
                       <p className="font-black text-slate-900 text-lg tracking-tight">{p.name}</p>
                       <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mt-1">₡{p.price.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                       <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M9 5l7 7-7 7"/></svg>
                    </div>
                 </button>
               ))}
            </div>
        )}
        <button onClick={onLogout} className="mt-auto text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] pb-10">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden animate-fade-in relative">
      <header className="p-8 pt-16 bg-white rounded-b-[48px] shadow-sm shrink-0 border-b border-slate-100 z-20">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-[34px] font-black text-slate-900 tracking-tighter leading-none">Pro Panel</h1>
            <div className="flex items-center gap-2 mt-2">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               <p className="text-green-600 text-[9px] font-black uppercase tracking-[0.2em]">Online • {daysLeft} días restantes</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M17 16l4-4m0 0l-4-4m4 4H7"/></svg>
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Ingresos</p>
              <p className="text-2xl font-black mt-1 tracking-tighter">₡{stats.earned.toLocaleString()}</p>
           </div>
           <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl shadow-slate-200">
              <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Reservas</p>
                    <p className="text-2xl font-black mt-1 tracking-tighter">{stats.count}</p>
                  </div>
                  {stats.pending > 0 && <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>}
              </div>
           </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-[24px] gap-1 shadow-inner">
           <TabBtn active={activeTab === 'agenda'} onClick={() => handleTabClick('agenda')} label="Agenda" />
           <TabBtn active={activeTab === 'gestor'} onClick={() => handleTabClick('gestor')} label="Gestión" />
           <TabBtn active={activeTab === 'reservas'} onClick={() => handleTabClick('reservas')} label="Reservas" />
           <TabBtn active={activeTab === 'perfil'} onClick={() => handleTabClick('perfil')} label="Perfil" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
         {/* ABA GESTOR AVANÇADO - NOVA ABA SOLICITADA */}
         {activeTab === 'gestor' && (
           <div className="animate-spring-up space-y-8">
              <div className="px-2">
                 <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Gestión de Horarios Activos</h3>
                 <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Edita capacidad, precios y disponibilidad de tus clases publicadas.</p>
              </div>

              <div className="space-y-6">
                 {slots.map(s => {
                   const isEditing = editingSlotId === s.id;
                   const progress = (s.capacityBooked / s.capacityTotal) * 100;

                   return (
                    <div key={s.id} className={`bg-white rounded-[40px] border transition-all duration-300 overflow-hidden shadow-sm ${s.status === 'cancelled' ? 'opacity-50 grayscale' : 'border-slate-100 hover:border-blue-200'}`}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 leading-none">
                                            {new Date(s.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            {new Date(s.startAt).toLocaleDateString()} • {s.type}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => handleToggleSlotStatus(s.id)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${s.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'}`}>
                                    {s.status === 'active' ? 'Publicado' : 'Pausado'}
                                </button>
                            </div>

                            <div className="space-y-5">
                                <div className="flex flex-wrap gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>
                                    <span className="truncate">{s.location}</span>
                                </div>

                                <div className="space-y-2 px-2">
                                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Cupos ({s.capacityBooked}/{s.capacityTotal})</span>
                                        <span className={`${progress >= 90 ? 'text-red-500' : 'text-blue-600'} font-black`}>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-700 ease-out ${progress >= 90 ? 'bg-red-400' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]'}`} style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex gap-2">
                            {isEditing ? (
                                <div className="flex-1 flex gap-2 animate-fade-in">
                                    <input type="number" placeholder="Cap." value={editSlotCapacity} onChange={e => setEditSlotCapacity(e.target.value)} className="w-20 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" />
                                    <input type="number" placeholder="Precio" value={editSlotPrice} onChange={e => setEditSlotPrice(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" />
                                    <button onClick={() => handleUpdateSlotQuick(s.id)} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></button>
                                    <button onClick={() => setEditingSlotId(null)} className="w-10 h-10 bg-white text-slate-400 rounded-xl flex items-center justify-center border border-slate-200 active:scale-90">✕</button>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => { setEditingSlotId(s.id); setEditSlotCapacity(s.capacityTotal.toString()); setEditSlotPrice(s.price.toString()); }} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 active:scale-95 transition-all hover:bg-slate-100">Editar Detalle</button>
                                    <button onClick={() => DB.deleteSlot(s.id)} className="w-14 py-4 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-95 border border-red-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/></svg></button>
                                </>
                            )}
                        </div>
                    </div>
                   );
                 })}
                 {slots.length === 0 && <EmptyState msg="No has creado horarios todavía" />}
              </div>
           </div>
         )}

         {/* ABA AGENDA - LISTAGEM SIMPLES */}
         {activeTab === 'agenda' && (
           <div className="animate-spring-up space-y-6">
              <div className="flex justify-between items-center px-2">
                 <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Mis Horarios Próximos</h3>
                 <button onClick={() => setShowAddSlot(true)} className="bg-black text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">+ Nuevo</button>
              </div>

              <div className="space-y-4">
                 {slots.map(s => (
                   <div key={s.id} className="bg-white p-6 rounded-[36px] border border-slate-100 flex items-center justify-between group shadow-sm overflow-hidden">
                      <div className="flex-1 flex items-center gap-5 min-w-0 pr-4">
                         <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                         </div>
                         <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <p className="text-lg font-black text-slate-900 leading-none whitespace-nowrap">
                              {new Date(s.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(s.endAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">{new Date(s.startAt).toLocaleDateString()}</span>
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest whitespace-nowrap">• {s.type}</span>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[120px]">• {s.location}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                         <div className="text-right">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.capacityBooked}/{s.capacityTotal} Cupos</p>
                            <p className="text-xs font-black text-slate-900 mt-0.5">₡{s.price.toLocaleString()}</p>
                         </div>
                         <button onClick={() => DB.deleteSlot(s.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center active:scale-90 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/></svg></button>
                      </div>
                   </div>
                 ))}
                 {slots.length === 0 && <EmptyState msg="No has creado horarios todavía" />}
              </div>
           </div>
         )}

         {activeTab === 'reservas' && (
           <div className="animate-spring-up space-y-4">
              <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] ml-2 mb-2">Gestión de Citas</h3>
              {bookings.map(b => (
                <div key={b.id} className="bg-white p-6 rounded-[36px] border border-slate-100 flex flex-col gap-5 shadow-sm">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-lg font-black">{b.clientName[0]}</div>
                         <div>
                            <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight">{b.clientName}</h4>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{new Date(b.date).toLocaleDateString()} • {new Date(b.date).getHours()}:00h</p>
                         </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${
                        b.status === BookingStatus.CONFIRMADA ? 'bg-green-50 text-green-600' :
                        b.status === BookingStatus.PENDIENTE ? 'bg-orange-50 text-orange-600 animate-pulse' : 'bg-red-50 text-red-400'
                      }`}>
                        {b.status}
                      </span>
                   </div>
                   {b.message && (
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-xs font-medium text-slate-400 leading-relaxed italic">"{b.message}"</p>
                     </div>
                   )}
                   {b.status === BookingStatus.PENDIENTE && (
                     <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => DB.updateBookingStatus(b.id, BookingStatus.RECHAZADA)} className="py-5 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Rechazar</button>
                        <button onClick={() => DB.updateBookingStatus(b.id, BookingStatus.CONFIRMADA)} className="py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-50 active:scale-95 transition-all">Confirmar</button>
                     </div>
                   )}
                </div>
              ))}
              {bookings.length === 0 && <EmptyState msg="Aún no tienes solicitudes" />}
           </div>
         )}

         {activeTab === 'perfil' && (
           <div className="animate-spring-up space-y-8 pb-20">
              <div className="flex flex-col items-center">
                 <div className="relative group mb-4">
                    <div className="w-32 h-32 rounded-[44px] bg-slate-100 overflow-hidden border-4 border-white shadow-2xl">
                       {editImage ? <img src={editImage} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl text-slate-300">📸</div>}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-11 h-11 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg></button>
                 </div>
                 <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Foto de Perfil Profesional</p>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <EditField label="Nombre" value={editName} onChange={setEditName} />
                    <EditField label="Apellidos" value={editLastName} onChange={setEditLastName} />
                 </div>
                 <EditField label="Ubicación (Ej: Escazú Centro)" value={editLocation} onChange={setEditLocation} />
                 <EditField label="Precio base por sesión (₡)" type="number" value={editPrice} onChange={setEditPrice} />
                 
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Disciplinas</label>
                    <div className="flex flex-wrap gap-2">
                       {categories.map(cat => (
                         <button 
                            key={cat.id} 
                            onClick={() => toggleArea(cat.name)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${editAreas.includes(cat.name) ? 'bg-black border-black text-white shadow-lg shadow-slate-200' : 'bg-white border-slate-100 text-slate-400'}`}
                         >
                            {cat.name}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Tu Bio Profissional</label>
                    <textarea 
                       value={editBio}
                       onChange={e => setEditBio(e.target.value)}
                       className="w-full h-32 bg-white border border-slate-100 p-6 rounded-[32px] font-medium text-sm text-slate-900 outline-none focus:ring-1 focus:ring-black transition-all shadow-inner resize-none"
                    />
                 </div>
              </div>

              <button onClick={handleSaveProfile} className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-100 active:scale-95 transition-all">Guardar Perfil Público</button>
           </div>
         )}
      </div>

      {/* Modal de Adicionar Slot */}
      {showAddSlot && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end">
           <form onSubmit={handleAddSlot} className="w-full bg-white rounded-t-[54px] p-8 animate-spring-up max-w-lg mx-auto shadow-2xl flex flex-col h-[90vh]">
              <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-10 shrink-0" />
              <div className="flex justify-between items-center mb-10 px-2 shrink-0">
                 <h2 className="text-3xl font-black text-black tracking-tighter">Nuevo Horário</h2>
                 <button type="button" onClick={() => setShowAddSlot(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pb-10 px-2">
                 <div className="grid grid-cols-2 gap-4">
                    <EditField label="Fecha" type="date" value={slotDate} onChange={setSlotDate} />
                    <div className="space-y-4">
                        <EditField label="Hora Inicio" type="time" value={slotTimeStart} onChange={setSlotTimeStart} />
                        <EditField label="Hora Fin" type="time" value={slotTimeEnd} onChange={setSlotTimeEnd} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <EditField label="Capacidad (Pax)" type="number" value={slotCapacity} onChange={setSlotCapacity} />
                    <EditField label="Precio Sesión (₡)" type="number" value={slotPrice} onChange={setSlotPrice} />
                 </div>
                 
                 <EditField label="Ubicación Específica" placeholder="Gimnasio o Dirección" value={slotLocation} onChange={setSlotLocation} />

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Tipo de Aula</label>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => setSlotType('individual')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${slotType === 'individual' ? 'bg-black border-black text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>1:1 Individual</button>
                       <button type="button" onClick={() => setSlotType('grupo')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${slotType === 'grupo' ? 'bg-black border-black text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Grupal</button>
                    </div>
                 </div>

                 <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100">
                    <p className="text-[11px] font-medium text-blue-600 leading-relaxed">
                       Este horario será visible instantáneamente para todos tus clientes potenciales en el catálogo.
                    </p>
                 </div>
              </div>

              <div className="pt-6 shrink-0">
                 <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 active:scale-95 transition-all">Publicar Horario</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button onClick={onClick} className={`flex-1 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{label}</button>
);

const EditField = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white border border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:ring-1 focus:ring-black transition-all shadow-inner text-sm"
    />
  </div>
);

const EmptyState = ({ msg }: { msg: string }) => (
  <div className="py-20 text-center opacity-30 flex flex-col items-center">
     <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-6 text-2xl">☕</div>
     <p className="font-black uppercase text-[10px] tracking-[0.3em]">{msg}</p>
  </div>
);


import React, { useState, useEffect, useMemo } from 'react';
import { ProfessionalProfile, TimeSlot, Booking, BookingStatus, User } from '../types';
import { DB } from '../services/databaseService';

interface DetailProps {
  professional: ProfessionalProfile;
  currentUser: User;
  onBack: () => void;
  onBook: (booking: Booking) => void;
}

export const ProfessionalDetail: React.FC<DetailProps> = ({ professional, currentUser, onBack, onBook }) => {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [finalBooking, setFinalBooking] = useState<Booking | null>(null);
  const [, setTick] = useState(0);

  // Sincronização em tempo real: Escuta mudanças no DB para atualizar "Cupos" e Slots
  useEffect(() => {
    const unsub = DB.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsub;
  }, []);

  const userBookings = useMemo(() => DB.getClientBookings(currentUser.id), [currentUser.id, DB.getBookings()]);

  // Gerador de dias do mês selecionado - Premium e completo
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    const locale = 'es-ES';
    const today = new Date();
    today.setHours(0,0,0,0);

    while (date.getMonth() === month) {
      // Permite ver todos os dias do mês selecionado, mas só interagir com futuros
      const isPast = date < today;
      days.push({
        fullDate: new Date(date),
        dayName: date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
        dayNum: date.getDate(),
        monthName: date.toLocaleDateString(locale, { month: 'short' }).replace('.', ''),
        disabled: isPast
      });
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  // Filtra slots considerando as reservas reais do DB para calcular vagas (cupos)
  const filteredSlots = useMemo(() => {
    const allSlots = DB.getSlotsByTeacher(professional.id);
    const allBookings = DB.getBookings();

    return allSlots.filter(s => {
      const slotDate = new Date(s.startAt);
      return slotDate.toDateString() === selectedDate.toDateString();
    }).map(slot => {
      // Calcula cupos ocupados baseados em reservas reais no DB para este slot
      const bookedCount = allBookings.filter(b => 
        b.slotId === slot.id && 
        (b.status === BookingStatus.PENDIENTE || b.status === BookingStatus.CONFIRMADA)
      ).length;
      
      return { ...slot, capacityBooked: bookedCount };
    }).sort((a,b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [professional.id, selectedDate, DB.getBookings(), DB.getSlots()]);

  const checkIsAlreadyBooked = (slotId: string) => {
    return userBookings.some(b => b.slotId === slotId && (b.status === BookingStatus.PENDIENTE || b.status === BookingStatus.CONFIRMADA));
  };

  const confirmFinalBooking = () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    
    setTimeout(() => {
      const newBooking: Booking = {
        id: `book-${Date.now()}`,
        clientId: currentUser.id,
        clientName: `${currentUser.name} ${currentUser.lastName}`,
        teacherId: professional.id,
        teacherName: `${professional.name} ${professional.lastName}`,
        slotId: selectedSlot.id,
        date: selectedSlot.startAt,
        price: selectedSlot.price,
        status: BookingStatus.PENDIENTE,
        createdAt: new Date().toISOString(),
        message: userMessage
      };

      DB.createBooking(newBooking);
      setFinalBooking(newBooking);
      setIsBooking(false);
      setShowConfirmModal(false);
      setShowSuccessScreen(true);
    }, 1200);
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    // Impede voltar antes do mês atual
    const now = new Date();
    if (next.getFullYear() < now.getFullYear() || (next.getFullYear() === now.getFullYear() && next.getMonth() < now.getMonth())) {
      return;
    }
    setCurrentMonth(next);
  };

  if (showSuccessScreen) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 animate-fade-in text-center h-full">
         <div className="relative mb-10">
            <div className="w-40 h-40 bg-emerald-50 rounded-full flex items-center justify-center animate-spring-up">
               <div className="w-24 h-24 bg-white border-[6px] border-emerald-500 rounded-full flex items-center justify-center shadow-2xl relative">
                  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-2xl animate-bounce">🎉</div>
               </div>
            </div>
         </div>
         <h2 className="text-[32px] font-black text-slate-900 tracking-tighter mb-4">¡Reserva creada!</h2>
         <p className="text-slate-400 font-bold text-sm mb-10 px-4 leading-relaxed">
            Tu reserva ha sido enviada al profesional y está <span className="text-orange-500">pendiente de confirmación</span>.
         </p>
         <div className="w-full bg-slate-50 border border-slate-100 rounded-[32px] p-6 mb-12 flex items-start gap-4 text-left">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2"/></svg>
            </div>
            <div>
               <h4 className="font-black text-slate-900 text-sm tracking-tight">Te notificaremos</h4>
               <p className="text-[11px] font-medium text-slate-400 mt-1 leading-tight">Recibirás un email y notificación cuando el profesional confirme o rechace tu reserva.</p>
            </div>
         </div>
         <div className="w-full space-y-4">
            <button onClick={() => finalBooking && onBook(finalBooking)} className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Ver mis reservas</button>
            <button onClick={onBack} className="w-full py-6 bg-white text-slate-900 border border-slate-100 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">Volver al inicio</button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto no-scrollbar h-full animate-fade-in relative">
      <div className="relative h-72 shrink-0 overflow-hidden">
        <img src={professional.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/10"></div>
        <button onClick={onBack} className="absolute top-14 left-6 w-11 h-11 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-black shadow-xl active:scale-90 transition-all border border-white/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      </div>

      <div className="px-6 -mt-12 relative z-10 pb-40">
        <div className="bg-white rounded-t-[44px] pt-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter px-4">
              {professional.name} {professional.lastName}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100/50">
                {professional.areas[0] || 'Personal Trainer'}
              </span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{professional.reviews} reseñas</span>
            </div>
            <p className="text-slate-500 text-[13px] leading-relaxed mt-5 font-medium px-4">{professional.bio}</p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-10 py-4 px-6 bg-slate-50/50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-2 text-slate-600">
               <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
               </svg>
               <span className="text-xs font-bold">{professional.location}</span>
             </div>
             <div className="w-px h-4 bg-slate-200"></div>
             <div className="flex items-center gap-2 text-slate-600">
               <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
               </svg>
               <span className="text-xs font-bold">Presencial</span>
             </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-black text-slate-900 text-lg tracking-tight">Disponibilidad</h3>
              {/* CORRIGIDO: Texto visível e botões funcionais */}
              <div className="flex items-center gap-3 bg-slate-100/50 px-4 py-2.5 rounded-2xl border border-slate-200/50 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="text-slate-400 hover:text-blue-600 transition-colors active:scale-75">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path d="M15 19l-7-7 7-7"/></svg>
                </button>
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 min-w-[100px] text-center">
                  {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="text-slate-400 hover:text-blue-600 transition-colors active:scale-75">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>

            {/* CORRIGIDO: Container com scroll lateral pleno para chegar até o dia 31 se necessário */}
            <div className="flex flex-row flex-nowrap gap-3 overflow-x-auto no-scrollbar pb-4 px-1 scroll-smooth">
               {monthDays.map((day, idx) => {
                 const isSelected = selectedDate.toDateString() === day.fullDate.toDateString();
                 return (
                  <button 
                    key={idx}
                    disabled={day.disabled}
                    onClick={() => { setSelectedDate(day.fullDate); setSelectedSlot(null); }}
                    className={`min-w-[72px] h-[100px] rounded-[28px] flex flex-col items-center justify-center transition-all duration-300 border shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-105 z-10' : 
                      day.disabled ? 'bg-slate-50 border-slate-50 opacity-20' : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{day.dayName}</p>
                    <p className="text-2xl font-black tracking-tighter leading-none">{day.dayNum}</p>
                    <p className="text-[9px] font-black uppercase tracking-tighter mt-1.5 opacity-60">{day.monthName}</p>
                  </button>
                 );
               })}
            </div>

            <div className="space-y-3 pt-4">
              {filteredSlots.length > 0 ? filteredSlots.map((slot) => {
                const available = slot.capacityTotal - slot.capacityBooked;
                const isFull = available <= 0;
                const isAlreadyBooked = checkIsAlreadyBooked(slot.id);
                const isSelected = selectedSlot?.id === slot.id;
                
                return (
                  <button 
                    key={slot.id}
                    disabled={isFull || isAlreadyBooked}
                    onClick={() => !isFull && !isAlreadyBooked && setSelectedSlot(slot)}
                    className={`w-full p-5 rounded-3xl border-2 transition-all duration-300 text-left ${
                      isFull || isAlreadyBooked 
                        ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-blue-50 border-blue-500 shadow-lg shadow-blue-100/50 scale-[1.02]' 
                          : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Horário e Tipo */}
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                          isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <div>
                          <p className={`text-2xl font-black tracking-tighter leading-none ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                            {new Date(slot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                              isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {slot.type}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              ₡{slot.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status e Vagas */}
                      <div className="text-right">
                        {isFull ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                            Lleno
                          </span>
                        ) : isAlreadyBooked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                            Reservado
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                              Cupos
                            </p>
                            <p className={`text-xl font-black tracking-tight ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                              {available}<span className="text-sm text-slate-300">/{slot.capacityTotal}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="py-16 text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                   </div>
                   <p className="text-slate-400 font-bold text-sm">Sin horarios para este día</p>
                   <p className="text-slate-300 text-xs mt-1">Selecciona otra fecha</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-spring-up max-w-lg mx-auto">
          <div className="mx-4 mb-6 bg-white rounded-[28px] shadow-2xl shadow-black/10 border border-slate-100 overflow-hidden">
            {/* Info compacta */}
            <div className="p-5 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900 tracking-tight">
                    {new Date(selectedSlot.startAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedSlot.type} • {new Date(selectedSlot.startAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-600 tracking-tight">
                  ₡{selectedSlot.price.toLocaleString()}
                </p>
              </div>
            </div>
            {/* Botón */}
            <button 
              onClick={() => setShowConfirmModal(true)} 
              className="w-full py-5 bg-blue-600 text-white font-black text-sm uppercase tracking-[0.15em] active:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7"/>
              </svg>
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && selectedSlot && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-lg flex items-end">
           <div className="w-full bg-white rounded-t-[54px] animate-spring-up max-w-lg mx-auto h-[92vh] flex flex-col shadow-2xl border-t border-slate-100 relative">
              <header className="px-10 pt-12 pb-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Confirmar reserva</h2>
                 <button onClick={() => setShowConfirmModal(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center active:scale-90 transition-all border border-slate-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
              </header>

              <div className="flex-1 overflow-y-auto p-10 no-scrollbar space-y-10">
                 <div className="bg-slate-50/80 p-6 rounded-[36px] border border-slate-100 flex items-center gap-6">
                    <img src={professional.image} className="w-20 h-20 rounded-[28px] object-cover shadow-sm border-2 border-white" alt="" />
                    <div>
                       <h4 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{professional.name} {professional.lastName}</h4>
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1.5 bg-blue-50 px-2 py-0.5 rounded-md inline-block">{professional.areas[0]}</p>
                    </div>
                 </div>

                 <div className="space-y-8 px-2">
                    <DetailRow icon="📅" label="Fecha" value={new Date(selectedSlot.startAt).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                    <DetailRow icon="⏰" label="Hora" value={new Date(selectedSlot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} />
                    <DetailRow icon="👤" label="Tipo de sesión" value={selectedSlot.type} />
                    <DetailRow icon="📍" label="Ubicación" value={professional.location} />
                 </div>

                 <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeWidth="2"/></svg>
                       Mensaje al profesional (opcional)
                    </label>
                    <textarea value={userMessage} onChange={e => setUserMessage(e.target.value)} placeholder="Ej: Es mi primera sesión, tengo una lesión en la rodilla..." className="w-full h-36 bg-slate-50/50 border border-slate-100 p-6 rounded-[36px] font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner resize-none placeholder:text-slate-300" />
                 </div>

                 <div className="bg-blue-50/80 border border-blue-100 p-6 rounded-[32px] flex items-center gap-5">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm">💡</div>
                    <p className="text-[11px] font-bold text-blue-700 leading-tight">
                      Tu reserva quedará <span className="font-black">pendiente</span> hasta que o profesional la confirme
                    </p>
                 </div>
              </div>

              <div className="p-10 border-t border-slate-50 shrink-0">
                 <button onClick={confirmFinalBooking} disabled={isBooking} className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 active:scale-95 transition-all">
                    {isBooking ? 'Procesando...' : 'Confirmar reserva'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const InfoBox = ({ icon, label, value, color }: { icon: string, label: string, value: string, color: string }) => (
  <div className="p-5 bg-slate-50/50 rounded-[32px] border border-slate-100 flex items-center gap-4 group hover:bg-white transition-all">
    <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-50 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">{label}</p>
      <p className="text-slate-900 font-extrabold text-[12px] truncate mt-1.5 capitalize">{value}</p>
    </div>
  </div>
);

const DetailRow = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
  <div className="flex items-center gap-6 group">
     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-50 group-hover:bg-blue-50 transition-colors">{icon}</div>
     <div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</p>
        <p className="text-[15px] font-black text-slate-900 mt-1 capitalize leading-none tracking-tight">{value}</p>
     </div>
  </div>
);

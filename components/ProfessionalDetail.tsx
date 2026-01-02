
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
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  
  // Estados para o novo fluxo
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [finalBooking, setFinalBooking] = useState<Booking | null>(null);

  const days = useMemo(() => {
    const arr = [];
    const locale = 'es-ES';
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      arr.push({
        fullDate: d,
        dayName: d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')
      });
    }
    return arr;
  }, []);

  const selectedDayInfo = days[selectedDayIdx];

  useEffect(() => {
    const allSlots = DB.getSlotsByTeacher(professional.id);
    setSlots(allSlots);
  }, [professional.id, selectedDayIdx]);

  const initiateBookingFlow = () => {
    if (!selectedSlot) return;
    setShowConfirmModal(true);
  };

  const confirmFinalBooking = () => {
    if (!selectedSlot) return;
    setIsBooking(true);
    
    // Simulação de processamento smooth
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
    }, 1500);
  };

  if (showSuccessScreen) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-10 animate-fade-in text-center h-full">
         <div className="relative mb-8">
            <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center animate-spring-up">
               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </div>
            </div>
            <div className="absolute -top-2 -right-2 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-xl animate-bounce">
              🎉
            </div>
         </div>

         <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter mb-4">¡Reserva creada!</h2>
         <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">
            Tu reserva ha sido enviada al profesional y está <span className="text-orange-500 font-bold">pendiente de confirmación</span>.
         </p>

         <div className="w-full bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center gap-5 mb-10 text-left">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2.5"/></svg>
            </div>
            <div>
               <p className="text-sm font-black text-slate-900 leading-tight">Te notificaremos</p>
               <p className="text-[11px] font-medium text-slate-400 mt-1 leading-snug">Recibirás un email y notificación cuando el profesional confirme o rechace tu reserva.</p>
            </div>
         </div>

         <div className="w-full space-y-3">
            <button 
              onClick={() => finalBooking && onBook(finalBooking)}
              className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 active:scale-95 transition-all"
            >
               Ver mis reservas
            </button>
            <button 
              onClick={onBack}
              className="w-full py-6 bg-white text-slate-900 border border-slate-100 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
            >
               Volver al inicio
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto no-scrollbar h-full animate-fade-in relative">
      {/* Header com Imagem e Overlay */}
      <div className="relative h-80 shrink-0 overflow-hidden">
        <img src={professional.image} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/20"></div>
        
        {/* Rating Floating Badge */}
        <div className="absolute top-14 right-6 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/20">
           <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
           <span className="text-white font-black text-[11px]">{professional.rating}</span>
        </div>

        <button 
          onClick={onBack}
          className="absolute top-14 left-6 w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-black shadow-xl active:scale-90 transition-all border border-slate-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
      </div>

      <div className="px-6 -mt-10 relative z-10 pb-40">
        <div className="bg-white rounded-[44px] animate-spring-up">
          {/* Info Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tighter">{professional.name} {professional.lastName}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100/50">
                {professional.areas[0] || 'Personal Trainer'}
              </span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{professional.reviews} reseñas</span>
            </div>
            <p className="text-slate-500 text-[13px] leading-relaxed mt-5 font-medium pr-4">
              {professional.bio}
            </p>
          </div>

          {/* Cards de Info Lateral */}
          <div className="grid grid-cols-2 gap-3 mb-10">
             <div className="p-4 bg-slate-50 rounded-[28px] border border-slate-100/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-slate-100">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ubicación</p>
                   <p className="text-slate-900 font-extrabold text-[12px] truncate">{professional.location}</p>
                </div>
             </div>
             <div className="p-4 bg-slate-50 rounded-[28px] border border-slate-100/50 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Modalidad</p>
                   <p className="text-slate-900 font-extrabold text-[12px] capitalize">Presencial</p>
                </div>
             </div>
          </div>

          {/* Seção de Disponibilidade */}
          <div className="space-y-6">
            <h3 className="font-black text-slate-900 text-[18px] tracking-tight">Disponibilidad</h3>
            
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
               {days.map((day, idx) => (
                 <button 
                  key={idx}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`min-w-[70px] h-[95px] rounded-[24px] flex flex-col items-center justify-center transition-all duration-300 active:scale-90 border ${
                    selectedDayIdx === idx 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-105' 
                    : 'bg-white border-slate-100 text-slate-400'
                  }`}
                 >
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedDayIdx === idx ? 'text-blue-100' : 'text-slate-400'}`}>{day.dayName}</p>
                    <p className="text-xl font-black tracking-tight">{day.dayNum}</p>
                    <p className={`text-[10px] font-black uppercase tracking-tighter mt-1 opacity-60`}>{day.monthName}</p>
                 </button>
               ))}
            </div>

            <div className="space-y-4 pt-4">
              {slots.length > 0 ? slots.map((slot) => {
                const isFull = slot.capacityBooked >= slot.capacityTotal;
                const progress = (slot.capacityBooked / slot.capacityTotal) * 100;
                
                return (
                  <div 
                    key={slot.id}
                    onClick={() => !isFull && setSelectedSlot(slot)}
                    className={`w-full p-6 rounded-[32px] border transition-all duration-300 flex items-center justify-between group ${
                      isFull 
                      ? 'bg-slate-50 border-slate-100 opacity-70' 
                      : selectedSlot?.id === slot.id 
                        ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-50/50' 
                        : 'bg-white border-slate-100 hover:border-slate-300 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1">
                       <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedSlot?.id === slot.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          </div>
                          <p className="text-xl font-black text-slate-900 tracking-tighter">
                            {new Date(slot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                       
                       <div className="w-32 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             <span>Cupos disponibles</span>
                             <span className="text-slate-900">{slot.capacityTotal - slot.capacityBooked}/{slot.capacityTotal}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                                className={`h-full transition-all duration-1000 ease-out ${isFull ? 'bg-slate-300' : 'bg-emerald-500'}`} 
                                style={{ width: `${progress}%` }}
                             />
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                       <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{slot.type}</span>
                       </div>

                       <button 
                        disabled={isFull}
                        className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-lg ${
                          isFull 
                          ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' 
                          : selectedSlot?.id === slot.id 
                            ? 'bg-blue-600 text-white shadow-blue-200 active:scale-95' 
                            : 'bg-blue-600 text-white shadow-blue-100/50 active:scale-95'
                        }`}
                       >
                          {isFull ? 'Lleno' : 'Reservar'}
                       </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-16 text-center border-2 border-dashed border-slate-100 rounded-[44px] bg-slate-50/30">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
                   </div>
                   <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sin horarios para este día</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Fixo */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-100 z-50 animate-spring-up max-w-lg mx-auto sm:rounded-t-[44px] sm:mb-8">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Total</p>
                 <p className="text-2xl font-black text-black tracking-tighter">₡{selectedSlot.price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Horario Seleccionado</p>
                 <p className="text-sm font-bold text-slate-900">{new Date(selectedSlot.startAt).getHours()}:00 - {new Date(selectedSlot.endAt).getHours()}:00</p>
              </div>
           </div>
           <button 
              onClick={initiateBookingFlow}
              className="w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl bg-[#1a1a1a] text-white active:scale-[0.98]"
            >
              Continuar
            </button>
        </div>
      )}

      {/* Modal de Confirmação Detalhada */}
      {showConfirmModal && selectedSlot && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end">
           <div className="w-full bg-white rounded-t-[54px] p-8 animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col shadow-2xl border-t border-slate-100">
              <div className="w-14 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0" />
              
              <div className="flex justify-between items-center mb-8 shrink-0">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Confirmar reserva</h2>
                 <button onClick={() => setShowConfirmModal(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center active:scale-90 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-10">
                 {/* Card do Profissional */}
                 <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex items-center gap-5">
                    <img src={professional.image} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt="" />
                    <div>
                       <h4 className="text-lg font-black text-slate-900 leading-tight">{professional.name} {professional.lastName}</h4>
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{professional.areas[0] || 'Personal Trainer'}</p>
                    </div>
                 </div>

                 {/* Detalhes da Reserva */}
                 <div className="space-y-6 px-2">
                    <InfoRow icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>} label="Fecha" value={selectedDayInfo.fullDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())} />
                    <InfoRow icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>} label="Hora" value={new Date(selectedSlot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' AM'} />
                    <InfoRow icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>} label="Tipo de sesión" value={slotTypeLabel(selectedSlot.type)} />
                    <InfoRow icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>} label="Ubicación" value={professional.location} />
                 </div>

                 {/* Mensagem Opcional */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-2">
                       <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" strokeWidth="2"/></svg>
                       <p className="font-black text-slate-800 text-[13px] tracking-tight">Mensaje al profesional (opcional)</p>
                    </div>
                    <textarea 
                       value={userMessage}
                       onChange={e => setUserMessage(e.target.value)}
                       placeholder="Ej: Es mi primera sesión, tengo una lesión en la rodilla..."
                       className="w-full h-32 bg-slate-50 border border-slate-100 p-6 rounded-[32px] font-medium text-sm text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner resize-none placeholder:text-slate-300"
                    />
                 </div>

                 {/* Aviso de Pendente */}
                 <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-[32px] flex items-center gap-4">
                    <div className="text-xl">💡</div>
                    <p className="text-[12px] font-medium text-blue-600 leading-snug">
                       Tu reserva quedará <span className="font-bold">pendiente</span> hasta que el profesional la confirme.
                    </p>
                 </div>
              </div>

              <div className="pt-8 shrink-0">
                 <button 
                  onClick={confirmFinalBooking}
                  disabled={isBooking}
                  className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    {isBooking ? (
                       <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                       'Confirmar reserva'
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-center gap-5">
     <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
        {icon}
     </div>
     <div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-[14px] font-bold text-slate-800 leading-tight">{value}</p>
     </div>
  </div>
);

const slotTypeLabel = (type: string) => {
   if (type === 'grupo') return 'Grupo';
   if (type === 'individual') return '1:1';
   return type;
};

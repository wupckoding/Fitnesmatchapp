
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setSlots(DB.getSlotsByTeacher(professional.id));
  }, [professional.id]);

  const handleBooking = () => {
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
        createdAt: new Date().toISOString()
      };

      DB.createBooking(newBooking);
      setIsBooking(false);
      onBook(newBooking);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto no-scrollbar h-full animate-fade-in">
      <div className="relative h-80 shrink-0">
        <img src={professional.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        <button 
          onClick={onBack}
          className="absolute top-14 left-6 w-12 h-12 bg-white/20 backdrop-blur-2xl rounded-2xl flex items-center justify-center text-white border border-white/30 active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg>
        </button>
      </div>

      <div className="px-6 -mt-16 relative z-10 pb-32 animate-fade-in-up">
        <div className="bg-white p-8 rounded-[44px] shadow-2xl border border-slate-50">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1 min-w-0 pr-4">
              <h1 className="text-3xl font-black text-slate-900 leading-tight truncate">{professional.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {professional.areas.map(area => (
                  <span key={area} className="text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg">
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-yellow-400 px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-yellow-100 shrink-0">
              <span className="text-white font-black text-sm">★ {professional.rating}</span>
            </div>
          </div>

          <p className="text-slate-500 text-base leading-relaxed mb-10 font-medium italic">
            "{professional.bio}"
          </p>

          <div className="grid grid-cols-2 gap-4 mb-10">
             <div className="p-5 bg-[#F2F2F7] rounded-[28px] border border-white">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</p>
                <p className="text-slate-900 font-bold mt-1 text-sm">{professional.location}</p>
             </div>
             <div className="p-5 bg-[#F2F2F7] rounded-[28px] border border-white">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Base</p>
                <p className="text-blue-600 font-bold mt-1 text-sm">₡{professional.price.toLocaleString()}</p>
             </div>
          </div>

          <div className="mb-8">
            <h3 className="font-black text-slate-900 mb-6 text-xs uppercase tracking-[0.2em]">Disponibilidad</h3>
            <div className="space-y-4">
              {slots.length > 0 ? slots.map((slot) => (
                <button 
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full p-6 rounded-[32px] border-2 transition-all flex justify-between items-center active:scale-[0.98] ${
                    selectedSlot?.id === slot.id 
                    ? 'border-blue-600 bg-blue-50/50' 
                    : 'border-slate-50 bg-slate-50/50'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Hoy</p>
                    <p className="text-lg font-black text-slate-900">{new Date(slot.startAt).getHours()}:00 - {new Date(slot.endAt).getHours()}:00</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-900 font-black">₡{slot.price.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{slot.type}</p>
                  </div>
                </button>
              )) : (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                   <p className="text-slate-300 font-bold">Sin horarios para hoy</p>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={handleBooking}
            disabled={!selectedSlot || isBooking}
            className={`w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl ${
              selectedSlot 
              ? 'bg-blue-600 text-white shadow-blue-100 active:scale-95' 
              : 'bg-slate-100 text-slate-300'
            }`}
          >
            {isBooking ? 'Sincronizando...' : 'Confirmar Reserva'}
          </button>
        </div>
      </div>
    </div>
  );
};

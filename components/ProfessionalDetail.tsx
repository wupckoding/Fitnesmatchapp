import React, { useState, useEffect, useMemo } from "react";
import {
  ProfessionalProfile,
  TimeSlot,
  Booking,
  BookingStatus,
  User,
} from "../types";
import { DB } from "../services/databaseService";

interface DetailProps {
  professional: ProfessionalProfile;
  currentUser: User;
  onBack: () => void;
  onBook: (booking: Booking) => void;
}

export const ProfessionalDetail: React.FC<DetailProps> = ({
  professional,
  currentUser,
  onBack,
  onBook,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [finalBooking, setFinalBooking] = useState<Booking | null>(null);
  const [, setTick] = useState(0);

  // Sincronização em tempo real: Escuta mudanças no DB para atualizar "Cupos" e Slots
  useEffect(() => {
    const unsub = DB.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const userBookings = useMemo(
    () => DB.getClientBookings(currentUser.id),
    [currentUser.id, DB.getBookings()]
  );

  // Gerador de dias do mês selecionado - Premium e completo
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    const locale = "es-ES";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (date.getMonth() === month) {
      // Permite ver todos os dias do mês selecionado, mas só interagir com futuros
      const isPast = date < today;
      days.push({
        fullDate: new Date(date),
        dayName: date
          .toLocaleDateString(locale, { weekday: "short" })
          .replace(".", ""),
        dayNum: date.getDate(),
        monthName: date
          .toLocaleDateString(locale, { month: "short" })
          .replace(".", ""),
        disabled: isPast,
      });
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

  // Filtra slots considerando as reservas reais do DB para calcular vagas (cupos)
  const filteredSlots = useMemo(() => {
    const allSlots = DB.getSlotsByTeacher(professional.id);
    const allBookings = DB.getBookings();

    return allSlots
      .filter((s) => {
        const slotDate = new Date(s.startAt);
        return slotDate.toDateString() === selectedDate.toDateString();
      })
      .map((slot) => {
        // Calcula cupos ocupados baseados em reservas reais no DB para este slot
        const bookedCount = allBookings.filter(
          (b) =>
            b.slotId === slot.id &&
            (b.status === BookingStatus.PENDIENTE ||
              b.status === BookingStatus.CONFIRMADA)
        ).length;

        return { ...slot, capacityBooked: bookedCount };
      })
      .sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
  }, [professional.id, selectedDate, DB.getBookings(), DB.getSlots()]);

  const checkIsAlreadyBooked = (slotId: string) => {
    return userBookings.some(
      (b) =>
        b.slotId === slotId &&
        (b.status === BookingStatus.PENDIENTE ||
          b.status === BookingStatus.CONFIRMADA)
    );
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
        message: userMessage,
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
    if (
      next.getFullYear() < now.getFullYear() ||
      (next.getFullYear() === now.getFullYear() &&
        next.getMonth() < now.getMonth())
    ) {
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
              <svg
                className="w-12 h-12 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="4"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-2xl animate-bounce">
                🎉
              </div>
            </div>
          </div>
        </div>
        <h2 className="text-[32px] font-black text-slate-900 tracking-tighter mb-4">
          ¡Reserva creada!
        </h2>
        <p className="text-slate-400 font-bold text-sm mb-10 px-4 leading-relaxed">
          Tu reserva ha sido enviada al profesional y está{" "}
          <span className="text-orange-500">pendiente de confirmación</span>.
        </p>
        <div className="w-full bg-slate-50 border border-slate-100 rounded-[32px] p-6 mb-12 flex items-start gap-4 text-left">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-sm tracking-tight">
              Te notificaremos
            </h4>
            <p className="text-[11px] font-medium text-slate-400 mt-1 leading-tight">
              Recibirás un email y notificación cuando el profesional confirme o
              rechace tu reserva.
            </p>
          </div>
        </div>
        <div className="w-full space-y-4">
          <button
            onClick={() => finalBooking && onBook(finalBooking)}
            className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
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
    <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto no-scrollbar h-full animate-fade-in relative">
      {/* Header com imagem - Design limpo */}
      <div className="relative h-56 shrink-0 bg-slate-900">
        {professional.image ? (
          <img
            src={professional.image}
            className="w-full h-full object-cover opacity-90"
            alt=""
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-violet-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-12 left-4 w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Info sobre a imagem */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h1 className="text-2xl font-bold text-white leading-tight">
            {professional.name} {professional.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white/90 text-xs font-semibold bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
              {professional.areas[0] || "Personal Trainer"}
            </span>
            <div className="flex items-center gap-1 text-white/80">
              <svg
                className="w-3.5 h-3.5 text-yellow-400 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-semibold">
                {professional.rating || 5.0}
              </span>
              <span className="text-xs text-white/60">
                ({professional.reviews || 0})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10 pb-40">
        {/* Quick info pills */}
        <div className="flex items-center justify-center gap-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-600">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs font-semibold">
              {professional.location}
            </span>
          </div>
          <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs font-semibold">Presencial</span>
          </div>
        </div>

        {/* Bio */}
        {professional.bio && (
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-slate-600 text-sm leading-relaxed">
              {professional.bio}
            </p>
          </div>
        )}

        <div className="p-5">
          {/* Calendario Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                Disponibilidad
              </h3>
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl">
                <button
                  onClick={() => changeMonth(-1)}
                  className="text-slate-400 hover:text-slate-900 transition-colors active:scale-90 p-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M15 19l-7-7 7-7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span className="text-xs font-bold text-slate-700 min-w-[90px] text-center capitalize">
                  {currentMonth.toLocaleDateString("es-ES", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="text-slate-400 hover:text-slate-900 transition-colors active:scale-90 p-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Days scroll */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
              {monthDays.map((day, idx) => {
                const isSelected =
                  selectedDate.toDateString() === day.fullDate.toDateString();
                const isToday =
                  new Date().toDateString() === day.fullDate.toDateString();
                return (
                  <button
                    key={idx}
                    disabled={day.disabled}
                    onClick={() => {
                      setSelectedDate(day.fullDate);
                      setSelectedSlot(null);
                    }}
                    className={`min-w-[56px] py-3 rounded-2xl flex flex-col items-center justify-center transition-all shrink-0 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : day.disabled
                        ? "bg-transparent opacity-30"
                        : isToday
                        ? "bg-blue-50 text-blue-600"
                        : "bg-white border border-slate-100 text-slate-600 hover:border-slate-200"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase ${
                        isSelected ? "text-blue-200" : "text-slate-400"
                      }`}
                    >
                      {day.dayName}
                    </p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${
                        isSelected ? "text-white" : ""
                      }`}
                    >
                      {day.dayNum}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="space-y-2 pt-2">
              {filteredSlots.length > 0 ? (
                filteredSlots.map((slot) => {
                  const available = slot.capacityTotal - slot.capacityBooked;
                  const isFull = available <= 0;
                  const isAlreadyBooked = checkIsAlreadyBooked(slot.id);
                  const isSelected = selectedSlot?.id === slot.id;

                  return (
                    <button
                      key={slot.id}
                      disabled={isFull || isAlreadyBooked}
                      onClick={() =>
                        !isFull && !isAlreadyBooked && setSelectedSlot(slot)
                      }
                      className={`w-full p-4 rounded-2xl border transition-all text-left ${
                        isFull || isAlreadyBooked
                          ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-50 border-blue-500 ring-2 ring-blue-100"
                          : "bg-white border-slate-200 hover:border-blue-300 active:scale-[0.99]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                            >
                              <path
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div>
                            <p
                              className={`text-lg font-bold ${
                                isSelected ? "text-blue-600" : "text-slate-900"
                              }`}
                            >
                              {new Date(slot.startAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400 font-medium">
                                {slot.type}
                              </span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-xs font-bold text-blue-600">
                                ₡{slot.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {isFull ? (
                            <span className="text-xs font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                              Lleno
                            </span>
                          ) : isAlreadyBooked ? (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Reservado
                            </span>
                          ) : (
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">
                                {available}
                                <span className="text-sm text-slate-400">
                                  /{slot.capacityTotal}
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                cupos
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-300">
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                    >
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-bold text-sm">
                    Sin horarios para este día
                  </p>
                  <p className="text-slate-300 text-xs mt-1">
                    Selecciona otra fecha
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-spring-up max-w-lg mx-auto bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-slate-900">
                  ₡{selectedSlot.price.toLocaleString()}
                </p>
                <span className="text-xs text-slate-400 font-medium">
                  / sesión
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(selectedSlot.startAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {selectedSlot.type}
              </p>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-6 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reservar
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Clean Design */}
      {showConfirmModal && selectedSlot && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end">
          <div className="w-full bg-white rounded-t-3xl animate-spring-up max-w-lg mx-auto max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                Confirmar reserva
              </h2>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-9 h-9 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 no-scrollbar space-y-5">
              {/* Professional card */}
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                {professional.image ? (
                  <img
                    src={professional.image}
                    className="w-14 h-14 rounded-xl object-cover"
                    alt=""
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold">
                    {professional.name[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900">
                    {professional.name} {professional.lastName}
                  </h4>
                  <p className="text-xs text-blue-600 font-semibold">
                    {professional.areas[0]}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <DetailRow
                  icon="calendar"
                  label="Fecha"
                  value={new Date(selectedSlot.startAt).toLocaleDateString(
                    "es-ES",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                />
                <DetailRow
                  icon="clock"
                  label="Hora"
                  value={new Date(selectedSlot.startAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                />
                <DetailRow
                  icon="user"
                  label="Tipo de sesión"
                  value={selectedSlot.type}
                />
                <DetailRow
                  icon="location"
                  label="Ubicación"
                  value={professional.location}
                />
              </div>

              {/* Message input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Mensaje al profesional (opcional)
                </label>
                <textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="Ej: Es mi primera sesión..."
                  className="w-full h-24 bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Info banner */}
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Tu reserva quedará{" "}
                  <span className="font-bold">pendiente</span> hasta que el
                  profesional la confirme.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 shrink-0 bg-white">
              <button
                onClick={confirmFinalBooking}
                disabled={isBooking}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isBooking ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Confirmar Reserva
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => {
  const getIcon = () => {
    switch (icon) {
      case "calendar":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "clock":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "user":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "location":
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
        {getIcon()}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">
          {value}
        </p>
      </div>
    </div>
  );
};

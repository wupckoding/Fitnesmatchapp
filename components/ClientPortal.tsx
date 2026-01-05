
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'active' | 'past'>('all');
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  
  const [editName, setEditName] = useState(user.name);
  const [editLastName, setEditLastName] = useState(user.lastName);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editImage, setEditImage] = useState(user.image || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshBookings = useCallback(() => {
    setBookings(DB.getClientBookings(user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [user.id]);

  useEffect(() => {
    setUser(initialUser);
    setEditName(initialUser.name);
    setEditLastName(initialUser.lastName);
    setEditEmail(initialUser.email);
    setEditPhone(initialUser.phone);
    setEditImage(initialUser.image || '');
  }, [initialUser]);

  useEffect(() => {
    // 1. Carregar imediatamente do cache
    refreshBookings();
    
    // 2. Sincronizar em background
    DB.forceSync().then(refreshBookings).catch(console.error);

    const unsub = DB.subscribe(refreshBookings);
    return () => unsub();
  }, [refreshBookings]);

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === BookingStatus.CONFIRMADA).length,
    pending: bookings.filter(b => b.status === BookingStatus.PENDIENTE).length,
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    switch (bookingFilter) {
      case 'active':
        return bookings.filter(b => b.status === BookingStatus.CONFIRMADA || b.status === BookingStatus.PENDIENTE);
      case 'past':
        return bookings.filter(b => b.status === BookingStatus.CANCELADA || b.status === BookingStatus.RECHAZADA);
      default:
        return bookings;
    }
  }, [bookings, bookingFilter]);

  const handleSave = async () => {
    const updatedUser: User = {
      ...user,
      name: editName,
      lastName: editLastName,
      email: editEmail,
      phone: editPhone,
      image: editImage
    };

    await DB.saveUser(updatedUser);
    setUser(updatedUser);
    setIsEditing(false);
    showFeedback("Cambios guardados", "success");
  };

  const showFeedback = (msg: string, type: 'success' | 'error') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleCancelBooking = (booking: Booking) => {
    if (!canCancel(booking.date)) {
      showFeedback('Mínimo 24h de anticipación', 'error');
      return;
    }
    DB.updateBookingStatus(booking.id, BookingStatus.CANCELADA);
    showFeedback('Reserva cancelada', 'success');
  };

  const handleDeleteBooking = (bookingId: string) => {
    DB.deleteBooking(bookingId);
    showFeedback('Eliminado', 'success');
  };

  const canCancel = (dateStr: string) => {
    return (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60) > 24;
  };

  // Comprimir imagem
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 300;
          let w = img.width, h = img.height;
          if (w > h) { h = (h * MAX) / w; w = MAX; }
          else { w = (w * MAX) / h; h = MAX; }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setEditImage(compressed);
      
      // Salvar imediatamente
      const updatedUser = { ...user, image: compressed };
      await DB.saveUser(updatedUser);
      setUser(updatedUser);
      showFeedback("Foto guardada", "success");
    } catch (err) {
      console.error(err);
      showFeedback("Error al guardar foto", "error");
    }
  };

  const sendHelpMessage = () => {
    if (!helpMessage.trim()) return;
    // Simular envio de mensagem para admin
    showFeedback("Mensaje enviado al soporte", "success");
    setHelpMessage('');
    setShowHelp(false);
  };

  const getSlotDetails = (slotId: string) => DB.getSlots().find(s => s.id === slotId);

  // Tela de Edição - Estilo Uber
  if (isEditing) {
    return (
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        <header className="px-4 pt-12 pb-4 flex items-center gap-4 border-b border-gray-100">
          <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Editar perfil</h1>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Foto */}
          <div className="py-8 flex flex-col items-center border-b border-gray-100">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                {editImage ? (
                  <img src={editImage} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white text-3xl font-medium">
                    {editName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 text-sm font-medium">
              Cambiar foto
            </button>
          </div>

          {/* Campos */}
          <div className="divide-y divide-gray-100">
            <EditField label="Nombre" value={editName} onChange={setEditName} />
            <EditField label="Apellido" value={editLastName} onChange={setEditLastName} />
            <EditField label="Correo" value={editEmail} onChange={setEditEmail} type="email" />
            <EditField label="Teléfono" value={editPhone} onChange={setEditPhone} type="tel" />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={handleSave} className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-medium active:bg-gray-800">
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
      {/* Toast */}
      {feedback && (
        <div className="fixed top-20 inset-x-4 z-[300] animate-spring-up">
          <div className={`mx-auto max-w-sm py-3 px-4 rounded-lg shadow-lg flex items-center gap-3 ${
            feedback.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}>
            {feedback.type === 'success' ? (
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
            )}
            <span className="text-sm font-medium">{feedback.msg}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* PERFIL */}
        {activeTab === 'perfil' && (
          <>
            {/* Header com foto */}
            <div className="bg-white pt-14 pb-6 px-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-900 overflow-hidden flex-shrink-0">
                  {user.image ? (
                    <img src={user.image} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-medium">
                      {user.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold text-gray-900 truncate">{user.name} {user.lastName}</h1>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white mt-2 py-4 px-5">
              <div className="grid grid-cols-3 divide-x divide-gray-200">
                <StatItem value={stats.total} label="Reservas" />
                <StatItem value={stats.confirmed} label="Confirmadas" color="text-green-600" />
                <StatItem value={stats.pending} label="Pendientes" color="text-amber-600" />
              </div>
            </div>

            {/* Menu */}
            <div className="bg-white mt-2">
              <MenuItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
                label="Editar perfil"
                onClick={() => setIsEditing(true)}
              />
              <MenuItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>}
                label="Notificaciones"
                subtitle="Push, email, SMS"
              />
              <MenuItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
                label="Privacidad"
                subtitle="Datos y seguridad"
                onClick={() => setShowPrivacy(true)}
              />
            </div>

            <div className="bg-white mt-2">
              <MenuItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
                label="Ayuda y soporte"
                subtitle="Contactar administrador"
                onClick={() => setShowHelp(true)}
              />
              <MenuItem 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                label="Términos y condiciones"
              />
            </div>

            {/* Logout */}
            <div className="bg-white mt-2 mb-32">
              <button 
                onClick={onLogout}
                className="w-full py-4 px-5 flex items-center gap-4 text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                <span className="font-medium">Cerrar sesión</span>
              </button>
            </div>
          </>
        )}

        {/* RESERVAS */}
        {activeTab === 'reservas' && (
          <>
            <div className="bg-white pt-14 pb-4 px-5">
              <h1 className="text-2xl font-bold text-gray-900">Mis reservas</h1>
              
              {/* Filtros */}
              <div className="flex gap-2 mt-4">
                {(['all', 'active', 'past'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setBookingFilter(f)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      bookingFilter === f 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Pasadas'}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 pb-32 space-y-3">
              {filteredBookings.map((b, idx) => (
                <BookingCard 
                  key={b.id}
                  booking={b}
                  onDetails={() => setSelectedBookingDetails(b)}
                  onCancel={() => handleCancelBooking(b)}
                  onDelete={() => handleDeleteBooking(b.id)}
                  canCancel={canCancel(b.date)}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                />
              ))}

              {filteredBookings.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No hay reservas</p>
                  <button 
                    onClick={() => onNavigate?.('buscar')}
                    className="mt-4 px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg"
                  >
                    Buscar entrenadores
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Detalles de Reserva */}
      {selectedBookingDetails && (
        <Modal onClose={() => setSelectedBookingDetails(null)} title="Detalles">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium text-lg">
                {selectedBookingDetails.teacherName[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedBookingDetails.teacherName}</p>
                <p className="text-sm text-gray-500">Entrenador</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Fecha" value={new Date(selectedBookingDetails.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} />
              <InfoBox label="Hora" value={new Date(selectedBookingDetails.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-medium text-blue-600 mb-1">UBICACIÓN</p>
              <p className="text-sm text-blue-900">{getSlotDetails(selectedBookingDetails.slotId)?.location || 'Por confirmar'}</p>
            </div>

            <div className="flex justify-between items-center py-3 border-t border-gray-100">
              <span className="text-gray-500">Total</span>
              <span className="text-xl font-bold text-gray-900">₡{selectedBookingDetails.price.toLocaleString()}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Ayuda */}
      {showHelp && (
        <Modal onClose={() => setShowHelp(false)} title="Ayuda y soporte">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Envía un mensaje al administrador y te responderemos lo antes posible.
            </p>
            <textarea
              value={helpMessage}
              onChange={e => setHelpMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <button 
              onClick={sendHelpMessage}
              disabled={!helpMessage.trim()}
              className={`w-full py-3.5 rounded-lg font-medium ${
                helpMessage.trim() 
                  ? 'bg-gray-900 text-white active:bg-gray-800' 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              Enviar mensaje
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Privacidad */}
      {showPrivacy && (
        <Modal onClose={() => setShowPrivacy(false)} title="Privacidad y seguridad">
          <div className="space-y-4">
            <PrivacyOption 
              label="Ubicación"
              description="Permitir acceso a tu ubicación"
              enabled={true}
            />
            <PrivacyOption 
              label="Notificaciones push"
              description="Recibir alertas en tu dispositivo"
              enabled={true}
            />
            <PrivacyOption 
              label="Compartir datos de uso"
              description="Ayudarnos a mejorar la app"
              enabled={false}
            />
            <div className="pt-4 border-t border-gray-100">
              <button className="text-red-600 text-sm font-medium">
                Eliminar mi cuenta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Componentes auxiliares
const StatItem = ({ value, label, color = "text-gray-900" }: { value: number; label: string; color?: string }) => (
  <div className="text-center px-2">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

const MenuItem = ({ icon, label, subtitle, onClick }: { icon: React.ReactNode; label: string; subtitle?: string; onClick?: () => void }) => (
  <button onClick={onClick} className="w-full py-4 px-5 flex items-center gap-4 border-b border-gray-100 last:border-0 text-left">
    <span className="text-gray-600">{icon}</span>
    <div className="flex-1">
      <p className="text-gray-900 font-medium">{label}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path d="M9 5l7 7-7 7"/>
    </svg>
  </button>
);

const EditField = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div className="py-4 px-5">
    <label className="text-sm text-gray-500">{label}</label>
    <input 
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full mt-1 text-gray-900 font-medium outline-none bg-transparent"
    />
  </div>
);

const Modal = ({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/50 z-[100] flex items-end">
    <div className="w-full bg-white rounded-t-2xl animate-spring-up max-w-lg mx-auto max-h-[85vh] flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {children}
      </div>
    </div>
  </div>
);

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 bg-gray-50 rounded-xl">
    <p className="text-xs font-medium text-gray-500 mb-1">{label.toUpperCase()}</p>
    <p className="font-semibold text-gray-900">{value}</p>
  </div>
);

const BookingCard = ({ booking, onDetails, onCancel, onDelete, canCancel, style }: { 
  booking: Booking; 
  onDetails: () => void;
  onCancel: () => void;
  onDelete: () => void;
  canCancel: boolean;
  style?: React.CSSProperties;
}) => {
  const isActive = booking.status === BookingStatus.CONFIRMADA || booking.status === BookingStatus.PENDIENTE;
  const statusColors = {
    [BookingStatus.CONFIRMADA]: 'bg-green-100 text-green-700',
    [BookingStatus.PENDIENTE]: 'bg-amber-100 text-amber-700',
    [BookingStatus.CANCELADA]: 'bg-gray-100 text-gray-500',
    [BookingStatus.RECHAZADA]: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm animate-spring-up" style={style}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium flex-shrink-0">
          {booking.teacherName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{booking.teacherName}</p>
              <p className="text-sm text-gray-500">
                {new Date(booking.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[booking.status]}`}>
              {booking.status}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="font-bold text-gray-900">₡{booking.price.toLocaleString()}</span>
            <div className="flex gap-2">
              {isActive && (
                <>
                  <button onClick={onDetails} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg">
                    Detalles
                  </button>
                  <button 
                    onClick={onCancel}
                    disabled={!canCancel}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                      canCancel ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'
                    }`}
                  >
                    Cancelar
                  </button>
                </>
              )}
              {!isActive && (
                <button onClick={onDelete} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg">
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PrivacyOption = ({ label, description, enabled }: { label: string; description: string; enabled: boolean }) => {
  const [isEnabled, setIsEnabled] = useState(enabled);
  
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button 
        onClick={() => setIsEnabled(!isEnabled)}
        className={`w-12 h-7 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
};


import { Plan, ProfessionalProfile, User, UserRole, Booking, BookingStatus, TimeSlot, Category, PlanType, ChatMessage, Conversation, Notification } from '../types';
import { PLANS, MOCK_PROS, MOCK_CLIENTS, MOCK_CATEGORIES, MOCK_SLOTS } from './mockData';

const KEYS = {
  PLANS: 'fm_plans_v3',
  PROS: 'fm_pros_v3',
  CLIENTS: 'fm_clients_v3',
  CATEGORIES: 'fm_categories_v3',
  BOOKINGS: 'fm_bookings_v3',
  SLOTS: 'fm_slots_v3',
  MESSAGES: 'fm_messages_v3',
  CONVERSATIONS: 'fm_convs_v3',
  NOTIFICATIONS: 'fm_notifs_v3',
  INITIALIZED: 'fm_is_init_v3'
};

const notify = () => {
  window.dispatchEvent(new CustomEvent('fm-db-update', { detail: Date.now() }));
};

export const DB = {
  init: () => {
    if (localStorage.getItem(KEYS.INITIALIZED)) return;
    
    localStorage.setItem(KEYS.PLANS, JSON.stringify(PLANS));
    localStorage.setItem(KEYS.PROS, JSON.stringify(MOCK_PROS));
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(MOCK_CLIENTS));
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(MOCK_CATEGORIES));
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify([]));
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(MOCK_SLOTS));
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(KEYS.INITIALIZED, 'true');
    notify();
  },

  subscribe: (callback: () => void) => {
    window.addEventListener('fm-db-update', callback);
    return () => window.removeEventListener('fm-db-update', callback);
  },

  getPlans: (): Plan[] => JSON.parse(localStorage.getItem(KEYS.PLANS) || '[]'),
  
  getNotifications: (userId: string): Notification[] => {
    const all: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    return all.filter(n => n.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addNotification: (notif: Notification) => {
    const all: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    all.push(notif);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
    notify();
  },

  markNotificationsRead: (userId: string) => {
    const all: Notification[] = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
    notify();
  },

  getPros: (): ProfessionalProfile[] => JSON.parse(localStorage.getItem(KEYS.PROS) || '[]'),
  getClients: (): User[] => JSON.parse(localStorage.getItem(KEYS.CLIENTS) || '[]'),
  
  saveUser: (user: User) => {
    if (user.role === UserRole.TEACHER) {
      const data = DB.getPros();
      const idx = data.findIndex(p => p.id === user.id);
      if (idx > -1) {
        data[idx] = { ...data[idx], ...user };
      } else {
        data.push({
          ...user,
          areas: [],
          bio: 'Nuevo profesional en FitnessMatch',
          location: user.city || 'Costa Rica',
          modalities: ['presencial'],
          rating: 5,
          reviews: 0,
          image: user.image || '',
          price: 0,
          planActive: false
        } as ProfessionalProfile);
      }
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients();
      const idx = data.findIndex(u => u.id === user.id);
      if (idx > -1) {
        data[idx] = { ...data[idx], ...user };
      } else {
        data.push(user);
      }
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },

  getMessages: (u1: string, u2: string): ChatMessage[] => {
    const all: ChatMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
    return all.filter(m => 
      (m.senderId === u1 && m.receiverId === u2) || 
      (m.senderId === u2 && m.receiverId === u1)
    ).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  markMessagesAsRead: (currentUserId: string, otherUserId: string) => {
    const all: ChatMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
    let changed = false;
    const updated = all.map(m => {
      if (m.senderId === otherUserId && m.receiverId === currentUserId && !m.isRead) {
        changed = true;
        return { ...m, isRead: true };
      }
      return m;
    });
    if (changed) {
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify(updated));
      notify();
    }
  },

  getConversations: (userId: string): Conversation[] => {
    const all: Conversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]');
    return all.filter(c => c.participants.includes(userId)).sort((a,b) => {
      const dateA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const dateB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return dateB - dateA;
    });
  },

  sendMessage: (msg: ChatMessage) => {
    const messages: ChatMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
    messages.push({ ...msg, isRead: false });
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));

    const convs: Conversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]');
    let conv = convs.find(c => c.participants.includes(msg.senderId) && c.participants.includes(msg.receiverId));
    
    if (!conv) {
      conv = { 
        id: `conv-${Date.now()}`, 
        participants: [msg.senderId, msg.receiverId], 
      };
      convs.push(conv);
    }
    
    conv.lastMessage = msg.text;
    conv.lastTimestamp = msg.timestamp;
    
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
    notify();
  },

  getCategories: (): Category[] => JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || '[]'),
  saveCategory: (cat: Category) => {
    const data = DB.getCategories();
    const idx = data.findIndex(c => c.id === cat.id);
    if (idx > -1) data[idx] = cat;
    else data.push(cat);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    notify();
  },
  deleteCategory: (id: string) => {
    const data = DB.getCategories().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    notify();
  },

  getSlots: (): TimeSlot[] => JSON.parse(localStorage.getItem(KEYS.SLOTS) || '[]'),
  getSlotsByTeacher: (teacherId: string) => DB.getSlots().filter(s => s.proUserId === teacherId),
  saveSlot: (slot: TimeSlot) => {
    const data = DB.getSlots();
    data.push(slot);
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(data));
    notify();
  },
  deleteSlot: (id: string) => {
    const data = DB.getSlots().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(data));
    notify();
  },

  getBookings: (): Booking[] => JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || '[]'),
  getTeacherBookings: (id: string) => DB.getBookings().filter(b => b.teacherId === id),
  getClientBookings: (id: string) => DB.getBookings().filter(b => b.clientId === id),
  
  updateTrainerPlan: (id: string, active: boolean) => {
    const data = DB.getPros().map(p => p.id === id ? { ...p, planActive: active, status: active ? 'active' : 'deactivated' } : p);
    localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    notify();
  },

  assignPlanToTrainer: (trainerId: string, planId: string) => {
    const plan = DB.getPlans().find(p => p.id === planId);
    if (!plan) return;
    const pros = DB.getPros();
    const idx = pros.findIndex(p => p.id === trainerId);
    if (idx === -1) return;
    
    pros[idx] = { 
        ...pros[idx], 
        planActive: false, 
        planType: plan.name as PlanType, 
        status: 'deactivated' as any,
        bio: 'Pendiente de activación por Admin'
    };
    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
  },

  renewTrainerExpiry: (id: string) => {
    const pros = DB.getPros();
    const idx = pros.findIndex(p => p.id === id);
    if (idx === -1) return;
    const current = pros[idx].planExpiry ? new Date(pros[idx].planExpiry!) : new Date();
    current.setMonth(current.getMonth() + 1);
    pros[idx].planExpiry = current.toISOString();
    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
  },

  createBooking: (b: Booking) => {
    const data = DB.getBookings();
    data.push(b);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));
    notify();
  },
  
  updateBookingStatus: (id: string, status: BookingStatus) => {
    const bookings = DB.getBookings();
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const data = bookings.map(b => b.id === id ? { ...b, status } : b);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));
    
    const title = status === BookingStatus.CONFIRMADA ? '¡Reserva Confirmada!' : 'Reserva Rechazada';
    const message = status === BookingStatus.CONFIRMADA 
      ? `Tu sesión con ${booking.teacherName} ha sido confirmada.`
      : `Lamentablemente ${booking.teacherName} no puede atenderte en este horario.`;

    DB.addNotification({
      id: `notif-${Date.now()}`,
      userId: booking.clientId,
      title,
      message,
      type: 'booking',
      isRead: false,
      timestamp: new Date().toISOString()
    });

    if (status === BookingStatus.CONFIRMADA) {
      const dateFormatted = new Date(booking.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeFormatted = `${new Date(booking.date).getHours()}:00h`;
      
      const systemMsg: ChatMessage = {
        id: `msg-auto-${Date.now()}`,
        senderId: booking.teacherId,
        receiverId: booking.clientId,
        text: `✅ ¡Reserva Confirmada!\n\nHola ${booking.clientName.split(' ')[0]}, he aceptado tu solicitud.\n\n📅 Fecha: ${dateFormatted}\n⏰ Hora: ${timeFormatted}\n💰 Inversión: ₡${booking.price.toLocaleString()}\n\n¡Cualquier duda escríbeme por aquí!`,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      
      DB.sendMessage(systemMsg);
    }

    notify();
  },
  deleteUser: (id: string, role: UserRole) => {
    if (role === UserRole.TEACHER) {
      const data = DB.getPros().filter(p => p.id !== id);
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients().filter(u => u.id !== id);
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },
  updateUserStatus: (id: string, role: UserRole, status: any) => {
    if (role === UserRole.TEACHER) {
      const data = DB.getPros().map(p => p.id === id ? { ...p, status } : p);
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients().map(u => u.id === id ? { ...u, status } : u);
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },
  deletePlan: (id: string) => {
    const data = DB.getPlans().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PLANS, JSON.stringify(data));
    notify();
    return data;
  },
  savePlan: (plan: Plan) => {
    const data = DB.getPlans();
    const idx = data.findIndex(p => p.id === plan.id);
    if (idx > -1) data[idx] = plan;
    else data.push(plan);
    localStorage.setItem(KEYS.PLANS, JSON.stringify(data));
    notify();
  }
};

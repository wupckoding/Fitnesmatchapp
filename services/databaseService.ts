
import { Plan, ProfessionalProfile, User, UserRole, Booking, BookingStatus, TimeSlot, Category, PlanType, ChatMessage, Conversation } from '../types';
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
    localStorage.setItem(KEYS.INITIALIZED, 'true');
    notify();
  },

  subscribe: (callback: () => void) => {
    window.addEventListener('fm-db-update', callback);
    return () => window.removeEventListener('fm-db-update', callback);
  },

  getPlans: (): Plan[] => JSON.parse(localStorage.getItem(KEYS.PLANS) || '[]'),
  savePlan: (plan: Plan) => {
    const data = DB.getPlans();
    const idx = data.findIndex(p => p.id === plan.id);
    if (idx > -1) data[idx] = plan;
    else data.push(plan);
    localStorage.setItem(KEYS.PLANS, JSON.stringify(data));
    notify();
  },
  deletePlan: (id: string) => {
    const data = DB.getPlans().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PLANS, JSON.stringify(data));
    notify();
    return data;
  },

  getPros: (): ProfessionalProfile[] => JSON.parse(localStorage.getItem(KEYS.PROS) || '[]'),
  getClients: (): User[] => JSON.parse(localStorage.getItem(KEYS.CLIENTS) || '[]'),
  
  // Fix: Added deleteUser to support user removal from admin dashboard
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

  // Fix: Added updateUserStatus to allow admin to toggle visibility or block users
  updateUserStatus: (id: string, role: UserRole, status: 'active' | 'blocked' | 'deactivated') => {
    if (role === UserRole.TEACHER) {
      const data = DB.getPros().map(p => p.id === id ? { ...p, status } : p);
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients().map(u => u.id === id ? { ...u, status } : u);
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },

  saveUser: (user: User) => {
    if (user.role === UserRole.TEACHER) {
      const data = DB.getPros();
      const idx = data.findIndex(p => p.id === user.id);
      if (idx > -1) {
        data[idx] = { ...data[idx], ...user } as ProfessionalProfile;
      } else {
        data.push({
          ...user,
          areas: [],
          bio: 'Nuevo profesional en FitnessMatch',
          location: user.city || 'Costa Rica',
          modalities: ['presencial'],
          rating: 5,
          reviews: 0,
          image: user.image || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
          price: 0,
          planActive: false
        } as ProfessionalProfile);
      }
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients();
      const idx = data.findIndex(u => u.id === user.id);
      if (idx > -1) data[idx] = user;
      else data.push(user);
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

  getConversations: (userId: string): Conversation[] => {
    const all: Conversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]');
    return all.filter(c => c.participants.includes(userId));
  },

  sendMessage: (msg: ChatMessage) => {
    const messages: ChatMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]');
    messages.push(msg);
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
  
  // Fix: Added saveCategory for category management in Admin panel
  saveCategory: (cat: Category) => {
    const data = DB.getCategories();
    const idx = data.findIndex(c => c.id === cat.id);
    if (idx > -1) data[idx] = cat;
    else data.push(cat);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    notify();
  },

  // Fix: Added deleteCategory for category management in Admin panel
  deleteCategory: (id: string) => {
    const data = DB.getCategories().filter(c => c.id !== id);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    notify();
  },

  getSlots: (): TimeSlot[] => JSON.parse(localStorage.getItem(KEYS.SLOTS) || '[]'),
  getSlotsByTeacher: (teacherId: string) => DB.getSlots().filter(s => s.proUserId === teacherId),
  getBookings: (): Booking[] => JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || '[]'),
  getTeacherBookings: (id: string) => DB.getBookings().filter(b => b.teacherId === id),
  getClientBookings: (id: string) => DB.getBookings().filter(b => b.clientId === id),
  
  updateTrainerPlan: (id: string, active: boolean) => {
    const data = DB.getPros().map(p => p.id === id ? { ...p, planActive: active } : p);
    localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    notify();
  },

  assignPlanToTrainer: (trainerId: string, planId: string) => {
    const plan = DB.getPlans().find(p => p.id === planId);
    if (!plan) return;
    const pros = DB.getPros();
    const idx = pros.findIndex(p => p.id === trainerId);
    if (idx === -1) return;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + plan.durationMonths);
    pros[idx] = { ...pros[idx], planActive: true, planType: plan.name as PlanType, planExpiry: expiry.toISOString() };
    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
  },

  // Fix: Added renewTrainerExpiry to allow manual plan extensions for professionals
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
    const data = DB.getBookings().map(b => b.id === id ? { ...b, status } : b);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));
    notify();
  }
};

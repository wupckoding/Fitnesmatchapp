
import { Plan, ProfessionalProfile, User, UserRole, Booking, BookingStatus, TimeSlot, Category, PlanType } from '../types';
import { PLANS, MOCK_PROS, MOCK_CLIENTS, MOCK_CATEGORIES, MOCK_SLOTS } from './mockData';

const KEYS = {
  PLANS: 'fm_plans_v3',
  PROS: 'fm_pros_v3',
  CLIENTS: 'fm_clients_v3',
  CATEGORIES: 'fm_categories_v3',
  BOOKINGS: 'fm_bookings_v3',
  SLOTS: 'fm_slots_v3',
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
  
  savePro: (pro: ProfessionalProfile) => {
    const data = DB.getPros();
    const idx = data.findIndex(p => p.id === pro.id);
    if (idx > -1) data[idx] = pro;
    else data.push(pro);
    localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    notify();
  },

  saveUser: (user: User) => {
    const data = DB.getClients();
    const idx = data.findIndex(u => u.id === user.id);
    if (idx > -1) {
      data[idx] = user;
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    } else {
      // Se não for cliente, pode ser admin ou pro sendo salvo como user genérico
      const pros = DB.getPros();
      const pIdx = pros.findIndex(p => p.id === user.id);
      if (pIdx > -1) {
        pros[pIdx] = { ...pros[pIdx], ...user };
        localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
      }
    }
    notify();
  },

  deleteUser: (id: string, role: UserRole) => {
    if (role === UserRole.TEACHER) {
      const data = DB.getPros().filter(p => p.id !== id);
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients().filter(c => c.id !== id);
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },

  updateUserStatus: (id: string, role: UserRole, status: any) => {
    if (role === UserRole.TEACHER) {
      const data = DB.getPros().map(p => p.id === id ? { ...p, status } : p);
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = DB.getClients().map(c => c.id === id ? { ...c, status } : c);
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
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
  getBookings: (): Booking[] => JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || '[]'),
  getTeacherBookings: (id: string) => DB.getBookings().filter(b => b.teacherId === id),
  getClientBookings: (id: string) => DB.getBookings().filter(b => b.clientId === id),
  
  updateTrainerPlan: (id: string, active: boolean) => {
    const data = DB.getPros().map(p => p.id === id ? { ...p, planActive: active } : p);
    localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    notify();
  },

  assignPlanToTrainer: (trainerId: string, planId: string) => {
    const plans = DB.getPlans();
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const pros = DB.getPros();
    const idx = pros.findIndex(p => p.id === trainerId);
    if (idx === -1) return;

    const now = new Date();
    const expiry = new Date(now.setMonth(now.getMonth() + plan.durationMonths));

    pros[idx] = {
      ...pros[idx],
      planActive: true,
      planType: plan.name as PlanType,
      planExpiry: expiry.toISOString()
    };

    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
  },

  renewTrainerExpiry: (trainerId: string) => {
    const pros = DB.getPros();
    const idx = pros.findIndex(p => p.id === trainerId);
    if (idx === -1) return;

    const currentExpiry = pros[idx].planExpiry ? new Date(pros[idx].planExpiry) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    
    // Añadir 30 días exactos
    baseDate.setDate(baseDate.getDate() + 30);

    pros[idx] = {
      ...pros[idx],
      planActive: true,
      planExpiry: baseDate.toISOString()
    };

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

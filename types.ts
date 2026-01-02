
export enum AppState {
  LOADING = 'loading',
  WELCOME = 'welcome',
  LOGIN = 'login',
  MAIN = 'main'
}

export enum UserRole {
  CLIENT = 'client',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export enum BookingStatus {
  PENDIENTE = 'Pendiente',
  CONFIRMADA = 'Confirmada',
  RECHAZADA = 'Rechazada',
  CANCELADA = 'Cancelada'
}

export enum PlanType {
  MENSUAL = 'Mensual',
  TRIMESTRAL = 'Trimestral',
  ANUAL = 'Anual'
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  role: UserRole;
  email: string;
  phone: string;
  phoneVerified: boolean;
  city: string;
  status: 'active' | 'blocked' | 'deactivated';
  banUntil?: string;
  planActive?: boolean;
  planType?: PlanType;
  planExpiry?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconClass: string;
  colorHex: string;
  displayOrder: number;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  teacherId: string;
  teacherName: string;
  slotId: string;
  date: string;
  price: number;
  status: BookingStatus;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  proUserId: string;
  startAt: string;
  endAt: string;
  capacityTotal: number;
  capacityBooked: number;
  type: 'grupo' | 'individual';
  location: string;
  price: number;
  status: 'active' | 'cancelled';
}

export interface ProfessionalProfile extends User {
  areas: string[];
  bio: string;
  location: string;
  modalities: ('presencial' | 'online')[];
  rating: number;
  reviews: number;
  image: string;
  price: number;
}

export interface Plan {
  id: string;
  name: string;
  durationMonths: number;
  description: string;
  price: number;
  promoPrice?: number;
  maxPhotos: number;
  displayOrder: number;
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  includesAnalytics: boolean;
  prioritySupport: boolean;
}

export enum AppState {
  LOADING = "loading",
  WELCOME = "welcome",
  LOGIN = "login",
  MAIN = "main",
}

export enum UserRole {
  CLIENT = "client",
  TEACHER = "teacher",
  ADMIN = "admin",
}

export enum BookingStatus {
  PENDIENTE = "Pendiente",
  CONFIRMADA = "Confirmada",
  RECHAZADA = "Rechazada",
  CANCELADA = "Cancelada",
}

export enum PlanType {
  BASICO = "Básico",
  PROFESIONAL = "Profesional",
  PREMIUM = "Premium",
  // Legado
  MENSUAL = "Mensual",
  TRIMESTRAL = "Trimestral",
  ANUAL = "Anual",
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
  status: "active" | "blocked" | "deactivated";
  banUntil?: string;
  planActive?: boolean;
  planType?: PlanType;
  planExpiry?: string;
  activatedAt?: string;
  createdAt?: string;
  image?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "booking" | "system" | "chat";
  isRead: boolean;
  timestamp: string;
}

export interface ChatAttachment {
  id: string;
  type: "image" | "pdf";
  url: string;
  fileName?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead?: boolean;
  attachment?: ChatAttachment;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastTimestamp?: string;
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
  message?: string;
}

export interface TimeSlot {
  id: string;
  proUserId: string;
  startAt: string;
  endAt: string;
  capacityTotal: number;
  capacityBooked: number;
  type: "grupo" | "individual";
  location: string;
  price: number;
  status: "active" | "cancelled";
}

export interface ProfessionalProfile extends User {
  areas: string[];
  bio: string;
  location: string;
  modalities: ("presencial" | "online")[];
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

// =====================================================
// NOVOS TIPOS - Sistema de Avaliações
// =====================================================
export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  clientImage?: string;
  professionalId: string;
  bookingId: string;
  rating: number; // 1-5 estrelas
  comment: string;
  reply?: string; // Resposta do profissional
  replyAt?: string;
  createdAt: string;
  isPublic: boolean;
}

// =====================================================
// Sistema de Favoritos
// =====================================================
export interface Favorite {
  id: string;
  clientId: string;
  professionalId: string;
  createdAt: string;
}

// =====================================================
// Pacotes de Sessões
// =====================================================
export interface SessionPackage {
  id: string;
  professionalId: string;
  name: string;
  description: string;
  totalSessions: number;
  price: number; // Preço total do pacote
  pricePerSession: number; // Calculado
  discountPercent: number; // Ex: 10% desconto
  validDays: number; // Validade em dias após compra
  isActive: boolean;
  createdAt: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  packageId: string;
  professionalId: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchaseDate: string;
  expiryDate: string;
  status: "active" | "expired" | "completed";
}

// =====================================================
// Agenda Recorrente
// =====================================================
export interface RecurringBooking {
  id: string;
  clientId: string;
  professionalId: string;
  dayOfWeek: number; // 0-6 (domingo-sábado)
  startTime: string; // "18:00"
  endTime: string; // "19:00"
  isActive: boolean;
  createdAt: string;
  lastGeneratedAt?: string; // Última vez que gerou reservas
}

// =====================================================
// Histórico de Treinos
// =====================================================
export interface TrainingLog {
  id: string;
  clientId: string;
  professionalId: string;
  bookingId: string;
  date: string;
  duration: number; // minutos
  notes?: string; // Notas do profissional
  clientNotes?: string; // Notas do cliente
  completed: boolean;
  createdAt: string;
}

// =====================================================
// Política de Cancelamento
// =====================================================
export interface CancellationPolicy {
  minHoursBeforeSession: number; // Ex: 24h
  refundPercentage: number; // Ex: 100% se cancelar dentro do prazo
  lateCancelPenalty: number; // Porcentagem cobrada se cancelar tarde
  noShowPenalty: number; // Porcentagem se não aparecer
}

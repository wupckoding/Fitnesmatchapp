
import { ProfessionalProfile, Plan, UserRole, User, TimeSlot, Category, PlanType } from '../types';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Pádel', slug: 'padel', description: 'Entrenadores de pádel profesionales', iconClass: '🎾', colorHex: '#3B82F6', displayOrder: 1, isActive: true, metaTitle: '', metaDescription: '' },
  { id: 'cat-2', name: 'Tenis', slug: 'tenis', description: 'Clases de tenis para todos los niveles', iconClass: '🎾', colorHex: '#10B981', displayOrder: 2, isActive: true, metaTitle: '', metaDescription: '' },
  { id: 'cat-3', name: 'Pilates', slug: 'pilates', description: 'Instructores certificados de Pilates', iconClass: '🧘', colorHex: '#8B5CF6', displayOrder: 3, isActive: true, metaTitle: '', metaDescription: '' },
  { id: 'cat-4', name: 'Yoga', slug: 'yoga', description: 'Profesores de yoga y meditación', iconClass: '🧘', colorHex: '#F59E0B', displayOrder: 4, isActive: true, metaTitle: '', metaDescription: '' },
];

export const PLANS: Plan[] = [
  { 
    id: 'plan-free',
    name: 'Prueba',
    durationMonths: 1,
    description: 'Conoce la plataforma sin compromiso',
    price: 0,
    maxPhotos: 1,
    maxReservationsPerMonth: 1,
    displayOrder: 1,
    features: [
      '1 reserva de prueba',
      'Perfil básico en el catálogo',
      'Chat con clientes',
      'Panel de gestión básico'
    ],
    isActive: true,
    isFeatured: false,
    includesAnalytics: false,
    prioritySupport: false,
    highlightedProfile: false,
    customBranding: false,
    chatEnabled: true,
    color: 'from-slate-500 to-slate-600'
  },
  { 
    id: 'plan-starter',
    name: 'Starter',
    durationMonths: 1,
    description: 'Ideal para comenzar tu negocio',
    price: 12000,
    maxPhotos: 3,
    maxReservationsPerMonth: 15,
    displayOrder: 2,
    features: [
      'Todo lo del plan Prueba',
      '15 reservas por mes',
      '3 fotos en tu perfil',
      'Horarios personalizados',
      'Notificaciones push',
      'Soporte por email'
    ],
    isActive: true,
    isFeatured: false,
    includesAnalytics: false,
    prioritySupport: false,
    highlightedProfile: false,
    customBranding: false,
    chatEnabled: true,
    color: 'from-emerald-500 to-teal-600'
  },
  { 
    id: 'plan-pro',
    name: 'Profesional',
    durationMonths: 1,
    description: 'Para profesionales establecidos',
    price: 25000,
    promoPrice: 22000,
    maxPhotos: 8,
    maxReservationsPerMonth: 50,
    displayOrder: 3,
    features: [
      'Todo lo del plan Starter',
      '50 reservas por mes',
      '8 fotos en tu perfil',
      'Estadísticas de rendimiento',
      'Perfil destacado en búsquedas',
      'Soporte prioritario',
      'Insignia verificado'
    ],
    isActive: true,
    isFeatured: true,
    includesAnalytics: true,
    prioritySupport: true,
    highlightedProfile: true,
    customBranding: false,
    chatEnabled: true,
    color: 'from-blue-500 to-indigo-600'
  },
  { 
    id: 'plan-elite',
    name: 'Elite',
    durationMonths: 1,
    description: 'Sin límites, máximo potencial',
    price: 45000,
    promoPrice: 39000,
    maxPhotos: 20,
    maxReservationsPerMonth: -1, // Unlimited
    displayOrder: 4,
    features: [
      'Todo lo del plan Profesional',
      'Reservas ILIMITADAS',
      '20 fotos + videos',
      'Analytics avanzados',
      'Perfil premium destacado',
      'Soporte 24/7 WhatsApp',
      'Promociones personalizadas',
      'Primero en resultados'
    ],
    isActive: true,
    isFeatured: false,
    includesAnalytics: true,
    prioritySupport: true,
    highlightedProfile: true,
    customBranding: true,
    chatEnabled: true,
    color: 'from-amber-500 to-orange-600'
  },
];

export const MOCK_PROS: ProfessionalProfile[] = [
  {
    id: 'pro-1',
    name: 'Julio Jaen',
    lastName: 'Umaña',
    email: 'julio@fitness.cr',
    phone: '8888-0001',
    phoneVerified: true,
    role: UserRole.TEACHER,
    city: 'San José',
    status: 'active',
    areas: ['Pilates', 'Yoga'],
    bio: 'Especialista en Reformer con 10 años en Escazú.',
    location: 'Escazú Centro',
    modalities: ['presencial'],
    rating: 4.9,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop',
    planActive: true,
    planType: PlanType.TRIMESTRAL,
    planExpiry: '2025-12-27T00:00:00Z',
    createdAt: '2025-12-27T10:00:00Z',
    price: 15000
  },
  {
    id: 'pro-2',
    name: 'Carlos',
    lastName: 'Mora',
    email: 'carlos@fitness.cr',
    phone: '8888-0002',
    phoneVerified: false,
    role: UserRole.TEACHER,
    city: 'Heredia',
    status: 'active',
    areas: ['Personal Trainer', 'Crossfit'],
    bio: 'Entrenamiento funcional y de alto rendimiento.',
    location: 'Santa Ana',
    modalities: ['presencial', 'online'],
    rating: 4.8,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    planActive: true,
    planType: PlanType.MENSUAL,
    planExpiry: '2026-06-15T00:00:00Z',
    createdAt: '2025-06-15T10:00:00Z',
    price: 12000
  }
];

export const MOCK_CLIENTS: User[] = [
  {
    id: 'cli-1',
    name: 'Juan',
    lastName: 'Pérez',
    email: 'juan@gmail.com',
    phone: '7777-1111',
    phoneVerified: true,
    role: UserRole.CLIENT,
    city: 'San José',
    status: 'active',
    createdAt: '2025-11-01T08:00:00Z'
  },
  {
    id: 'cli-2',
    name: 'Maria',
    lastName: 'Rodriguez',
    email: 'maria@outlook.com',
    phone: '7777-2222',
    phoneVerified: true,
    role: UserRole.CLIENT,
    city: 'Escazú',
    status: 'active',
    createdAt: '2025-11-15T12:00:00Z'
  }
];

export const MOCK_SLOTS: TimeSlot[] = [
  {
    id: 'slot-1',
    proUserId: 'pro-1',
    startAt: '2025-11-20T08:00:00Z',
    endAt: '2025-11-20T09:00:00Z',
    capacityTotal: 10,
    capacityBooked: 2,
    type: 'grupo',
    location: 'Escazú Centro',
    price: 15000,
    status: 'active'
  }
];

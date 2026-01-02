
import { ProfessionalProfile, Plan, UserRole, User, TimeSlot, Category } from '../types';

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Pádel', slug: 'padel', description: 'Entrenadores de pádel profesionales', iconClass: '🎾', colorHex: '#3B82F6', displayOrder: 1, isActive: true, metaTitle: '', metaDescription: '' },
  { id: 'cat-2', name: 'Tenis', slug: 'tenis', description: 'Clases de tenis para todos los niveles', iconClass: '🎾', colorHex: '#10B981', displayOrder: 2, isActive: true, metaTitle: '', metaDescription: '' },
  { id: 'cat-3', name: 'Pilates', slug: 'pilates', description: 'Instructores certificados de Pilates', iconClass: '🧘', colorHex: '#8B5CF6', displayOrder: 3, isActive: true, metaTitle: '', metaDescription: '' },
  { id: 'cat-4', name: 'Yoga', slug: 'yoga', description: 'Profesores de yoga y meditación', iconClass: '🧘', colorHex: '#F59E0B', displayOrder: 4, isActive: true, metaTitle: '', metaDescription: '' },
];

export const PLANS: Plan[] = [
  { 
    id: 'plan-1',
    name: 'Básico',
    durationMonths: 1,
    description: 'Plan mensual para empezar',
    price: 20000,
    maxPhotos: 1,
    displayOrder: 1,
    features: ['Presencia en el catálogo', 'Soporte estándar'],
    isActive: true,
    isFeatured: false,
    includesAnalytics: false,
    prioritySupport: false
  },
  { 
    id: 'plan-2',
    name: 'Profesional',
    durationMonths: 3,
    description: 'Plan trimestral con descuento',
    price: 60000,
    promoPrice: 52500,
    maxPhotos: 5,
    displayOrder: 2,
    features: ['Presencia en el catálogo', 'Soporte prioritário', 'Estadísticas básicas'],
    isActive: true,
    isFeatured: true,
    includesAnalytics: false,
    prioritySupport: true
  },
  { 
    id: 'plan-3',
    name: 'Premium',
    durationMonths: 6,
    description: 'Plan semestral - Mejor valor',
    price: 120000,
    promoPrice: 107500,
    maxPhotos: 10,
    displayOrder: 3,
    features: ['Presencia destacada', 'Soporte prioritário 24/7', 'Analíticas avanzadas'],
    isActive: true,
    isFeatured: false,
    includesAnalytics: true,
    prioritySupport: true
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
    image: 'https://images.unsplash.com/photo-1518611012118-2961d6a297e7?w=400',
    planActive: true,
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
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
    planActive: true,
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

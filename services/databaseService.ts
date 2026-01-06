import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  Plan,
  ProfessionalProfile,
  User,
  UserRole,
  Booking,
  BookingStatus,
  TimeSlot,
  Category,
  PlanType,
  ChatMessage,
  Conversation,
  Notification,
} from "../types";
import {
  PLANS,
  MOCK_PROS,
  MOCK_CLIENTS,
  MOCK_CATEGORIES,
  MOCK_SLOTS,
} from "./mockData";

// =====================================================
// KEYS PARA LOCALSTORAGE (sempre usado como cache)
// =====================================================
const KEYS = {
  PLANS: "fm_plans_v3",
  PROS: "fm_pros_v3",
  CLIENTS: "fm_clients_v3",
  CATEGORIES: "fm_categories_v3",
  BOOKINGS: "fm_bookings_v3",
  SLOTS: "fm_slots_v3",
  MESSAGES: "fm_messages_v3",
  CONVERSATIONS: "fm_convs_v3",
  NOTIFICATIONS: "fm_notifs_v3",
  INITIALIZED: "fm_is_init_v3",
  DELETED_BOOKINGS: "fm_deleted_bookings", // IDs de reservas deletadas localmente
};

const notify = () => {
  window.dispatchEvent(new CustomEvent("fm-db-update", { detail: Date.now() }));
};

// =====================================================
// THROTTLE PARA SYNC (evitar muitas requisições)
// =====================================================
let lastSyncTime = 0;
let isSyncing = false;
const MIN_SYNC_INTERVAL = 5000; // 5 segundos entre syncs

const canSync = (): boolean => {
  const now = Date.now();
  if (isSyncing) return false;
  if (now - lastSyncTime < MIN_SYNC_INTERVAL) return false;
  return true;
};

const markSyncStart = () => {
  isSyncing = true;
  lastSyncTime = Date.now();
};

const markSyncEnd = () => {
  isSyncing = false;
};

// =====================================================
// HELPER: Converter entre formatos Supabase ↔ App
// =====================================================
const mapProfileToUser = (
  profile: any,
  professional?: any
): User | ProfessionalProfile => {
  const base: User = {
    id: profile.id,
    name: profile.name || "Usuario",
    lastName: profile.last_name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    phoneVerified: profile.phone_verified || false,
    role: profile.role as UserRole,
    city: profile.city || "San José",
    status:
      (profile.status as "active" | "blocked" | "deactivated") || "active",
    image: profile.avatar_url || "",
    createdAt: profile.created_at,
  };

  if (professional) {
    return {
      ...base,
      // Usar status do professional se disponível
      status: (professional.status as "active" | "blocked" | "deactivated") || base.status,
      areas: professional.areas || [],
      bio: professional.bio || "",
      location: professional.location || "",
      modalities: professional.modalities || ["presencial"],
      rating: professional.rating || 5,
      reviews: professional.reviews || 0,
      image: profile.avatar_url || "",
      price: professional.price || 0,
      planActive: professional.plan_active || false,
      planType: professional.plan_type as PlanType,
      planExpiry: professional.plan_expiry,
      requestedPlanId: professional.requested_plan_id || profile.requested_plan_id,
      requestedPlanAt: professional.requested_plan_at || profile.requested_plan_at,
    } as ProfessionalProfile;
  }

  return base;
};

const mapSlotFromDB = (slot: any): TimeSlot => ({
  id: slot.id,
  proUserId: slot.professional_id,
  startAt: slot.start_at,
  endAt: slot.end_at,
  capacityTotal: slot.capacity_total,
  capacityBooked: slot.capacity_booked,
  type: slot.slot_type,
  location: slot.location,
  price: slot.price,
  status: slot.status,
});

const mapBookingFromDB = (booking: any): Booking => ({
  id: booking.id,
  clientId: booking.client_id,
  clientName: booking.client_name,
  teacherId: booking.professional_id,
  teacherName: booking.teacher_name,
  slotId: booking.slot_id,
  date: booking.booking_date,
  price: booking.price,
  status: booking.status as BookingStatus,
  createdAt: booking.created_at,
  message: booking.message,
});

const mapCategoryFromDB = (cat: any): Category => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  iconClass: cat.icon_class,
  colorHex: cat.color_hex,
  displayOrder: cat.display_order,
  isActive: cat.is_active,
  metaTitle: cat.meta_title,
  metaDescription: cat.meta_description,
});

const mapPlanFromDB = (plan: any): Plan => ({
  id: plan.id,
  name: plan.name,
  durationMonths: plan.duration_months,
  description: plan.description,
  price: plan.price,
  promoPrice: plan.promo_price,
  maxPhotos: plan.max_photos,
  maxReservationsPerMonth: plan.max_reservations_per_month || 10,
  displayOrder: plan.display_order,
  features: plan.features || [],
  isActive: plan.is_active,
  isFeatured: plan.is_featured,
  includesAnalytics: plan.includes_analytics,
  prioritySupport: plan.priority_support,
  highlightedProfile: plan.highlighted_profile || false,
  customBranding: plan.custom_branding || false,
  chatEnabled: plan.chat_enabled !== false,
  color: plan.color || "from-slate-500 to-slate-600",
});

// =====================================================
// SYNC DATA FROM SUPABASE TO LOCALSTORAGE (BACKGROUND)
// =====================================================

// Sistema de proteção contra sobrescrita de dados locais
let pendingLocalWrites = 0;
let lastLocalWriteTime = 0;

const markLocalWrite = () => {
  pendingLocalWrites++;
  lastLocalWriteTime = Date.now();
  console.log("🔒 Escrita local marcada - sync bloqueado por 8s");
  // Auto-decrementar após 10 segundos
  setTimeout(() => {
    pendingLocalWrites = Math.max(0, pendingLocalWrites - 1);
  }, 10000);
};

const canSyncSafely = () => {
  // Não sincronizar se houve escrita local nos últimos 8 segundos
  const timeSinceWrite = Date.now() - lastLocalWriteTime;
  const canSync = pendingLocalWrites === 0 || timeSinceWrite > 8000;
  if (!canSync) {
    console.log(`⏳ Sync bloqueado (${Math.round((8000 - timeSinceWrite) / 1000)}s restantes)`);
  }
  return canSync;
};

const syncFromSupabase = async (fullClean = false) => {
  if (!isSupabaseConfigured()) return;

  // Throttle - não permitir sync muito frequente
  if (!fullClean && !canSync()) {
    console.log("⏳ Sync ignorado (throttle)");
    return;
  }
  
  // Proteção contra sobrescrita de dados locais recentes
  if (!fullClean && !canSyncSafely()) {
    console.log("⏳ Sync adiado (escrita local pendente)");
    return;
  }

  markSyncStart();

  try {
    console.log(
      "📥 Sincronizando com Supabase...",
      fullClean ? "(limpeza completa)" : "(merge)"
    );

    // Limpar APENAS se for limpeza completa explícita
    if (fullClean) {
      console.log("🧹 Limpeza completa do cache local...");
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    }
    // NÃO limpar dados existentes em sync normal - apenas sobrescrever com dados novos

    // Sync Plans - Preferir planos locais se Supabase não tiver os novos
    const { data: remotePlans, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("display_order");
    
    if (remotePlans && remotePlans.length > 0) {
      const mappedPlans = remotePlans.map(mapPlanFromDB);
      // Verificar se os planos remotos têm o plano gratuito (Prueba)
      const hasFreePlan = mappedPlans.some(p => p.price === 0 || p.name === "Prueba");
      if (hasFreePlan) {
        localStorage.setItem(KEYS.PLANS, JSON.stringify(mappedPlans));
        console.log(`  ✓ ${mappedPlans.length} planos sincronizados do Supabase`);
      } else {
        // Supabase não tem os planos novos, usar MOCK_PLANS
        console.log("  📦 Usando planos locais (Supabase desatualizado)");
        localStorage.setItem(KEYS.PLANS, JSON.stringify(PLANS));
      }
    } else if (plansError) {
      console.warn("  ⚠ Erro ao buscar planos:", plansError.message);
      // Usar planos locais como fallback
      localStorage.setItem(KEYS.PLANS, JSON.stringify(PLANS));
    } else {
      // Não há planos no Supabase, usar locais
      console.log("  📦 Sem planos no Supabase, usando locais");
      localStorage.setItem(KEYS.PLANS, JSON.stringify(PLANS));
    }

    // Sync Categories
    const { data: cats, error: catsError } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
    if (cats && cats.length > 0) {
      localStorage.setItem(
        KEYS.CATEGORIES,
        JSON.stringify(cats.map(mapCategoryFromDB))
      );
      console.log(`  ✓ ${cats.length} categorias sincronizadas`);
    } else if (catsError) {
      console.warn("  ⚠ Erro ao buscar categorias:", catsError.message);
    }

    // Sync ALL Teachers (profiles com role = teacher)
    const { data: teacherProfiles, error: teachersError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("created_at", { ascending: false });

    if (teacherProfiles) {
      // Buscar dados adicionais da tabela professionals
      const allPros: ProfessionalProfile[] = [];

      // Obter dados locais para mesclar (preservar mudanças locais)
      const localPros: ProfessionalProfile[] = JSON.parse(
        localStorage.getItem(KEYS.PROS) || "[]"
      );
      const localProsMap = new Map(localPros.map(p => [p.id, p]));

      for (const profile of teacherProfiles) {
        const { data: proData } = await supabase
          .from("professionals")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        // Verificar se temos dados locais mais recentes
        const localPro = localProsMap.get(profile.id);
        
        if (proData) {
          const remotePro = mapProfileToUser(profile, proData) as ProfessionalProfile;
          
          // MERGE: Preservar campos locais que são mais importantes
          // (planActive, planType, planExpiry, requestedPlanId, etc.)
          if (localPro && localPro.planActive && !remotePro.planActive) {
            // Local tem plano ativo, remoto não - manter local
            console.log(`  ⚠️ Preservando dados locais para ${profile.id}`);
            allPros.push({
              ...remotePro,
              planActive: localPro.planActive,
              planType: localPro.planType,
              planExpiry: localPro.planExpiry,
              status: localPro.status,
              requestedPlanId: localPro.requestedPlanId,
              requestedPlanAt: localPro.requestedPlanAt,
            });
          } else {
            allPros.push(remotePro);
          }
        } else {
          // Professor existe no profiles mas não no professionals ainda
          // Se temos dados locais, usar eles
          if (localPro && (localPro.planActive || localPro.requestedPlanId)) {
            console.log(`  ⚠️ Usando dados locais para ${profile.id} (não existe no Supabase)`);
            allPros.push(localPro);
          } else {
            allPros.push({
              id: profile.id,
              name: profile.name || "Profesional",
              lastName: profile.last_name || "",
              email: profile.email || "",
              phone: profile.phone || "",
              phoneVerified: profile.phone_verified || false,
              role: UserRole.TEACHER,
              city: profile.city || "Costa Rica",
              status: localPro?.status || "deactivated",
              areas: localPro?.areas || [],
              bio: localPro?.bio || "",
              location: localPro?.location || profile.city || "Costa Rica",
              modalities: localPro?.modalities || ["presencial"],
              rating: localPro?.rating || 5,
              reviews: localPro?.reviews || 0,
              image: profile.avatar_url || localPro?.image || "",
              price: localPro?.price || 0,
              planActive: localPro?.planActive || false,
              planType: localPro?.planType,
              planExpiry: localPro?.planExpiry,
              requestedPlanId: localPro?.requestedPlanId,
              requestedPlanAt: localPro?.requestedPlanAt,
            } as ProfessionalProfile);
          }
        }
      }

      localStorage.setItem(KEYS.PROS, JSON.stringify(allPros));
      console.log(`  ✓ ${allPros.length} profesores sincronizados (com merge)`);
    } else if (teachersError) {
      console.warn("  ⚠ Erro ao buscar professores:", teachersError.message);
    }

    // Sync Clients - Limitar para não estourar localStorage
    const { data: clients, error: clientsError } = await supabase
      .from("profiles")
      .select(
        "id, name, last_name, email, phone, role, city, status, created_at, avatar_url"
      )
      .eq("role", "client")
      .order("created_at", { ascending: false })
      .limit(100); // Limitar a 100 clientes mais recentes

    if (clients) {
      try {
        const mappedClients = clients.map((p) => ({
          id: p.id,
          name: p.name || "Usuario",
          lastName: p.last_name || "",
          email: p.email || "",
          phone: p.phone || "",
          phoneVerified: false,
          role: UserRole.CLIENT,
          city: p.city || "San José",
          status: p.status || "active",
          image: p.avatar_url || "", // Mapear avatar_url para image
          createdAt: p.created_at,
        }));
        localStorage.setItem(KEYS.CLIENTS, JSON.stringify(mappedClients));
        console.log(`  ✓ ${clients.length} clientes sincronizados`);
      } catch (storageError) {
        console.warn(
          "  ⚠ Não foi possível salvar clientes no cache (localStorage cheio)"
        );
      }
    } else if (clientsError) {
      console.warn("  ⚠ Erro ao buscar clientes:", clientsError.message);
    }

    // Sync Time Slots
    try {
      const { data: slots, error: slotsError } = await supabase
        .from("time_slots")
        .select("*, professionals!inner(user_id)")
        .order("start_at", { ascending: true });

      if (slots && slots.length > 0) {
        const mappedSlots = slots.map((s: any) => ({
          id: s.id,
          proUserId: s.professionals?.user_id || s.professional_id,
          startAt: s.start_at,
          endAt: s.end_at,
          capacityTotal: s.capacity_total,
          capacityBooked: s.capacity_booked || 0,
          type: s.slot_type || "individual",
          location: s.location || "",
          price: s.price || 0,
          status: s.status || "active",
        }));
        localStorage.setItem(KEYS.SLOTS, JSON.stringify(mappedSlots));
        console.log(`  ✓ ${slots.length} horários sincronizados`);
      } else {
        localStorage.setItem(KEYS.SLOTS, JSON.stringify([]));
        if (slotsError)
          console.warn("  ⚠ Erro ao buscar slots:", slotsError.message);
      }
    } catch (slotError) {
      console.warn("  ⚠ Erro ao sincronizar slots:", slotError);
      localStorage.setItem(KEYS.SLOTS, JSON.stringify([]));
    }

    // Sync Bookings
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("*, professionals!inner(user_id)")
        .order("created_at", { ascending: false });

      if (bookings && bookings.length > 0) {
        // Obter lista de IDs deletados localmente
        const deletedIds = JSON.parse(
          localStorage.getItem(KEYS.DELETED_BOOKINGS) || "[]"
        );

        const mappedBookings = bookings
          .filter((b: any) => !deletedIds.includes(b.id)) // Filtrar deletados
          .map((b: any) => ({
            id: b.id,
            clientId: b.client_id,
            clientName: b.client_name || "Cliente",
            teacherId: b.professionals?.user_id || b.professional_id,
            teacherName: b.teacher_name || "Profesional",
            slotId: b.slot_id,
            date: b.booking_date,
            price: b.price || 0,
            status: b.status || "pendiente",
            createdAt: b.created_at,
            message: b.message || "",
            professionalId: b.professionals?.user_id || b.professional_id, // Para compatibilidade
          }));
        localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(mappedBookings));
        console.log(
          `  ✓ ${mappedBookings.length} reservas sincronizadas (${deletedIds.length} ignoradas)`
        );
      } else {
        // Manter bookings existentes se não houver novos do Supabase
        if (bookingsError) {
          console.warn("  ⚠ Erro ao buscar bookings:", bookingsError.message);
        }
      }
    } catch (bookingError) {
      console.warn("  ⚠ Erro ao sincronizar bookings:", bookingError);
    }

    // Sync Messages
    try {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);

      if (messages && messages.length > 0) {
        const mappedMessages = messages.map((m: any) => {
          const msg: any = {
            id: m.id,
            senderId: m.sender_id,
            receiverId: m.receiver_id,
            text: m.text,
            timestamp: m.created_at,
            isRead: m.is_read || false,
          };

          // Mapear attachment se existir
          if (m.attachment_url) {
            msg.attachment = {
              id: `att-${m.id}`,
              type: m.attachment_type || "image",
              url: m.attachment_url,
              fileName: m.attachment_name || "arquivo",
              size: m.attachment_size || 0,
            };
          }

          return msg;
        });
        localStorage.setItem(KEYS.MESSAGES, JSON.stringify(mappedMessages));
        console.log(`  ✓ ${messages.length} mensagens sincronizadas`);
      } else {
        localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
        if (messagesError)
          console.warn("  ⚠ Erro ao buscar mensagens:", messagesError.message);
      }
    } catch (msgError) {
      console.warn("  ⚠ Erro ao sincronizar mensagens:", msgError);
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
    }

    // Sync Notifications
    try {
      const { data: notifs, error: notifsError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (notifs && notifs.length > 0) {
        const mappedNotifs = notifs.map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          type: n.notification_type || "general",
          isRead: n.is_read || false,
          timestamp: n.created_at,
        }));
        localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(mappedNotifs));
        console.log(`  ✓ ${notifs.length} notificações sincronizadas`);
      } else {
        localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
        if (notifsError)
          console.warn("  ⚠ Erro ao buscar notificações:", notifsError.message);
      }
    } catch (notifError) {
      console.warn("  ⚠ Erro ao sincronizar notificações:", notifError);
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
    }

    // Sync Conversations (reconstituir a partir das mensagens)
    try {
      const messages: any[] = JSON.parse(
        localStorage.getItem(KEYS.MESSAGES) || "[]"
      );
      const conversationsMap = new Map<string, any>();

      messages.forEach((msg: any) => {
        const participants = [msg.senderId, msg.receiverId].sort();
        const convId = participants.join("-");

        if (!conversationsMap.has(convId)) {
          conversationsMap.set(convId, {
            id: convId,
            participants: participants,
            lastMessage: msg.text,
            lastTimestamp: msg.timestamp,
          });
        } else {
          const existing = conversationsMap.get(convId);
          if (new Date(msg.timestamp) > new Date(existing.lastTimestamp)) {
            existing.lastMessage = msg.text;
            existing.lastTimestamp = msg.timestamp;
          }
        }
      });

      const conversations = Array.from(conversationsMap.values());
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
      console.log(`  ✓ ${conversations.length} conversas reconstruídas`);
    } catch (convError) {
      console.warn("  ⚠ Erro ao reconstruir conversas:", convError);
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify([]));
    }

    notify();
    console.log("✅ Sincronização completa!");
  } catch (err) {
    console.error("❌ Erro na sincronização com Supabase:", err);
  } finally {
    markSyncEnd();
  }
};

// Exportar para uso externo
export { markLocalWrite };

// =====================================================
// DATABASE SERVICE (SYNC API com CACHE LOCAL)
// =====================================================
export const DB = {
  // Inicialização - CACHE PRIMEIRO, SUPABASE EM BACKGROUND
  init: () => {
    console.log("🔄 Inicializando banco de dados...");

    // ESTRATÉGIA: Manter cache e mostrar imediatamente, sincronizar em background
    if (isSupabaseConfigured()) {
      console.log("☁️ Supabase detectado - usando cache + sync em background");

      // Garantir que temos dados mínimos para a UI
      // SEMPRE atualizar os planos com a versão mais recente do código
      const existingPlans = JSON.parse(
        localStorage.getItem(KEYS.PLANS) || "[]"
      );
      // Verificar se os planos têm os novos campos (maxReservationsPerMonth)
      const plansNeedUpdate = existingPlans.length === 0 || 
        !existingPlans.some((p: any) => p.maxReservationsPerMonth !== undefined);
      if (plansNeedUpdate) {
        console.log("📦 Atualizando planos com nova estrutura...");
        localStorage.setItem(KEYS.PLANS, JSON.stringify(PLANS));
      }

      const existingCategories = JSON.parse(
        localStorage.getItem(KEYS.CATEGORIES) || "[]"
      );
      if (existingCategories.length === 0) {
        localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(MOCK_CATEGORIES));
      }

      // Limpar APENAS chaves antigas/legado (não limpar dados atuais!)
      localStorage.removeItem("fm_pros");
      localStorage.removeItem("fm_clients");
      localStorage.removeItem("fm_pros_v2");
      localStorage.removeItem("fm_clients_v2");
      localStorage.removeItem("fm_is_init");
      localStorage.removeItem("fm_is_init_v2");

      // Sincronização em BACKGROUND (não bloqueia UI)
      // Usar setTimeout para não bloquear a renderização inicial
      setTimeout(() => {
        syncFromSupabase(false)
          .then(() => {
            console.log("✅ Dados sincronizados do Supabase em background");
            notify();
          })
          .catch((err) => {
            console.error("❌ Erro ao sincronizar com Supabase:", err);
          });
      }, 100);
    } else {
      console.log("📦 Supabase não configurado - usando dados mock");
      // Inicializar com mock data apenas se não tiver Supabase
      if (!localStorage.getItem(KEYS.INITIALIZED)) {
        localStorage.setItem(KEYS.PROS, JSON.stringify(MOCK_PROS));
        localStorage.setItem(KEYS.CLIENTS, JSON.stringify(MOCK_CLIENTS));
        localStorage.setItem(KEYS.BOOKINGS, JSON.stringify([]));
        localStorage.setItem(KEYS.SLOTS, JSON.stringify(MOCK_SLOTS));
        localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
        localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify([]));
        localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
        localStorage.setItem(KEYS.INITIALIZED, "true");
      }
    }

    notify();
  },

  // Forçar sincronização com Supabase
  forceSync: async () => {
    if (isSupabaseConfigured()) {
      console.log("🔄 Forçando sincronização com Supabase...");
      await syncFromSupabase();
      return true;
    }
    return false;
  },

  // Limpar cache local e resincronizar COMPLETAMENTE
  clearCacheAndSync: async () => {
    console.log("🧹 Limpando TODOS os dados locais...");

    // Limpar ABSOLUTAMENTE TUDO do localStorage relacionado ao app
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));

    // Limpar também chaves antigas que podem existir
    const keysToRemove = [
      "fm_pros",
      "fm_clients",
      "fm_bookings",
      "fm_slots",
      "fm_pros_v2",
      "fm_clients_v2",
      "fm_bookings_v2",
      "fm_session_user",
      "SESSION_KEY",
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log("✅ Cache local limpo!");

    if (isSupabaseConfigured()) {
      console.log("📥 Baixando dados frescos do Supabase...");
      await syncFromSupabase(true); // Full clean sync
    }
    notify();
  },

  // Resetar TUDO e fazer login novamente
  fullReset: () => {
    console.log("🔴 RESET COMPLETO - Limpando tudo...");
    localStorage.clear();
    window.location.reload();
  },

  // Subscribe para mudanças (apenas eventos locais, não realtime do Supabase para evitar loops)
  subscribe: (callback: () => void) => {
    // Apenas escutar eventos locais - sync é feito manualmente quando necessário
    window.addEventListener("fm-db-update", callback);
    return () => window.removeEventListener("fm-db-update", callback);
  },

  // =====================================================
  // PLANS (SYNC - lê do cache local)
  // =====================================================
  getPlans: (): Plan[] => {
    return JSON.parse(localStorage.getItem(KEYS.PLANS) || "[]");
  },

  savePlan: async (plan: Plan) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("plans").upsert({
        id: plan.id,
        name: plan.name,
        duration_months: plan.durationMonths,
        description: plan.description,
        price: plan.price,
        promo_price: plan.promoPrice,
        max_photos: plan.maxPhotos,
        max_reservations_per_month: plan.maxReservationsPerMonth,
        display_order: plan.displayOrder,
        features: plan.features,
        is_active: plan.isActive,
        is_featured: plan.isFeatured,
        includes_analytics: plan.includesAnalytics,
        priority_support: plan.prioritySupport,
        highlighted_profile: plan.highlightedProfile,
        custom_branding: plan.customBranding,
        chat_enabled: plan.chatEnabled,
        color: plan.color,
      });
      if (error) console.error("Error saving plan:", error);
    }

    // Sempre salvar localmente também
    const data = JSON.parse(localStorage.getItem(KEYS.PLANS) || "[]");
    const idx = data.findIndex((p: Plan) => p.id === plan.id);
    if (idx > -1) data[idx] = plan;
    else data.push(plan);
    localStorage.setItem(KEYS.PLANS, JSON.stringify(data));
    notify();
  },

  deletePlan: async (id: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) console.error("Error deleting plan:", error);
    }

    const data = JSON.parse(localStorage.getItem(KEYS.PLANS) || "[]").filter(
      (p: Plan) => p.id !== id
    );
    localStorage.setItem(KEYS.PLANS, JSON.stringify(data));
    notify();
  },

  // =====================================================
  // PROFESSIONALS (SYNC - lê do cache local)
  // =====================================================
  getPros: (): ProfessionalProfile[] => {
    return JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
  },

  // =====================================================
  // CLIENTS (SYNC - lê do cache local)
  // =====================================================
  getClients: (): User[] => {
    return JSON.parse(localStorage.getItem(KEYS.CLIENTS) || "[]");
  },

  // =====================================================
  // USERS (SAVE/UPDATE)
  // =====================================================
  saveUser: async (user: User | ProfessionalProfile) => {
    markLocalWrite(); // Proteger contra sync imediato
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        // Não salvar imagens base64 no banco (muito grandes)
        const avatarUrl = user.image?.startsWith("data:") ? null : user.image;

        // Atualizar profile
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          name: user.name,
          last_name: user.lastName,
          email: user.email,
          phone: user.phone,
          phone_verified: user.phoneVerified,
          role: user.role,
          city: user.city,
          status: user.status,
          avatar_url: avatarUrl,
        });

        if (profileError) {
          console.error("❌ Error saving profile:", profileError);
        } else {
          supabaseSuccess = true;
          console.log("✅ Perfil salvo no Supabase:", user.name);
        }

        // Se for teacher, atualizar professional
        if (user.role === UserRole.TEACHER) {
          const pro = user as ProfessionalProfile;
          const { error: proError } = await supabase
            .from("professionals")
            .upsert(
              {
                user_id: user.id,
                bio: pro.bio,
                location: pro.location,
                price: pro.price,
                areas: pro.areas,
                modalities: pro.modalities,
                rating: pro.rating,
                reviews: pro.reviews,
                plan_active: pro.planActive,
                plan_type: pro.planType,
                plan_expiry: pro.planExpiry,
              },
              { onConflict: "user_id" }
            );

          if (proError)
            console.error("❌ Error saving professional:", proError);
        }
      } catch (err) {
        console.error("Error saving to Supabase:", err);
      }
    }

    // Sempre salvar localmente (cache)
    if (user.role === UserRole.TEACHER) {
      const data = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
      const idx = data.findIndex((p: ProfessionalProfile) => p.id === user.id);
      if (idx > -1) {
        data[idx] = { ...data[idx], ...user };
      } else {
        data.push({
          ...user,
          areas: (user as any).areas || [],
          bio: (user as any).bio || "Nuevo profesional en FitnessMatch",
          location: (user as any).location || user.city || "Costa Rica",
          modalities: (user as any).modalities || ["presencial"],
          rating: (user as any).rating || 5,
          reviews: (user as any).reviews || 0,
          image: user.image || "",
          price: (user as any).price || 0,
          planActive: (user as any).planActive || false,
        });
      }
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = JSON.parse(localStorage.getItem(KEYS.CLIENTS) || "[]");
      const idx = data.findIndex((u: User) => u.id === user.id);
      if (idx > -1) {
        data[idx] = { ...data[idx], ...user };
      } else {
        data.push(user);
      }
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();

    // Sincronizar após salvar para garantir dados consistentes
    if (supabaseSuccess) {
      setTimeout(() => syncFromSupabase(false), 1000);
    }
  },

  deleteUser: async (id: string, role: UserRole) => {
    if (isSupabaseConfigured()) {
      try {
        // Primeiro deletar da tabela professionals (se for teacher)
        if (role === UserRole.TEACHER) {
          await supabase.from("professionals").delete().eq("user_id", id);
        }

        // Deletar do profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", id);
        if (profileError)
          console.error("Error deleting profile:", profileError);

        // Deletar do Supabase Auth (isso impede o login futuro)
        // Nota: Isso requer service_role key no backend ou uma Edge Function
        // Por enquanto, apenas desativar a conta marcando como deletada
        await supabase
          .from("profiles")
          .upsert({
            id: id,
            status: "deleted",
            email: `deleted_${id}@deleted.local`,
          })
          .select();

        console.log("✅ Usuário deletado do Supabase:", id);
      } catch (err) {
        console.error("Error deleting user from Supabase:", err);
      }
    }

    if (role === UserRole.TEACHER) {
      const data = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]").filter(
        (p: ProfessionalProfile) => p.id !== id
      );
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = JSON.parse(
        localStorage.getItem(KEYS.CLIENTS) || "[]"
      ).filter((u: User) => u.id !== id);
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },

  updateUserStatus: async (
    id: string,
    role: UserRole,
    status: "active" | "blocked" | "deactivated"
  ) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", id);
      if (error) console.error("Error updating status:", error);
    }

    if (role === UserRole.TEACHER) {
      const data = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]").map(
        (p: ProfessionalProfile) => (p.id === id ? { ...p, status } : p)
      );
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    } else {
      const data = JSON.parse(localStorage.getItem(KEYS.CLIENTS) || "[]").map(
        (u: User) => (u.id === id ? { ...u, status } : u)
      );
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(data));
    }
    notify();
  },

  // =====================================================
  // TRAINER PLAN MANAGEMENT
  // =====================================================

  // Suspender ou reativar plano (sem mudar data de expiração)
  updateTrainerPlan: async (id: string, active: boolean) => {
    let success = false;
    if (isSupabaseConfigured()) {
      const { error: e1 } = await supabase
        .from("professionals")
        .update({ plan_active: active })
        .eq("user_id", id);
      const { error: e2 } = await supabase
        .from("profiles")
        .update({ status: active ? "active" : "deactivated" })
        .eq("id", id);
      success = !e1 && !e2;
      if (e1) console.error("Erro ao atualizar professionals:", e1);
      if (e2) console.error("Erro ao atualizar profiles:", e2);
    }

    // Sincronizar do Supabase para garantir dados corretos
    if (success) {
      console.log("🔄 Sincronizando após atualização de plano...");
      await syncFromSupabase(true);
    } else {
      // Fallback para localStorage
      const data = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]").map(
        (p: ProfessionalProfile) =>
          p.id === id
            ? {
                ...p,
                planActive: active,
                status: active ? "active" : "deactivated",
              }
            : p
      );
      localStorage.setItem(KEYS.PROS, JSON.stringify(data));
    }
    notify();
  },

  // Atribuir plano a um professor (muda tipo mas NÃO ativa automaticamente)
  assignPlanToTrainer: async (trainerId: string, planId: string) => {
    markLocalWrite(); // Proteger contra sync imediato
    const plans = DB.getPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    // Mapear para formato do banco de dados
    const dbPlanType = (() => {
      const pt = plan.name.toLowerCase();
      if (pt.includes("anual") || pt.includes("premium")) return "Anual";
      if (pt.includes("trimestral") || pt.includes("profesional"))
        return "Trimestral";
      return "Mensual";
    })();

    let success = false;
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("professionals")
        .update({
          plan_type: dbPlanType,
        })
        .eq("user_id", trainerId);
      success = !error;
      if (error) console.error("Erro ao atribuir plano:", error);
    }

    // Sincronizar após mudança
    if (success) {
      await syncFromSupabase(true);
    } else {
      const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
      const idx = pros.findIndex(
        (p: ProfessionalProfile) => p.id === trainerId
      );
      if (idx !== -1) {
        pros[idx] = {
          ...pros[idx],
          planType: plan.name as PlanType,
        };
        localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
      }
    }
    notify();
  },

  // ATIVAR PLANO COM DURAÇÃO BASEADA NO TIPO
  // Mensal = 30 dias, Trimestral = 90 dias, Anual = 365 dias
  activatePlanWithDuration: async (
    id: string,
    planType: string,
    customDays?: number
  ): Promise<{ expiryDate: Date; daysToAdd: number; success: boolean }> => {
    markLocalWrite(); // Proteger contra sync imediato
    console.log(`🔓 Ativando plano ${planType} para usuário ${id}...`);

    const now = new Date();
    let daysToAdd = customDays || 30; // Padrão 30 dias

    // Calcular dias baseado no tipo de plano
    if (!customDays) {
      const planLower = planType.toLowerCase();
      if (planLower.includes("anual") || planLower.includes("premium")) {
        daysToAdd = 365;
      } else if (
        planLower.includes("trimestral") ||
        planLower.includes("profesional")
      ) {
        daysToAdd = 90;
      } else if (
        planLower.includes("mensual") ||
        planLower.includes("básico") ||
        planLower.includes("basico")
      ) {
        daysToAdd = 30;
      }
    }

    const expiryDate = new Date(
      now.getTime() + daysToAdd * 24 * 60 * 60 * 1000
    );
    const activationDate = now.toISOString();
    let supabaseSuccess = false;

    // SALVAR NO SUPABASE PRIMEIRO
    if (isSupabaseConfigured()) {
      try {
        // Primeiro, buscar dados do perfil no Supabase
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (!profileData) {
          console.error("❌ Usuário não encontrado no Supabase:", id);
          return { expiryDate, daysToAdd, success: false };
        }

        console.log("📋 Dados do perfil encontrados:", profileData.name);

        // Verificar se já existe na tabela professionals
        const { data: existingPro, error: checkError } = await supabase
          .from("professionals")
          .select("*")
          .eq("user_id", id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.warn("⚠️ Erro ao verificar professional:", checkError);
        }

        // Mapear tipo de plano para formato do banco de dados
        const dbPlanType = (() => {
          const pt = planType.toLowerCase();
          if (pt.includes("anual") || pt.includes("premium")) return "Anual";
          if (pt.includes("trimestral") || pt.includes("profesional"))
            return "Trimestral";
          return "Mensual"; // Default
        })();
        console.log(`📋 Tipo de plano mapeado: ${planType} -> ${dbPlanType}`);

        if (existingPro) {
          console.log("📝 Atualizando professional existente...");
          // Atualizar existente
          const { error } = await supabase
            .from("professionals")
            .update({
              plan_active: true,
              plan_type: dbPlanType,
              plan_expiry: expiryDate.toISOString(),
              requested_plan_id: null, // Limpar solicitação ao ativar
              requested_plan_at: null,
            })
            .eq("user_id", id);

          if (error) {
            console.error("❌ Erro ao atualizar professional:", error);
          } else {
            supabaseSuccess = true;
          }
        } else {
          console.log("➕ Criando novo registro professional...");
          // Criar novo registro na tabela professionals
          const { error } = await supabase.from("professionals").insert({
            user_id: id,
            plan_active: true,
            plan_type: dbPlanType,
            plan_expiry: expiryDate.toISOString(),
            bio: "Profesional activo en FitnessMatch",
            location: profileData.city || "Costa Rica",
            areas: [],
            modalities: ["presencial"],
            rating: 5,
            reviews: 0,
            price: 0,
            requested_plan_id: null,
            requested_plan_at: null,
          });

          if (error) {
            console.error("❌ Erro ao criar professional:", error);
          } else {
            supabaseSuccess = true;
          }
        }

        // Atualizar status no profiles e limpar solicitação
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ 
            status: "active",
            requested_plan_id: null,
            requested_plan_at: null,
          })
          .eq("id", id);

        if (profileUpdateError) {
          console.error(
            "❌ Erro ao atualizar status do profile:",
            profileUpdateError
          );
        }

        if (supabaseSuccess) {
          console.log("✅ Plano ativado no Supabase com sucesso!");
        }
      } catch (err) {
        console.error("❌ Erro ao ativar plano no Supabase:", err);
      }
    }

    // ATUALIZAR LOCALSTORAGE (cache) - SEMPRE fazer isso
    try {
      const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
      const idx = pros.findIndex((p: ProfessionalProfile) => p.id === id);

      // Buscar dados do perfil existente
      let profileData: any = pros[idx] || {};
      if (!profileData.name) {
        const clients = JSON.parse(localStorage.getItem(KEYS.CLIENTS) || "[]");
        profileData = clients.find((c: any) => c.id === id) || {};
      }

      const updatedPro: ProfessionalProfile = {
        id: id,
        name: profileData?.name || "Profesional",
        lastName: profileData?.lastName || "",
        email: profileData?.email || "",
        phone: profileData?.phone || "",
        phoneVerified: profileData?.phoneVerified || false,
        role: UserRole.TEACHER,
        city: profileData?.city || "Costa Rica",
        status: "active",
        areas: profileData?.areas || [],
        bio: profileData?.bio || "Profesional activo en FitnessMatch",
        location: profileData?.location || profileData?.city || "Costa Rica",
        modalities: profileData?.modalities || ["presencial"],
        rating: profileData?.rating || 5,
        reviews: profileData?.reviews || 0,
        image: profileData?.image || "",
        price: profileData?.price || 0,
        planActive: true,
        planType: planType as PlanType,
        planExpiry: expiryDate.toISOString(),
        activatedAt: activationDate,
        requestedPlanId: undefined, // Limpar solicitação ao ativar
        requestedPlanAt: undefined,
      };

      if (idx === -1) {
        pros.push(updatedPro);
        console.log("➕ Novo professional adicionado ao cache local");
      } else {
        pros[idx] = { ...pros[idx], ...updatedPro };
        console.log("📝 Professional atualizado no cache local");
      }

      localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
      console.log("💾 Cache local salvo com sucesso!");
    } catch (localError) {
      console.error("❌ Erro ao salvar no localStorage:", localError);
    }

    // FORÇAR SYNC DO SUPABASE para garantir dados corretos
    if (supabaseSuccess) {
      console.log("🔄 Forçando sincronização para garantir dados corretos...");
      await syncFromSupabase(true);
    }

    notify();
    return {
      expiryDate,
      daysToAdd,
      success: supabaseSuccess || !isSupabaseConfigured(),
    };
  },

  // DEFINIR DATA DE EXPIRAÇÃO PERSONALIZADA
  setCustomExpiry: async (id: string, expiryDate: Date) => {
    if (isSupabaseConfigured()) {
      await supabase
        .from("professionals")
        .update({ plan_expiry: expiryDate.toISOString() })
        .eq("user_id", id);
    }

    const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
    const idx = pros.findIndex((p: ProfessionalProfile) => p.id === id);
    if (idx === -1) return;

    pros[idx].planExpiry = expiryDate.toISOString();
    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
  },

  // ADICIONAR DIAS À DATA ATUAL
  addDaysToExpiry: async (id: string, days: number) => {
    // Primeiro buscar dados atuais do Supabase
    let currentExpiry = new Date();

    if (isSupabaseConfigured()) {
      const { data: proData } = await supabase
        .from("professionals")
        .select("plan_expiry")
        .eq("user_id", id)
        .single();

      if (proData?.plan_expiry) {
        currentExpiry = new Date(proData.plan_expiry);
      }
    } else {
      const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
      const pro = pros.find((p: ProfessionalProfile) => p.id === id);
      if (pro?.planExpiry) {
        currentExpiry = new Date(pro.planExpiry);
      }
    }

    // Se expirado, começar de hoje
    const baseDate = currentExpiry < new Date() ? new Date() : currentExpiry;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    let success = false;
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("professionals")
        .update({ plan_expiry: newExpiry.toISOString() })
        .eq("user_id", id);
      success = !error;
      if (error) console.error("Erro ao adicionar dias:", error);
    }

    // Sincronizar do Supabase para garantir dados corretos
    if (success) {
      console.log("🔄 Sincronizando após adicionar dias...");
      await syncFromSupabase(true);
    } else {
      // Fallback para localStorage
      const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
      const idx = pros.findIndex((p: ProfessionalProfile) => p.id === id);
      if (idx !== -1) {
        pros[idx].planExpiry = newExpiry.toISOString();
        localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
      }
    }
    notify();

    return newExpiry;
  },

  // Calcular dias restantes
  getDaysRemaining: (expiry: string | undefined): number => {
    if (!expiry) return 0;
    const expiryDate = new Date(expiry);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  // Verificar se plano está expirado
  isPlanExpired: (expiry: string | undefined): boolean => {
    if (!expiry) return true;
    return new Date(expiry) < new Date();
  },

  // Função legado para compatibilidade
  renewTrainerExpiry: async (id: string) => {
    return DB.addDaysToExpiry(id, 30);
  },

  // =====================================================
  // CATEGORIES (SYNC)
  // =====================================================
  getCategories: (): Category[] => {
    return JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || "[]");
  },

  saveCategory: async (cat: Category) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("categories").upsert({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon_class: cat.iconClass,
        color_hex: cat.colorHex,
        display_order: cat.displayOrder,
        is_active: cat.isActive,
        meta_title: cat.metaTitle,
        meta_description: cat.metaDescription,
      });
      if (error) console.error("Error saving category:", error);
    }

    const data = JSON.parse(localStorage.getItem(KEYS.CATEGORIES) || "[]");
    const idx = data.findIndex((c: Category) => c.id === cat.id);
    if (idx > -1) data[idx] = cat;
    else data.push(cat);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    notify();
  },

  deleteCategory: async (id: string) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) console.error("Error deleting category:", error);
    }

    const data = JSON.parse(
      localStorage.getItem(KEYS.CATEGORIES) || "[]"
    ).filter((c: Category) => c.id !== id);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    notify();
  },

  // =====================================================
  // TIME SLOTS (SYNC) - Dados do Supabase com cache local
  // =====================================================
  getSlots: (): TimeSlot[] => {
    const cached = JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]");
    // Se não tiver dados em cache, forçar sync em background
    if (cached.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return cached;
  },

  getSlotsByTeacher: (teacherId: string): TimeSlot[] => {
    const all = JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]");
    if (all.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return all.filter((s: TimeSlot) => s.proUserId === teacherId);
  },

  // Versão async que garante dados frescos do Supabase
  getSlotsByTeacherAsync: async (teacherId: string): Promise<TimeSlot[]> => {
    if (isSupabaseConfigured()) {
      try {
        // Buscar o ID do professional
        const { data: pro } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", teacherId)
          .single();

        if (!pro) {
          console.warn("Professional não encontrado para:", teacherId);
          return [];
        }

        const { data: slots, error } = await supabase
          .from("time_slots")
          .select("*")
          .eq("professional_id", pro.id)
          .order("start_at", { ascending: true });

        if (error) {
          console.error("❌ Erro ao buscar horários:", error);
          return DB.getSlotsByTeacher(teacherId);
        }

        if (slots && slots.length > 0) {
          return slots.map((s: any) => ({
            id: s.id,
            proUserId: teacherId,
            startAt: s.start_at,
            endAt: s.end_at,
            capacityTotal: s.capacity_total,
            capacityBooked: s.capacity_booked || 0,
            type: s.slot_type || "individual",
            location: s.location || "",
            price: s.price || 0,
            status: s.status || "active",
          }));
        }
        return [];
      } catch (err) {
        console.error("❌ Erro ao buscar horários do Supabase:", err);
      }
    }

    return DB.getSlotsByTeacher(teacherId);
  },

  saveSlot: async (slot: TimeSlot) => {
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        // Buscar o ID do professional no Supabase
        const { data: pro, error: proError } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", slot.proUserId)
          .single();

        if (proError) {
          console.warn(
            "Professional não encontrado no Supabase:",
            proError.message
          );
        }

        if (pro) {
          const { error: insertError } = await supabase
            .from("time_slots")
            .insert({
              professional_id: pro.id,
              start_at: slot.startAt,
              end_at: slot.endAt,
              capacity_total: slot.capacityTotal,
              capacity_booked: slot.capacityBooked || 0,
              slot_type: slot.type,
              location: slot.location,
              price: slot.price,
              status: slot.status || "active",
            });

          if (insertError) {
            console.error("Erro ao salvar slot no Supabase:", insertError);
          } else {
            supabaseSuccess = true;
            console.log("✅ Slot salvo no Supabase");
          }
        }
      } catch (err) {
        console.error("Error saving slot:", err);
      }
    }

    // Sempre salvar no localStorage para UI imediata
    const data = JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]");
    data.push(slot);
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(data));
    notify();

    // Se salvou no Supabase, sincronizar para pegar o ID correto
    if (supabaseSuccess) {
      setTimeout(() => syncFromSupabase(false), 500);
    }
  },

  deleteSlot: async (id: string) => {
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("time_slots").delete().eq("id", id);
      if (!error) {
        supabaseSuccess = true;
        console.log("✅ Horário deletado do Supabase");
      } else {
        console.error("❌ Erro ao deletar horário:", error);
      }
    }

    const data = JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]").filter(
      (s: TimeSlot) => s.id !== id
    );
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(data));
    notify();

    // Sincronizar
    if (supabaseSuccess) {
      setTimeout(() => syncFromSupabase(false), 500);
    }
  },

  // =====================================================
  // BOOKINGS (SYNC) - Dados do Supabase com cache local
  // =====================================================
  getBookings: (): Booking[] => {
    const cached = JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]");
    const deletedIds = JSON.parse(
      localStorage.getItem(KEYS.DELETED_BOOKINGS) || "[]"
    );
    // Filtrar reservas deletadas localmente
    const filtered = cached.filter((b: Booking) => !deletedIds.includes(b.id));
    // Se não tiver dados em cache, forçar sync em background
    if (filtered.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return filtered;
  },

  getTeacherBookings: (id: string): Booking[] => {
    const all = DB.getBookings(); // Já filtra deletados
    return all.filter(
      (b: Booking) => b.teacherId === id || (b as any).professionalId === id
    );
  },

  getClientBookings: (id: string): Booking[] => {
    const all = DB.getBookings(); // Já filtra deletados
    return all.filter((b: Booking) => b.clientId === id);
  },

  // Versão async que garante dados frescos do Supabase
  getBookingsAsync: async (
    clientId?: string,
    teacherId?: string
  ): Promise<Booking[]> => {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from("bookings")
          .select("*, professionals!inner(user_id)")
          .order("created_at", { ascending: false });

        if (clientId) {
          query = query.eq("client_id", clientId);
        }

        const { data: bookings, error } = await query;

        if (error) {
          console.error("❌ Erro ao buscar reservas:", error);
          return DB.getBookings();
        }

        if (bookings && bookings.length > 0) {
          const mappedBookings = bookings.map((b: any) => ({
            id: b.id,
            clientId: b.client_id,
            clientName: b.client_name || "Cliente",
            teacherId: b.professionals?.user_id || b.professional_id,
            teacherName: b.teacher_name || "Profesional",
            slotId: b.slot_id,
            date: b.booking_date,
            price: b.price || 0,
            status: b.status || "pendiente",
            createdAt: b.created_at,
            message: b.message || "",
          }));

          // Atualizar cache local
          localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(mappedBookings));

          if (teacherId) {
            return mappedBookings.filter(
              (b: Booking) => b.teacherId === teacherId
            );
          }
          if (clientId) {
            return mappedBookings.filter(
              (b: Booking) => b.clientId === clientId
            );
          }
          return mappedBookings;
        }
        return [];
      } catch (err) {
        console.error("❌ Erro ao buscar reservas do Supabase:", err);
      }
    }

    // Fallback para cache local
    const all = DB.getBookings();
    if (teacherId) return all.filter((b) => b.teacherId === teacherId);
    if (clientId) return all.filter((b) => b.clientId === clientId);
    return all;
  },

  createBooking: async (b: Booking) => {
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        const { data: pro } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", b.teacherId)
          .single();

        if (pro) {
          const { error } = await supabase.from("bookings").insert({
            client_id: b.clientId,
            professional_id: pro.id,
            slot_id: b.slotId,
            client_name: b.clientName,
            teacher_name: b.teacherName,
            booking_date: b.date,
            price: b.price,
            status: b.status,
            message: b.message,
          });

          if (!error) {
            supabaseSuccess = true;
            console.log("✅ Reserva salva no Supabase");
          } else {
            console.error("❌ Erro ao salvar reserva no Supabase:", error);
          }
        }
      } catch (err) {
        console.error("Error creating booking:", err);
      }
    }

    // Atualizar cache local
    const data = JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]");
    data.push(b);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));
    notify();

    // Sincronizar do Supabase para garantir dados corretos
    if (supabaseSuccess) {
      setTimeout(() => syncFromSupabase(false), 500);
    }
  },

  deleteBooking: async (id: string) => {
    console.log("🗑️ Deletando reserva:", id);

    // 1. Adicionar ID à lista de deletados (evita que volte no sync)
    const deletedIds = JSON.parse(
      localStorage.getItem(KEYS.DELETED_BOOKINGS) || "[]"
    );
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(KEYS.DELETED_BOOKINGS, JSON.stringify(deletedIds));
    }

    // 2. Remover do localStorage IMEDIATAMENTE
    const bookings = JSON.parse(
      localStorage.getItem(KEYS.BOOKINGS) || "[]"
    ).filter((b: Booking) => b.id !== id);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    notify();
    console.log("✅ Reserva removida do cache local");

    // 3. Tentar deletar do Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("bookings").delete().eq("id", id);

        if (error) {
          console.error("❌ Erro ao deletar do Supabase:", error.message);
        } else {
          console.log("✅ Reserva deletada do Supabase");
          // Remover da lista de deletados após sucesso no Supabase
          const updated = deletedIds.filter((did: string) => did !== id);
          localStorage.setItem(KEYS.DELETED_BOOKINGS, JSON.stringify(updated));
        }
      } catch (err) {
        console.error("❌ Exceção ao deletar reserva:", err);
      }
    }

    // NÃO sincronizar após delete
  },

  updateBookingStatus: async (id: string, status: BookingStatus) => {
    const bookings = DB.getBookings();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    let supabaseSuccess = false;
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", id);
      if (!error) {
        supabaseSuccess = true;
        console.log("✅ Status da reserva atualizado no Supabase:", status);
      } else {
        console.error("❌ Erro ao atualizar status no Supabase:", error);
      }
    }

    const data = bookings.map((b) => (b.id === id ? { ...b, status } : b));
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));

    // Sincronizar do Supabase
    if (supabaseSuccess) {
      setTimeout(() => syncFromSupabase(false), 500);
    }

    // Notificação
    let title = "Notificación de Reserva";
    let message = "Tu reserva ha sido actualizada.";

    if (status === BookingStatus.CONFIRMADA) {
      title = "¡Reserva Confirmada!";
      message = `Tu sesión con ${booking.teacherName} ha sido confirmada.`;
    } else if (status === BookingStatus.RECHAZADA) {
      title = "Reserva Rechazada";
      message = `Lamentablemente ${booking.teacherName} no puede atenderte en este horario.`;
    } else if (status === BookingStatus.CANCELADA) {
      title = "Reserva Cancelada";
      message = `Tu reserva con ${booking.teacherName} ha sido cancelada con éxito.`;
    }

    DB.addNotification({
      id: `notif-${Date.now()}`,
      userId: booking.clientId,
      title,
      message,
      type: "booking",
      isRead: false,
      timestamp: new Date().toISOString(),
    });

    // Mensagem automática no chat se confirmada
    if (status === BookingStatus.CONFIRMADA) {
      const bookingDate = new Date(booking.date);
      const dateFormatted = bookingDate.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const timeFormatted = bookingDate.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      DB.sendMessage({
        id: `msg-auto-${Date.now()}`,
        senderId: booking.teacherId,
        receiverId: booking.clientId,
        text: `¡Hola ${booking.clientName.split(" ")[0]}! 🎉

Tu reserva ha sido CONFIRMADA.

📅 ${dateFormatted}
🕐 ${timeFormatted}
💵 ₡${booking.price.toLocaleString()}

Te espero puntual. Si tienes alguna duda o necesitas reagendar, escríbeme aquí.

¡Nos vemos pronto!`,
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }

    // Mensagem automática se rechazada
    if (status === BookingStatus.RECHAZADA) {
      DB.sendMessage({
        id: `msg-auto-${Date.now()}`,
        senderId: booking.teacherId,
        receiverId: booking.clientId,
        text: `Hola ${booking.clientName.split(" ")[0]},

Lamentablemente no puedo confirmar tu reserva para esta fecha/hora.

Por favor, selecciona otro horario disponible y con gusto te atiendo.

¡Disculpa las molestias!`,
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }

    notify();
  },

  // =====================================================
  // ONLINE STATUS / PRESENCE SYSTEM
  // =====================================================
  updateLastSeen: async (userId: string) => {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", userId);
    } catch (err) {
      console.warn("Error updating last_seen:", err);
    }
  },

  getLastSeen: async (userId: string): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("last_seen")
        .eq("id", userId)
        .single();

      if (error || !data) return null;
      return data.last_seen;
    } catch (err) {
      return null;
    }
  },

  // Formata o status de presença
  formatPresence: (
    lastSeen: string | null
  ): { text: string; isOnline: boolean } => {
    if (!lastSeen) return { text: "Sin conexión", isOnline: false };

    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now.getTime() - seen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Considerar online se visto nos últimos 2 minutos
    if (diffMins < 2) {
      return { text: "En línea", isOnline: true };
    }

    if (diffMins < 60) {
      return { text: `Hace ${diffMins} min`, isOnline: false };
    }

    if (diffHours < 24) {
      return { text: `Hace ${diffHours}h`, isOnline: false };
    }

    if (diffDays === 1) {
      return { text: "Ayer", isOnline: false };
    }

    if (diffDays < 7) {
      return { text: `Hace ${diffDays} días`, isOnline: false };
    }

    return {
      text: seen.toLocaleDateString("es-CR", {
        day: "numeric",
        month: "short",
      }),
      isOnline: false,
    };
  },

  // =====================================================
  // MESSAGES (SYNC) - Dados do Supabase com cache local
  // =====================================================
  getMessages: (u1: string, u2: string): ChatMessage[] => {
    const all: ChatMessage[] = JSON.parse(
      localStorage.getItem(KEYS.MESSAGES) || "[]"
    );
    // Se não tiver dados em cache, forçar sync em background
    if (all.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return all
      .filter(
        (m) =>
          (m.senderId === u1 && m.receiverId === u2) ||
          (m.senderId === u2 && m.receiverId === u1)
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  },

  markMessagesAsRead: async (currentUserId: string, otherUserId: string) => {
    if (isSupabaseConfigured()) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", currentUserId);
    }

    const all: ChatMessage[] = JSON.parse(
      localStorage.getItem(KEYS.MESSAGES) || "[]"
    );
    let changed = false;
    const updated = all.map((m) => {
      if (
        m.senderId === otherUserId &&
        m.receiverId === currentUserId &&
        !m.isRead
      ) {
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
    const all: Conversation[] = JSON.parse(
      localStorage.getItem(KEYS.CONVERSATIONS) || "[]"
    );
    // Se não tiver dados em cache, forçar sync em background
    if (all.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return all
      .filter((c) => c.participants.includes(userId))
      .sort((a, b) => {
        const dateA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
        const dateB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
        return dateB - dateA;
      });
  },

  sendMessage: async (msg: ChatMessage) => {
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        // Preparar dados da mensagem
        const messageData: any = {
          sender_id: msg.senderId,
          receiver_id: msg.receiverId,
          text: msg.text || "",
          is_read: false,
        };

        // Adicionar dados do anexo se existir
        if (msg.attachment) {
          messageData.attachment_url = msg.attachment.url;
          messageData.attachment_type = msg.attachment.type;
          messageData.attachment_name = msg.attachment.fileName;
          messageData.attachment_size = msg.attachment.size;
        }

        const { error } = await supabase.from("messages").insert(messageData);
        if (!error) {
          supabaseSuccess = true;
          console.log(
            "✅ Mensagem enviada via Supabase",
            msg.attachment ? "(com anexo)" : ""
          );
        } else {
          console.error("❌ Erro ao enviar mensagem:", error);
        }
      } catch (err) {
        console.error("Error sending message to Supabase:", err);
      }
    }

    const messages: ChatMessage[] = JSON.parse(
      localStorage.getItem(KEYS.MESSAGES) || "[]"
    );
    messages.push({ ...msg, isRead: false });
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));

    const convs: Conversation[] = JSON.parse(
      localStorage.getItem(KEYS.CONVERSATIONS) || "[]"
    );
    let conv = convs.find(
      (c) =>
        c.participants.includes(msg.senderId) &&
        c.participants.includes(msg.receiverId)
    );

    if (!conv) {
      conv = {
        id: `conv-${Date.now()}`,
        participants: [msg.senderId, msg.receiverId],
      };
      convs.push(conv);
    }

    // Show attachment indicator in last message if applicable
    conv.lastMessage = msg.attachment
      ? msg.text ||
        (msg.attachment.type === "image" ? "📷 Foto" : "📄 Documento")
      : msg.text;
    conv.lastTimestamp = msg.timestamp;

    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
    notify();
  },

  // =====================================================
  // NOTIFICATIONS (SYNC) - Dados do Supabase com cache local
  // =====================================================
  getNotifications: (userId: string): Notification[] => {
    const all: Notification[] = JSON.parse(
      localStorage.getItem(KEYS.NOTIFICATIONS) || "[]"
    );
    // Se não tiver dados em cache, forçar sync em background
    if (all.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return all
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  },

  addNotification: async (notif: Notification) => {
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("notifications").insert({
          user_id: notif.userId,
          title: notif.title,
          message: notif.message,
          notification_type: notif.type,
          is_read: false,
        });
        if (!error) {
          supabaseSuccess = true;
        } else {
          console.error("❌ Erro ao adicionar notificação:", error);
        }
      } catch (err) {
        console.error("Error adding notification:", err);
      }
    }

    const all: Notification[] = JSON.parse(
      localStorage.getItem(KEYS.NOTIFICATIONS) || "[]"
    );
    all.push(notif);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(all));
    notify();
  },

  markNotificationsRead: async (userId: string) => {
    if (isSupabaseConfigured()) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId);
    }

    const all: Notification[] = JSON.parse(
      localStorage.getItem(KEYS.NOTIFICATIONS) || "[]"
    );
    const updated = all.map((n) =>
      n.userId === userId ? { ...n, isRead: true } : n
    );
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
    notify();
  },

  clearNotifications: async (userId: string) => {
    // Deletar do Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("notifications").delete().eq("user_id", userId);
        console.log("✅ Notificações deletadas do Supabase");
      } catch (err) {
        console.error("❌ Erro ao limpar notificações:", err);
      }
    }

    // Remover do localStorage
    const all: Notification[] = JSON.parse(
      localStorage.getItem(KEYS.NOTIFICATIONS) || "[]"
    );
    const remaining = all.filter((n) => n.userId !== userId);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(remaining));
    notify();
  },

  // =====================================================
  // REVIEWS (Avaliações)
  // =====================================================
  getReviews: (professionalId: string): any[] => {
    const cached = JSON.parse(localStorage.getItem("fm_reviews_v3") || "[]");
    return cached
      .filter((r: any) => r.professionalId === professionalId && r.isPublic)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  },

  addReview: async (review: any) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("reviews").insert({
          client_id: review.clientId,
          professional_id: review.professionalId,
          booking_id: review.bookingId,
          rating: review.rating,
          comment: review.comment,
          is_public: true,
        });
        if (!error) {
          console.log("✅ Review adicionada");
          // Atualizar flag na reserva
          await supabase
            .from("bookings")
            .update({ has_review: true })
            .eq("id", review.bookingId);
        }
      } catch (err) {
        console.error("Erro ao adicionar review:", err);
      }
    }

    // Cache local
    const all = JSON.parse(localStorage.getItem("fm_reviews_v3") || "[]");
    all.push({
      ...review,
      createdAt: new Date().toISOString(),
      isPublic: true,
    });
    localStorage.setItem("fm_reviews_v3", JSON.stringify(all));
    notify();
  },

  replyToReview: async (reviewId: string, reply: string) => {
    if (isSupabaseConfigured()) {
      await supabase
        .from("reviews")
        .update({ reply, reply_at: new Date().toISOString() })
        .eq("id", reviewId);
    }

    const all = JSON.parse(localStorage.getItem("fm_reviews_v3") || "[]");
    const idx = all.findIndex((r: any) => r.id === reviewId);
    if (idx !== -1) {
      all[idx].reply = reply;
      all[idx].replyAt = new Date().toISOString();
      localStorage.setItem("fm_reviews_v3", JSON.stringify(all));
    }
    notify();
  },

  // =====================================================
  // FAVORITOS
  // =====================================================
  getFavorites: (clientId: string): string[] => {
    const cached = JSON.parse(localStorage.getItem("fm_favorites_v3") || "[]");
    return cached
      .filter((f: any) => f.clientId === clientId)
      .map((f: any) => f.professionalId);
  },

  toggleFavorite: async (clientId: string, professionalId: string) => {
    const all = JSON.parse(localStorage.getItem("fm_favorites_v3") || "[]");
    const existingIdx = all.findIndex(
      (f: any) => f.clientId === clientId && f.professionalId === professionalId
    );

    if (existingIdx !== -1) {
      // Remover favorito
      if (isSupabaseConfigured()) {
        await supabase
          .from("favorites")
          .delete()
          .eq("client_id", clientId)
          .eq("professional_id", professionalId);
      }
      all.splice(existingIdx, 1);
    } else {
      // Adicionar favorito
      const newFav = {
        id: `fav-${Date.now()}`,
        clientId,
        professionalId,
        createdAt: new Date().toISOString(),
      };
      if (isSupabaseConfigured()) {
        await supabase.from("favorites").insert({
          client_id: clientId,
          professional_id: professionalId,
        });
      }
      all.push(newFav);
    }

    localStorage.setItem("fm_favorites_v3", JSON.stringify(all));
    notify();
    return existingIdx === -1; // true se adicionou, false se removeu
  },

  isFavorite: (clientId: string, professionalId: string): boolean => {
    const all = JSON.parse(localStorage.getItem("fm_favorites_v3") || "[]");
    return all.some(
      (f: any) => f.clientId === clientId && f.professionalId === professionalId
    );
  },

  // =====================================================
  // PACOTES DE SESSÕES
  // =====================================================
  getPackagesByProfessional: (professionalId: string): any[] => {
    const cached = JSON.parse(localStorage.getItem("fm_packages_v3") || "[]");
    return cached.filter(
      (p: any) => p.professionalId === professionalId && p.isActive
    );
  },

  getClientPackages: (clientId: string): any[] => {
    const cached = JSON.parse(
      localStorage.getItem("fm_client_packages_v3") || "[]"
    );
    return cached.filter((p: any) => p.clientId === clientId);
  },

  createPackage: async (pkg: any) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("session_packages")
        .insert({
          professional_id: pkg.professionalId,
          name: pkg.name,
          description: pkg.description,
          total_sessions: pkg.totalSessions,
          price: pkg.price,
          discount_percent: pkg.discountPercent,
          valid_days: pkg.validDays,
          is_active: true,
        })
        .select()
        .single();

      if (!error && data) {
        pkg.id = data.id;
      }
    } else {
      pkg.id = `pkg-${Date.now()}`;
    }

    const all = JSON.parse(localStorage.getItem("fm_packages_v3") || "[]");
    all.push({ ...pkg, createdAt: new Date().toISOString(), isActive: true });
    localStorage.setItem("fm_packages_v3", JSON.stringify(all));
    notify();
    return pkg;
  },

  purchasePackage: async (
    clientId: string,
    packageId: string,
    professionalId: string
  ) => {
    const packages = JSON.parse(localStorage.getItem("fm_packages_v3") || "[]");
    const pkg = packages.find((p: any) => p.id === packageId);
    if (!pkg) return null;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (pkg.validDays || 90));

    const clientPkg = {
      id: `cp-${Date.now()}`,
      clientId,
      packageId,
      professionalId,
      sessionsTotal: pkg.totalSessions,
      sessionsUsed: 0,
      sessionsRemaining: pkg.totalSessions,
      purchaseDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      status: "active" as const,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("client_packages")
        .insert({
          client_id: clientId,
          package_id: packageId,
          professional_id: professionalId,
          sessions_total: pkg.totalSessions,
          sessions_used: 0,
          expiry_date: expiryDate.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (!error && data) {
        clientPkg.id = data.id;
      }
    }

    const all = JSON.parse(
      localStorage.getItem("fm_client_packages_v3") || "[]"
    );
    all.push(clientPkg);
    localStorage.setItem("fm_client_packages_v3", JSON.stringify(all));
    notify();
    return clientPkg;
  },

  usePackageSession: async (clientPackageId: string) => {
    const all = JSON.parse(
      localStorage.getItem("fm_client_packages_v3") || "[]"
    );
    const idx = all.findIndex((p: any) => p.id === clientPackageId);
    if (idx === -1) return false;

    all[idx].sessionsUsed++;
    all[idx].sessionsRemaining--;
    if (all[idx].sessionsRemaining <= 0) {
      all[idx].status = "completed";
    }

    if (isSupabaseConfigured()) {
      await supabase
        .from("client_packages")
        .update({
          sessions_used: all[idx].sessionsUsed,
          status: all[idx].status,
        })
        .eq("id", clientPackageId);
    }

    localStorage.setItem("fm_client_packages_v3", JSON.stringify(all));
    notify();
    return true;
  },

  // =====================================================
  // POLÍTICA DE CANCELAMENTO
  // =====================================================
  getCancellationPolicy: (): any => {
    return {
      minHoursBeforeSession: 24,
      refundPercentage: 100,
      lateCancelPenalty: 50,
      noShowPenalty: 100,
    };
  },

  canCancelBooking: (
    bookingDate: string
  ): { canCancel: boolean; penalty: number; message: string } => {
    const policy = DB.getCancellationPolicy();
    const bookingTime = new Date(bookingDate).getTime();
    const now = Date.now();
    const hoursUntil = (bookingTime - now) / (1000 * 60 * 60);

    if (hoursUntil >= policy.minHoursBeforeSession) {
      return {
        canCancel: true,
        penalty: 0,
        message: `Cancelamento gratuito até ${policy.minHoursBeforeSession}h antes.`,
      };
    } else if (hoursUntil > 0) {
      return {
        canCancel: true,
        penalty: policy.lateCancelPenalty,
        message: `Cancelamento tardio: ${policy.lateCancelPenalty}% de taxa.`,
      };
    } else {
      return {
        canCancel: false,
        penalty: policy.noShowPenalty,
        message: "Sessão já iniciada. Cancelamento não permitido.",
      };
    }
  },

  cancelBookingWithPolicy: async (
    bookingId: string,
    cancelledBy: string,
    reason?: string
  ) => {
    const bookings = DB.getBookings();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return { success: false, message: "Reserva não encontrada" };

    const { canCancel, penalty, message } = DB.canCancelBooking(booking.date);
    if (!canCancel) {
      return { success: false, message };
    }

    // Calcular reembolso
    const refund = booking.price * ((100 - penalty) / 100);

    if (isSupabaseConfigured()) {
      await supabase
        .from("bookings")
        .update({
          status: "Cancelada",
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: reason,
          refund_amount: refund,
        })
        .eq("id", bookingId);
    }

    // Atualizar local
    await DB.updateBookingStatus(bookingId, BookingStatus.CANCELADA);

    return {
      success: true,
      penalty,
      refund,
      message:
        penalty > 0
          ? `Cancelado com ${penalty}% de taxa. Reembolso: ₡${refund.toLocaleString()}`
          : "Cancelado sem taxas.",
    };
  },

  // =====================================================
  // HISTÓRICO DE TREINOS
  // =====================================================
  getTrainingLogs: (clientId: string, professionalId?: string): any[] => {
    const cached = JSON.parse(
      localStorage.getItem("fm_training_logs_v3") || "[]"
    );
    return cached
      .filter((l: any) => {
        if (professionalId) {
          return l.clientId === clientId && l.professionalId === professionalId;
        }
        return l.clientId === clientId;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  },

  addTrainingLog: async (log: any) => {
    if (isSupabaseConfigured()) {
      await supabase.from("training_logs").insert({
        client_id: log.clientId,
        professional_id: log.professionalId,
        booking_id: log.bookingId,
        session_date: log.date,
        duration_minutes: log.duration,
        professional_notes: log.notes,
        completed: true,
      });
    }

    const all = JSON.parse(localStorage.getItem("fm_training_logs_v3") || "[]");
    all.push({
      ...log,
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
      completed: true,
    });
    localStorage.setItem("fm_training_logs_v3", JSON.stringify(all));
    notify();
  },

  // =====================================================
  // BUSCA AVANÇADA
  // =====================================================
  searchProfessionals: (filters: {
    query?: string;
    category?: string;
    minRating?: number;
    maxPrice?: number;
    modality?: string;
    sortBy?: "rating" | "price" | "reviews";
  }): ProfessionalProfile[] => {
    let pros = DB.getPros().filter(
      (p) => p.planActive && p.status === "active"
    );

    // Filtro por texto
    if (filters.query) {
      const q = filters.query.toLowerCase();
      pros = pros.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.lastName?.toLowerCase().includes(q) ||
          p.bio?.toLowerCase().includes(q) ||
          p.areas?.some((a) => a.toLowerCase().includes(q))
      );
    }

    // Filtro por categoria
    if (filters.category && filters.category !== "all") {
      pros = pros.filter((p) => p.areas?.includes(filters.category!));
    }

    // Filtro por rating mínimo
    if (filters.minRating) {
      pros = pros.filter((p) => p.rating >= filters.minRating!);
    }

    // Filtro por preço máximo
    if (filters.maxPrice) {
      pros = pros.filter((p) => p.price <= filters.maxPrice!);
    }

    // Filtro por modalidade
    if (filters.modality) {
      pros = pros.filter((p) =>
        p.modalities?.includes(filters.modality as any)
      );
    }

    // Ordenação
    switch (filters.sortBy) {
      case "rating":
        pros.sort((a, b) => b.rating - a.rating);
        break;
      case "price":
        pros.sort((a, b) => a.price - b.price);
        break;
      case "reviews":
        pros.sort((a, b) => b.reviews - a.reviews);
        break;
      default:
        pros.sort((a, b) => b.rating - a.rating); // Default: melhor rating
    }

    return pros;
  },
};

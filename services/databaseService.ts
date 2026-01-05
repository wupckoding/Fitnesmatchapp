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
};

const notify = () => {
  window.dispatchEvent(new CustomEvent("fm-db-update", { detail: Date.now() }));
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
  displayOrder: plan.display_order,
  features: plan.features || [],
  isActive: plan.is_active,
  isFeatured: plan.is_featured,
  includesAnalytics: plan.includes_analytics,
  prioritySupport: plan.priority_support,
});

// =====================================================
// SYNC DATA FROM SUPABASE TO LOCALSTORAGE (BACKGROUND)
// =====================================================
const syncFromSupabase = async (fullClean = false) => {
  if (!isSupabaseConfigured()) return;

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

    // Sync Plans
    const { data: plans, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("display_order");
    if (plans && plans.length > 0) {
      localStorage.setItem(
        KEYS.PLANS,
        JSON.stringify(plans.map(mapPlanFromDB))
      );
      console.log(`  ✓ ${plans.length} planos sincronizados`);
    } else if (plansError) {
      console.warn("  ⚠ Erro ao buscar planos:", plansError.message);
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

      for (const profile of teacherProfiles) {
        const { data: proData } = await supabase
          .from("professionals")
          .select("*")
          .eq("user_id", profile.id)
          .single();

        if (proData) {
          allPros.push(
            mapProfileToUser(profile, proData) as ProfessionalProfile
          );
        } else {
          // Professor existe no profiles mas não no professionals ainda
          allPros.push({
            id: profile.id,
            name: profile.name || "Profesional",
            lastName: profile.last_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            phoneVerified: profile.phone_verified || false,
            role: UserRole.TEACHER,
            city: profile.city || "Costa Rica",
            status: "deactivated",
            areas: [],
            bio: "Pendiente de activación",
            location: profile.city || "Costa Rica",
            modalities: ["presencial"],
            rating: 5,
            reviews: 0,
            image: profile.avatar_url || "",
            price: 0,
            planActive: false,
          } as ProfessionalProfile);
        }
      }

      localStorage.setItem(KEYS.PROS, JSON.stringify(allPros));
      console.log(`  ✓ ${allPros.length} profesores sincronizados`);
    } else if (teachersError) {
      console.warn("  ⚠ Erro ao buscar professores:", teachersError.message);
    }

    // Sync Clients - Limitar para não estourar localStorage
    const { data: clients, error: clientsError } = await supabase
      .from("profiles")
      .select(
        "id, name, last_name, email, phone, role, city, status, created_at"
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
        localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(mappedBookings));
        console.log(`  ✓ ${bookings.length} reservas sincronizadas`);
      } else {
        localStorage.setItem(KEYS.BOOKINGS, JSON.stringify([]));
        if (bookingsError)
          console.warn("  ⚠ Erro ao buscar bookings:", bookingsError.message);
      }
    } catch (bookingError) {
      console.warn("  ⚠ Erro ao sincronizar bookings:", bookingError);
      localStorage.setItem(KEYS.BOOKINGS, JSON.stringify([]));
    }

    // Sync Messages
    try {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(500);

      if (messages && messages.length > 0) {
        const mappedMessages = messages.map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          text: m.text,
          timestamp: m.created_at,
          isRead: m.is_read || false,
        }));
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
  }
};

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
      const existingPlans = JSON.parse(
        localStorage.getItem(KEYS.PLANS) || "[]"
      );
      if (existingPlans.length === 0) {
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

  // Subscribe para mudanças
  subscribe: (callback: () => void) => {
    if (isSupabaseConfigured()) {
      // Real-time subscriptions do Supabase
      const channel = supabase
        .channel("db-changes")
        .on("postgres_changes", { event: "*", schema: "public" }, () => {
          syncFromSupabase().then(callback);
        })
        .subscribe();

      // Também escutar eventos locais
      window.addEventListener("fm-db-update", callback);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener("fm-db-update", callback);
      };
    }

    // Fallback localStorage
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
        display_order: plan.displayOrder,
        features: plan.features,
        is_active: plan.isActive,
        is_featured: plan.isFeatured,
        includes_analytics: plan.includesAnalytics,
        priority_support: plan.prioritySupport,
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
          });

          if (error) {
            console.error("❌ Erro ao criar professional:", error);
          } else {
            supabaseSuccess = true;
          }
        }

        // Atualizar status no profiles
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ status: "active" })
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
    // Se não tiver dados em cache, forçar sync em background
    if (cached.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return cached;
  },

  getTeacherBookings: (id: string): Booking[] => {
    const all = JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]");
    if (all.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
    return all.filter((b: Booking) => b.teacherId === id);
  },

  getClientBookings: (id: string): Booking[] => {
    const all = JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]");
    if (all.length === 0 && isSupabaseConfigured()) {
      syncFromSupabase(false);
    }
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
    let supabaseSuccess = false;

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (!error) {
        supabaseSuccess = true;
        console.log("✅ Reserva deletada do Supabase");
      } else {
        console.error("❌ Erro ao deletar reserva:", error);
      }
    }

    const bookings = JSON.parse(
      localStorage.getItem(KEYS.BOOKINGS) || "[]"
    ).filter((b: Booking) => b.id !== id);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    notify();

    // Sincronizar
    if (supabaseSuccess) {
      setTimeout(() => syncFromSupabase(false), 500);
    }
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
      const dateFormatted = new Date(booking.date).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const timeFormatted = `${new Date(booking.date).getHours()}:00h`;

      DB.sendMessage({
        id: `msg-auto-${Date.now()}`,
        senderId: booking.teacherId,
        receiverId: booking.clientId,
        text: `✅ ¡Reserva Confirmada!\n\nHola ${
          booking.clientName.split(" ")[0]
        }, he aceptado tu solicitud.\n\n📅 Fecha: ${dateFormatted}\n⏰ Hora: ${timeFormatted}\n💰 Inversión: ₡${booking.price.toLocaleString()}\n\n¡Cualquier duda escríbeme por aquí!`,
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }

    notify();
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
        const { error } = await supabase.from("messages").insert({
          sender_id: msg.senderId,
          receiver_id: msg.receiverId,
          text: msg.text,
          is_read: false,
        });
        if (!error) {
          supabaseSuccess = true;
          console.log("✅ Mensagem enviada via Supabase");
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

    conv.lastMessage = msg.text;
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
};

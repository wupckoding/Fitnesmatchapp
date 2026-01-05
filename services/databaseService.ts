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
const syncFromSupabase = async () => {
  if (!isSupabaseConfigured()) return;

  try {
    // Sync Plans
    const { data: plans } = await supabase
      .from("plans")
      .select("*")
      .order("display_order");
    if (plans)
      localStorage.setItem(
        KEYS.PLANS,
        JSON.stringify(plans.map(mapPlanFromDB))
      );

    // Sync Categories
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");
    if (cats)
      localStorage.setItem(
        KEYS.CATEGORIES,
        JSON.stringify(cats.map(mapCategoryFromDB))
      );

    // Sync Professionals
    const { data: pros } = await supabase
      .from("professionals")
      .select(`*, profile:profiles(*)`)
      .order("created_at", { ascending: false });
    if (pros) {
      const mappedPros = pros.map(
        (pro) => mapProfileToUser(pro.profile, pro) as ProfessionalProfile
      );
      localStorage.setItem(KEYS.PROS, JSON.stringify(mappedPros));
    }

    // Sync Clients
    const { data: clients } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("created_at", { ascending: false });
    if (clients)
      localStorage.setItem(
        KEYS.CLIENTS,
        JSON.stringify(clients.map((p) => mapProfileToUser(p) as User))
      );

    notify();
    console.log("✅ Synced data from Supabase");
  } catch (err) {
    console.error("Error syncing from Supabase:", err);
  }
};

// =====================================================
// DATABASE SERVICE (SYNC API com CACHE LOCAL)
// =====================================================
export const DB = {
  // Inicialização
  init: () => {
    const isInitialized = localStorage.getItem(KEYS.INITIALIZED);

    if (!isInitialized) {
      // Inicializar com dados mock
      localStorage.setItem(KEYS.PLANS, JSON.stringify(PLANS));
      localStorage.setItem(KEYS.PROS, JSON.stringify(MOCK_PROS));
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(MOCK_CLIENTS));
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(MOCK_CATEGORIES));
      localStorage.setItem(KEYS.BOOKINGS, JSON.stringify([]));
      localStorage.setItem(KEYS.SLOTS, JSON.stringify(MOCK_SLOTS));
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
      localStorage.setItem(KEYS.INITIALIZED, "true");
    } else {
      // Garantir que dados essenciais existam mesmo se já inicializado
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
    }

    // Se Supabase configurado, sincronizar em background
    if (isSupabaseConfigured()) {
      console.log("✅ Supabase configurado. Sincronizando dados...");
      syncFromSupabase();
    }

    notify();
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
    if (isSupabaseConfigured()) {
      try {
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
          avatar_url: user.image,
        });

        if (profileError) console.error("Error saving profile:", profileError);

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

          if (proError) console.error("Error saving professional:", proError);
        }
      } catch (err) {
        console.error("Error saving to Supabase:", err);
      }
    }

    // Sempre salvar localmente
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
  updateTrainerPlan: async (id: string, active: boolean) => {
    if (isSupabaseConfigured()) {
      await supabase
        .from("professionals")
        .update({ plan_active: active })
        .eq("user_id", id);
      await supabase
        .from("profiles")
        .update({ status: active ? "active" : "deactivated" })
        .eq("id", id);
    }

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
    notify();
  },

  assignPlanToTrainer: async (trainerId: string, planId: string) => {
    const plans = DB.getPlans();
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    if (isSupabaseConfigured()) {
      await supabase
        .from("professionals")
        .update({
          plan_active: false,
          plan_type: plan.name,
          bio: "Pendiente de activación por Admin",
        })
        .eq("user_id", trainerId);

      await supabase
        .from("profiles")
        .update({ status: "deactivated" })
        .eq("id", trainerId);
    }

    const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
    const idx = pros.findIndex((p: ProfessionalProfile) => p.id === trainerId);
    if (idx === -1) return;

    pros[idx] = {
      ...pros[idx],
      planActive: false,
      planType: plan.name as PlanType,
      status: "deactivated",
      bio: "Pendiente de activación por Admin",
    };
    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
  },

  renewTrainerExpiry: async (id: string) => {
    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    if (isSupabaseConfigured()) {
      await supabase
        .from("professionals")
        .update({ plan_expiry: newExpiry.toISOString() })
        .eq("user_id", id);
    }

    const pros = JSON.parse(localStorage.getItem(KEYS.PROS) || "[]");
    const idx = pros.findIndex((p: ProfessionalProfile) => p.id === id);
    if (idx === -1) return;

    const current = pros[idx].planExpiry
      ? new Date(pros[idx].planExpiry!)
      : new Date();
    current.setMonth(current.getMonth() + 1);
    pros[idx].planExpiry = current.toISOString();
    localStorage.setItem(KEYS.PROS, JSON.stringify(pros));
    notify();
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
  // TIME SLOTS (SYNC)
  // =====================================================
  getSlots: (): TimeSlot[] => {
    return JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]");
  },

  getSlotsByTeacher: (teacherId: string): TimeSlot[] => {
    return JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]").filter(
      (s: TimeSlot) => s.proUserId === teacherId
    );
  },

  saveSlot: async (slot: TimeSlot) => {
    if (isSupabaseConfigured()) {
      try {
        const { data: pro } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", slot.proUserId)
          .single();
        if (pro) {
          await supabase.from("time_slots").insert({
            professional_id: pro.id,
            start_at: slot.startAt,
            end_at: slot.endAt,
            capacity_total: slot.capacityTotal,
            capacity_booked: slot.capacityBooked,
            slot_type: slot.type,
            location: slot.location,
            price: slot.price,
            status: slot.status,
          });
        }
      } catch (err) {
        console.error("Error saving slot:", err);
      }
    }

    const data = JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]");
    data.push(slot);
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(data));
    notify();
  },

  deleteSlot: async (id: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from("time_slots").delete().eq("id", id);
    }

    const data = JSON.parse(localStorage.getItem(KEYS.SLOTS) || "[]").filter(
      (s: TimeSlot) => s.id !== id
    );
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(data));
    notify();
  },

  // =====================================================
  // BOOKINGS (SYNC)
  // =====================================================
  getBookings: (): Booking[] => {
    return JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]");
  },

  getTeacherBookings: (id: string): Booking[] => {
    return JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]").filter(
      (b: Booking) => b.teacherId === id
    );
  },

  getClientBookings: (id: string): Booking[] => {
    return JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]").filter(
      (b: Booking) => b.clientId === id
    );
  },

  createBooking: async (b: Booking) => {
    if (isSupabaseConfigured()) {
      try {
        const { data: pro } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", b.teacherId)
          .single();
        if (pro) {
          await supabase.from("bookings").insert({
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
        }
      } catch (err) {
        console.error("Error creating booking:", err);
      }
    }

    const data = JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || "[]");
    data.push(b);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));
    notify();
  },

  deleteBooking: async (id: string) => {
    if (isSupabaseConfigured()) {
      await supabase.from("bookings").delete().eq("id", id);
    }

    const bookings = JSON.parse(
      localStorage.getItem(KEYS.BOOKINGS) || "[]"
    ).filter((b: Booking) => b.id !== id);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    notify();
  },

  updateBookingStatus: async (id: string, status: BookingStatus) => {
    const bookings = DB.getBookings();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    if (isSupabaseConfigured()) {
      await supabase.from("bookings").update({ status }).eq("id", id);
    }

    const data = bookings.map((b) => (b.id === id ? { ...b, status } : b));
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(data));

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
  // MESSAGES (SYNC)
  // =====================================================
  getMessages: (u1: string, u2: string): ChatMessage[] => {
    const all: ChatMessage[] = JSON.parse(
      localStorage.getItem(KEYS.MESSAGES) || "[]"
    );
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
    return all
      .filter((c) => c.participants.includes(userId))
      .sort((a, b) => {
        const dateA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
        const dateB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
        return dateB - dateA;
      });
  },

  sendMessage: async (msg: ChatMessage) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("messages").insert({
          sender_id: msg.senderId,
          receiver_id: msg.receiverId,
          text: msg.text,
          is_read: false,
        });
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
  // NOTIFICATIONS (SYNC)
  // =====================================================
  getNotifications: (userId: string): Notification[] => {
    const all: Notification[] = JSON.parse(
      localStorage.getItem(KEYS.NOTIFICATIONS) || "[]"
    );
    return all
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  },

  addNotification: async (notif: Notification) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("notifications").insert({
          user_id: notif.userId,
          title: notif.title,
          message: notif.message,
          notification_type: notif.type,
          is_read: false,
        });
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

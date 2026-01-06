import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  User,
  Booking,
  BookingStatus,
  Plan,
  ProfessionalProfile,
  TimeSlot,
  Category,
  UserRole,
} from "../types";
import { DB, markLocalWrite } from "../services/databaseService";
import { uploadProfileImage } from "../services/fileUploadService";

interface TeacherProps {
  user: User;
  onLogout: () => void;
  initialTab?: "agenda" | "reservas" | "perfil" | "gestor";
  onTabChange?: (tab: string) => void;
}

// Icon Components
const Icons = {
  Calendar: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Settings: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  List: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  User: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Clock: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Plus: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
    >
      <path d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Check: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
    >
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Logout: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Location: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="2"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  Camera: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
    >
      <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export const TeacherDashboard: React.FC<TeacherProps> = ({
  user: initialUser,
  onLogout,
  initialTab = "agenda",
  onTabChange,
}) => {
  const [pro, setPro] = useState<ProfessionalProfile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "agenda" | "reservas" | "perfil" | "gestor"
  >(initialTab);

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editSlotCapacity, setEditSlotCapacity] = useState("");
  const [editSlotPrice, setEditSlotPrice] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabClick = (tab: "agenda" | "reservas" | "perfil" | "gestor") => {
    setActiveTab(tab);
    if (onTabChange) {
      const navMap = {
        agenda: "inicio",
        gestor: "buscar",
        reservas: "reservas",
        perfil: "perfil",
      };
      onTabChange(navMap[tab]);
    }
  };

  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showPlanUpgrade, setShowPlanUpgrade] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [slotTimeStart, setSlotTimeStart] = useState("");
  const [slotTimeEnd, setSlotTimeEnd] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("1");
  const [slotType, setSlotType] = useState<"grupo" | "individual">(
    "individual"
  );
  const [slotPrice, setSlotPrice] = useState("10000");
  const [slotLocation, setSlotLocation] = useState("");

  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPrice, setEditPrice] = useState("0");
  const [editLocation, setEditLocation] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editAreas, setEditAreas] = useState<string[]>([]);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshData = useCallback(() => {
    const currentPro = DB.getPros().find((p) => p.id === initialUser.id);
    if (currentPro) {
      setPro(currentPro);
      setEditName(currentPro.name);
      setEditLastName(currentPro.lastName);
      setEditBio(currentPro.bio);
      setEditPrice(currentPro.price.toString());
      setEditLocation(currentPro.location);
      if (!slotLocation) setSlotLocation(currentPro.location);
      setEditImage(currentPro.image || "");
      setEditAreas(currentPro.areas);
    } else {
      const basePro: ProfessionalProfile = {
        id: initialUser.id,
        name: initialUser.name,
        lastName: initialUser.lastName || "",
        email: initialUser.email,
        phone: initialUser.phone || "",
        phoneVerified: false,
        role: UserRole.TEACHER,
        city: initialUser.city || "Costa Rica",
        status: "deactivated",
        areas: [],
        bio: "Pendiente de activación",
        location: initialUser.city || "Costa Rica",
        modalities: ["presencial"],
        rating: 5,
        reviews: 0,
        image: "",
        price: 0,
        planActive: false,
      };
      setPro(basePro);
      setEditName(basePro.name);
      setEditLastName(basePro.lastName);
      setEditBio(basePro.bio);
      setEditPrice("0");
      setEditLocation(basePro.location);
      if (!slotLocation) setSlotLocation(basePro.location);
    }
    setPlans(DB.getPlans().filter((p) => p.isActive));
    setBookings(
      DB.getTeacherBookings(initialUser.id).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
    const allBookings = DB.getBookings();
    const rawSlots = DB.getSlotsByTeacher(initialUser.id);
    const enrichedSlots = rawSlots.map((s) => {
      const booked = allBookings.filter(
        (b) =>
          b.slotId === s.id &&
          (b.status === BookingStatus.PENDIENTE ||
            b.status === BookingStatus.CONFIRMADA)
      ).length;
      return { ...s, capacityBooked: booked };
    });
    setSlots(
      enrichedSlots.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )
    );
    setCategories(DB.getCategories().filter((c) => c.isActive));
    setIsLoading(false);
  }, [initialUser.id, slotLocation]);

  useEffect(() => {
    refreshData();
    const syncInBackground = async () => {
      setIsSyncing(true);
      try {
        await DB.forceSync();
        refreshData();
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    syncInBackground();
    const unsub = DB.subscribe(refreshData);
    return () => unsub();
  }, [refreshData]);

  const handleUpdateSlotQuick = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    const updatedSlot: TimeSlot = {
      ...slot,
      capacityTotal: parseInt(editSlotCapacity) || slot.capacityTotal,
      price: parseInt(editSlotPrice) || slot.price,
    };
    const currentSlots = DB.getSlots();
    const idx = currentSlots.findIndex((s) => s.id === slotId);
    if (idx > -1) {
      currentSlots[idx] = updatedSlot;
      localStorage.setItem("fm_slots_v3", JSON.stringify(currentSlots));
      window.dispatchEvent(new CustomEvent("fm-db-update"));
    }
    setEditingSlotId(null);
    showToast("Horario actualizado");
  };

  const handleToggleSlotStatus = (slotId: string) => {
    const currentSlots = DB.getSlots();
    const idx = currentSlots.findIndex((s) => s.id === slotId);
    if (idx > -1) {
      currentSlots[idx].status =
        currentSlots[idx].status === "active" ? "cancelled" : "active";
      localStorage.setItem("fm_slots_v3", JSON.stringify(currentSlots));
      window.dispatchEvent(new CustomEvent("fm-db-update"));
      showToast(
        currentSlots[idx].status === "active"
          ? "Horario publicado"
          : "Horario pausado"
      );
    }
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotTimeStart || !slotTimeEnd) return;
    const start = new Date(`${slotDate}T${slotTimeStart}`);
    const end = new Date(`${slotDate}T${slotTimeEnd}`);
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      proUserId: initialUser.id,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      capacityTotal: parseInt(slotCapacity),
      capacityBooked: 0,
      type: slotType,
      location: slotLocation || pro?.location || "Costa Rica",
      price: parseInt(slotPrice),
      status: "active",
    };
    DB.saveSlot(newSlot);
    setShowAddSlot(false);
    setSlotTimeStart("");
    setSlotTimeEnd("");
    showToast("Horario creado");
  };

  const daysLeft = useMemo(() => {
    if (!pro?.planExpiry) return 0;
    const diff = new Date(pro.planExpiry).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [pro]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter(
      (b) => b.status === BookingStatus.CONFIRMADA
    );
    return {
      earned: confirmed.reduce((acc, curr) => acc + curr.price, 0),
      count: bookings.length,
      pending: bookings.filter((b) => b.status === BookingStatus.PENDIENTE)
        .length,
      confirmed: confirmed.length,
    };
  }, [bookings]);

  const handleSaveProfile = async () => {
    const basePro: ProfessionalProfile = pro || {
      id: initialUser.id,
      name: initialUser.name,
      lastName: initialUser.lastName || "",
      email: initialUser.email,
      phone: initialUser.phone || "",
      phoneVerified: false,
      role: UserRole.TEACHER,
      city: initialUser.city || "Costa Rica",
      status: "active",
      areas: [],
      bio: "Nuevo profesional en FitnessMatch",
      location: initialUser.city || "Costa Rica",
      modalities: ["presencial"],
      rating: 5,
      reviews: 0,
      image: "",
      price: 0,
      planActive: true,
      planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const updated: ProfessionalProfile = {
      ...basePro,
      name: editName || basePro.name,
      lastName: editLastName || basePro.lastName,
      bio: editBio || basePro.bio,
      price: parseInt(editPrice) || basePro.price || 0,
      location: editLocation || basePro.location,
      image: editImage || basePro.image,
      areas: editAreas.length > 0 ? editAreas : basePro.areas,
    };
    try {
      const pros = JSON.parse(localStorage.getItem("fm_pros_v3") || "[]");
      const idx = pros.findIndex(
        (p: ProfessionalProfile) => p.id === updated.id
      );
      if (idx > -1) pros[idx] = { ...pros[idx], ...updated };
      else pros.push(updated);
      try {
        localStorage.setItem("fm_pros_v3", JSON.stringify(pros));
      } catch (quotaError: any) {
        if (quotaError.name === "QuotaExceededError") {
          const prosWithoutLargeImages = pros.map((p: ProfessionalProfile) => ({
            ...p,
            image: p.image && p.image.length > 10000 ? "" : p.image,
          }));
          localStorage.setItem(
            "fm_pros_v3",
            JSON.stringify(prosWithoutLargeImages)
          );
          showToast("Imagen muy grande", "error");
        } else throw quotaError;
      }
      window.dispatchEvent(new CustomEvent("fm-db-update"));
      DB.saveUser(updated).catch(console.error);
      setPro(updated);
      showToast("Perfil guardado");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const result = await uploadProfileImage(file, initialUser.id);

      if (result.success && result.url) {
        setEditImage(result.url);
        showToast("Foto actualizada");
      } else {
        showToast(result.error || "Error al subir foto", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error al subir foto", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const toggleArea = (areaName: string) => {
    setEditAreas((prev) =>
      prev.includes(areaName)
        ? prev.filter((a) => a !== areaName)
        : [...prev, areaName]
    );
  };

  const handleSelectPlan = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    
    const isFree = plan.price === 0;
    const requestedAt = new Date().toISOString();
    
    // Para plan gratuito: activar automáticamente
    // Para planes pagos: esperar aprobación del admin
    const shouldAutoActivate = isFree;
    
    // Calcular fecha de expiración (30 días para plan gratuito)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    const pros = JSON.parse(localStorage.getItem("fm_pros_v3") || "[]");
    const existingIdx = pros.findIndex(
      (p: ProfessionalProfile) => p.id === initialUser.id
    );
    
    const newPro: ProfessionalProfile = {
      id: initialUser.id,
      name: initialUser.name,
      lastName: initialUser.lastName || "",
      email: initialUser.email,
      phone: initialUser.phone || "",
      phoneVerified: false,
      role: UserRole.TEACHER,
      city: initialUser.city || "Costa Rica",
      status: shouldAutoActivate ? "active" : "deactivated",
      areas: [],
      bio: "",
      location: initialUser.city || "Costa Rica",
      modalities: ["presencial"],
      rating: 5,
      reviews: 0,
      image: "",
      price: 0,
      planActive: shouldAutoActivate,
      planType: plan.name as any,
      planExpiry: shouldAutoActivate ? expiryDate.toISOString() : undefined,
      requestedPlanId: shouldAutoActivate ? undefined : planId,
      requestedPlanAt: shouldAutoActivate ? undefined : requestedAt,
      activatedAt: shouldAutoActivate ? requestedAt : undefined,
    };
    
    if (existingIdx > -1)
      pros[existingIdx] = { ...pros[existingIdx], ...newPro };
    else pros.push(newPro);
    
    // Marcar escrita local para bloquear sync por 8 segundos
    markLocalWrite();
    localStorage.setItem("fm_pros_v3", JSON.stringify(pros));
    window.dispatchEvent(new CustomEvent("fm-db-update"));
    setPro(newPro);
    
    // Save to Supabase - IMPORTANTE para funcionar em outros dispositivos
    try {
      const { supabase, isSupabaseConfigured } = await import("../services/supabaseClient");
      if (!isSupabaseConfigured()) {
        console.log("⚠️ Supabase não configurado, usando apenas localStorage");
        showToast(shouldAutoActivate ? "¡Plan activado!" : "Solicitud enviada");
        return;
      }
      
      // Check if professional record exists
      const { data: existingProData } = await supabase
        .from("professionals")
        .select("user_id")
        .eq("user_id", initialUser.id)
        .single();
      
      // Dados para salvar no Supabase
      const professionalData = {
        plan_type: plan.name,
        plan_active: shouldAutoActivate,
        plan_expiry: shouldAutoActivate ? expiryDate.toISOString() : null,
        status: shouldAutoActivate ? "active" : "deactivated",
        requested_plan_id: shouldAutoActivate ? null : planId,
        requested_plan_at: shouldAutoActivate ? null : requestedAt,
      };
      
      if (existingProData) {
        const { error } = await supabase.from("professionals")
          .update(professionalData)
          .eq("user_id", initialUser.id);
        if (error) {
          console.error("❌ Erro ao atualizar professional:", error);
          showToast("Error al guardar. Intenta de nuevo.", "error");
          return;
        }
      } else {
        const { error } = await supabase.from("professionals").insert({
          user_id: initialUser.id,
          name: initialUser.name,
          email: initialUser.email,
          phone: initialUser.phone || "",
          bio: "",
          location: initialUser.city || "Costa Rica",
          areas: [],
          modalities: ["presencial"],
          rating: 5,
          reviews: 0,
          price: 0,
          ...professionalData,
        });
        if (error) {
          console.error("❌ Erro ao inserir professional:", error);
          showToast("Error al guardar. Intenta de nuevo.", "error");
          return;
        }
      }
      
      // Update profiles table
      await supabase.from("profiles")
        .update({ 
          status: shouldAutoActivate ? "active" : "deactivated",
        })
        .eq("id", initialUser.id);
      
      console.log(shouldAutoActivate 
        ? "✅ Plan gratuito activado en Supabase" 
        : "✅ Solicitud guardada en Supabase");
        
    } catch (e) {
      console.error("❌ Error crítico al guardar:", e);
      showToast("Error de conexión", "error");
      return;
    }
    
    showToast(shouldAutoActivate 
      ? "¡Plan activado! Bienvenido" 
      : "Solicitud enviada al administrador"
    );
  };
  
  // Get the requested plan details
  const requestedPlan = pro?.requestedPlanId 
    ? plans.find(p => p.id === pro.requestedPlanId) 
    : null;

  if (isLoading) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Plan not active
  if (!pro?.planActive) {
    return (
      <div className="flex-1 bg-white flex flex-col overflow-hidden">
        <header className="px-6 pt-14 pb-6 flex justify-between items-start">
          <div>
            <p className="text-xs text-neutral-400 font-medium">Bienvenido</p>
            <h1 className="text-2xl font-bold text-black mt-1">
              {initialUser.name}
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 active:scale-95 transition-transform"
          >
            <Icons.Logout />
          </button>
        </header>

        <div className="flex-1 px-6 overflow-y-auto no-scrollbar">
          {/* State: Waiting for Admin approval */}
          {pro?.requestedPlanId && !pro?.planActive ? (
            <div className="py-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-black">Esperando aprobación</h2>
                <p className="text-neutral-500 text-sm mt-2 max-w-xs mx-auto">
                  Tu solicitud está siendo revisada por el administrador.
                </p>
              </div>
              
              {/* Plan Selected Card */}
              {requestedPlan && (
                <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">
                      PLAN SOLICITADO
                    </span>
                    <span className="text-xs text-neutral-400">
                      {pro.requestedPlanAt && new Date(pro.requestedPlanAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{requestedPlan.name}</h3>
                  <p className="text-neutral-400 text-sm mb-4">
                    {requestedPlan.durationMonths} {requestedPlan.durationMonths === 1 ? "mes" : "meses"} de acceso
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">₡{requestedPlan.price.toLocaleString()}</span>
                    <span className="text-neutral-400 text-sm">/ pago único</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-neutral-400 mb-2">Incluye:</p>
                    <div className="flex flex-wrap gap-2">
                      {requestedPlan.features.slice(0, 3).map((f, i) => (
                        <span key={i} className="text-xs text-neutral-300 bg-white/5 px-2 py-1 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Timeline */}
              <div className="bg-neutral-50 rounded-2xl p-5">
                <h4 className="font-semibold text-black text-sm mb-4">Estado de tu solicitud</h4>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">Solicitud enviada</p>
                      <p className="text-xs text-neutral-400">Plan seleccionado correctamente</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">En revisión</p>
                      <p className="text-xs text-neutral-400">Esperando confirmación del administrador</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 opacity-40">
                    <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Plan activado</p>
                      <p className="text-xs text-neutral-400">Acceso completo a la plataforma</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Change Plan Button */}
              <button
                onClick={() => {
                  const updatedPro = { ...pro, requestedPlanId: undefined, requestedPlanAt: undefined };
                  setPro(updatedPro as any);
                  const pros = JSON.parse(localStorage.getItem("fm_pros_v3") || "[]");
                  const idx = pros.findIndex((p: any) => p.id === pro.id);
                  if (idx > -1) {
                    pros[idx] = updatedPro;
                    localStorage.setItem("fm_pros_v3", JSON.stringify(pros));
                  }
                }}
                className="w-full mt-6 py-3 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
              >
                Cambiar plan seleccionado
              </button>
            </div>
          ) : (
            /* State: Select a Plan */
            <>
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-black">Elige tu plan</h2>
                <p className="text-neutral-400 text-sm mt-1">
                  Selecciona el plan que mejor se adapte a ti
                </p>
              </div>

              <div className="space-y-4 pb-24">
                {plans.map((p, idx) => {
                  const isFree = p.price === 0;
                  const isPopular = p.isFeatured;
                  const reservationsText = (p as any).maxReservationsPerMonth === -1 
                    ? 'Ilimitadas' 
                    : `${(p as any).maxReservationsPerMonth || 1}`;
                  
                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-3xl overflow-hidden transition-all ${
                        isPopular ? 'ring-2 ring-blue-500 shadow-xl' : 'shadow-md'
                      }`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider">
                          Más Popular
                        </div>
                      )}
                      
                      {/* Plan Header */}
                      <div className={`bg-gradient-to-r ${(p as any).color || 'from-slate-500 to-slate-600'} p-5 ${isPopular ? 'pt-8' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                              {isFree ? 'Gratis' : 'Por mes'}
                            </span>
                            <h3 className="text-2xl font-black text-white mt-0.5">{p.name}</h3>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              {p.promoPrice && (
                                <span className="text-white/50 text-sm line-through">₡{p.price.toLocaleString()}</span>
                              )}
                              <span className="text-3xl font-black text-white">
                                {isFree ? 'Gratis' : `₡${(p.promoPrice || p.price).toLocaleString()}`}
                              </span>
                            </div>
                            {!isFree && (
                              <span className="text-white/60 text-xs">/mes</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Key Stats */}
                        <div className="flex gap-3 mt-4">
                          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex-1 text-center">
                            <p className="text-lg font-black text-white">{reservationsText}</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Reservas</p>
                          </div>
                          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex-1 text-center">
                            <p className="text-lg font-black text-white">{p.maxPhotos}</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Fotos</p>
                          </div>
                          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex-1 text-center">
                            <p className="text-lg font-black text-white">
                              {p.includesAnalytics ? (
                                <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : '—'}
                            </p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Analytics</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Features & CTA */}
                      <div className="bg-white p-5">
                        <p className="text-xs text-neutral-500 mb-3">{p.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          {p.features.slice(0, 4).map((feature, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-neutral-600">{feature}</span>
                            </div>
                          ))}
                          {p.features.length > 4 && (
                            <p className="text-[10px] text-neutral-400 ml-6">+{p.features.length - 4} beneficios más</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleSelectPlan(p.id)}
                          className={`w-full py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${
                            isFree 
                              ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                              : isPopular
                              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                              : 'bg-black text-white hover:bg-neutral-800'
                          }`}
                        >
                          {isFree ? 'Comenzar Gratis' : `Seleccionar ${p.name}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Comparison note */}
                <div className="text-center py-4">
                  <p className="text-xs text-neutral-400">
                    Todos los planes incluyen acceso al panel de gestión
                  </p>
                  <p className="text-[10px] text-neutral-300 mt-1">
                    Puedes cambiar de plan en cualquier momento
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-neutral-50 flex flex-col overflow-hidden relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-14 inset-x-4 z-[200] animate-slide-up">
          <div
            className={`mx-auto max-w-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-black text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? <Icons.Check /> : <Icons.X />}
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Sync indicator */}
      {isSyncing && (
        <div className="absolute top-3 right-3 z-50">
          <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-14 pb-5 bg-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs text-neutral-400 font-medium">
              Panel profesional
            </p>
            <h1 className="text-2xl font-bold text-black mt-1">
              {pro?.name || initialUser.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-200">
              {editImage ? (
                <img
                  src={editImage}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center text-white font-medium">
                  {(pro?.name || initialUser.name)[0]}
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className="w-11 h-11 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 active:scale-95 transition-transform"
            >
              <Icons.Logout />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-black p-4 rounded-xl text-white">
            <p className="text-[11px] text-white/60 font-medium uppercase tracking-wide">
              Ingresos
            </p>
            <p className="text-lg font-bold mt-1">
              ₡{stats.earned.toLocaleString()}
            </p>
          </div>
          <div className="bg-neutral-100 p-4 rounded-xl">
            <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">
              Reservas
            </p>
            <p className="text-lg font-bold text-black mt-1">{stats.count}</p>
          </div>
          <div className="bg-neutral-100 p-4 rounded-xl">
            <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">
              Días
            </p>
            <p className="text-lg font-bold text-black mt-1">{daysLeft}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          {[
            { key: "agenda", label: "Agenda", Icon: Icons.Calendar },
            { key: "gestor", label: "Gestión", Icon: Icons.Settings },
            { key: "reservas", label: "Reservas", Icon: Icons.List },
            { key: "perfil", label: "Perfil", Icon: Icons.User },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key as any)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-black text-black"
                  : "border-transparent text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <tab.Icon />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
        {/* AGENDA */}
        {activeTab === "agenda" && (
          <div className="py-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-black">Mis horarios</h3>
                <p className="text-sm text-neutral-400">
                  {slots.length} publicados
                </p>
              </div>
              <button
                onClick={() => setShowAddSlot(true)}
                className="bg-black text-white h-10 px-4 rounded-full text-sm font-medium flex items-center gap-2 active:scale-95 transition-transform"
              >
                <Icons.Plus />
                Nuevo
              </button>
            </div>

            {slots.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <Icons.Calendar />
                </div>
                <p className="text-neutral-500 font-medium">
                  Sin horarios creados
                </p>
                <p className="text-neutral-400 text-sm mt-1">
                  Crea tu primer horario
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((s) => {
                  const progress = (s.capacityBooked / s.capacityTotal) * 100;
                  const isFull = s.capacityBooked >= s.capacityTotal;
                  return (
                    <div
                      key={s.id}
                      className={`bg-white p-4 rounded-2xl transition-all ${
                        s.status === "cancelled" ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                              isFull
                                ? "bg-red-50 text-red-600"
                                : "bg-neutral-100 text-black"
                            }`}
                          >
                            <span className="text-xs font-medium">
                              {new Date(s.startAt).toLocaleDateString("es", {
                                weekday: "short",
                              })}
                            </span>
                            <span className="text-lg font-bold">
                              {new Date(s.startAt).getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-black">
                              {new Date(s.startAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm text-neutral-400">
                              {s.type === "grupo" ? "Grupo" : "Individual"} ·{" "}
                              {s.location}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black">
                            ₡{s.price.toLocaleString()}
                          </p>
                          <p
                            className={`text-sm ${
                              isFull ? "text-red-500" : "text-neutral-400"
                            }`}
                          >
                            {s.capacityBooked}/{s.capacityTotal}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isFull ? "bg-red-500" : "bg-black"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <button
                          onClick={() => DB.deleteSlot(s.id)}
                          className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GESTOR */}
        {activeTab === "gestor" && (
          <div className="py-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-black">
                Gestión de horarios
              </h3>
              <p className="text-sm text-neutral-400">
                Edita capacidad, precio y estado
              </p>
            </div>

            {slots.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <p className="text-neutral-400">Sin horarios para gestionar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((s) => {
                  const isEditing = editingSlotId === s.id;
                  const progress = (s.capacityBooked / s.capacityTotal) * 100;
                  return (
                    <div
                      key={s.id}
                      className={`bg-white rounded-2xl overflow-hidden ${
                        s.status === "cancelled" ? "opacity-60" : ""
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400">
                              <Icons.Clock />
                            </div>
                            <div>
                              <p className="font-semibold text-black">
                                {new Date(s.startAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-sm text-neutral-400">
                                {new Date(s.startAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleSlotStatus(s.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              s.status === "active"
                                ? "bg-black text-white"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {s.status === "active" ? "Activo" : "Pausado"}
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-400">Cupos</span>
                            <span className="font-medium text-black">
                              {s.capacityBooked}/{s.capacityTotal}
                            </span>
                          </div>
                          <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                progress >= 90 ? "bg-red-500" : "bg-black"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 flex gap-2">
                        {isEditing ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="number"
                              placeholder="Cupos"
                              value={editSlotCapacity}
                              onChange={(e) =>
                                setEditSlotCapacity(e.target.value)
                              }
                              className="w-20 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-black"
                            />
                            <input
                              type="number"
                              placeholder="Precio"
                              value={editSlotPrice}
                              onChange={(e) => setEditSlotPrice(e.target.value)}
                              className="flex-1 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-black"
                            />
                            <button
                              onClick={() => handleUpdateSlotQuick(s.id)}
                              className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform"
                            >
                              <Icons.Check />
                            </button>
                            <button
                              onClick={() => setEditingSlotId(null)}
                              className="w-10 h-10 bg-white border border-neutral-200 text-neutral-400 rounded-lg flex items-center justify-center active:scale-95 transition-transform"
                            >
                              <Icons.X />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingSlotId(s.id);
                                setEditSlotCapacity(s.capacityTotal.toString());
                                setEditSlotPrice(s.price.toString());
                              }}
                              className="flex-1 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-600 active:scale-[0.98] transition-all"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => DB.deleteSlot(s.id)}
                              className="w-10 h-10 bg-white border border-neutral-200 text-neutral-400 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
                            >
                              <Icons.Trash />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RESERVAS */}
        {activeTab === "reservas" && (
          <div className="py-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-black">Gestión de citas</h3>
              <p className="text-sm text-neutral-400">
                {stats.pending > 0 && (
                  <span className="text-orange-500">
                    {stats.pending} pendientes
                  </span>
                )}
                {stats.pending > 0 && stats.confirmed > 0 && " · "}
                {stats.confirmed > 0 && (
                  <span className="text-emerald-500">
                    {stats.confirmed} confirmadas
                  </span>
                )}
                {stats.pending === 0 &&
                  stats.confirmed === 0 &&
                  "Sin citas activas"}
              </p>
            </div>

            {bookings.filter(
              (b) =>
                b.status !== BookingStatus.CANCELADA &&
                b.status !== BookingStatus.RECHAZADA
            ).length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <div className="w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                  <Icons.List />
                </div>
                <p className="text-neutral-500 font-medium">
                  Sin reservas activas
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings
                  .filter(
                    (b) =>
                      b.status !== BookingStatus.CANCELADA &&
                      b.status !== BookingStatus.RECHAZADA
                  )
                  .map((b) => (
                    <div key={b.id} className="bg-white p-4 rounded-2xl">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center font-semibold">
                            {b.clientName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-black">
                              {b.clientName}
                            </p>
                            <p className="text-sm text-neutral-400">
                              {new Date(b.date).toLocaleDateString("es", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              · {new Date(b.date).getHours()}:00
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            b.status === BookingStatus.CONFIRMADA
                              ? "bg-emerald-50 text-emerald-600"
                              : b.status === BookingStatus.PENDIENTE
                              ? "bg-orange-50 text-orange-500"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {b.status === BookingStatus.CONFIRMADA
                            ? "Confirmada"
                            : b.status === BookingStatus.PENDIENTE
                            ? "Pendiente"
                            : b.status}
                        </span>
                      </div>
                      {b.message && (
                        <div className="bg-neutral-50 p-3 rounded-xl mb-3">
                          <p className="text-sm text-neutral-500">
                            "{b.message}"
                          </p>
                        </div>
                      )}
                      {b.status === BookingStatus.PENDIENTE && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              DB.updateBookingStatus(
                                b.id,
                                BookingStatus.RECHAZADA
                              )
                            }
                            className="py-2.5 bg-neutral-100 text-neutral-600 rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() =>
                              DB.updateBookingStatus(
                                b.id,
                                BookingStatus.CONFIRMADA
                              )
                            }
                            className="py-2.5 bg-black text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-all"
                          >
                            Confirmar
                          </button>
                        </div>
                      )}
                      {b.status === BookingStatus.CONFIRMADA && (
                        <button
                          onClick={() =>
                            confirm(
                              `¿Cancelar la reserva de ${b.clientName}?`
                            ) &&
                            DB.updateBookingStatus(
                              b.id,
                              BookingStatus.CANCELADA
                            )
                          }
                          className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Icons.X /> Cancelar
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {bookings.filter(
              (b) =>
                b.status === BookingStatus.CANCELADA ||
                b.status === BookingStatus.RECHAZADA
            ).length > 0 && (
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-400 mb-3">
                  Histórico (
                  {
                    bookings.filter(
                      (b) =>
                        b.status === BookingStatus.CANCELADA ||
                        b.status === BookingStatus.RECHAZADA
                    ).length
                  }
                  )
                </p>
                <div className="space-y-2">
                  {bookings
                    .filter(
                      (b) =>
                        b.status === BookingStatus.CANCELADA ||
                        b.status === BookingStatus.RECHAZADA
                    )
                    .map((b) => (
                      <div
                        key={b.id}
                        className="bg-white p-3 rounded-xl flex items-center justify-between opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center text-sm font-medium">
                            {b.clientName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-600">
                              {b.clientName}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {new Date(b.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            b.status === BookingStatus.CANCELADA
                              ? "text-red-400"
                              : "text-neutral-400"
                          }`}
                        >
                          {b.status === BookingStatus.CANCELADA
                            ? "Cancelada"
                            : "Rechazada"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PERFIL */}
        {activeTab === "perfil" && (
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-full bg-neutral-200 overflow-hidden">
                  {isUploadingImage ? (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  ) : editImage ? (
                    <img
                      src={editImage}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center text-white text-3xl font-bold">
                      {editName[0] || "?"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() =>
                    !isUploadingImage && fileInputRef.current?.click()
                  }
                  disabled={isUploadingImage}
                  className={`absolute -bottom-1 -right-1 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${
                    isUploadingImage ? "opacity-50" : ""
                  }`}
                >
                  <Icons.Camera />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
              />
              <p className="text-sm text-neutral-400">
                {isUploadingImage ? "Subiendo..." : "Foto de perfil"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Ej: Escazú Centro"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Precio por sesión (₡)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Disciplinas
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleArea(cat.name)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        editAreas.includes(cat.name)
                          ? "bg-black text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Bio profesional
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-black transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-4 bg-black text-white rounded-full text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Icons.Check /> Guardar perfil
            </button>

            {/* Current Plan Section */}
            <div className="mt-8 pt-6 border-t border-neutral-200">
              <h3 className="text-sm font-bold text-black mb-4">Tu suscripción</h3>
              
              {(() => {
                const currentPlan = plans.find(p => p.name === pro?.planType);
                const daysRemaining = pro?.planExpiry 
                  ? Math.ceil((new Date(pro.planExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : 0;
                const isExpiring = daysRemaining <= 7 && daysRemaining > 0;
                const isExpired = daysRemaining <= 0;
                const reservationsUsed = bookings.filter(b => 
                  b.status === 'Confirmada' && 
                  new Date(b.date).getMonth() === new Date().getMonth()
                ).length;
                const maxReservations = (currentPlan as any)?.maxReservationsPerMonth || 1;
                const reservationsLeft = maxReservations === -1 ? '∞' : Math.max(0, maxReservations - reservationsUsed);
                
                return (
                  <div className={`rounded-2xl overflow-hidden ${isExpired ? 'ring-2 ring-red-200' : isExpiring ? 'ring-2 ring-amber-200' : ''}`}>
                    {/* Plan Header */}
                    <div className={`bg-gradient-to-r ${(currentPlan as any)?.color || 'from-slate-500 to-slate-600'} p-4`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Plan actual</span>
                          <h4 className="text-xl font-black text-white">{pro?.planType || 'Sin plan'}</h4>
                        </div>
                        {pro?.planExpiry && (
                          <div className={`text-right px-3 py-1.5 rounded-lg ${isExpired ? 'bg-red-500' : isExpiring ? 'bg-amber-500' : 'bg-white/20'}`}>
                            <p className="text-lg font-black text-white">{Math.max(0, daysRemaining)}</p>
                            <p className="text-[8px] font-bold text-white/70 uppercase">días</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Reservations counter */}
                      <div className="flex gap-2 mt-3">
                        <div className="bg-white/15 rounded-xl px-3 py-2 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/70">Reservas este mes</span>
                            <span className="text-sm font-black text-white">
                              {reservationsUsed}/{maxReservations === -1 ? '∞' : maxReservations}
                            </span>
                          </div>
                          {maxReservations !== -1 && (
                            <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  reservationsUsed >= maxReservations ? 'bg-red-400' : 'bg-white'
                                }`}
                                style={{ width: `${Math.min(100, (reservationsUsed / maxReservations) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Warning messages */}
                      {reservationsUsed >= maxReservations && maxReservations !== -1 && (
                        <div className="bg-red-500/30 rounded-lg px-3 py-2 mt-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-white font-medium">Has alcanzado el límite. ¡Mejora tu plan!</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Plan Features */}
                    <div className="bg-white p-4">
                      {currentPlan && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {currentPlan.features.slice(0, 3).map((f, i) => (
                            <span key={i} className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <button
                        onClick={() => setShowPlanUpgrade(true)}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        {currentPlan?.name === 'Elite' ? 'Ver mi plan' : 'Mejorar plan'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Horario */}
      {showAddSlot && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end">
          <form
            onSubmit={handleAddSlot}
            className="w-full bg-white rounded-t-3xl max-w-lg mx-auto flex flex-col max-h-[85vh] animate-slide-up"
          >
            <div className="px-6 pt-4 pb-3 border-b border-neutral-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-black">Nuevo horario</h2>
                <p className="text-sm text-neutral-400">
                  Agenda tu disponibilidad
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSlot(false)}
                className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 active:scale-90 transition-transform"
              >
                <Icons.X />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Fecha
                </label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  required
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    Inicio
                  </label>
                  <input
                    type="time"
                    value={slotTimeStart}
                    onChange={(e) => setSlotTimeStart(e.target.value)}
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    Fin
                  </label>
                  <input
                    type="time"
                    value={slotTimeEnd}
                    onChange={(e) => setSlotTimeEnd(e.target.value)}
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-black"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["individual", "grupo"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSlotType(t as any)}
                      className={`py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                        slotType === t
                          ? "bg-black text-white"
                          : "bg-neutral-50 text-neutral-600 border border-neutral-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    Cupos
                  </label>
                  <input
                    type="number"
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(e.target.value)}
                    min="1"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    Precio (₡)
                  </label>
                  <input
                    type="number"
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-black"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={slotLocation}
                  onChange={(e) => setSlotLocation(e.target.value)}
                  placeholder="Ej: Gym Central, Escazú"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="p-6 border-t border-neutral-100">
              <button
                type="submit"
                className="w-full py-4 bg-black text-white rounded-full text-sm font-semibold active:scale-[0.98] transition-all"
              >
                Crear horario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Upgrade de Plan */}
      {showPlanUpgrade && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end">
          <div className="w-full bg-white rounded-t-3xl max-w-lg mx-auto flex flex-col max-h-[90vh] animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 pt-4 pb-6 rounded-t-3xl">
              <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Gestiona tu</span>
                  <h2 className="text-2xl font-black text-white">Suscripción</h2>
                </div>
                <button 
                  onClick={() => setShowPlanUpgrade(false)}
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Current plan indicator */}
              <div className="mt-4 bg-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white/60 text-xs">Plan actual</span>
                    <p className="text-xl font-black text-white">{pro?.planType || 'Sin plan'}</p>
                  </div>
                  {pro?.planExpiry && (
                    <div className="text-right">
                      <span className="text-white/60 text-xs">Vence</span>
                      <p className="text-sm font-bold text-white">
                        {new Date(pro.planExpiry).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Plans List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              <p className="text-xs text-neutral-400 font-medium">Selecciona un plan para solicitar cambio:</p>
              
              {plans.map((p) => {
                const isCurrentPlan = pro?.planType === p.name;
                const isFree = p.price === 0;
                const reservationsText = (p as any).maxReservationsPerMonth === -1 
                  ? 'Ilimitadas' 
                  : `${(p as any).maxReservationsPerMonth || 1}/mes`;
                
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border-2 overflow-hidden transition-all ${
                      isCurrentPlan 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    {/* Plan header */}
                    <div className={`bg-gradient-to-r ${(p as any).color || 'from-slate-500 to-slate-600'} p-4`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-lg font-black text-white">{p.name}</p>
                            <p className="text-white/70 text-xs">{reservationsText} reservas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {p.promoPrice && (
                            <span className="text-white/50 text-xs line-through">₡{p.price.toLocaleString()}</span>
                          )}
                          <p className="text-xl font-black text-white">
                            {isFree ? 'Gratis' : `₡${(p.promoPrice || p.price).toLocaleString()}`}
                          </p>
                          {!isFree && <span className="text-white/60 text-[10px]">/mes</span>}
                        </div>
                      </div>
                    </div>
                    
                    {/* Features & CTA */}
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
                            <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
                          </svg>
                          {p.maxPhotos} fotos
                        </span>
                        {p.includesAnalytics && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                            </svg>
                            Analytics
                          </span>
                        )}
                        {p.prioritySupport && (
                          <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                            </svg>
                            Soporte prioritario
                          </span>
                        )}
                        {(p as any).highlightedProfile && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            Destacado
                          </span>
                        )}
                      </div>
                      
                      {isCurrentPlan ? (
                        <div className="w-full py-3 bg-indigo-100 text-indigo-600 rounded-xl font-bold text-sm text-center">
                          Plan actual
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            handleSelectPlan(p.id);
                            setShowPlanUpgrade(false);
                          }}
                          className={`w-full py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${
                            isFree 
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-black text-white'
                          }`}
                        >
                          {isFree ? 'Cambiar a Prueba' : `Solicitar ${p.name}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <p className="text-[10px] text-neutral-400 text-center pt-4">
                Los cambios de plan requieren aprobación del administrador
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

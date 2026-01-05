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
import { DB } from "../services/databaseService";

interface TeacherProps {
  user: User;
  onLogout: () => void;
  initialTab?: "agenda" | "reservas" | "perfil" | "gestor";
  onTabChange?: (tab: string) => void;
}

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

  // States para edição rápida de slot
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

  // States para criação de slot
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [slotTimeStart, setSlotTimeStart] = useState("");
  const [slotTimeEnd, setSlotTimeEnd] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("1");
  const [slotType, setSlotType] = useState<"grupo" | "individual">(
    "individual"
  );
  const [slotPrice, setSlotPrice] = useState("10000");
  const [slotLocation, setSlotLocation] = useState("");

  // States para edição de perfil
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

  // CARREGAR DADOS DO CACHE IMEDIATAMENTE
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

  // CARREGAR DO CACHE PRIMEIRO, SINCRONIZAR EM BACKGROUND
  useEffect(() => {
    // 1. Carregar imediatamente do cache
    refreshData();

    // 2. Sincronizar do Supabase em background (sem bloquear UI)
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
    showToast("✓ Horario actualizado");
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
          ? "✓ Horario publicado"
          : "✓ Horario pausado"
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
    showToast("✓ Horario creado con éxito");
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
          showToast("⚠️ Imagen muy grande, guardado sin foto", "error");
        } else throw quotaError;
      }

      window.dispatchEvent(new CustomEvent("fm-db-update"));
      DB.saveUser(updated).catch(console.error);
      setPro(updated);
      showToast("✓ Perfil guardado con éxito");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  const compressImage = (
    file: File,
    maxWidth = 400,
    quality = 0.6
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width,
            height = img.height;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 0.6);
        setEditImage(compressed);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => setEditImage(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const toggleArea = (areaName: string) => {
    setEditAreas((prev) =>
      prev.includes(areaName)
        ? prev.filter((a) => a !== areaName)
        : [...prev, areaName]
    );
  };

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

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
      status: "deactivated",
      areas: [],
      bio: "Pendiente de activación por Admin",
      location: initialUser.city || "Costa Rica",
      modalities: ["presencial"],
      rating: 5,
      reviews: 0,
      image: "",
      price: 0,
      planActive: false,
      planType: plan.name as any,
    };

    if (existingIdx > -1)
      pros[existingIdx] = { ...pros[existingIdx], ...newPro };
    else pros.push(newPro);

    localStorage.setItem("fm_pros_v3", JSON.stringify(pros));
    window.dispatchEvent(new CustomEvent("fm-db-update"));
    setPro(newPro);
    showToast("Plan seleccionado. Esperando activación...");
  };

  // Greeting baseado na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm font-medium">Cargando panel...</p>
        </div>
      </div>
    );
  }

  // PLAN NOT ACTIVE
  if (!pro?.planActive) {
    return (
      <div className="flex-1 bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden">
        <header className="px-6 pt-14 pb-6 shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest animate-fade-in">
                {getGreeting()}
              </p>
              <h1 className="text-2xl font-black text-black tracking-tight mt-1">
                {initialUser.name}
              </h1>
            </div>
            <button
              onClick={onLogout}
              className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center active:scale-90 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 px-6 overflow-y-auto no-scrollbar">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce-in">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {pro?.bio === "Pendiente de activación por Admin"
                ? "Esperando Aprobación"
                : "Activa tu Perfil Pro"}
            </h2>
            <p className="text-slate-400 text-sm mt-3 max-w-xs mx-auto leading-relaxed">
              {pro?.bio === "Pendiente de activación por Admin"
                ? "Ya seleccionaste tu plan. El administrador revisará tu cuenta pronto."
                : "Elige un plan para aparecer en las búsquedas y comenzar a recibir clientes."}
            </p>
          </div>

          {pro?.bio !== "Pendiente de activación por Admin" && (
            <div className="space-y-3 pb-20">
              {plans.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPlan(p.id)}
                  className="w-full bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center active:scale-[0.98] transition-all hover:border-blue-200 hover:shadow-lg group animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="text-left">
                    <p className="font-black text-slate-900 text-lg tracking-tight">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {p.durationMonths}{" "}
                      {p.durationMonths === 1 ? "mes" : "meses"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-blue-600">
                      ₡{p.price.toLocaleString()}
                    </span>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white text-slate-300 transition-all">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 inset-x-0 z-[200] flex justify-center animate-slide-up pointer-events-none">
          <div
            className={`px-6 py-3 rounded-full shadow-xl flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-bold text-sm">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Sync indicator */}
      {isSyncing && (
        <div className="absolute top-2 right-2 z-50">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-14 pb-6 shrink-0">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1">
            <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest animate-fade-in">
              {getGreeting()}, Pro
            </p>
            <h1 className="text-[28px] font-black text-black leading-tight tracking-tight animate-slide-up">
              Panel de
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                Profesional
              </span>
            </h1>
          </div>

          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-lg animate-scale-in">
              {editImage ? (
                <img
                  src={editImage}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-lg">
                  {initialUser.name[0]}
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl text-white shadow-lg animate-scale-in">
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">
              Ingresos
            </p>
            <p className="text-xl font-black mt-1">
              ₡{stats.earned.toLocaleString()}
            </p>
          </div>
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl text-white shadow-lg animate-scale-in"
            style={{ animationDelay: "100ms" }}
          >
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">
              Reservas
            </p>
            <p className="text-xl font-black mt-1">{stats.count}</p>
          </div>
          <div
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl text-white shadow-lg animate-scale-in"
            style={{ animationDelay: "200ms" }}
          >
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">
              Días
            </p>
            <p className="text-xl font-black mt-1">{daysLeft}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
          {[
            { key: "agenda", label: "Agenda", icon: "📅" },
            { key: "gestor", label: "Gestión", icon: "⚙️" },
            { key: "reservas", label: "Citas", icon: "📋" },
            { key: "perfil", label: "Perfil", icon: "👤" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key as any)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
        {/* AGENDA TAB */}
        {activeTab === "agenda" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Mis Horarios
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {slots.length} publicados
                </p>
              </div>
              <button
                onClick={() => setShowAddSlot(true)}
                className="bg-black text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path d="M12 4v16m8-8H4" />
                </svg>
                Nuevo
              </button>
            </div>

            {slots.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-10 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📅</span>
                </div>
                <p className="text-slate-400 font-medium">
                  No tienes horarios creados
                </p>
                <p className="text-slate-300 text-sm mt-1">
                  Crea tu primer horario para empezar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((s, i) => {
                  const progress = (s.capacityBooked / s.capacityTotal) * 100;
                  const isFull = s.capacityBooked >= s.capacityTotal;

                  return (
                    <div
                      key={s.id}
                      className={`bg-white p-5 rounded-2xl border transition-all animate-slide-up ${
                        s.status === "cancelled"
                          ? "opacity-50 border-slate-200"
                          : "border-slate-100 hover:border-blue-200 hover:shadow-md"
                      }`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isFull
                                ? "bg-red-50 text-red-500"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            <span className="text-lg font-black">
                              {new Date(s.startAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {new Date(s.startAt).toLocaleDateString("es", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-xs text-slate-400">
                              {s.type === "grupo"
                                ? "Clase grupal"
                                : "Individual"}{" "}
                              • {s.location}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-blue-600">
                            ₡{s.price.toLocaleString()}
                          </p>
                          <p
                            className={`text-xs font-bold ${
                              isFull ? "text-red-500" : "text-slate-400"
                            }`}
                          >
                            {s.capacityBooked}/{s.capacityTotal} cupos
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isFull ? "bg-red-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <button
                          onClick={() => DB.deleteSlot(s.id)}
                          className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-90 transition-all"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GESTOR TAB */}
        {activeTab === "gestor" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Gestión de Horarios
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Edita precios, capacidad y estado
              </p>
            </div>

            {slots.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-10 text-center">
                <p className="text-slate-400 font-medium">
                  No tienes horarios para gestionar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((s) => {
                  const isEditing = editingSlotId === s.id;
                  const progress = (s.capacityBooked / s.capacityTotal) * 100;

                  return (
                    <div
                      key={s.id}
                      className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                        s.status === "cancelled"
                          ? "opacity-60"
                          : "border-slate-100"
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                              >
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">
                                {new Date(s.startAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(s.startAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleSlotStatus(s.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                              s.status === "active"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {s.status === "active" ? "✓ Activo" : "Pausado"}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Cupos</span>
                            <span className="font-bold text-slate-600">
                              {s.capacityBooked}/{s.capacityTotal}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                progress >= 90 ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                        {isEditing ? (
                          <div className="flex-1 flex gap-2 animate-fade-in">
                            <input
                              type="number"
                              placeholder="Cap."
                              value={editSlotCapacity}
                              onChange={(e) =>
                                setEditSlotCapacity(e.target.value)
                              }
                              className="w-16 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                            />
                            <input
                              type="number"
                              placeholder="Precio"
                              value={editSlotPrice}
                              onChange={(e) => setEditSlotPrice(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleUpdateSlotQuick(s.id)}
                              className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center active:scale-90 transition-all"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="3"
                              >
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingSlotId(null)}
                              className="w-10 h-10 bg-white text-slate-400 rounded-lg flex items-center justify-center border border-slate-200 active:scale-90 transition-all"
                            >
                              ✕
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
                              className="flex-1 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 active:scale-95 transition-all"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => DB.deleteSlot(s.id)}
                              className="w-12 py-3 bg-red-50 text-red-500 rounded-lg flex items-center justify-center active:scale-95 border border-red-100"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="2.5"
                              >
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                              </svg>
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

        {/* RESERVAS TAB */}
        {activeTab === "reservas" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Gestión de Citas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats.pending > 0 && (
                    <span className="text-orange-500 font-bold">
                      {stats.pending} pendientes
                    </span>
                  )}
                  {stats.pending > 0 && stats.confirmed > 0 && " • "}
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
            </div>

            {bookings.filter(
              (b) =>
                b.status !== BookingStatus.CANCELADA &&
                b.status !== BookingStatus.RECHAZADA
            ).length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-10 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📋</span>
                </div>
                <p className="text-slate-400 font-medium">
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
                  .map((b, i) => (
                    <div
                      key={b.id}
                      className="bg-white p-5 rounded-2xl border border-slate-100 animate-slide-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 text-white rounded-xl flex items-center justify-center font-black text-lg">
                            {b.clientName[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {b.clientName}
                            </h4>
                            <p className="text-xs text-slate-400">
                              {new Date(b.date).toLocaleDateString("es", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              • {new Date(b.date).getHours()}:00h
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            b.status === BookingStatus.CONFIRMADA
                              ? "bg-emerald-50 text-emerald-600"
                              : b.status === BookingStatus.PENDIENTE
                              ? "bg-orange-50 text-orange-600 animate-pulse"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      {b.message && (
                        <div className="bg-slate-50 p-3 rounded-xl mb-4">
                          <p className="text-xs text-slate-500 italic">
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
                            className="py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold active:scale-95 transition-all"
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
                            className="py-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all"
                          >
                            ✓ Confirmar
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
                          className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelar Reserva
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Histórico */}
            {bookings.filter(
              (b) =>
                b.status === BookingStatus.CANCELADA ||
                b.status === BookingStatus.RECHAZADA
            ).length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Histórico (
                  {
                    bookings.filter(
                      (b) =>
                        b.status === BookingStatus.CANCELADA ||
                        b.status === BookingStatus.RECHAZADA
                    ).length
                  }
                  )
                </h4>
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
                        className="bg-slate-50 p-4 rounded-xl flex items-center justify-between opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-200 text-slate-400 rounded-lg flex items-center justify-center text-sm font-bold">
                            {b.clientName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">
                              {b.clientName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(b.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            b.status === BookingStatus.CANCELADA
                              ? "text-red-400"
                              : "text-slate-400"
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

        {/* PERFIL TAB */}
        {activeTab === "perfil" && (
          <div className="space-y-6 animate-fade-in pb-10">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative group mb-3">
                <div className="w-28 h-28 rounded-3xl bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                  {editImage ? (
                    <img
                      src={editImage}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-4xl font-black">
                      {editName[0] || "?"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/*"
              />
              <p className="text-xs text-slate-400">Foto de Perfil</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Ej: Escazú Centro"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Precio base por sesión (₡)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Disciplinas
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleArea(cat.name)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        editAreas.includes(cat.name)
                          ? "bg-black text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Bio Profesional
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              Guardar Perfil
            </button>
          </div>
        )}
      </div>

      {/* Modal Nuevo Horario */}
      {showAddSlot && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end animate-fade-in">
          <form
            onSubmit={handleAddSlot}
            className="w-full bg-white rounded-t-3xl max-w-lg mx-auto shadow-2xl flex flex-col max-h-[85vh] animate-slide-up"
          >
            <div className="px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-black">
                    Nuevo Horario
                  </h2>
                  <p className="text-xs text-slate-400">
                    Agenda tu disponibilidad
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  📅 Fecha
                </label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    ⏰ Inicio
                  </label>
                  <input
                    type="time"
                    value={slotTimeStart}
                    onChange={(e) => setSlotTimeStart(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    ⏰ Fin
                  </label>
                  <input
                    type="time"
                    value={slotTimeEnd}
                    onChange={(e) => setSlotTimeEnd(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Tipo de clase
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["individual", "grupo"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSlotType(t as any)}
                      className={`py-3 rounded-xl text-sm font-bold capitalize transition-all ${
                        slotType === t
                          ? "bg-black text-white"
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {t === "individual" ? "👤 Individual" : "👥 Grupo"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Cupos
                  </label>
                  <input
                    type="number"
                    value={slotCapacity}
                    onChange={(e) => setSlotCapacity(e.target.value)}
                    min="1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Precio (₡)
                  </label>
                  <input
                    type="number"
                    value={slotPrice}
                    onChange={(e) => setSlotPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  📍 Ubicación
                </label>
                <input
                  type="text"
                  value={slotLocation}
                  onChange={(e) => setSlotLocation(e.target.value)}
                  placeholder="Ej: Gym Central, Escazú"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 shrink-0">
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all"
              >
                Crear Horario
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

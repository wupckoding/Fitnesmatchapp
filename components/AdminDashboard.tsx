import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User, UserRole, Plan, ProfessionalProfile, Category } from "../types";
import { DB } from "../services/databaseService";

type AdminView = "dashboard" | "users" | "trainers" | "plans" | "categories";

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [view, setView] = useState<AdminView>("dashboard");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [trainers, setTrainers] = useState<ProfessionalProfile[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isEditingPlan, setIsEditingPlan] = useState<Plan | null>(null);
  const [isEditingCat, setIsEditingCat] = useState<Category | null>(null);
  const [isManagingTrainer, setIsManagingTrainer] =
    useState<ProfessionalProfile | null>(null);
  const [isEditingUser, setIsEditingUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const refresh = useCallback(() => {
    setPlans(
      [...DB.getPlans()].sort((a, b) => a.displayOrder - b.displayOrder)
    );
    setTrainers([...DB.getPros()]);
    setClients([...DB.getClients()].filter((c) => c.role === UserRole.CLIENT));
    setCategories(
      [...DB.getCategories()].sort((a, b) => a.displayOrder - b.displayOrder)
    );
  }, []);

  // Atualizar trainer/user selecionado quando dados mudam
  useEffect(() => {
    if (isManagingTrainer) {
      const updated = trainers.find((p) => p.id === isManagingTrainer.id);
      if (
        updated &&
        JSON.stringify(updated) !== JSON.stringify(isManagingTrainer)
      ) {
        setIsManagingTrainer(updated);
      }
    }
  }, [trainers, isManagingTrainer]);

  useEffect(() => {
    if (isEditingUser) {
      const updated = clients.find((u) => u.id === isEditingUser.id);
      if (
        updated &&
        JSON.stringify(updated) !== JSON.stringify(isEditingUser)
      ) {
        setIsEditingUser(updated);
      }
    }
  }, [clients, isEditingUser]);

  useEffect(() => {
    // 1. Carregar imediatamente do cache
    refresh();

    // 2. Sincronizar em background (apenas uma vez)
    let mounted = true;
    DB.forceSync()
      .then(() => {
        if (mounted) refresh();
      })
      .catch(console.error);

    const unsub = DB.subscribe(refresh);
    return () => {
      mounted = false;
      unsub();
    };
  }, [refresh]);

  const showToast = (msg: string) => {
    setToast({ msg, type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (fn: () => void | Promise<any>, msg: string) => {
    try {
      const result = fn();
      // Se for uma Promise, aguardar
      if (result && typeof (result as Promise<any>).then === "function") {
        await result;
      }
      refresh();
      showToast(msg);
    } catch (error) {
      console.error("Erro na ação:", error);
      showToast("❌ Erro ao executar ação");
    }
  };

  const handleLogout = () => {
    setIsExiting(true);
    setTimeout(onLogout, 300);
  };

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        c.phone.includes(userSearch)
    );
  }, [clients, userSearch]);

  const getDaysLeft = (expiryDate?: string) => {
    if (!expiryDate) return 0;
    const now = new Date();
    const exp = new Date(expiryDate);
    const diff = exp.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const createEmptyPlan = (): Plan => ({
    id: `plan-${Date.now()}`,
    name: "",
    durationMonths: 1,
    description: "",
    price: 0,
    promoPrice: 0,
    maxPhotos: 1,
    displayOrder: plans.length + 1,
    features: [],
    isActive: true,
    isFeatured: false,
    includesAnalytics: false,
    prioritySupport: false,
  });

  const createEmptyCategory = (): Category => ({
    id: `cat-${Date.now()}`,
    name: "",
    slug: "",
    description: "",
    iconClass: "⭐",
    colorHex: "#3B82F6",
    displayOrder: categories.length + 1,
    isActive: true,
    metaTitle: "",
    metaDescription: "",
  });

  return (
    <div
      className={`flex-1 bg-white flex flex-col overflow-hidden relative transition-all duration-300 ${
        isExiting ? "animate-exit" : ""
      }`}
    >
      {toast && (
        <div className="fixed inset-x-0 top-16 z-[3000] flex justify-center px-4 animate-spring-up pointer-events-none">
          <div className="bg-black text-white py-4 px-8 rounded-full shadow-2xl flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="3"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-bold">{toast.msg}</span>
          </div>
        </div>
      )}

      <header className="px-8 pt-16 pb-8 bg-white border-b border-slate-100 sticky top-0 z-50 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-black tracking-tighter">
            Panel
          </h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">
            Suite de Gestión
          </p>
        </div>
        <div className="flex gap-2">
          {view !== "dashboard" && (
            <button
              onClick={() => setView("dashboard")}
              className="w-12 h-12 border border-slate-100 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
            >
              <svg
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* Botão Sincronizar */}
          <button
            onClick={async () => {
              showToast("🔄 Sincronizando...");
              await DB.clearCacheAndSync();
              refresh();
              showToast("✅ Dados atualizados do servidor!");
            }}
            className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
            title="Sincronizar com Supabase"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm"
          >
            <svg
              className="w-6 h-6"
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

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
        {view === "dashboard" && (
          <div className="animate-spring-up space-y-10">
            {/* Estadísticas Principales */}
            <div className="space-y-4">
              {/* Card Principal - Resumen de la Red */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-[32px] text-white shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                      Red FitnessMatch
                    </p>
                    <p className="text-2xl font-black tracking-tighter mt-1">
                      Resumen General
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-white">
                      {trainers.filter((t) => t.planActive).length}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/50 mt-1">
                      Activos
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-orange-400">
                      {trainers.filter((t) => !t.planActive).length}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/50 mt-1">
                      Pendientes
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-blue-400">
                      {clients.length}
                    </p>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/50 mt-1">
                      Clientes
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards Secundarios */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-100 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-[9px] font-black text-green-600 uppercase tracking-wider">
                      Profesionales
                    </p>
                  </div>
                  <p className="text-3xl font-black text-green-700">
                    {trainers.length}
                  </p>
                  <p className="text-[9px] font-bold text-green-500 mt-1">
                    Registrados en la red
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-wider">
                      Categorías
                    </p>
                  </div>
                  <p className="text-3xl font-black text-blue-700">
                    {categories.filter((c) => c.isActive).length}
                  </p>
                  <p className="text-[9px] font-bold text-blue-500 mt-1">
                    Disciplinas activas
                  </p>
                </div>
              </div>

              {/* Planes Distribucion */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Distribución de Planes
                </p>
                <div className="space-y-3">
                  {plans.map((plan) => {
                    const count = trainers.filter(
                      (t) => t.planType === plan.name
                    ).length;
                    const percentage =
                      trainers.length > 0
                        ? Math.round((count / trainers.length) * 100)
                        : 0;
                    return (
                      <div key={plan.id} className="flex items-center gap-3">
                        <div className="w-16 text-right">
                          <span className="text-[10px] font-black text-slate-600">
                            {plan.name}
                          </span>
                        </div>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-[10px] font-black text-slate-500">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] px-2 mb-4">
                Operaciones
              </h2>
              <ActionRow
                label="Planes de Suscripción"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M7 8h10M7 12h10" />
                  </svg>
                }
                onClick={() => setView("plans")}
              />
              <ActionRow
                label="Red de Profesionales"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                onClick={() => setView("trainers")}
              />
              <ActionRow
                label="Disciplinas"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path d="M7 7h10v10H7zM7 12h10" />
                  </svg>
                }
                onClick={() => setView("categories")}
              />
              <ActionRow
                label="Base de Clientes"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                onClick={() => setView("users")}
              />
            </div>
          </div>
        )}

        {view === "users" && (
          <div className="animate-spring-up space-y-6">
            <div className="px-2">
              <h2 className="text-2xl font-black text-black tracking-tight">
                Base de Clientes
              </h2>
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                Gestión de usuarios registrados
              </p>
            </div>

            <div className="relative group px-2">
              <input
                type="text"
                placeholder="Buscar por nombre, email ou telefone..."
                className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-5 pl-14 pr-6 text-black placeholder:text-slate-300 font-bold text-xs focus:ring-1 focus:ring-black outline-none transition-all shadow-inner"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <svg
                className="absolute left-7 top-5 w-5 h-5 text-slate-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="3"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-sm flex flex-col gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-xl font-black text-slate-300">
                      {client.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-black tracking-tight truncate">
                        {client.name} {client.lastName}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                        {client.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest ${
                          client.status === "active"
                            ? "bg-green-50 text-green-500"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {client.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                      {client.phoneVerified && (
                        <span className="px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-widest bg-blue-50 text-blue-500">
                          Verificado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 px-4">
                      <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">
                        Teléfono
                      </p>
                      <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                        {client.phone || "N/A"}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditingUser(client)}
                      className="px-6 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-50 active:scale-95 transition-all"
                    >
                      Detalles
                    </button>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div className="py-20 text-center opacity-30">
                  <p className="font-black uppercase text-[10px] tracking-widest">
                    No se encontraron clientes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "trainers" && (
          <div className="animate-spring-up space-y-6">
            {/* Header com estatísticas */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 p-6 rounded-[32px] text-white shadow-2xl">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">
                    Red de Profesionales
                  </p>
                  <p className="text-2xl font-black tracking-tighter mt-1">
                    Profesionales
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-xl font-black">{trainers.length}</p>
                  <p className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Total
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-xl font-black text-green-300">
                    {
                      trainers.filter(
                        (t) => t.planActive && !DB.isPlanExpired(t.planExpiry)
                      ).length
                    }
                  </p>
                  <p className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Activos
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-xl font-black text-yellow-300">
                    {trainers.filter((t) => !t.planActive).length}
                  </p>
                  <p className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Pendientes
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-xl font-black text-red-300">
                    {
                      trainers.filter(
                        (t) =>
                          t.planActive &&
                          getDaysLeft(t.planExpiry) <= 7 &&
                          getDaysLeft(t.planExpiry) > 0
                      ).length
                    }
                  </p>
                  <p className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Por Vencer
                  </p>
                </div>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Buscar profesional..."
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-black placeholder:text-slate-300 font-bold text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <svg
                className="absolute left-4 top-4 w-5 h-5 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Lista de profesionales */}
            <div className="space-y-3">
              {trainers
                .filter(
                  (t) =>
                    !userSearch ||
                    t.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                    t.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    t.areas?.some((a) =>
                      a.toLowerCase().includes(userSearch.toLowerCase())
                    )
                )
                .sort((a, b) => {
                  // Prioridad: por vencer > activos > pendientes
                  const daysA = getDaysLeft(a.planExpiry);
                  const daysB = getDaysLeft(b.planExpiry);
                  if (a.planActive && daysA <= 7 && daysA > 0) return -1;
                  if (b.planActive && daysB <= 7 && daysB > 0) return 1;
                  if (a.planActive && !b.planActive) return -1;
                  if (!a.planActive && b.planActive) return 1;
                  return daysA - daysB;
                })
                .map((pro, idx) => {
                  const daysLeft = getDaysLeft(pro.planExpiry);
                  const isExpiring =
                    pro.planActive && daysLeft <= 7 && daysLeft > 0;
                  const isExpired = pro.planActive && daysLeft <= 0;
                  const bookingsCount = DB.getBookings().filter(
                    (b) => b.professionalId === pro.id
                  ).length;

                  // Plan colors
                  const planColors: Record<string, string> = {
                    Básico: "from-slate-500 to-slate-600",
                    Profesional: "from-blue-500 to-indigo-600",
                    Premium: "from-amber-500 to-orange-500",
                  };
                  const planGradient =
                    planColors[pro.planType || ""] ||
                    "from-slate-400 to-slate-500";

                  return (
                    <div
                      key={pro.id}
                      onClick={() => setIsManagingTrainer(pro)}
                      className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer group ${
                        isExpiring
                          ? "border-orange-200 ring-2 ring-orange-100"
                          : isExpired
                          ? "border-red-200 ring-2 ring-red-100"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      {/* Barra de progreso del plan */}
                      {pro.planActive && (
                        <div className="h-1 bg-slate-100">
                          <div
                            className={`h-full bg-gradient-to-r ${
                              isExpired
                                ? "from-red-500 to-red-600"
                                : isExpiring
                                ? "from-orange-500 to-yellow-500"
                                : "from-green-500 to-emerald-500"
                            } transition-all`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, (daysLeft / 365) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-center gap-4">
                          {/* Avatar con indicador de estado */}
                          <div className="relative">
                            {pro.image ? (
                              <img
                                src={pro.image}
                                className="w-14 h-14 rounded-2xl object-cover shadow-md"
                                alt=""
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xl font-black shadow-md">
                                {pro.name[0]}
                              </div>
                            )}
                            <div
                              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                                pro.status === "active"
                                  ? "bg-green-500"
                                  : "bg-slate-400"
                              }`}
                            >
                              {pro.status === "active" ? (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth="3"
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth="3"
                                >
                                  <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* Info principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-black tracking-tight truncate">
                                {pro.name} {pro.lastName}
                              </h4>
                              {isExpiring && (
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[7px] font-black uppercase animate-pulse">
                                  ⚠️ Por vencer
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                              {pro.email}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {/* Plan badge */}
                              {pro.planActive ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight text-white bg-gradient-to-r ${planGradient}`}
                                >
                                  {pro.planType || "Plan"}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight bg-slate-100 text-slate-400">
                                  Sin plan
                                </span>
                              )}
                              {/* Areas */}
                              {pro.areas?.slice(0, 2).map((area, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-slate-50 text-slate-500"
                                >
                                  {area}
                                </span>
                              ))}
                              {(pro.areas?.length || 0) > 2 && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-slate-50 text-slate-400">
                                  +{(pro.areas?.length || 0) - 2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stats y días restantes */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-3">
                              {/* Reservas */}
                              <div className="text-center">
                                <p className="text-lg font-black text-slate-700">
                                  {bookingsCount}
                                </p>
                                <p className="text-[7px] font-bold text-slate-300 uppercase">
                                  Reservas
                                </p>
                              </div>

                              {/* Días */}
                              <div
                                className={`px-3 py-2 rounded-xl text-center min-w-[50px] ${
                                  !pro.planActive
                                    ? "bg-slate-100"
                                    : isExpired
                                    ? "bg-red-500 text-white"
                                    : isExpiring
                                    ? "bg-orange-500 text-white"
                                    : daysLeft <= 30
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                <p className="text-lg font-black">
                                  {pro.planActive ? Math.max(0, daysLeft) : "—"}
                                </p>
                                <p className="text-[7px] font-bold uppercase opacity-70">
                                  días
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Arrow */}
                          <svg
                            className="w-5 h-5 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                          >
                            <path
                              d="M9 5l7 7-7 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {trainers.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    👥
                  </div>
                  <p className="font-black text-slate-300 uppercase text-[10px] tracking-widest">
                    No hay profesionales registrados
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "plans" && (
          <div className="animate-spring-up space-y-6">
            {/* Header com estatísticas de receita */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 rounded-[32px] text-white shadow-2xl">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">
                    Monetización
                  </p>
                  <p className="text-2xl font-black tracking-tighter mt-1">
                    Planes de Suscripción
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingPlan(createEmptyPlan())}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" />
                  </svg>
                  Nuevo
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black">{plans.length}</p>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Planes
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-yellow-300">
                    {trainers.filter((t) => t.planActive).length}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Suscritos
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-green-300">
                    ₡
                    {(() => {
                      const total = trainers
                        .filter((t) => t.planActive && t.planType)
                        .reduce((acc, t) => {
                          const plan = plans.find((p) => p.name === t.planType);
                          return acc + (plan?.price || 0);
                        }, 0);
                      return (total / 1000).toFixed(0) + "k";
                    })()}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    MRR Est.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de planes como cards */}
            <div className="space-y-4">
              {plans.map((p, idx) => {
                const subscribersCount = trainers.filter(
                  (t) => t.planType === p.name && t.planActive
                ).length;
                const revenue = subscribersCount * p.price;
                const isPopular =
                  subscribersCount ===
                  Math.max(
                    ...plans.map(
                      (pl) =>
                        trainers.filter(
                          (t) => t.planType === pl.name && t.planActive
                        ).length
                    )
                  );

                // Colores según el plan
                const planColors: Record<
                  string,
                  { bg: string; text: string; accent: string }
                > = {
                  Básico: {
                    bg: "from-slate-500 to-slate-600",
                    text: "text-slate-600",
                    accent: "bg-slate-500",
                  },
                  Profesional: {
                    bg: "from-blue-500 to-blue-600",
                    text: "text-blue-600",
                    accent: "bg-blue-500",
                  },
                  Premium: {
                    bg: "from-amber-500 to-orange-500",
                    text: "text-amber-600",
                    accent: "bg-amber-500",
                  },
                };
                const colors = planColors[p.name] || {
                  bg: "from-violet-500 to-purple-600",
                  text: "text-violet-600",
                  accent: "bg-violet-500",
                };

                return (
                  <div
                    key={p.id}
                    onClick={() => setIsEditingPlan(p)}
                    className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-200 transition-all active:scale-[0.98] cursor-pointer group"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Header del plan con gradiente */}
                    <div
                      className={`bg-gradient-to-r ${colors.bg} p-5 relative overflow-hidden`}
                    >
                      {isPopular && subscribersCount > 0 && (
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                          <span className="text-[8px] font-black uppercase text-white">
                            Más popular
                          </span>
                        </div>
                      )}
                      {p.isFeatured && (
                        <div className="absolute top-3 left-3 bg-yellow-400 px-2 py-1 rounded-lg">
                          <span className="text-[8px] font-black uppercase text-yellow-900">
                            Destacado
                          </span>
                        </div>
                      )}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                            {p.durationMonths}{" "}
                            {p.durationMonths === 1 ? "Mes" : "Meses"}
                          </p>
                          <h4 className="text-white text-2xl font-black tracking-tight mt-1">
                            {p.name}
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-white/70 text-[10px] font-bold uppercase">
                            Precio
                          </p>
                          <p className="text-white text-2xl font-black">
                            ₡{p.price.toLocaleString()}
                          </p>
                          {p.promoPrice > 0 && p.promoPrice < p.price && (
                            <p className="text-green-300 text-xs font-bold line-through opacity-70">
                              ₡{p.promoPrice.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats y features */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className={`text-xl font-black ${colors.text}`}>
                              {subscribersCount}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">
                              Suscritos
                            </p>
                          </div>
                          <div className="w-px h-8 bg-slate-100"></div>
                          <div className="text-center">
                            <p className="text-xl font-black text-green-600">
                              ₡{(revenue / 1000).toFixed(0)}k
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">
                              Ingresos
                            </p>
                          </div>
                          <div className="w-px h-8 bg-slate-100"></div>
                          <div className="text-center">
                            <p className="text-xl font-black text-slate-700">
                              {p.maxPhotos}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">
                              Fotos
                            </p>
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path
                            d="M9 5l7 7-7 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      {/* Features preview */}
                      {p.features.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {p.features.slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-slate-50 rounded-lg text-[9px] font-bold text-slate-500"
                            >
                              {f.length > 25 ? f.substring(0, 25) + "..." : f}
                            </span>
                          ))}
                          {p.features.length > 3 && (
                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-[9px] font-bold text-slate-400">
                              +{p.features.length - 3} más
                            </span>
                          )}
                        </div>
                      )}

                      {/* Badges de características */}
                      <div className="flex gap-2 mt-3">
                        {p.includesAnalytics && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase">
                            Analytics
                          </span>
                        )}
                        {p.prioritySupport && (
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[8px] font-black uppercase">
                            Soporte VIP
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-[8px] font-black uppercase">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {plans.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    💳
                  </div>
                  <p className="font-black text-slate-300 uppercase text-[10px] tracking-widest">
                    No hay planes creados
                  </p>
                  <button
                    onClick={() => setIsEditingPlan(createEmptyPlan())}
                    className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                  >
                    Crear primer plan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === "categories" && (
          <div className="animate-spring-up space-y-6">
            {/* Header com estatísticas */}
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 rounded-[32px] text-white shadow-2xl">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">
                    Disciplinas & Deportes
                  </p>
                  <p className="text-2xl font-black tracking-tighter mt-1">
                    Categorías
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingCat(createEmptyCategory())}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" />
                  </svg>
                  Nueva
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black">{categories.length}</p>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Total
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-green-300">
                    {categories.filter((c) => c.isActive).length}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Activas
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-orange-300">
                    {categories.filter((c) => !c.isActive).length}
                  </p>
                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-60 mt-1">
                    Inactivas
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de categorías */}
            <div className="space-y-3">
              {categories.map((cat, idx) => {
                const prosInCategory = trainers.filter((t) =>
                  t.areas?.includes(cat.name)
                ).length;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setIsEditingCat(cat)}
                    className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all active:scale-[0.98] cursor-pointer group"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Ícono con color de fondo */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform shadow-inner"
                      style={{
                        backgroundColor: cat.colorHex
                          ? `${cat.colorHex}15`
                          : "#f1f5f9",
                      }}
                    >
                      {cat.iconClass || "⭐"}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-black text-base tracking-tight truncate">
                          {cat.name}
                        </h4>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.colorHex || "#3B82F6" }}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          /{cat.slug}
                        </span>
                        <span className="text-[10px] font-black text-violet-500">
                          {prosInCategory}{" "}
                          {prosInCategory === 1
                            ? "profesional"
                            : "profesionales"}
                        </span>
                      </div>
                    </div>

                    {/* Status e orden */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-black text-slate-300">
                          #{cat.displayOrder}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                          cat.isActive
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {cat.isActive ? "Activa" : "Off"}
                      </span>
                      <svg
                        className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path
                          d="M9 5l7 7-7 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    📂
                  </div>
                  <p className="font-black text-slate-300 uppercase text-[10px] tracking-widest">
                    No hay categorías creadas
                  </p>
                  <button
                    onClick={() => setIsEditingCat(createEmptyCategory())}
                    className="mt-4 px-6 py-3 bg-violet-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                  >
                    Crear primera categoría
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLES DEL USUARIO (CLIENTE) - MEJORADO */}
      {isEditingUser && (
        <UserDetailsModal
          user={isEditingUser}
          onClose={() => setIsEditingUser(null)}
          onSave={(updatedUser) =>
            handleAction(() => {
              DB.saveUser(updatedUser);
              setIsEditingUser(null);
            }, "Usuario Actualizado")
          }
          onDelete={() => {
            if (
              confirm(
                "¿Eliminar usuario definitivamente? Esta acción no se puede deshacer."
              )
            )
              handleAction(() => {
                DB.deleteUser(isEditingUser.id, isEditingUser.role);
                setIsEditingUser(null);
              }, "Usuario Eliminado");
          }}
          trainers={trainers}
        />
      )}

      {isManagingTrainer && (
        <TrainerManagementModal
          trainer={isManagingTrainer}
          plans={plans}
          onClose={() => setIsManagingTrainer(null)}
          onAction={handleAction}
        />
      )}

      {isEditingPlan && (
        <PlanEditModal
          plan={isEditingPlan}
          trainers={trainers}
          onClose={() => setIsEditingPlan(null)}
          onSave={(plan) =>
            handleAction(() => {
              DB.savePlan(plan);
              setIsEditingPlan(null);
            }, "Plan Guardado")
          }
          onDelete={() => {
            const subscribersCount = trainers.filter(
              (t) => t.planType === isEditingPlan.name
            ).length;
            if (subscribersCount > 0) {
              alert(
                `No puedes eliminar este plan. Hay ${subscribersCount} profesionales suscritos.`
              );
              return;
            }
            if (confirm("¿Eliminar este plan permanentemente?"))
              handleAction(() => {
                DB.deletePlan(isEditingPlan.id);
                setIsEditingPlan(null);
              }, "Plan Eliminado");
          }}
        />
      )}

      {isEditingCat && (
        <CategoryEditModal
          category={isEditingCat}
          trainers={trainers}
          onClose={() => setIsEditingCat(null)}
          onSave={(cat) =>
            handleAction(() => {
              DB.saveCategory(cat);
              setIsEditingCat(null);
            }, "Categoría Guardada")
          }
          onDelete={() => {
            if (
              confirm(
                "¿Eliminar esta categoría? Los profesionales que la usen quedarán sin categoría asignada."
              )
            )
              handleAction(() => {
                DB.deleteCategory(isEditingCat.id);
                setIsEditingCat(null);
              }, "Categoría Eliminada");
          }}
        />
      )}
    </div>
  );
};

const KPICard = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) => (
  <div
    className={`p-6 rounded-[28px] border border-slate-100 flex flex-col gap-1 active:scale-95 transition-transform ${
      highlight ? "bg-slate-50" : "bg-white shadow-sm"
    }`}
  >
    <p
      className={`text-3xl font-black tracking-tighter ${
        highlight ? "text-black" : "text-slate-800"
      }`}
    >
      {value}
    </p>
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
  </div>
);

const ActionRow = ({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full bg-white p-6 rounded-[24px] border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm hover:border-black"
  >
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-black transition-colors">
        {icon}
      </div>
      <span className="font-extrabold text-black text-sm tracking-tight">
        {label}
      </span>
    </div>
    <svg
      className="w-4 h-4 text-slate-200 group-hover:text-black transition-all transform group-hover:translate-x-1"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth="3"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-5 px-6 font-bold text-black outline-none focus:ring-1 focus:ring-black transition-all shadow-inner text-sm"
    />
  </div>
);

const CheckField = ({
  label,
  checked,
  onChange,
  variant = "primary",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  variant?: "primary" | "danger";
}) => (
  <button
    onClick={() => onChange(!checked)}
    className="flex items-center gap-4 py-2 group active:scale-[0.98] transition-all"
  >
    <div
      className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
        checked
          ? variant === "danger"
            ? "bg-red-500 border-red-500 shadow-red-100 shadow-lg"
            : "bg-black border-black shadow-lg"
          : "border-slate-200 bg-white"
      }`}
    >
      {checked && (
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="4"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span
      className={`text-[11px] font-black uppercase tracking-widest ${
        checked
          ? variant === "danger"
            ? "text-red-500"
            : "text-black"
          : "text-slate-300 group-hover:text-slate-500"
      }`}
    >
      {label}
    </span>
  </button>
);

// ============================================
// COMPONENTE MELHORADO: TrainerManagementModal
// ============================================
const TrainerManagementModal = ({
  trainer,
  plans,
  onClose,
  onAction,
}: {
  trainer: ProfessionalProfile;
  plans: Plan[];
  onClose: () => void;
  onAction: (action: () => void, message: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState<"plan" | "info" | "activity">(
    "plan"
  );
  const [customDate, setCustomDate] = useState("");

  // Cálculos
  const daysRemaining = DB.getDaysRemaining(trainer.planExpiry);
  const isExpired = DB.isPlanExpired(trainer.planExpiry);
  const isActive = trainer.planActive && !isExpired;
  const isExpiring =
    trainer.planActive && daysRemaining <= 7 && daysRemaining > 0;

  // Estatísticas
  const bookings = DB.getBookings().filter(
    (b) => b.professionalId === trainer.id
  );
  const completedBookings = bookings.filter((b) => b.status === "Confirmada");
  const pendingBookings = bookings.filter((b) => b.status === "Pendiente");
  const cancelledBookings = bookings.filter((b) => b.status === "Cancelada");
  const totalEarnings = completedBookings.reduce(
    (acc, b) => acc + (b.price || 0),
    0
  );
  const slots = DB.getSlots().filter((s) => s.proUserId === trainer.id);
  const conversations = DB.getConversations().filter((c) =>
    c.participants.includes(trainer.id)
  );

  // Cores do plan
  const planColors: Record<
    string,
    { gradient: string; bg: string; light: string }
  > = {
    Básico: {
      gradient: "from-slate-600 to-slate-700",
      bg: "#64748b",
      light: "bg-slate-50",
    },
    Profesional: {
      gradient: "from-blue-600 to-indigo-600",
      bg: "#3b82f6",
      light: "bg-blue-50",
    },
    Premium: {
      gradient: "from-amber-500 to-orange-600",
      bg: "#f59e0b",
      light: "bg-amber-50",
    },
  };
  const colors = planColors[trainer.planType || ""] || {
    gradient: "from-indigo-600 to-blue-600",
    bg: "#4f46e5",
    light: "bg-indigo-50",
  };

  const getPlanDuration = (planType: string) => {
    if (
      planType.toLowerCase().includes("premium") ||
      planType.toLowerCase().includes("anual")
    )
      return 365;
    if (planType.toLowerCase().includes("profesional")) return 90;
    return 30;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[1100] flex items-end">
      <div className="w-full bg-white rounded-t-[48px] animate-spring-up max-w-lg mx-auto shadow-2xl border-t border-slate-100 flex flex-col h-[95vh] overflow-hidden">
        {/* Header com gradiente baseado no plano */}
        <div
          className={`bg-gradient-to-br ${
            isActive ? colors.gradient : "from-slate-500 to-slate-600"
          } px-8 pt-8 pb-6 relative`}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
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

          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative">
              {trainer.image ? (
                <img
                  src={trainer.image}
                  className="w-20 h-20 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl"
                  alt=""
                />
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center text-white text-3xl font-black ring-4 ring-white/20">
                  {trainer.name[0]}
                </div>
              )}
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                  trainer.status === "active" ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                {trainer.status === "active" ? (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="4"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="4"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                {trainer.name} {trainer.lastName}
              </h2>
              <p className="text-white/60 text-xs font-bold mt-1">
                {trainer.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                    isActive
                      ? "bg-green-500/20 text-green-300"
                      : isExpired
                      ? "bg-red-500/20 text-red-300"
                      : "bg-orange-500/20 text-orange-300"
                  }`}
                >
                  {isActive ? "Activo" : isExpired ? "Expirado" : "Suspendido"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                    trainer.status === "active"
                      ? "bg-white/20 text-white"
                      : "bg-orange-500/20 text-orange-300"
                  }`}
                >
                  {trainer.status === "active" ? "Visible" : "Oculto"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="flex gap-2 mt-5">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
              <p className="text-lg font-black text-white">{bookings.length}</p>
              <p className="text-[8px] font-bold text-white/60 uppercase">
                Reservas
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
              <p className="text-lg font-black text-green-300">
                ₡{(totalEarnings / 1000).toFixed(0)}k
              </p>
              <p className="text-[8px] font-bold text-white/60 uppercase">
                Ingresos
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
              <p
                className={`text-lg font-black ${
                  isExpiring
                    ? "text-orange-300 animate-pulse"
                    : isExpired
                    ? "text-red-300"
                    : "text-white"
                }`}
              >
                {trainer.planActive ? Math.max(0, daysRemaining) : "—"}
              </p>
              <p className="text-[8px] font-bold text-white/60 uppercase">
                Días
              </p>
            </div>
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50">
          {[
            {
              id: "plan",
              label: "Plan",
              icon: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <path d="M7 8h10" />
                </svg>
              ),
            },
            {
              id: "info",
              label: "Perfil",
              icon: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
            {
              id: "activity",
              label: "Actividad",
              icon: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-black border-black"
                  : "text-slate-300 border-transparent hover:text-slate-500"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {activeTab === "plan" && (
            <div className="space-y-6 animate-fade-in">
              {/* Estado atual do plan */}
              <div
                className={`p-5 rounded-2xl border-2 ${
                  isActive
                    ? "bg-green-50 border-green-200"
                    : isExpired
                    ? "bg-red-50 border-red-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p
                      className={`text-xl font-black tracking-tight ${
                        isActive
                          ? "text-green-600"
                          : isExpired
                          ? "text-red-500"
                          : "text-orange-500"
                      }`}
                    >
                      {trainer.planType || "Sin Plan"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                      {trainer.planExpiry
                        ? `Expira: ${new Date(
                            trainer.planExpiry
                          ).toLocaleDateString("es-CR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`
                        : "Sin fecha de expiración"}
                    </p>
                  </div>
                  <div
                    className={`px-5 py-3 rounded-2xl text-center ${
                      isActive
                        ? "bg-green-500 text-white"
                        : isExpired
                        ? "bg-red-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    <p className="text-2xl font-black">
                      {trainer.planActive ? Math.max(0, daysRemaining) : "—"}
                    </p>
                    <p className="text-[8px] font-bold uppercase">días</p>
                  </div>
                </div>
              </div>

              {/* Selector de plan */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Cambiar Plan
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {plans.map((p) => {
                    const pColors = planColors[p.name] || {
                      gradient: "from-slate-500 to-slate-600",
                      bg: "#64748b",
                      light: "bg-slate-50",
                    };
                    const isSelected = trainer.planType === p.name;

                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          onAction(
                            () => DB.assignPlanToTrainer(trainer.id, p.id),
                            `Plan ${p.name} asignado`
                          )
                        }
                        className={`p-4 rounded-xl border-2 transition-all active:scale-95 ${
                          isSelected
                            ? `bg-gradient-to-br ${pColors.gradient} border-transparent text-white shadow-lg`
                            : `${pColors.light} border-slate-200 hover:border-slate-300`
                        }`}
                      >
                        <p
                          className={`text-sm font-black ${
                            isSelected ? "text-white" : "text-slate-700"
                          }`}
                        >
                          {p.name}
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            isSelected ? "text-white/70" : "text-slate-400"
                          }`}
                        >
                          ₡{p.price.toLocaleString()}
                        </p>
                        <p
                          className={`text-[8px] font-bold ${
                            isSelected ? "text-white/50" : "text-slate-300"
                          }`}
                        >
                          {p.durationMonths}{" "}
                          {p.durationMonths === 1 ? "mes" : "meses"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acciones del plan */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Acciones
                </h3>

                {/* Botón principal */}
                {!trainer.planActive ? (
                  <button
                    onClick={() =>
                      onAction(
                        () =>
                          DB.activatePlanWithDuration(
                            trainer.id,
                            trainer.planType || "Básico"
                          ),
                        "Plan activado"
                      )
                    }
                    className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl shadow-green-500/30 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Activar Plan (
                    {getPlanDuration(trainer.planType || "Básico")} días)
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onAction(
                        () => DB.updateTrainerPlan(trainer.id, false),
                        "Plan suspendido"
                      )
                    }
                    className="w-full py-5 bg-red-50 text-red-500 border border-red-200 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Suspender Plan
                  </button>
                )}

                {/* Añadir días rápido */}
                <div className="grid grid-cols-4 gap-2">
                  {[7, 15, 30, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() =>
                        onAction(
                          () => DB.addDaysToExpiry(trainer.id, days),
                          `+${days} días añadidos`
                        )
                      }
                      className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-sm transition-all active:scale-95"
                    >
                      +{days}d
                    </button>
                  ))}
                </div>

                {/* Fecha personalizada */}
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      if (customDate) {
                        onAction(
                          () =>
                            DB.setCustomExpiry(
                              trainer.id,
                              new Date(customDate)
                            ),
                          "Fecha definida"
                        );
                        setCustomDate("");
                      }
                    }}
                    disabled={!customDate}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Definir
                  </button>
                </div>
              </div>

              {/* Visibilidad */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Visibilidad en Marketplace
                </h3>
                <div
                  className={`p-5 rounded-2xl border flex items-center justify-between ${
                    trainer.status === "active"
                      ? "bg-green-50 border-green-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <div>
                    <p
                      className={`text-lg font-black ${
                        trainer.status === "active"
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {trainer.status === "active" ? "VISIBLE" : "OCULTO"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      {trainer.status === "active"
                        ? "Aparece en búsquedas"
                        : "No visible para clientes"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onAction(
                        () =>
                          DB.updateUserStatus(
                            trainer.id,
                            UserRole.TEACHER,
                            trainer.status === "active"
                              ? "deactivated"
                              : "active"
                          ),
                        trainer.status === "active" ? "Ocultado" : "Visible"
                      )
                    }
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                      trainer.status === "active"
                        ? "bg-white text-orange-500 shadow-md"
                        : "bg-green-500 text-white shadow-lg"
                    }`}
                  >
                    {trainer.status === "active" ? (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "info" && (
            <div className="space-y-6 animate-fade-in">
              {/* Información personal */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Información Personal
                </h3>
                <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Nombre
                      </p>
                      <p className="text-sm font-black text-slate-700">
                        {trainer.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Apellidos
                      </p>
                      <p className="text-sm font-black text-slate-700">
                        {trainer.lastName || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Email
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {trainer.email}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Teléfono
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {trainer.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Ciudad
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {trainer.city || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {trainer.bio && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Biografía
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-5">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">
                      {trainer.bio}
                    </p>
                  </div>
                </div>
              )}

              {/* Áreas */}
              {trainer.areas && trainer.areas.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Especialidades
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trainer.areas.map((area, i) => (
                      <span
                        key={i}
                        className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Precio */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Tarifa
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                  <p className="text-3xl font-black text-green-600">
                    ₡{(trainer.sessionPrice || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-green-500 uppercase">
                    Por sesión
                  </p>
                </div>
              </div>

              {/* Zona de peligro */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                  Zona de Peligro
                </h3>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar este profesional permanentemente? Esta acción no se puede deshacer."
                      )
                    )
                      onAction(() => {
                        DB.deleteUser(trainer.id, UserRole.TEACHER);
                        onClose();
                      }, "Profesional Eliminado");
                  }}
                  className="w-full py-4 bg-red-50 text-red-500 border border-red-200 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar Profesional
                </button>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-6 animate-fade-in">
              {/* Métricas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-black text-blue-600 uppercase">
                      Reservas
                    </span>
                  </div>
                  <p className="text-3xl font-black text-blue-700">
                    {bookings.length}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-black text-green-600 uppercase">
                      Ingresos
                    </span>
                  </div>
                  <p className="text-3xl font-black text-green-700">
                    ₡{(totalEarnings / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>

              {/* Detalle de reservas */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  Detalle de Reservas
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-black text-green-600">
                      {completedBookings.length}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Completadas
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-yellow-600">
                      {pendingBookings.length}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Pendientes
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-red-600">
                      {cancelledBookings.length}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Canceladas
                    </p>
                  </div>
                </div>
              </div>

              {/* Horarios y chat */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-black text-purple-600 uppercase">
                      Horarios
                    </span>
                  </div>
                  <p className="text-2xl font-black text-purple-700">
                    {slots.length}
                  </p>
                </div>
                <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-cyan-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-black text-cyan-600 uppercase">
                      Chats
                    </span>
                  </div>
                  <p className="text-2xl font-black text-cyan-700">
                    {conversations.length}
                  </p>
                </div>
              </div>

              {/* Últimas reservas */}
              {bookings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Últimas Reservas
                  </h4>
                  <div className="space-y-2">
                    {bookings.slice(0, 3).map((booking, i) => {
                      const client = DB.getClients().find(
                        (c) => c.id === booking.clientId
                      );
                      return (
                        <div
                          key={i}
                          className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-sm font-bold text-slate-500">
                              {client?.name?.[0] || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700">
                                {client?.name || "Cliente"}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400">
                                {booking.date} • {booking.time}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                              booking.status === "Confirmada"
                                ? "bg-green-100 text-green-600"
                                : booking.status === "Cancelada"
                                ? "bg-red-100 text-red-600"
                                : "bg-yellow-100 text-yellow-600"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={onClose}
            className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE MELHORADO: PlanEditModal
// ============================================
const PlanEditModal = ({
  plan,
  trainers,
  onClose,
  onSave,
  onDelete,
}: {
  plan: Plan;
  trainers: ProfessionalProfile[];
  onClose: () => void;
  onSave: (plan: Plan) => void;
  onDelete: () => void;
}) => {
  const [editedPlan, setEditedPlan] = useState<Plan>(plan);
  const [newFeature, setNewFeature] = useState("");
  const isNew = !plan.name || plan.name === "";

  // Estatísticas do plano
  const subscribersCount = trainers.filter(
    (t) => t.planType === plan.name && t.planActive
  ).length;
  const totalRevenue = subscribersCount * plan.price;
  const pendingCount = trainers.filter(
    (t) => t.planType === plan.name && !t.planActive
  ).length;

  // Cores do plano
  const planColors: Record<string, { gradient: string; bg: string }> = {
    Básico: { gradient: "from-slate-600 to-slate-700", bg: "#64748b" },
    Profesional: { gradient: "from-blue-600 to-indigo-600", bg: "#3b82f6" },
    Premium: { gradient: "from-amber-500 to-orange-600", bg: "#f59e0b" },
  };
  const colors = planColors[editedPlan.name] || {
    gradient: "from-emerald-600 to-teal-600",
    bg: "#10b981",
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setEditedPlan({
        ...editedPlan,
        features: [...editedPlan.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setEditedPlan({
      ...editedPlan,
      features: editedPlan.features.filter((_, i) => i !== index),
    });
  };

  // Presets de duração
  const durationPresets = [
    { months: 1, label: "1 Mes" },
    { months: 3, label: "3 Meses" },
    { months: 6, label: "6 Meses" },
    { months: 12, label: "1 Año" },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[1500] flex items-end">
      <div className="w-full bg-white rounded-t-[48px] animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col shadow-2xl border-t border-slate-100 overflow-hidden">
        {/* Header visual com preview do preço */}
        <div
          className={`bg-gradient-to-br ${colors.gradient} px-8 pt-8 pb-6 relative`}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
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

          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">
                {isNew ? "Nuevo plan" : "Editando"}
              </p>
              <h2 className="text-3xl font-black text-white tracking-tight">
                {editedPlan.name || "Sin nombre"}
              </h2>
              <p className="text-white/60 text-xs font-bold mt-1">
                {editedPlan.durationMonths}{" "}
                {editedPlan.durationMonths === 1 ? "mes" : "meses"} de duración
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[9px] font-black uppercase">
                Precio
              </p>
              <p className="text-4xl font-black text-white">
                ₡{editedPlan.price.toLocaleString()}
              </p>
              {editedPlan.promoPrice > 0 &&
                editedPlan.promoPrice < editedPlan.price && (
                  <p className="text-green-300 text-sm font-bold">
                    Promo: ₡{editedPlan.promoPrice.toLocaleString()}
                  </p>
                )}
            </div>
          </div>

          {/* Stats si no es nuevo */}
          {!isNew && (
            <div className="flex gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex-1 text-center">
                <p className="text-xl font-black text-white">
                  {subscribersCount}
                </p>
                <p className="text-[8px] font-bold text-white/60 uppercase">
                  Activos
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex-1 text-center">
                <p className="text-xl font-black text-yellow-300">
                  {pendingCount}
                </p>
                <p className="text-[8px] font-bold text-white/60 uppercase">
                  Pendientes
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex-1 text-center">
                <p className="text-xl font-black text-green-300">
                  ₡{(totalRevenue / 1000).toFixed(0)}k
                </p>
                <p className="text-[8px] font-bold text-white/60 uppercase">
                  MRR
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Información del Plan
            </h3>

            <Input
              label="Nombre del plan"
              placeholder="Ej. Premium"
              value={editedPlan.name}
              onChange={(e: any) =>
                setEditedPlan({ ...editedPlan, name: e.target.value })
              }
            />

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Descripción
              </label>
              <textarea
                value={editedPlan.description}
                onChange={(e) =>
                  setEditedPlan({ ...editedPlan, description: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold h-20 resize-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all text-sm"
                placeholder="Describe los beneficios del plan..."
              />
            </div>
          </div>

          {/* Precio y duración */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Precio y Duración
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Precio (₡)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₡
                  </span>
                  <input
                    type="number"
                    value={editedPlan.price}
                    onChange={(e) =>
                      setEditedPlan({
                        ...editedPlan,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-10 pr-4 font-bold text-black outline-none focus:ring-1 focus:ring-emerald-400 transition-all text-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Precio Promo
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₡
                  </span>
                  <input
                    type="number"
                    value={editedPlan.promoPrice || 0}
                    onChange={(e) =>
                      setEditedPlan({
                        ...editedPlan,
                        promoPrice: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-10 pr-4 font-bold text-black outline-none focus:ring-1 focus:ring-emerald-400 transition-all text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Selector de duración */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Duración
              </label>
              <div className="grid grid-cols-4 gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.months}
                    onClick={() =>
                      setEditedPlan({
                        ...editedPlan,
                        durationMonths: preset.months,
                      })
                    }
                    className={`py-3 rounded-xl font-black text-xs transition-all active:scale-95 ${
                      editedPlan.durationMonths === preset.months
                        ? "bg-emerald-500 text-white shadow-lg"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Características ({editedPlan.features.length})
              </h3>
            </div>

            {/* Lista de features */}
            <div className="space-y-2">
              {editedPlan.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 group"
                >
                  <svg
                    className="w-4 h-4 text-emerald-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="flex-1 text-sm font-bold text-slate-700">
                    {feature}
                  </span>
                  <button
                    onClick={() => removeFeature(idx)}
                    className="w-6 h-6 bg-red-100 text-red-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="3"
                    >
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Agregar feature */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addFeature()}
                placeholder="Nueva característica..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                onClick={addFeature}
                className="px-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase active:scale-95 transition-all"
              >
                Añadir
              </button>
            </div>
          </div>

          {/* Configuración adicional */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Configuración
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Máx. fotos"
                type="number"
                value={editedPlan.maxPhotos}
                onChange={(e: any) =>
                  setEditedPlan({
                    ...editedPlan,
                    maxPhotos: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Orden"
                type="number"
                value={editedPlan.displayOrder}
                onChange={(e: any) =>
                  setEditedPlan({
                    ...editedPlan,
                    displayOrder: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setEditedPlan({
                    ...editedPlan,
                    isActive: !editedPlan.isActive,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  editedPlan.isActive
                    ? "bg-green-50 border-green-500 text-green-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <svg
                  className={`w-5 h-5 mx-auto mb-1 ${
                    editedPlan.isActive ? "text-green-500" : "text-slate-300"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-xs font-black uppercase">Activo</p>
              </button>

              <button
                onClick={() =>
                  setEditedPlan({
                    ...editedPlan,
                    isFeatured: !editedPlan.isFeatured,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  editedPlan.isFeatured
                    ? "bg-yellow-50 border-yellow-500 text-yellow-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <svg
                  className={`w-5 h-5 mx-auto mb-1 ${
                    editedPlan.isFeatured ? "text-yellow-500" : "text-slate-300"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <p className="text-xs font-black uppercase">Destacado</p>
              </button>

              <button
                onClick={() =>
                  setEditedPlan({
                    ...editedPlan,
                    includesAnalytics: !editedPlan.includesAnalytics,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  editedPlan.includesAnalytics
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <svg
                  className={`w-5 h-5 mx-auto mb-1 ${
                    editedPlan.includesAnalytics
                      ? "text-blue-500"
                      : "text-slate-300"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-xs font-black uppercase">Analytics</p>
              </button>

              <button
                onClick={() =>
                  setEditedPlan({
                    ...editedPlan,
                    prioritySupport: !editedPlan.prioritySupport,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all ${
                  editedPlan.prioritySupport
                    ? "bg-purple-50 border-purple-500 text-purple-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <svg
                  className={`w-5 h-5 mx-auto mb-1 ${
                    editedPlan.prioritySupport
                      ? "text-purple-500"
                      : "text-slate-300"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-xs font-black uppercase">Soporte VIP</p>
              </button>
            </div>
          </div>

          {/* Zona de peligro */}
          {!isNew && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                Zona de Peligro
              </h3>
              <button
                onClick={onDelete}
                disabled={subscribersCount > 0}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 ${
                  subscribersCount > 0
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : "bg-red-50 text-red-500 border border-red-200"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar plan
              </button>
              {subscribersCount > 0 && (
                <p className="text-[9px] text-orange-500 text-center mt-2 font-bold">
                  ⚠️ No puedes eliminar: {subscribersCount} profesionales
                  suscritos
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(editedPlan)}
            className={`flex-[2] py-5 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl bg-gradient-to-r ${colors.gradient}`}
          >
            {isNew ? "Crear Plan" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE MELHORADO: CategoryEditModal
// ============================================
const CategoryEditModal = ({
  category,
  trainers,
  onClose,
  onSave,
  onDelete,
}: {
  category: Category;
  trainers: ProfessionalProfile[];
  onClose: () => void;
  onSave: (cat: Category) => void;
  onDelete: () => void;
}) => {
  const [editedCat, setEditedCat] = useState<Category>(category);
  const isNew = category.id.startsWith("cat-");

  // Estatísticas da categoria
  const prosInCategory = trainers.filter((t) =>
    t.areas?.includes(category.name)
  ).length;
  const activeProsInCategory = trainers.filter(
    (t) => t.areas?.includes(category.name) && t.planActive
  ).length;

  // Paleta de cores predefinidas
  const colorPalette = [
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#EF4444",
    "#F97316",
    "#EAB308",
    "#22C55E",
    "#14B8A6",
    "#06B6D4",
    "#6366F1",
  ];

  // Emojis populares para categorias fitness
  const emojiPalette = [
    "🏋️",
    "🎾",
    "⚽",
    "🏊",
    "🚴",
    "🧘",
    "🥊",
    "💪",
    "🏃",
    "🎯",
    "🏀",
    "🏈",
    "⛳",
    "🎿",
    "🤸",
    "🏄",
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[1500] flex items-end">
      <div className="w-full bg-white rounded-t-[48px] animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col shadow-2xl border-t border-slate-100 overflow-hidden">
        {/* Header visual com preview */}
        <div
          className="px-8 pt-8 pb-6 relative"
          style={{
            backgroundColor: editedCat.colorHex
              ? `${editedCat.colorHex}15`
              : "#f8fafc",
          }}
        >
          <div className="w-12 h-1 bg-black/10 rounded-full mx-auto mb-6" />

          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 bg-black/5 rounded-full flex items-center justify-center text-slate-400 hover:text-black hover:bg-black/10 transition-all"
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

          <div className="flex items-center gap-5">
            {/* Preview do ícone */}
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg transition-all"
              style={{ backgroundColor: editedCat.colorHex || "#3B82F6" }}
            >
              {editedCat.iconClass || "⭐"}
            </div>

            <div className="flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                {isNew ? "Nueva categoría" : "Editando"}
              </p>
              <h2 className="text-2xl font-black text-black tracking-tight">
                {editedCat.name || "Sin nombre"}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1">
                /{editedCat.slug || "slug"}
              </p>
            </div>
          </div>

          {/* Stats si no es nueva */}
          {!isNew && (
            <div className="flex gap-3 mt-5">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
                <p className="text-lg font-black text-slate-800">
                  {prosInCategory}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">
                  Profesionales
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
                <p className="text-lg font-black text-green-600">
                  {activeProsInCategory}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">
                  Activos
                </p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 flex-1 text-center">
                <p className="text-lg font-black text-slate-800">
                  #{editedCat.displayOrder}
                </p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">
                  Orden
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Información Básica
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre"
                placeholder="Ej. Pádel"
                value={editedCat.name}
                onChange={(e: any) =>
                  setEditedCat({
                    ...editedCat,
                    name: e.target.value,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, ""),
                  })
                }
              />
              <Input
                label="Slug (URL)"
                placeholder="padel"
                value={editedCat.slug}
                onChange={(e: any) =>
                  setEditedCat({ ...editedCat, slug: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Descripción
              </label>
              <textarea
                value={editedCat.description}
                onChange={(e) =>
                  setEditedCat({ ...editedCat, description: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold h-20 resize-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all text-sm"
                placeholder="Breve descripción de la disciplina..."
              />
            </div>
          </div>

          {/* Apariencia */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Apariencia
            </h3>

            {/* Selector de Emoji */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Icono
              </label>
              <div className="flex flex-wrap gap-2">
                {emojiPalette.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() =>
                      setEditedCat({ ...editedCat, iconClass: emoji })
                    }
                    className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90 ${
                      editedCat.iconClass === emoji
                        ? "bg-violet-100 ring-2 ring-violet-500 scale-110"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                <input
                  type="text"
                  value={editedCat.iconClass}
                  onChange={(e) =>
                    setEditedCat({ ...editedCat, iconClass: e.target.value })
                  }
                  placeholder="✨"
                  className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 text-center text-xl outline-none focus:border-violet-400"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Selector de Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Color de marca
              </label>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      setEditedCat({ ...editedCat, colorHex: color })
                    }
                    className={`w-9 h-9 rounded-xl transition-all active:scale-90 ${
                      editedCat.colorHex === color
                        ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={editedCat.colorHex || "#3B82F6"}
                    onChange={(e) =>
                      setEditedCat({ ...editedCat, colorHex: e.target.value })
                    }
                    className="w-9 h-9 rounded-xl cursor-pointer opacity-0 absolute inset-0"
                  />
                  <div
                    className="w-9 h-9 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center"
                    style={{ backgroundColor: editedCat.colorHex }}
                  >
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M12 4v16m8-8H4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Orden */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Orden de visualización"
                type="number"
                value={editedCat.displayOrder}
                onChange={(e: any) =>
                  setEditedCat({
                    ...editedCat,
                    displayOrder: Number(e.target.value),
                  })
                }
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Estado
                </label>
                <button
                  onClick={() =>
                    setEditedCat({
                      ...editedCat,
                      isActive: !editedCat.isActive,
                    })
                  }
                  className={`w-full py-4 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                    editedCat.isActive
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  {editedCat.isActive ? "✓ Activa" : "Inactiva"}
                </button>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                SEO & Metadatos
              </h3>
              <span className="text-[8px] font-bold text-slate-300 uppercase">
                Opcional
              </span>
            </div>

            <Input
              label="Meta título"
              placeholder="Clases de pádel en Costa Rica"
              value={editedCat.metaTitle}
              onChange={(e: any) =>
                setEditedCat({ ...editedCat, metaTitle: e.target.value })
              }
            />

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Meta descripción
              </label>
              <textarea
                value={editedCat.metaDescription}
                onChange={(e) =>
                  setEditedCat({
                    ...editedCat,
                    metaDescription: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold h-20 resize-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 outline-none transition-all text-sm"
                placeholder="Descripción para Google..."
              />
              <p className="text-[9px] text-slate-400 text-right">
                {editedCat.metaDescription?.length || 0}/160 caracteres
              </p>
            </div>
          </div>

          {/* Zona de peligro */}
          {!isNew && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                Zona de Peligro
              </h3>
              <button
                onClick={onDelete}
                className="w-full py-4 bg-red-50 text-red-500 border border-red-200 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar categoría
              </button>
              {prosInCategory > 0 && (
                <p className="text-[9px] text-orange-500 text-center mt-2 font-bold">
                  ⚠️ {prosInCategory} profesionales usan esta categoría
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(editedCat)}
            className="flex-[2] py-5 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
            style={{ backgroundColor: editedCat.colorHex || "#8B5CF6" }}
          >
            {isNew ? "Crear Categoría" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE MELHORADO: UserDetailsModal
// ============================================
const UserDetailsModal = ({
  user,
  onClose,
  onSave,
  onDelete,
  trainers,
}: {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
  onDelete: () => void;
  trainers: ProfessionalProfile[];
}) => {
  const [editedUser, setEditedUser] = useState<User>(user);
  const [activeTab, setActiveTab] = useState<"info" | "activity" | "settings">(
    "info"
  );
  const [newPassword, setNewPassword] = useState("");

  // Calcular estatísticas do usuário
  const userStats = useMemo(() => {
    const bookings = DB.getBookings().filter((b) => b.clientId === user.id);
    const completedBookings = bookings.filter((b) => b.status === "Confirmada");
    const cancelledBookings = bookings.filter((b) => b.status === "Cancelada");
    const totalSpent = completedBookings.reduce(
      (acc, b) => acc + (b.price || 0),
      0
    );
    const favorites = DB.getFavorites(user.id);
    const conversations = DB.getConversations().filter((c) =>
      c.participants.includes(user.id)
    );

    // Profissionais com quem treinou
    const trainedWithIds = [
      ...new Set(completedBookings.map((b) => b.professionalId)),
    ];
    const trainedWith = trainers.filter((t) => trainedWithIds.includes(t.id));

    // Última atividade
    const lastBooking = bookings.sort(
      (a, b) =>
        new Date(b.createdAt || "").getTime() -
        new Date(a.createdAt || "").getTime()
    )[0];

    return {
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalSpent,
      favoritesCount: favorites.length,
      conversationsCount: conversations.length,
      trainedWith,
      lastBooking,
      cancelRate:
        bookings.length > 0
          ? Math.round((cancelledBookings.length / bookings.length) * 100)
          : 0,
    };
  }, [user.id, trainers]);

  const formatDate = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date?: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const daysSinceRegistration = user.createdAt
    ? Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[2500] flex items-end">
      <div className="w-full bg-white rounded-t-[48px] animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col shadow-2xl border-t border-slate-100 overflow-hidden">
        {/* Header com Avatar */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black px-8 pt-8 pb-10 relative">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8" />

          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
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

          <div className="flex items-center gap-5">
            <div className="relative">
              {editedUser.image ? (
                <img
                  src={editedUser.image}
                  className="w-20 h-20 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl"
                  alt=""
                />
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 ring-4 ring-white/20 flex items-center justify-center text-white text-2xl font-black shadow-2xl">
                  {editedUser.name[0]}
                  {editedUser.lastName?.[0] || ""}
                </div>
              )}
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-slate-900 flex items-center justify-center ${
                  editedUser.status === "active"
                    ? "bg-green-500"
                    : editedUser.status === "blocked"
                    ? "bg-red-500"
                    : "bg-orange-500"
                }`}
              >
                {editedUser.status === "active" ? (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="4"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : editedUser.status === "blocked" ? (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="4"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="4"
                  >
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {editedUser.name} {editedUser.lastName}
              </h2>
              <p className="text-white/50 text-xs font-bold mt-1">
                {editedUser.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                    editedUser.status === "active"
                      ? "bg-green-500/20 text-green-300"
                      : editedUser.status === "blocked"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-orange-500/20 text-orange-300"
                  }`}
                >
                  {editedUser.status === "active"
                    ? "Activo"
                    : editedUser.status === "blocked"
                    ? "Bloqueado"
                    : "Inactivo"}
                </span>
                {editedUser.phoneVerified && (
                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300">
                    Verificado
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-white/10 text-white/50">
                  {daysSinceRegistration} días
                </span>
              </div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-white">
                {userStats.totalBookings}
              </p>
              <p className="text-[8px] font-bold text-white/40 uppercase">
                Reservas
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-green-400">
                ₡{(userStats.totalSpent / 1000).toFixed(0)}k
              </p>
              <p className="text-[8px] font-bold text-white/40 uppercase">
                Gastado
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-blue-400">
                {userStats.favoritesCount}
              </p>
              <p className="text-[8px] font-bold text-white/40 uppercase">
                Favoritos
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p
                className={`text-lg font-black ${
                  userStats.cancelRate > 30 ? "text-red-400" : "text-white"
                }`}
              >
                {userStats.cancelRate}%
              </p>
              <p className="text-[8px] font-bold text-white/40 uppercase">
                Cancelac.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-8 bg-slate-50">
          {[
            {
              id: "info",
              label: "Información",
              icon: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
            {
              id: "activity",
              label: "Actividad",
              icon: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
            {
              id: "settings",
              label: "Ajustes",
              icon: (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-black border-black"
                  : "text-slate-300 border-transparent hover:text-slate-500"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {activeTab === "info" && (
            <div className="space-y-6 animate-fade-in">
              {/* Datos personales */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Datos Personales
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nombre"
                    value={editedUser.name}
                    onChange={(e: any) =>
                      setEditedUser({ ...editedUser, name: e.target.value })
                    }
                  />
                  <Input
                    label="Apellidos"
                    value={editedUser.lastName}
                    onChange={(e: any) =>
                      setEditedUser({ ...editedUser, lastName: e.target.value })
                    }
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={editedUser.email}
                  onChange={(e: any) =>
                    setEditedUser({ ...editedUser, email: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Teléfono"
                    value={editedUser.phone}
                    onChange={(e: any) =>
                      setEditedUser({ ...editedUser, phone: e.target.value })
                    }
                  />
                  <Input
                    label="Ciudad"
                    value={editedUser.city || ""}
                    onChange={(e: any) =>
                      setEditedUser({ ...editedUser, city: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Fechas importantes */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Fechas Importantes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Registrado
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      {formatDate(editedUser.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Última reserva
                    </p>
                    <p className="text-sm font-black text-slate-700">
                      {formatDate(userStats.lastBooking?.date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profesionales con quienes ha entrenado */}
              {userStats.trainedWith.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Entrenó con ({userStats.trainedWith.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userStats.trainedWith.slice(0, 5).map((trainer) => (
                      <div
                        key={trainer.id}
                        className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl"
                      >
                        {trainer.image ? (
                          <img
                            src={trainer.image}
                            className="w-6 h-6 rounded-lg object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                            {trainer.name[0]}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-600">
                          {trainer.name}
                        </span>
                      </div>
                    ))}
                    {userStats.trainedWith.length > 5 && (
                      <div className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-400">
                        +{userStats.trainedWith.length - 5} más
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-6 animate-fade-in">
              {/* Resumen de actividad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-black text-green-600 uppercase">
                      Completadas
                    </span>
                  </div>
                  <p className="text-3xl font-black text-green-700">
                    {userStats.completedBookings}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-black text-red-600 uppercase">
                      Canceladas
                    </span>
                  </div>
                  <p className="text-3xl font-black text-red-700">
                    {userStats.cancelledBookings}
                  </p>
                </div>
              </div>

              {/* Valor del cliente */}
              <div className="bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl p-5 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-bold uppercase opacity-70">
                      Valor Total del Cliente
                    </p>
                    <p className="text-3xl font-black mt-1">
                      ₡{userStats.totalSpent.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase opacity-70">
                      Promedio por sesión
                    </p>
                    <p className="text-lg font-black">
                      ₡
                      {userStats.completedBookings > 0
                        ? Math.round(
                            userStats.totalSpent / userStats.completedBookings
                          ).toLocaleString()
                        : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase opacity-70">
                      Conversaciones
                    </p>
                    <p className="text-lg font-black">
                      {userStats.conversationsCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Indicador de riesgo de cancelación */}
              {userStats.cancelRate > 20 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black text-orange-700">
                      Alto índice de cancelación
                    </p>
                    <p className="text-xs font-bold text-orange-500 mt-0.5">
                      Este cliente cancela {userStats.cancelRate}% de sus
                      reservas
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 animate-fade-in">
              {/* Estado de la cuenta */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Estado de la Cuenta
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "active", label: "Activo", color: "green" },
                    {
                      value: "deactivated",
                      label: "Inactivo",
                      color: "orange",
                    },
                    { value: "blocked", label: "Bloqueado", color: "red" },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() =>
                        setEditedUser({
                          ...editedUser,
                          status: status.value as any,
                        })
                      }
                      className={`p-4 rounded-xl border-2 transition-all active:scale-95 ${
                        editedUser.status === status.value
                          ? status.color === "green"
                            ? "bg-green-50 border-green-500 text-green-700"
                            : status.color === "orange"
                            ? "bg-orange-50 border-orange-500 text-orange-700"
                            : "bg-red-50 border-red-500 text-red-700"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-black uppercase">
                        {status.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Verificaciones */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Verificaciones
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      setEditedUser({
                        ...editedUser,
                        phoneVerified: !editedUser.phoneVerified,
                      })
                    }
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      editedUser.phoneVerified
                        ? "bg-blue-50 border-blue-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          editedUser.phoneVerified
                            ? "bg-blue-500 text-white"
                            : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          editedUser.phoneVerified
                            ? "text-blue-700"
                            : "text-slate-500"
                        }`}
                      >
                        Teléfono verificado
                      </span>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        editedUser.phoneVerified
                          ? "bg-blue-500"
                          : "bg-slate-300"
                      }`}
                    >
                      {editedUser.phoneVerified && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="4"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Cambiar rol */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Tipo de Cuenta
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setEditedUser({ ...editedUser, role: UserRole.CLIENT })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editedUser.role === UserRole.CLIENT
                        ? "bg-blue-50 border-blue-500"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <svg
                      className={`w-6 h-6 mx-auto mb-2 ${
                        editedUser.role === UserRole.CLIENT
                          ? "text-blue-500"
                          : "text-slate-300"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p
                      className={`text-xs font-black uppercase ${
                        editedUser.role === UserRole.CLIENT
                          ? "text-blue-700"
                          : "text-slate-400"
                      }`}
                    >
                      Cliente
                    </p>
                  </button>
                  <button
                    onClick={() =>
                      setEditedUser({ ...editedUser, role: UserRole.TEACHER })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      editedUser.role === UserRole.TEACHER
                        ? "bg-violet-50 border-violet-500"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <svg
                      className={`w-6 h-6 mx-auto mb-2 ${
                        editedUser.role === UserRole.TEACHER
                          ? "text-violet-500"
                          : "text-slate-300"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p
                      className={`text-xs font-black uppercase ${
                        editedUser.role === UserRole.TEACHER
                          ? "text-violet-700"
                          : "text-slate-400"
                      }`}
                    >
                      Profesional
                    </p>
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Seguridad
                </h3>
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e: any) => setNewPassword(e.target.value)}
                  placeholder="Dejar vacío para mantener actual"
                />
              </div>

              {/* Zona de peligro */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">
                  Zona de Peligro
                </h3>
                <button
                  onClick={onDelete}
                  className="w-full py-4 bg-red-50 text-red-500 border border-red-200 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar cuenta permanentemente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="p-6 border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={() => onSave(editedUser)}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

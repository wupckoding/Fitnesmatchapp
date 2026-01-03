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
    setClients([...DB.getClients()].filter((c) => c.role === UserRole.CLIENT)); // Filtra apenas Clientes reais
    setCategories(
      [...DB.getCategories()].sort((a, b) => a.displayOrder - b.displayOrder)
    );

    if (isManagingTrainer) {
      const updated = DB.getPros().find((p) => p.id === isManagingTrainer.id);
      if (updated) setIsManagingTrainer(updated);
    }
    if (isEditingUser) {
      const updated = DB.getClients().find((u) => u.id === isEditingUser.id);
      if (updated) setIsEditingUser(updated);
    }
  }, [isManagingTrainer, isEditingUser]);

  useEffect(() => {
    refresh();
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [refresh]);

  const showToast = (msg: string) => {
    setToast({ msg, type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = (fn: () => void, msg: string) => {
    fn();
    refresh();
    showToast(msg);
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
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[3000] w-[90%] max-w-[360px]">
          <div className="bg-black text-white p-5 rounded-2xl shadow-2xl flex items-center justify-between animate-spring-up">
            <span className="text-[10px] font-black uppercase tracking-widest">
              {toast.msg}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
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
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-black p-8 rounded-[32px] text-white flex justify-between items-center shadow-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">
                    Ingresos de Hoy
                  </p>
                  <p className="text-3xl font-black tracking-tighter mt-1">
                    ₡285,000
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3m0-3v3m0 12v3" />
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <KPICard
                  label="Total Usuarios"
                  value={trainers.length + clients.length}
                />
                <KPICard
                  label="Base de Clientes"
                  value={clients.length}
                  highlight
                />
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
            <div className="flex justify-between items-center px-2">
              <div>
                <h2 className="text-2xl font-black text-black tracking-tight">
                  Profesionales
                </h2>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                  Control de Membresías
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {trainers.map((pro) => (
                <div
                  key={pro.id}
                  onClick={() => setIsManagingTrainer(pro)}
                  className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col gap-4 shadow-sm hover:border-black transition-all active:scale-[0.98] cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={pro.image}
                      className="w-14 h-14 rounded-2xl object-cover shadow-md"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-black tracking-tight truncate">
                        {pro.name} {pro.lastName}
                      </h4>
                      <div className="flex gap-2 items-center mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            pro.planActive
                              ? "bg-blue-50 text-blue-600"
                              : "bg-red-50 text-red-400"
                          }`}
                        >
                          {pro.planActive ? "Pro Activo" : "Sin Plan"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            pro.status === "active"
                              ? "bg-green-50 text-green-600"
                              : "bg-orange-50 text-orange-400"
                          }`}
                        >
                          {pro.status === "active" ? "Operativo" : "Oculto"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        Días restantes
                      </p>
                      <p
                        className={`text-lg font-black tracking-tighter ${
                          getDaysLeft(pro.planExpiry) < 5
                            ? "text-red-500 animate-pulse"
                            : "text-black"
                        }`}
                      >
                        {getDaysLeft(pro.planExpiry)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "plans" && (
          <div className="animate-spring-up space-y-8">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-2xl font-black text-black tracking-tight">
                Planes
              </h2>
              <button
                onClick={() => setIsEditingPlan(createEmptyPlan())}
                className="bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Crear Nuevo
              </button>
            </div>
            <div className="space-y-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-6 rounded-[28px] border border-slate-100 flex items-center justify-between shadow-sm group hover:border-black transition-all"
                >
                  <div>
                    <h4 className="font-extrabold text-black text-lg tracking-tight">
                      {p.name}
                    </h4>
                    <p className="text-slate-400 font-bold text-xs mt-1">
                      ₡{p.price.toLocaleString()} / {p.durationMonths}{" "}
                      {p.durationMonths === 1 ? "Mes" : "Meses"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingPlan(p)}
                      className="w-12 h-12 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-black active:scale-90 transition-all"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        handleAction(
                          () => DB.deletePlan(p.id),
                          "Plan Eliminado"
                        )
                      }
                      className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "categories" && (
          <div className="animate-spring-up space-y-8">
            <div className="flex justify-between items-center px-2">
              <div>
                <h2 className="text-2xl font-black text-black tracking-tight">
                  Categorías
                </h2>
              </div>
              <button
                onClick={() => setIsEditingCat(createEmptyCategory())}
                className="bg-black text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 shadow-xl"
              >
                + Nueva
              </button>
            </div>

            <div className="space-y-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col gap-4 shadow-sm group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {cat.iconClass || "⭐"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            #{cat.displayOrder}
                          </span>
                          <h4 className="font-black text-black text-lg tracking-tight">
                            {cat.name}
                          </h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          {cat.slug}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${
                        cat.isActive
                          ? "bg-green-50 text-green-500"
                          : "bg-slate-50 text-slate-300"
                      }`}
                    >
                      {cat.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIsEditingCat(cat)}
                      className="flex-1 bg-slate-50 text-slate-400 hover:text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        handleAction(
                          () => DB.deleteCategory(cat.id),
                          "Categoría Eliminada"
                        )
                      }
                      className="w-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DETALLES DEL USUARIO (CLIENTE) */}
      {isEditingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[2500] flex items-end">
          <div className="w-full bg-white rounded-t-[48px] p-8 animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col shadow-2xl border-t border-slate-100">
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-10 shrink-0" />

            <div className="flex justify-between items-start mb-10 shrink-0 px-2">
              <div>
                <h2 className="text-3xl font-black text-black tracking-tighter leading-none">
                  Detalles del usuario
                </h2>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-2">
                  Configuración y acceso de cuenta
                </p>
              </div>
              <button
                onClick={() => setIsEditingUser(null)}
                className="text-slate-300 hover:text-black transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pb-10 px-2">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  value={isEditingUser.name}
                  onChange={(e: any) =>
                    setIsEditingUser({ ...isEditingUser, name: e.target.value })
                  }
                />
                <Input
                  label="Apellidos"
                  value={isEditingUser.lastName}
                  onChange={(e: any) =>
                    setIsEditingUser({
                      ...isEditingUser,
                      lastName: e.target.value,
                    })
                  }
                />
              </div>
              <Input
                label="Email"
                value={isEditingUser.email}
                onChange={(e: any) =>
                  setIsEditingUser({ ...isEditingUser, email: e.target.value })
                }
              />
              <Input
                label="Teléfono"
                value={isEditingUser.phone}
                onChange={(e: any) =>
                  setIsEditingUser({ ...isEditingUser, phone: e.target.value })
                }
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nueva contraseña (opcional)
                </label>
                <input
                  type="password"
                  placeholder="Déjalo vacío si no quieres cambiarla"
                  className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-5 px-6 font-bold text-black outline-none focus:ring-1 focus:ring-black transition-all shadow-inner text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-y-6 pt-4">
                <CheckField
                  label="Activo"
                  checked={isEditingUser.status === "active"}
                  onChange={(v) =>
                    setIsEditingUser({
                      ...isEditingUser,
                      status: v ? "active" : "deactivated",
                    })
                  }
                />
                <CheckField
                  label="Es entrenador"
                  checked={isEditingUser.role === UserRole.TEACHER}
                  onChange={(v) =>
                    setIsEditingUser({
                      ...isEditingUser,
                      role: v ? UserRole.TEACHER : UserRole.CLIENT,
                    })
                  }
                />
                <CheckField
                  label="Teléfono verificado"
                  checked={isEditingUser.phoneVerified}
                  onChange={(v) =>
                    setIsEditingUser({ ...isEditingUser, phoneVerified: v })
                  }
                />
              </div>

              <div className="pt-6 border-t border-slate-50">
                <CheckField
                  label="Banear (bloquear completamente)"
                  checked={isEditingUser.status === "blocked"}
                  onChange={(v) =>
                    setIsEditingUser({
                      ...isEditingUser,
                      status: v ? "blocked" : "active",
                    })
                  }
                  variant="danger"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 shrink-0 flex gap-4">
              <button
                onClick={() => {
                  if (confirm("¿Eliminar usuario definitivamente?"))
                    handleAction(() => {
                      DB.deleteUser(isEditingUser.id, isEditingUser.role);
                      setIsEditingUser(null);
                    }, "Usuario Eliminado");
                }}
                className="flex-1 py-6 bg-red-50 text-red-500 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="3"
                >
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                </svg>
                Eliminar
              </button>
              <button
                onClick={() =>
                  handleAction(() => {
                    DB.saveUser(isEditingUser);
                    setIsEditingUser(null);
                  }, "Usuario Actualizado")
                }
                className="flex-[2] py-6 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {isManagingTrainer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-[1100] flex items-end">
          <div className="w-full bg-white rounded-t-[48px] p-8 animate-spring-up max-w-lg mx-auto shadow-2xl border-t border-slate-100 flex flex-col max-h-[95vh]">
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-10 shrink-0" />

            <div className="flex items-center gap-6 mb-10 shrink-0">
              <img
                src={isManagingTrainer.image}
                className="w-20 h-20 rounded-[32px] object-cover shadow-2xl border-4 border-slate-50"
                alt=""
              />
              <div>
                <h3 className="text-3xl font-black text-black tracking-tighter leading-none">
                  {isManagingTrainer.name}
                </h3>
                <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">
                  {isManagingTrainer.email}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-10 no-scrollbar pr-2 pb-10">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">
                  Plan de Membresía
                </h4>
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex justify-between items-center mb-6">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                      Activo actualmente
                    </p>
                    <p className="text-xl font-black text-black tracking-tight">
                      {isManagingTrainer.planType || "Sin Plan Asignado"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      Expira:{" "}
                      {isManagingTrainer.planExpiry
                        ? new Date(
                            isManagingTrainer.planExpiry
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ml-4 ${
                      isManagingTrainer.planActive
                        ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
                        : "bg-red-400 animate-pulse"
                    }`}
                  ></div>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">
                  Asignar nuevo plan:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        handleAction(
                          () =>
                            DB.assignPlanToTrainer(isManagingTrainer.id, p.id),
                          `Plan ${p.name} asignado`
                        )
                      }
                      className={`p-4 rounded-2xl border transition-all text-left active:scale-[0.97] ${
                        isManagingTrainer.planType === p.name
                          ? "border-black bg-black text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-tighter">
                        {p.name}
                      </p>
                      <p className="text-[10px] font-bold opacity-60">
                        ₡{p.price.toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button
                    onClick={() =>
                      handleAction(
                        () =>
                          DB.updateTrainerPlan(
                            isManagingTrainer.id,
                            !isManagingTrainer.planActive
                          ),
                        isManagingTrainer.planActive
                          ? "Membresía Desactivada"
                          : "Membresía Activada"
                      )
                    }
                    className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                      isManagingTrainer.planActive
                        ? "bg-red-50 text-red-500"
                        : "bg-blue-600 text-white shadow-xl"
                    }`}
                  >
                    {isManagingTrainer.planActive
                      ? "Suspender Plan"
                      : "Activar Cuenta"}
                  </button>
                  <button
                    onClick={() =>
                      handleAction(
                        () => DB.renewTrainerExpiry(isManagingTrainer.id),
                        "+30 días de acceso"
                      )
                    }
                    className="py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-xl"
                  >
                    Renovar Fecha
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-1">
                  Visibilidad en Marketplace
                </h4>
                <div
                  className={`p-6 rounded-[32px] border transition-all flex justify-between items-center ${
                    isManagingTrainer.status === "active"
                      ? "bg-green-50 border-green-100"
                      : "bg-orange-50 border-orange-100"
                  }`}
                >
                  <div>
                    <p
                      className={`text-lg font-black tracking-tight ${
                        isManagingTrainer.status === "active"
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {isManagingTrainer.status === "active"
                        ? "VISIBLE"
                        : "OCULTO"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                      {isManagingTrainer.status === "active"
                        ? "Aparece en las búsquedas de clientes"
                        : "No es visible para el público"}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleAction(
                        () =>
                          DB.updateUserStatus(
                            isManagingTrainer.id,
                            UserRole.TEACHER,
                            isManagingTrainer.status === "active"
                              ? "deactivated"
                              : "active"
                          ),
                        isManagingTrainer.status === "active"
                          ? "Ocultado del Marketplace"
                          : "Visible en Marketplace"
                      )
                    }
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-sm ${
                      isManagingTrainer.status === "active"
                        ? "bg-white text-orange-500"
                        : "bg-black text-white"
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      {isManagingTrainer.status === "active" ? (
                        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      ) : (
                        <>
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar entrenador permanentemente?"))
                      handleAction(() => {
                        DB.deleteUser(isManagingTrainer.id, UserRole.TEACHER);
                        setIsManagingTrainer(null);
                      }, "Entrenador Eliminado");
                  }}
                  className="w-full py-6 bg-red-50 text-red-500 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Borrar Definitivamente
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setIsManagingTrainer(null)}
                className="w-full py-6 bg-slate-50 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Cerrar Panel de Control
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[1500] flex items-end">
          <div className="w-full bg-white rounded-t-[48px] p-8 animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col shadow-2xl border-t border-slate-100">
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-10 shrink-0" />

            <div className="flex justify-between items-start mb-10 shrink-0 px-2">
              <div>
                <h2 className="text-3xl font-black text-black tracking-tighter">
                  {isEditingPlan.id.includes("plan-")
                    ? "Editar plan"
                    : "Nuevo plan"}
                </h2>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                  Configura los beneficios de suscripción
                </p>
              </div>
              <button
                onClick={() => setIsEditingPlan(null)}
                className="text-slate-300 hover:text-black transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pb-10 px-2">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre del plan"
                  placeholder="Ej. Básico"
                  value={isEditingPlan.name}
                  onChange={(e: any) =>
                    setIsEditingPlan({ ...isEditingPlan, name: e.target.value })
                  }
                />
                <Input
                  label="Duración (meses)"
                  type="number"
                  value={isEditingPlan.durationMonths}
                  onChange={(e: any) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      durationMonths: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Descripción
                </label>
                <textarea
                  value={isEditingPlan.description}
                  onChange={(e) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[28px] font-bold h-24 resize-none focus:ring-1 focus:ring-black outline-none transition-all shadow-inner text-sm"
                  placeholder="Describe el plan..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Precio (₡)"
                  type="number"
                  value={isEditingPlan.price}
                  onChange={(e: any) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      price: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="Precio con descuento"
                  type="number"
                  value={isEditingPlan.promoPrice || 0}
                  onChange={(e: any) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      promoPrice: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Máx. fotos en perfil"
                  type="number"
                  value={isEditingPlan.maxPhotos}
                  onChange={(e: any) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      maxPhotos: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="Orden de despliegue"
                  type="number"
                  value={isEditingPlan.displayOrder}
                  onChange={(e: any) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      displayOrder: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Características (lista)
                  </label>
                  <span className="text-[8px] font-bold text-slate-300">
                    Una por línea
                  </span>
                </div>
                <textarea
                  value={isEditingPlan.features.join("\n")}
                  onChange={(e) =>
                    setIsEditingPlan({
                      ...isEditingPlan,
                      features: e.target.value
                        .split("\n")
                        .filter((f) => f.trim() !== ""),
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[28px] font-bold h-40 resize-none focus:ring-1 focus:ring-black outline-none transition-all shadow-inner text-sm"
                  placeholder="• Presencia en el catálogo&#10;• Soporte prioritario..."
                />
              </div>

              <div className="grid grid-cols-2 gap-y-4 pt-2">
                <CheckField
                  label="Plan activo"
                  checked={isEditingPlan.isActive}
                  onChange={(v) =>
                    setIsEditingPlan({ ...isEditingPlan, isActive: v })
                  }
                />
                <CheckField
                  label="Destacado en la web"
                  checked={isEditingPlan.isFeatured}
                  onChange={(v) =>
                    setIsEditingPlan({ ...isEditingPlan, isFeatured: v })
                  }
                />
                <CheckField
                  label="Incluye analíticas"
                  checked={isEditingPlan.includesAnalytics}
                  onChange={(v) =>
                    setIsEditingPlan({ ...isEditingPlan, includesAnalytics: v })
                  }
                />
                <CheckField
                  label="Soporte prioritario"
                  checked={isEditingPlan.prioritySupport}
                  onChange={(v) =>
                    setIsEditingPlan({ ...isEditingPlan, prioritySupport: v })
                  }
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 shrink-0 flex gap-4">
              <button
                onClick={() => setIsEditingPlan(null)}
                className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  handleAction(() => {
                    DB.savePlan(isEditingPlan);
                    setIsEditingPlan(null);
                  }, "Plan Guardado")
                }
                className="flex-[1.5] py-6 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-100"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-[1500] flex items-end">
          <div className="w-full bg-white rounded-t-[48px] p-8 animate-spring-up max-w-lg mx-auto h-[95vh] flex flex-col border-t border-slate-100 shadow-2xl">
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-10 shrink-0" />

            <div className="flex justify-between items-start mb-10 shrink-0 px-2">
              <div>
                <h2 className="text-3xl font-black text-black tracking-tighter">
                  Editar categoría
                </h2>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">
                  Modifica la información del deporte / disciplina
                </p>
              </div>
              <button
                onClick={() => setIsEditingCat(null)}
                className="text-slate-300 hover:text-black transition-colors"
              >
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pb-10 px-2">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  placeholder="Ej. Pádel"
                  value={isEditingCat.name}
                  onChange={(e: any) =>
                    setIsEditingCat({ ...isEditingCat, name: e.target.value })
                  }
                />
                <Input
                  label="Slug (URL)"
                  placeholder="Ej. padel"
                  value={isEditingCat.slug}
                  onChange={(e: any) =>
                    setIsEditingCat({ ...isEditingCat, slug: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Descripción
                </label>
                <textarea
                  value={isEditingCat.description}
                  onChange={(e) =>
                    setIsEditingCat({
                      ...isEditingCat,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[28px] font-bold h-24 resize-none focus:ring-1 focus:ring-black outline-none transition-all shadow-inner text-sm"
                  placeholder="Descripción de la disciplina..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Icono (clase CSS)"
                  placeholder="🎾"
                  value={isEditingCat.iconClass}
                  onChange={(e: any) =>
                    setIsEditingCat({
                      ...isEditingCat,
                      iconClass: e.target.value,
                    })
                  }
                />
                <Input
                  label="Color (hex)"
                  placeholder="#3B82F6"
                  value={isEditingCat.colorHex}
                  onChange={(e: any) =>
                    setIsEditingCat({
                      ...isEditingCat,
                      colorHex: e.target.value,
                    })
                  }
                />
                <Input
                  label="Orden"
                  type="number"
                  value={isEditingCat.displayOrder}
                  onChange={(e: any) =>
                    setIsEditingCat({
                      ...isEditingCat,
                      displayOrder: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="pt-2">
                <CheckField
                  label="Activo (visible en la web)"
                  checked={isEditingCat.isActive}
                  onChange={(v) =>
                    setIsEditingCat({ ...isEditingCat, isActive: v })
                  }
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-50">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">
                  Optimización SEO
                </h4>
                <Input
                  label="Meta título (SEO)"
                  placeholder="Título para buscadores"
                  value={isEditingCat.metaTitle}
                  onChange={(e: any) =>
                    setIsEditingCat({
                      ...isEditingCat,
                      metaTitle: e.target.value,
                    })
                  }
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Meta descripción (SEO)
                  </label>
                  <textarea
                    value={isEditingCat.metaDescription}
                    onChange={(e) =>
                      setIsEditingCat({
                        ...isEditingCat,
                        metaDescription: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 p-6 rounded-[28px] font-bold h-24 resize-none focus:ring-1 focus:ring-black outline-none transition-all shadow-inner text-sm"
                    placeholder="Descripción para SEO..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 shrink-0 flex gap-4">
              <button
                onClick={() => setIsEditingCat(null)}
                className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  handleAction(() => {
                    DB.saveCategory(isEditingCat);
                    setIsEditingCat(null);
                  }, "Categoría Guardada")
                }
                className="flex-[1.5] py-6 bg-blue-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
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

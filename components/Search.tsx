import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ProfessionalProfile } from "../types";
import { DB } from "../services/databaseService";

interface SearchProps {
  onSelectProfessional: (p: ProfessionalProfile) => void;
  currentUserId?: string;
}

export const Search: React.FC<SearchProps> = ({
  onSelectProfessional,
  currentUserId,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [pros, setPros] = useState<ProfessionalProfile[]>([]);
  const [cats, setCats] = useState<{ name: string; icon: string }[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "price" | "reviews">(
    "rating"
  );
  const [showFilters, setShowFilters] = useState(false);

  // Filtros avançados
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [modality, setModality] = useState<"all" | "presencial" | "online">(
    "all"
  );
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setPros(DB.getPros().filter((p) => p.status === "active" && p.planActive));
    setCats([
      { name: "Todos", icon: "✨" },
      ...DB.getCategories()
        .filter((c) => c.isActive)
        .map((c) => ({ name: c.name, icon: c.iconClass })),
    ]);
    if (currentUserId) {
      setFavorites(DB.getFavorites(currentUserId));
    }
  }, [currentUserId]);

  useEffect(() => {
    refresh();
    DB.forceSync().then(refresh).catch(console.error);
    const unsub = DB.subscribe(refresh);
    return () => unsub();
  }, [refresh]);

  const handleToggleFavorite = async (e: React.MouseEvent, proId: string) => {
    e.stopPropagation();
    if (!currentUserId) return;

    const isFav = await DB.toggleFavorite(currentUserId, proId);
    setFavorites((prev) =>
      isFav ? [...prev, proId] : prev.filter((id) => id !== proId)
    );
  };

  const filtered = useMemo(() => {
    let result = DB.searchProfessionals({
      query: search,
      category: selectedCategory === "Todos" ? undefined : selectedCategory,
      minRating: minRating > 0 ? minRating : undefined,
      maxPrice: maxPrice < 100000 ? maxPrice : undefined,
      modality: modality !== "all" ? modality : undefined,
      sortBy,
    });

    // Filtrar favoritos
    if (showFavoritesOnly) {
      result = result.filter((p) => favorites.includes(p.id));
    }

    return result;
  }, [
    search,
    selectedCategory,
    sortBy,
    minRating,
    maxPrice,
    modality,
    showFavoritesOnly,
    favorites,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (minRating > 0) count++;
    if (maxPrice < 100000) count++;
    if (modality !== "all") count++;
    if (showFavoritesOnly) count++;
    return count;
  }, [minRating, maxPrice, modality, showFavoritesOnly]);

  const clearFilters = () => {
    setMinRating(0);
    setMaxPrice(100000);
    setModality("all");
    setShowFavoritesOnly(false);
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden animate-fade-in">
      <header className="px-6 pt-14 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-black tracking-tight">
              Explorar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filtered.length} de {pros.length} profesionales
            </p>
          </div>

          {/* Filtros e Ordenação */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFiltersCount > 0
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none"
            >
              <option value="rating">⭐ Rating</option>
              <option value="price">💰 Precio</option>
              <option value="reviews">💬 Reseñas</option>
            </select>
          </div>
        </div>

        {/* Painel de Filtros Avançados */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-black">
                Filtros avanzados
              </h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 font-bold"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rating Mínimo */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Rating mínimo
                </label>
                <div className="flex gap-1 mt-2">
                  {[0, 3, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        minRating === r
                          ? "bg-yellow-400 text-black"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r === 0 ? "Todos" : `${r}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modalidad */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Modalidad
                </label>
                <div className="flex gap-1 mt-2">
                  {[
                    { value: "all", label: "Todas" },
                    { value: "presencial", label: "🏋️" },
                    { value: "online", label: "💻" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setModality(m.value as any)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        modality === m.value
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preço Máximo */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Precio máximo
                </label>
                <span className="text-sm font-bold text-black">
                  {maxPrice >= 100000
                    ? "Sin límite"
                    : `₡${maxPrice.toLocaleString()}`}
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="100000"
                step="5000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full mt-2 accent-blue-600"
              />
            </div>

            {/* Favoritos */}
            {currentUserId && (
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  showFavoritesOnly
                    ? "bg-red-500 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill={showFavoritesOnly ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {showFavoritesOnly
                  ? "Mostrando favoritos"
                  : "Ver solo favoritos"}
                {favorites.length > 0 && !showFavoritesOnly && (
                  <span className="bg-slate-200 px-1.5 py-0.5 rounded-full text-[10px]">
                    {favorites.length}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Barra de Busca Premium */}
        <div
          className={`relative transition-all duration-300 mb-4 ${
            isSearchFocused ? "scale-[1.02]" : ""
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl blur-xl transition-opacity duration-300 ${
              isSearchFocused ? "opacity-100" : "opacity-0"
            }`}
          ></div>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, disciplina o ubicación..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-black placeholder:text-slate-400 outline-none focus:border-blue-300 focus:shadow-lg focus:shadow-blue-50/50 transition-all duration-300"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <svg
              className={`absolute left-4 top-4 w-5 h-5 transition-colors ${
                isSearchFocused ? "text-blue-500" : "text-slate-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-4 w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
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
            )}
          </div>
        </div>

        {/* Categorias */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {cats.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 whitespace-nowrap animate-slide-up ${
                selectedCategory === cat.name
                  ? "bg-black text-white shadow-lg shadow-slate-300"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <span className="text-sm">{cat.icon}</span>
              <span className="text-xs font-bold">{cat.name}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-32">
        {/* Resultados */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400">
            {filtered.length}{" "}
            {filtered.length === 1 ? "resultado" : "resultados"}
            {search && ` para "${search}"`}
          </p>
        </div>

        <div className="space-y-3">
          {filtered.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => onSelectProfessional(p)}
              className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all animate-spring-up shadow-sm hover:shadow-md hover:border-slate-200 group cursor-pointer"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="relative">
                {p.image ? (
                  <img
                    src={p.image}
                    className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all"
                    alt=""
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 ring-2 ring-slate-100 flex items-center justify-center text-white text-xl font-bold">
                    {p.name[0]}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="4"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-black text-sm truncate">
                    {p.name} {p.lastName}
                  </h4>
                  <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded-md">
                    <svg
                      className="w-3 h-3 text-yellow-500 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-[10px] font-bold text-yellow-700">
                      {p.rating}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 font-semibold truncate">
                  {p.areas.join(" · ")}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                  {p.location} · {p.reviews} reseñas
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Botão Favorito */}
                {currentUserId && (
                  <button
                    onClick={(e) => handleToggleFavorite(e, p.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      favorites.includes(p.id)
                        ? "bg-red-100 text-red-500"
                        : "bg-slate-100 text-slate-400 hover:text-red-400"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={favorites.includes(p.id) ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )}
                <div className="text-right">
                  <p className="font-black text-black text-lg">
                    ₡{p.price.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">
                    por sesión
                  </p>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">
                🔍
              </div>
              <p className="text-sm font-bold text-slate-400">
                No encontramos resultados
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {search
                  ? `No hay resultados para "${search}"`
                  : "Intenta con otra categoría"}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

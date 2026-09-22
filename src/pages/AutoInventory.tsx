// src/pages/AutoInventory.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigation, useBackHandler } from "../context/NavigationContext";
import { useAuth } from "../context/AuthContext";
import { useAutoInventory, Product, Transaction } from "../hooks/useAutoInventory";
import {
  Search, Package, History, ArrowLeft,
  TrendingUp, TrendingDown, Layers,
  Plus, Minus, Filter, X, Check, Clock, User,
  IndianRupee as DollarSign, Calculator, Loader2, ChevronDown,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []);
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const TOPBAR_H = 56;
const CHIPS_H = 40;

type StockFilter = "all" | "low" | "available" | "out";

const isLow = (p: Product) => p.stock > 0 && p.stock <= 10;
const isAvailable = (p: Product) => p.stock > 10;
const isOut = (p: Product) => p.stock === 0;

const matchesStock = (p: Product, f: StockFilter) => {
  switch (f) {
    case "low": return isLow(p);
    case "available": return isAvailable(p);
    case "out": return isOut(p);
    case "all": default: return true;
  }
};

const stockTone = (n: number) => {
  if (n === 0) return {
    text: "text-red-600 dark:text-red-400",
    pill: "bg-red-500 text-white",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    label: "Out",
  };
  if (n <= 10) return {
    text: "text-orange-600 dark:text-orange-400",
    pill: "bg-orange-500 text-white",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    label: "Low",
  };
  return {
    text: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-500 text-white",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "OK",
  };
};

/* ============================================================
   Sheet
   ============================================================ */
const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startT = useRef(0);

  useEffect(() => {
    if (!open) { setDragY(0); dragging.current = false; }
  }, [open]);

  const begin = (y: number) => {
    dragging.current = true;
    startY.current = y;
    startT.current = performance.now();
  };
  const move = (y: number) => {
    if (!dragging.current) return;
    const d = y - startY.current;
    if (d > 0) setDragY(d);
  };
  const end = (y: number) => {
    if (!dragging.current) return;
    const d = y - startY.current;
    const v = d / Math.max(1, performance.now() - startT.current);
    dragging.current = false;
    if (d > 120 || v > 0.5) onClose();
    else setDragY(0);
  };

  if (!open) return null;
  const backdropOpacity = Math.max(0.25, 1 - dragY / 500);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity * 0.6, transition: "opacity 150ms" }}
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 rounded-t-[28px] overflow-hidden shadow-2xl"
        style={{
          maxHeight: "92vh",
          transform: `translateY(${dragY}px)`,
          transition: dragging.current
            ? "none"
            : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          touchAction: "none",
          willChange: "transform",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onTouchStart={(e) => begin(e.touches[0].clientY)}
          onTouchMove={(e) => move(e.touches[0].clientY)}
          onTouchEnd={(e) => end(e.changedTouches[0].clientY)}
          onMouseDown={(e) => {
            begin(e.clientY);
            const mv = (ev: MouseEvent) => move(ev.clientY);
            const up = (ev: MouseEvent) => {
              end(ev.clientY);
              document.removeEventListener("mousemove", mv);
              document.removeEventListener("mouseup", up);
            };
            document.addEventListener("mousemove", mv);
            document.addEventListener("mouseup", up);
          }}
        >
          <div className="w-10 h-1.5 bg-black/25 dark:bg-white/25 rounded-full" />
        </div>

        {(title || subtitle) && (
          <div className="px-5 pb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        )}

        <div
          className="overflow-y-auto overscroll-contain"
          style={{ maxHeight: "calc(92vh - 80px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const AutoInventoryPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { user } = useAuth();

  const hook = useAutoInventory(true);
  const products         = safeArray<Product>(hook?.products);
  const displayProducts  = safeArray<Product>(hook?.displayProducts);
  const inventoryGroups  = safeArray<any>(hook?.inventoryGroups);
  const productsCostMap  = hook?.productsCostMap ?? {};
  const loading          = !!hook?.loading;
  const hasMore          = !!hook?.hasMore;
  const loadMore         = hook?.loadMore ?? (() => {});
  const adjustStockFn    = hook?.adjustStock;
  const getHistoryFn     = hook?.getProductHistory;
  const getGroupProducts = hook?.getGroupProducts ?? (() => [] as Product[]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showGroupSheet, setShowGroupSheet] = useState(false);
  const [showStockSheet, setShowStockSheet] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [chunkLoading, setChunkLoading] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adjustInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);

  const hasActiveFilters =
    !!searchTerm || !!selectedGroup || stockFilter !== "all";

  /* ---------- hardware / browser back ---------- */
  useBackHandler(showHistoryModal, () => {
    setShowHistoryModal(false);
    setSelectedProduct(null);
    setProductTransactions([]);
  });
  useBackHandler(showAdjustModal, () => {
    setShowAdjustModal(false);
    setSelectedProduct(null);
    setAdjustQuantity("");
    setAdjustNote("");
  });
  useBackHandler(showGroupSheet, () => setShowGroupSheet(false));
  useBackHandler(showStockSheet, () => setShowStockSheet(false));
  useBackHandler(showSearchInput, () => {
    setShowSearchInput(false);
    setSearchTerm("");
  });

  /* ---------- scroll hide/show ---------- */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (showSearchInput) { setShowHeader(true); return; }
      if (y < lastScrollY.current) setShowHeader(true);
      else if (y > lastScrollY.current + 12) setShowHeader(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showSearchInput]);

  /* ---------- focus search ---------- */
  useEffect(() => {
    if (showSearchInput) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [showSearchInput]);

  /* ---------- tap outside search ---------- */
  useEffect(() => {
    if (!showSearchInput) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const hdr = headerRef.current;
      if (!hdr) return;
      if (!hdr.contains(e.target as Node)) {
        setShowSearchInput(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [showSearchInput]);

  /* ---------- ESC ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showHistoryModal) {
        setShowHistoryModal(false);
        setSelectedProduct(null);
        setProductTransactions([]);
      } else if (showAdjustModal) {
        setShowAdjustModal(false);
        setSelectedProduct(null);
        setAdjustQuantity("");
        setAdjustNote("");
      } else if (showGroupSheet) setShowGroupSheet(false);
      else if (showStockSheet) setShowStockSheet(false);
      else if (showSearchInput) {
        setShowSearchInput(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    showHistoryModal, showAdjustModal,
    showGroupSheet, showStockSheet, showSearchInput,
  ]);

  /* ---------- focus adjust input ---------- */
  useEffect(() => {
    if (showAdjustModal) setTimeout(() => adjustInputRef.current?.focus(), 120);
  }, [showAdjustModal]);

  /* ---------- body scroll lock ---------- */
  useEffect(() => {
    const lock =
      showHistoryModal || showAdjustModal || showGroupSheet || showStockSheet;
    document.body.style.overflow = lock ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [showHistoryModal, showAdjustModal, showGroupSheet, showStockSheet]);

  /* ---------- filtering ---------- */
  const filteredProducts = useMemo<Product[]>(() => {
    let base: Product[] = selectedGroup
      ? safeArray<Product>(getGroupProducts(selectedGroup))
      : displayProducts;
    base = base.filter((p) => matchesStock(p, stockFilter));
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      base = base.filter(
        (p) =>
          p.productName.toLowerCase().includes(t) ||
          p.productId.toLowerCase().includes(t)
      );
    }
    return base;
  }, [displayProducts, selectedGroup, stockFilter, searchTerm, getGroupProducts]);

  const countAll = products.length;
  const countLow = products.filter(isLow).length;
  const countAvailable = products.filter(isAvailable).length;
  const countOut = products.filter(isOut).length;

  const stockFilterLabel = (f: StockFilter) => {
    switch (f) {
      case "low": return "Low";
      case "available": return "Available";
      case "out": return "Out";
      case "all": default: return "All";
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedGroup(null);
    setStockFilter("all");
  };

  const openAdjust = (p: Product, type: "add" | "reduce") => {
    setSelectedProduct(p);
    setAdjustType(type);
    setAdjustQuantity("");
    setAdjustNote("");
    setShowAdjustModal(true);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQuantity) return toast.error("Enter quantity");
    if (!adjustStockFn) return toast.error("Adjuster not ready");
    let q = parseFloat(adjustQuantity);
    if (isNaN(q) || q <= 0) return toast.error("Enter a valid quantity");
    if (adjustType === "reduce") {
      if (q > selectedProduct.stock) return toast.error("Not enough stock");
      q = -q;
    }
    const performer = user?.displayName || user?.email || user?.uid || "Unknown";
    const note = adjustNote
      ? `${adjustNote} (By: ${performer})`
      : `${q > 0 ? "Added" : "Removed"} stock (By: ${performer})`;
    try {
      await adjustStockFn(selectedProduct, q, note, performer);
      toast.success(`Stock ${q > 0 ? "added" : "removed"}`);
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQuantity("");
      setAdjustNote("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update");
    }
  };

  const openHistory = async (p: Product) => {
    if (!getHistoryFn) return;
    setSelectedProduct(p);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const txs = await getHistoryFn(p.id);
      setProductTransactions(safeArray<Transaction>(txs));
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadMoreClick = () => {
    setChunkLoading(true);
    loadMore();
    setTimeout(() => setChunkLoading(false), 350);
  };

  const spacerHeight = `calc(${TOPBAR_H}px${
    hasActiveFilters ? ` + ${CHIPS_H}px` : ""
  } + ${SAFE_TOP})`;

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          className: "dark:bg-neutral-900 dark:text-white",
          duration: 2500,
        }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-20">
        <header
          ref={headerRef as any}
          style={{ paddingTop: SAFE_TOP }}
          className={`fixed top-0 left-0 right-0 z-30
            bg-white/85 dark:bg-black/85 backdrop-blur-xl
            shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.10)]
            dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_28px_-14px_rgba(0,0,0,0.8)]
            transition-transform duration-300
            will-change-transform
            ${showHeader ? "translate-y-0" : "-translate-y-full"}`}
        >
          <div className="flex items-center px-3 gap-1.5" style={{ height: TOPBAR_H }}>
            {showSearchInput ? (
              <>
                <button
                  onClick={() => { setShowSearchInput(false); setSearchTerm(""); }}
                  className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Close search"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search fabrics…"
                    className="w-full h-10 pl-9 pr-9 rounded-full bg-gray-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 border-0"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
                      aria-label="Clear"
                    >
                      <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={goBack}
                  className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base font-bold truncate flex-1 ml-1">
                  Fabric Inventory
                </h1>

                <button
                  onClick={() => setShowSearchInput(true)}
                  className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                {inventoryGroups.length > 0 && (
                  <button
                    onClick={() => setShowGroupSheet(true)}
                    className={`relative p-2 rounded-full ${
                      selectedGroup
                        ? "bg-purple-500 text-white"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    }`}
                    aria-label="Groups"
                  >
                    <Layers className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={() => setShowStockSheet(true)}
                  className={`relative p-2 rounded-full ${
                    stockFilter !== "all"
                      ? "bg-orange-500 text-white"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
                  aria-label="Stock filter"
                >
                  <Filter className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {hasActiveFilters && (
            <div style={{ height: CHIPS_H }}>
              <div className="h-full flex items-center gap-1.5 px-3 overflow-x-auto scrollbar-hide">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="shrink-0 flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full
                      bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-medium"
                  >
                    <Search className="w-3 h-3" />
                    <span className="max-w-[140px] truncate">{searchTerm}</span>
                    <X className="w-3 h-3 opacity-60" />
                  </button>
                )}
                {selectedGroup && (
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="shrink-0 flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full
                      bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium"
                  >
                    <Layers className="w-3 h-3" />
                    <span className="max-w-[140px] truncate">
                      {inventoryGroups.find((g: any) => g.id === selectedGroup)?.name}
                    </span>
                    <X className="w-3 h-3 opacity-60" />
                  </button>
                )}
                {stockFilter !== "all" && (
                  <button
                    onClick={() => setStockFilter("all")}
                    className={`shrink-0 flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium ${
                      stockFilter === "low"
                        ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                        : stockFilter === "available"
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    }`}
                  >
                    <Filter className="w-3 h-3" />
                    <span>{stockFilterLabel(stockFilter)}</span>
                    <X className="w-3 h-3 opacity-60" />
                  </button>
                )}
                {(searchTerm ? 1 : 0) + (selectedGroup ? 1 : 0) + (stockFilter !== "all" ? 1 : 0) > 1 && (
                  <button
                    onClick={clearAllFilters}
                    className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        <div style={{ height: spacerHeight }} />

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-4 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Fabrics</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{countAll}</span>
                <span className="text-xs text-gray-500">items</span>
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Available</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                  {countAvailable}
                </span>
                <span className="text-xs text-gray-500">items</span>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium text-base mb-2">
                {searchTerm
                  ? "No fabrics found"
                  : loading
                  ? "Loading fabrics…"
                  : hasActiveFilters
                  ? "No fabrics match these filters"
                  : "No fabrics in inventory"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm mt-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                {filteredProducts.map((p) => {
                  const cost = productsCostMap[p.productId] ?? p.cost ?? 0;
                  const value = cost * p.stock;
                  const tone = stockTone(p.stock);
                  return (
                    <div
                      key={p.id}
                      onClick={() => openHistory(p)}
                      className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow cursor-pointer"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-[15px] truncate">
                              {p.productName}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-neutral-500 mt-0.5 truncate">
                              Code: {p.productId}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {p.category && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-neutral-800 rounded-lg text-[11px] text-gray-600 dark:text-gray-400">
                                  <Layers className="w-3 h-3" />
                                  {p.category}
                                </span>
                              )}
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${tone.chip}`}>
                                {tone.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-2xl font-bold tabular-nums leading-none ${tone.text}`}>
                              {p.stock.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1 uppercase tracking-wider">
                              {p.unit}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-1 border-t border-gray-100 dark:border-neutral-900">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20">
                                <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-neutral-500 font-semibold">Cost</p>
                                <p className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                                  ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(cost)}
                                  <span className="text-neutral-400 dark:text-neutral-500 font-normal"> / {p.unit}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/20">
                                <Calculator className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-neutral-500 font-semibold">Value</p>
                                <p className="text-[13px] font-semibold text-purple-600 dark:text-purple-400 tabular-nums">
                                  ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-neutral-900 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); openAdjust(p, "add"); }}
                            className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[11px] font-semibold active:scale-[0.97] transition flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openAdjust(p, "reduce"); }}
                            className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[11px] font-semibold active:scale-[0.97] transition flex items-center justify-center gap-1.5"
                          >
                            <Minus className="w-3.5 h-3.5" /> Remove
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openHistory(p); }}
                            className="flex-1 h-9 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-xl text-[11px] font-semibold active:scale-[0.97] transition flex items-center justify-center gap-1.5"
                          >
                            <History className="w-3.5 h-3.5" /> History
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && !searchTerm && !selectedGroup && stockFilter === "all" && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMoreClick}
                    disabled={chunkLoading}
                    className="px-6 py-3 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black font-medium flex items-center gap-2 active:scale-95 transition disabled:opacity-50"
                  >
                    {chunkLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Load More</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <Sheet
          open={showGroupSheet}
          onClose={() => setShowGroupSheet(false)}
          title="Filter by group"
          subtitle={selectedGroup ? "Tap to change" : "Pick a group to narrow results"}
        >
          <div className="p-5">
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => { setSelectedGroup(null); setShowGroupSheet(false); }}
                className="flex flex-col items-center"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition ${
                  !selectedGroup
                    ? "bg-purple-600 text-white ring-2 ring-purple-600 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950"
                    : "bg-gray-100 dark:bg-neutral-900 text-gray-500"
                }`}>
                  <span className="text-xs font-bold">ALL</span>
                </div>
                <span className={`text-[11px] text-center leading-tight ${
                  !selectedGroup ? "text-purple-600 font-semibold" : "text-gray-600 dark:text-gray-400"
                }`}>
                  All
                </span>
              </button>

              {inventoryGroups.map((g: any) => {
                const isSel = selectedGroup === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroup(g.id); setShowGroupSheet(false); }}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-16 h-16 rounded-full overflow-hidden mb-2 transition ${
                      isSel
                        ? "ring-2 ring-purple-600 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950"
                        : ""
                    }`}>
                      <img
                        src={g.imageUrl || "/images/group-placeholder.png"}
                        alt={g.name}
                        onError={(e) => { e.currentTarget.src = "/images/group-placeholder.png"; }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[11px] text-center leading-tight max-w-[72px] line-clamp-2 ${
                      isSel ? "text-purple-600 font-semibold" : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {g.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Sheet>

        <Sheet
          open={showStockSheet}
          onClose={() => setShowStockSheet(false)}
          title="Filter by stock"
        >
          <div className="p-4 space-y-2 pb-6">
            {(
              [
                { key: "all" as const, label: "All", sub: `${countAll} items`, tone: "neutral" },
                { key: "low" as const, label: "Low", sub: `${countLow} items · 1–10`, tone: "orange" },
                { key: "available" as const, label: "Available", sub: `${countAvailable} items · 11+`, tone: "emerald" },
                { key: "out" as const, label: "Out", sub: `${countOut} items`, tone: "red" },
              ] as const
            ).map((opt) => {
              const isSel = stockFilter === opt.key;
              const tones: Record<string, string> = {
                neutral: isSel
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200",
                orange: isSel
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300",
                emerald: isSel
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
                red: isSel
                  ? "bg-red-500 text-white"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300",
              };
              return (
                <button
                  key={opt.key}
                  onClick={() => { setStockFilter(opt.key); setShowStockSheet(false); }}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition active:scale-[0.98] ${tones[opt.tone]}`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-[15px]">{opt.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{opt.sub}</p>
                  </div>
                  {isSel && <Check className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </Sheet>

        <Sheet
          open={showAdjustModal}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedProduct(null);
            setAdjustQuantity("");
            setAdjustNote("");
          }}
          title="Adjust Stock"
          subtitle={selectedProduct?.productName}
        >
          {selectedProduct && (
            <div className="p-4">
              <div className="mb-5 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Current</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {selectedProduct.stock.toFixed(2)}
                    <span className="text-sm font-medium text-neutral-400 ml-1">
                      {selectedProduct.unit}
                    </span>
                  </p>
                </div>
                <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  selectedProduct.stock === 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : selectedProduct.stock <= 10
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}>
                  {selectedProduct.stock === 0 ? "Out" : selectedProduct.stock <= 10 ? "Low" : "Available"}
                </div>
              </div>

              <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Cost per unit</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    ₹{(productsCostMap[selectedProduct.productId] ?? selectedProduct.cost ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Current value</p>
                  <p className="text-base font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                    ₹{((productsCostMap[selectedProduct.productId] ?? selectedProduct.cost ?? 0) * selectedProduct.stock).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-2xl mb-5">
                <button
                  onClick={() => setAdjustType("add")}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition ${
                    adjustType === "add"
                      ? "bg-green-500 text-white shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
                <button
                  onClick={() => setAdjustType("reduce")}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition ${
                    adjustType === "reduce"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  <Minus className="w-4 h-4" /> Reduce
                </button>
              </div>

              <div className="mb-5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 block">
                  Quantity
                </label>
                <div className="flex gap-2">
                  <input
                    ref={adjustInputRef}
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="0"
                    className="flex-1 h-14 px-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <div className="h-14 px-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl text-sm text-neutral-500 dark:text-neutral-400 flex items-center">
                    {selectedProduct.unit}
                  </div>
                </div>
                {adjustQuantity && !isNaN(parseFloat(adjustQuantity)) && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Value impact: ₹
                    {((productsCostMap[selectedProduct.productId] ?? selectedProduct.cost ?? 0) *
                      parseFloat(adjustQuantity) *
                      (adjustType === "add" ? 1 : -1)
                    ).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 block">
                  Note (optional)
                </label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Reason for adjustment"
                  rows={2}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              <div className="flex gap-3 pb-4">
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedProduct(null);
                    setAdjustQuantity("");
                    setAdjustNote("");
                  }}
                  className="flex-1 h-14 bg-neutral-100 dark:bg-neutral-900 rounded-2xl font-semibold text-neutral-700 dark:text-neutral-300 active:scale-[0.98] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  className="flex-1 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-sm"
                >
                  <Check className="w-4 h-4" /> Confirm
                </button>
              </div>
            </div>
          )}
        </Sheet>

        <Sheet
          open={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedProduct(null);
            setProductTransactions([]);
          }}
          title="Transaction History"
          subtitle={selectedProduct?.productName}
        >
          <div className="p-4">
            {historyLoading ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-3 border-neutral-200 dark:border-neutral-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
              </div>
            ) : productTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-14 h-14 text-neutral-200 dark:text-neutral-800 mx-auto mb-3" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No transactions yet
                </p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {productTransactions.map((t) => {
                  const positive = t.quantityChange > 0;
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl"
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            positive
                              ? "bg-emerald-100 dark:bg-emerald-900/30"
                              : "bg-rose-100 dark:bg-rose-900/30"
                          }`}>
                            {positive ? (
                              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            )}
                          </div>
                          <div>
                            <div className={`text-base font-bold tabular-nums ${
                              positive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}>
                              {positive ? "+" : ""}
                              {Number(t.quantityChange).toFixed(2)}
                              <span className="text-xs font-medium text-neutral-400 ml-1">{t.unit}</span>
                            </div>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 capitalize mt-0.5">
                              {t.source}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                            {new Date(t.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short",
                            })}
                          </p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-500 tabular-nums">
                            {new Date(t.createdAt).toLocaleTimeString([], {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {t.note && (
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 p-2.5 bg-white dark:bg-neutral-950 rounded-xl mb-2">
                          {t.note}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{t.performedBy || "System"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(t.createdAt).toLocaleTimeString([], {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Sheet>
      </div>
    </>
  );
};

export default AutoInventoryPage;
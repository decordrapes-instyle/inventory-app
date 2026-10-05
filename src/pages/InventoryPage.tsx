// src/pages/InventoryPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation, useBackHandler } from "../context/NavigationContext";
import { useInventoryData } from "../hooks/useInventory";
import {
  Search, Package, History, TrendingUp, TrendingDown,
  Plus, Minus, X, Check, Clock, User,
  Filter, Layers,
  ChevronDown, Loader2, ArrowLeft, AlertCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type InventoryUnit =
  | "piece" | "meter" | "foot" | "length" | "box" | "sqft" | "pcs"
  | "kgs" | "pkt" | "roll" | "set" | "carton" | "bundle" | "dozen"
  | "kg" | "inch" | "cm" | "mm";

type StockFilter = "all" | "low" | "available" | "out";

interface Product {
  rate?: number;
  id: string;
  productId: string;
  __path?: "manualInventory" | "inventory";
  productName: string;
  stock: number;
  unit: InventoryUnit;
  imageUrl?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface Transaction {
  id: string;
  productId: string;
  productName: string;
  quantityChange: number;
  unit: InventoryUnit;
  source: "quotation" | "manual" | "purchase";
  quotationId?: string;
  purchaseId?: string;
  note?: string;
  createdAt: number;
  performedBy?: string;
}

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

const LONG_PRESS_MS = 500;

/* ============================ Sheet ============================ */
interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  zIndex?: string;
}

const Sheet: React.FC<SheetProps> = ({ open, onClose, title, subtitle, children, zIndex = "z-50" }) => {
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!open) { setDragY(0); draggingRef.current = false; }
  }, [open]);

  const begin = (y: number) => {
    draggingRef.current = true;
    startYRef.current = y;
    startTimeRef.current = performance.now();
  };
  const move = (y: number) => {
    if (!draggingRef.current) return;
    const d = y - startYRef.current;
    if (d > 0) setDragY(d);
  };
  const end = (y: number) => {
    if (!draggingRef.current) return;
    const delta = y - startYRef.current;
    const elapsed = Math.max(1, performance.now() - startTimeRef.current);
    const velocity = delta / elapsed;
    draggingRef.current = false;
    if (delta > 120 || velocity > 0.5) onClose();
    else setDragY(0);
  };

  if (!open) return null;
  const backdropOpacity = Math.max(0.25, 1 - dragY / 500);

  return (
    <div className={`fixed inset-0 ${zIndex}`}>
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity * 0.65, transition: "opacity 150ms" }}
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
        <div
          className="w-full sm:max-w-xl pointer-events-auto bg-white dark:bg-neutral-950 rounded-t-[28px] overflow-hidden shadow-2xl"
          style={{
            maxHeight: "92vh",
            transform: `translateY(${dragY}px)`,
            transition: draggingRef.current
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
            style={{ maxHeight: "calc(92vh - 60px)" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const TOPBAR_H = 56;
const CHIPS_H = 40;
const SAFE_TOP = "env(safe-area-inset-top, 0px)";

/* ============================ Card ============================ */
/**
 * Interaction model:
 *   • Single click/tap anywhere on the card  → onTap (opens Adjust sheet)
 *   • Long-press (≥500 ms) with image present → onLongPress (opens image)
 *   • Scroll / drag cancels both
 *
 * Implementation notes:
 *   - We use `onPointerDown/Up/Cancel/Leave` for the press timer because
 *     Pointer Events unify mouse, touch and pen without duplicating.
 *   - We use `onClick` for the tap because it fires exactly once per tap
 *     and the browser only fires it when the gesture was NOT a scroll.
 *   - `touch-action: manipulation` removes the 300 ms tap delay and
 *     suppresses the "ghost click" that used to close the sheet the
 *     instant it opened.
 */
/* Image session caching to eliminate loading animations for cached images */
const CACHED_IMAGES_KEY = "inv:cached_images";
const getCachedImagesSet = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(CACHED_IMAGES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};
const globalImageCache = getCachedImagesSet();

const markImageAsCached = (url?: string) => {
  if (!url || globalImageCache.has(url)) return;
  globalImageCache.add(url);
  try {
    sessionStorage.setItem(
      CACHED_IMAGES_KEY,
      JSON.stringify(Array.from(globalImageCache).slice(-1000))
    );
  } catch {}
};

const ProductCard: React.FC<{
  product: Product;
  onTap: (p: Product) => void;
  onLongPress: (p: Product) => void;
  hasImage: boolean;
}> = ({ product, onTap, onLongPress, hasImage }) => {
  const isCached = Boolean(product.imageUrl && globalImageCache.has(product.imageUrl));
  const [loaded, setLoaded] = useState(isCached);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const out = product.stock === 0;
  const low = product.stock > 0 && product.stock <= 10;

  const stockColor = out
    ? "text-red-600 dark:text-red-400"
    : low
    ? "text-orange-600 dark:text-orange-400"
    : "text-emerald-600 dark:text-emerald-400";

  const cardAccent = out
    ? "ring-2 ring-red-500/50 dark:ring-red-500/40 bg-red-50/40 dark:bg-red-950/10"
    : low
    ? "ring-2 ring-orange-500/40 dark:ring-orange-500/30 bg-orange-50/40 dark:bg-orange-950/10"
    : "border border-gray-200 dark:border-neutral-800";

  const cancelPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const startPress = () => {
    longPressed.current = false;
    cancelPress();
    if (!hasImage) return; // nothing to long-press into
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressed.current = true;
      try { (navigator as any).vibrate?.(15); } catch {}
      onLongPress(product);
    }, LONG_PRESS_MS);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If a long-press already ran, swallow the click that the browser
    // fires right after it. Otherwise treat as a normal tap.
    if (longPressed.current) {
      longPressed.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onTap(product);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap(product);
        }
      }}
      style={{ touchAction: "manipulation" }}
      className={`group relative rounded-2xl overflow-hidden flex flex-col select-none
        shadow-[0_1px_2px_rgba(0,0,0,0.03)]
        hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]
        active:scale-[0.985] transition-[transform,box-shadow] duration-150
        bg-white dark:bg-neutral-950
        ${cardAccent}`}
    >
      {/* IMAGE */}
      <div className="w-full aspect-square bg-gray-100 dark:bg-neutral-900 relative overflow-hidden">
        {hasImage ? (
          <>
            {!loaded && !isCached && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-neutral-800 animate-pulse" />
            )}
            <img
              ref={(el) => {
                if (el && el.complete && el.naturalWidth > 0 && !loaded) {
                  markImageAsCached(product.imageUrl);
                  setLoaded(true);
                }
              }}
              src={product.imageUrl}
              alt={product.productName}
              draggable={false}
              className={`w-full h-full object-cover pointer-events-none ${
                isCached || loaded
                  ? "opacity-100"
                  : "opacity-0 transition-opacity duration-150"
              }`}
              onLoad={() => {
                markImageAsCached(product.imageUrl);
                setLoaded(true);
              }}
              loading="lazy"
            />
            {out && (
              <div className="absolute inset-0 bg-red-900/20 dark:bg-red-950/30 pointer-events-none" />
            )}
            {low && (
              <div className="absolute inset-0 bg-orange-900/10 dark:bg-orange-950/20 pointer-events-none" />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300 dark:text-neutral-700" />
          </div>
        )}

        <div className="absolute top-2 left-2 max-w-[85%]">
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold
            bg-black/70 text-white backdrop-blur-sm
            dark:bg-white/85 dark:text-black truncate">
            {product.productId}
          </span>
        </div>
      </div>

      {/* BODY */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-[13px] sm:text-sm leading-snug line-clamp-2 min-h-[2.3rem] text-gray-900 dark:text-white">
          {product.productName}
        </h3>

        <div className="mt-2 sm:mt-2.5 flex items-baseline justify-between gap-1.5">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className={`text-lg sm:text-xl font-bold tabular-nums leading-none ${stockColor}`}>
              {product.stock.toFixed(2)}
            </span>
            <span className="text-[10px] font-medium text-gray-400 dark:text-neutral-500 truncate">
              {product.unit}
            </span>
          </div>

          {(out || low) && (
            <span
              className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                out
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
              }`}
            >
              {out ? "Out" : "Low"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const InventoryPage: React.FC = () => {
  const { user, initializing } = useAuth();
  const { goBack } = useNavigation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>([]);
  const [uiLoading, setUiLoading] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showGroupSheet, setShowGroupSheet] = useState(false);
  const [showStockSheet, setShowStockSheet] = useState(false);
  const [chunkLoading, setChunkLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const {
    inventoryGroups,
    loading: dataLoading,
    adjustStock,
    getProductHistory,
    displayProducts,
    loadMore,
    hasMore,
    searchProducts,
    allProducts,
  } = useInventoryData(true);

  const hasActiveFilters =
    !!searchTerm || !!selectedGroup || stockFilter !== "all";

  useBackHandler(!!previewImage, () => setPreviewImage(null));
  useBackHandler(showHistoryModal, () => {
    setShowHistoryModal(false);
    setProductTransactions([]);
    if (!showAdjustModal) {
      setSelectedProduct(null);
    }
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

  useEffect(() => {
    if (showSearchInput) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [showSearchInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewImage) {
        setPreviewImage(null);
      } else if (showHistoryModal) {
        setShowHistoryModal(false);
        setProductTransactions([]);
        if (!showAdjustModal) {
          setSelectedProduct(null);
        }
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
    previewImage, showHistoryModal, showAdjustModal,
    showGroupSheet, showStockSheet, showSearchInput,
  ]);

  useEffect(() => {
    const lock =
      !!previewImage || showHistoryModal || showAdjustModal ||
      showGroupSheet || showStockSheet;
    document.body.style.overflow = lock ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [
    previewImage, showHistoryModal, showAdjustModal,
    showGroupSheet, showStockSheet,
  ]);

  const handleStepQuantity = (delta: number) => {
    const current = parseFloat(adjustQuantity) || 0;
    const next = Math.max(0, current + delta);
    setAdjustQuantity(next === 0 ? "" : Number(next.toFixed(3)).toString());
  };

  const handleQuickAdd = (amount: number) => {
    const current = parseFloat(adjustQuantity) || 0;
    const next = current + amount;
    setAdjustQuantity(Number(next.toFixed(3)).toString());
  };

  const handleAdjustStock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProduct || !adjustQuantity) return toast.error("Enter quantity");

    let q = parseFloat(adjustQuantity);
    if (isNaN(q) || q <= 0) return toast.error("Enter a valid quantity");
    if (adjustType === "reduce") {
      if (q > selectedProduct.stock) return toast.error("Not enough stock");
      q = -q;
    }

    const performer = user?.displayName || user?.email || user?.uid || "Unknown";
    const userInfo = user?.email || user?.uid || "User";
    const note = adjustNote
      ? `${adjustNote} (${userInfo})`
      : `${q > 0 ? "Added" : "Removed"} by ${performer}`;

    try {
      await adjustStock(selectedProduct, q, note, userInfo);
      toast.success(`Stock ${q > 0 ? "added" : "removed"}`);
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQuantity("");
      setAdjustNote("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update");
    }
  };

  const handleViewHistory = async (product: Product) => {
    setSelectedProduct(product);
    setUiLoading(true);
    setShowHistoryModal(true);
    try {
      const list = await getProductHistory(product.id);
      setProductTransactions(list);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setUiLoading(false);
    }
  };

  const openAdjust = (p: Product) => {
    setSelectedProduct(p);
    setAdjustType("add");
    setAdjustQuantity("");
    setAdjustNote("");
    setShowAdjustModal(true);
  };

  const openImage = (p: Product) => {
    if (!p.imageUrl) return;
    setPreviewImage({ url: p.imageUrl, title: p.productName });
  };

  const closeImage = () => {
    setPreviewImage(null);
  };

  const getGroupProducts = useCallback(
    (groupId: string): Product[] => {
      const group = inventoryGroups.find((g) => g.id === groupId);
      if (!group) return [];
      const ids = new Set(group.items.map((i) => i.productId));
      return allProducts.filter((p) => ids.has(p.productId));
    },
    [inventoryGroups, allProducts]
  );

  const filteredProducts = (() => {
    let base: Product[] = [];
    if (searchTerm) base = searchProducts(searchTerm);
    else if (selectedGroup) base = getGroupProducts(selectedGroup);
    else base = displayProducts;
    return base.filter((p) => matchesStock(p, stockFilter));
  })();

  const countAll = allProducts.length;
  const countLow = allProducts.filter(isLow).length;
  const countAvailable = allProducts.filter(isAvailable).length;
  const countOut = allProducts.filter(isOut).length;

  const handleLoadMore = () => {
    setChunkLoading(true);
    loadMore();
    setTimeout(() => setChunkLoading(false), 300);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedGroup(null);
    setStockFilter("all");
  };

  const stockFilterLabel = (f: StockFilter) => {
    switch (f) {
      case "low": return "Low";
      case "available": return "Available";
      case "out": return "Out";
      case "all": default: return "All";
    }
  };

  const ProductSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200 dark:bg-neutral-800" />
      <div className="p-3">
        <div className="h-3.5 bg-gray-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-5 bg-gray-200 dark:bg-neutral-800 rounded w-1/2 mt-3" />
      </div>
    </div>
  );

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-3 md:p-6">
        <div className="mt-[80px] max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4">
          {Array.from({ length: 15 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center p-4">
          <img
            src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
            alt="Logo"
            className="w-24 h-24 rounded-full object-contain mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Inventory Management
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Please log in to access the dashboard.
          </p>
          <a
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const isEmpty = filteredProducts.length === 0 && !dataLoading;

  const spacerHeight = `calc(${TOPBAR_H}px${
    hasActiveFilters ? ` + ${CHIPS_H}px` : ""
  } + ${SAFE_TOP})`;

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: { background: "#1a1a1a", color: "#fff", borderRadius: 10, fontSize: 14 },
        }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24">
        <header
          ref={headerRef as any}
          style={{ paddingTop: SAFE_TOP }}
          className="fixed top-0 left-0 right-0 xl:left-64 z-30
            bg-white/85 dark:bg-black/85 backdrop-blur-xl
            shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.10)]
            dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_28px_-14px_rgba(0,0,0,0.8)]"
        >
          <div className="relative flex items-center justify-between px-3 md:px-5 gap-2" style={{ height: TOPBAR_H }}>
            {/* Mobile Header (< md): toggles search input when opened */}
            <div className="flex md:hidden items-center flex-1 gap-1.5 min-w-0">
              {showSearchInput ? (
                <>
                  <button
                    onClick={() => { setShowSearchInput(false); setSearchTerm(""); }}
                    className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    aria-label="Close search"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or code…"
                      className="w-full h-10 pl-9 pr-9 rounded-full bg-gray-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 border-0"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        aria-label="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <img
                    src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
                    alt="Logo"
                    className="w-7 h-7 rounded object-contain ml-1 shrink-0"
                  />
                  <h1 className="text-base font-bold truncate flex-1 ml-1">Inventory</h1>

                  <button
                    onClick={() => setShowSearchInput(true)}
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Tablet & Desktop Left Brand (>= md) */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0 z-10">
              <img
                src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
                alt="Logo"
                className="w-7 h-7 rounded object-contain shrink-0"
              />
              <h1 className="text-lg font-bold tracking-tight">Inventory</h1>
            </div>

            {/* Tablet & Desktop TOTAL CENTER Search Bar (>= md) */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-full max-w-sm lg:max-w-md xl:max-w-lg px-4 justify-center pointer-events-none">
              <div className="relative w-full pointer-events-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by fabric name or code…"
                  className="w-full h-10 pl-10 pr-9 rounded-full bg-gray-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 border-0"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-auto z-10">
              <button
                onClick={() => setShowGroupSheet(true)}
                className={`relative p-2 rounded-full transition ${
                  selectedGroup
                    ? "bg-purple-500 text-white"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
                }`}
                aria-label="Groups"
                title="Filter by group"
              >
                <Layers className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowStockSheet(true)}
                className={`relative p-2 rounded-full transition ${
                  stockFilter !== "all"
                    ? "bg-orange-500 text-white"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
                }`}
                aria-label="Stock filter"
                title="Filter by stock"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
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
                      {inventoryGroups.find((g) => g.id === selectedGroup)?.name}
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

        <div className="max-w-[1600px] mx-auto p-3 sm:p-5 md:p-6">
          {isEmpty ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchTerm
                  ? "No fabrics found"
                  : hasActiveFilters
                  ? "No fabrics match these filters"
                  : "No fabrics yet"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-3.5 lg:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={`${product.__path || "m"}:${product.id}`}
                    product={product}
                    hasImage={!!product.imageUrl}
                    onTap={openAdjust}
                    onLongPress={openImage}
                  />
                ))}
              </div>

              {hasMore && !searchTerm && !selectedGroup && stockFilter === "all" && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
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

              {inventoryGroups.map((group) => {
                const isSel = selectedGroup === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => { setSelectedGroup(group.id); setShowGroupSheet(false); }}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-16 h-16 rounded-full overflow-hidden mb-2 transition ${
                      isSel
                        ? "ring-2 ring-purple-600 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950"
                        : ""
                    }`}>
                      <img
                        src={group.imageUrl || "/images/group-placeholder.png"}
                        alt={group.name}
                        onError={(e) => (e.currentTarget.src = "/images/group-placeholder.png")}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[11px] text-center leading-tight max-w-[72px] line-clamp-2 ${
                      isSel ? "text-purple-600 font-semibold" : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {group.name}
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
          {selectedProduct && (() => {
            const numQty = parseFloat(adjustQuantity) || 0;
            const projectedStock =
              adjustType === "add"
                ? selectedProduct.stock + numQty
                : selectedProduct.stock - numQty;
            const isOverdraw =
              adjustType === "reduce" && numQty > selectedProduct.stock;
            const isValid =
              adjustQuantity !== "" && numQty > 0 && !isOverdraw;

            return (
              <div className="p-4 sm:p-5">
                {/* Product Reference Card with Image & Quick History Button */}
                <div className="mb-4 p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl flex items-center gap-3.5 border border-neutral-200/60 dark:border-neutral-800/80">
                  {/* Product Image Reference */}
                  <div
                    onClick={() => {
                      if (selectedProduct.imageUrl) openImage(selectedProduct);
                    }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-neutral-200 dark:bg-neutral-800 border border-black/5 dark:border-white/10 relative flex items-center justify-center ${
                      selectedProduct.imageUrl ? "cursor-pointer group active:scale-95 transition" : ""
                    }`}
                    title={selectedProduct.imageUrl ? "Tap to view full photo" : undefined}
                  >
                    {selectedProduct.imageUrl ? (
                      <>
                        <img
                          src={selectedProduct.imageUrl}
                          alt={selectedProduct.productName}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
                      </>
                    ) : (
                      <Package className="w-7 h-7 text-neutral-400 dark:text-neutral-500" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 truncate">
                        {selectedProduct.productId}
                      </span>
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        selectedProduct.stock === 0
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : selectedProduct.stock <= 10
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}>
                        {selectedProduct.stock === 0 ? "Out" : selectedProduct.stock <= 10 ? "Low" : "Available"}
                      </div>

                      {/* Quick History Button in header */}
                      <button
                        type="button"
                        onClick={() => handleViewHistory(selectedProduct)}
                        className="ml-auto px-2 py-1 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white bg-neutral-200/70 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 active:scale-95 transition shrink-0 flex items-center gap-1 text-[11px] font-semibold"
                        title="View product history"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </div>

                    <p className="font-semibold text-sm leading-tight text-neutral-900 dark:text-white truncate">
                      {selectedProduct.productName}
                    </p>

                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Current Stock:</span>
                      <span className="text-base font-bold tabular-nums text-neutral-900 dark:text-white">
                        {selectedProduct.stock.toFixed(2)}{" "}
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {selectedProduct.unit}
                        </span>
                      </span>
                      {typeof selectedProduct.rate === "number" && selectedProduct.rate > 0 && (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto tabular-nums">
                          ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(selectedProduct.rate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add / Reduce Type Toggle */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl mb-4 border border-neutral-200/50 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setAdjustType("add")}
                    className={`py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                      adjustType === "add"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("reduce")}
                    className={`py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                      adjustType === "reduce"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 ring-1 ring-rose-500"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                    <span>Reduce Stock</span>
                  </button>
                </div>

                {/* Blended Stepper & Quantity Input Area */}
                <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900/90 rounded-3xl border border-neutral-200/70 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Quantity to {adjustType === "add" ? "Add" : "Reduce"}
                    </span>
                    {numQty > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdjustQuantity("")}
                        className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Stepper Row with Blended Plus / Minus Buttons */}
                  <div className="flex items-center gap-2 bg-white dark:bg-neutral-950 p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
                    {/* Minus button */}
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(-1)}
                      disabled={!adjustQuantity || numQty <= 0}
                      className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90 transition font-bold shrink-0"
                      aria-label="Decrease by 1"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    {/* Numeric input in center */}
                    <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={adjustQuantity}
                        onChange={(e) => setAdjustQuantity(e.target.value)}
                        placeholder="0"
                        className="w-full text-center text-3xl sm:text-4xl font-extrabold tabular-nums bg-transparent text-neutral-900 dark:text-white focus:outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 -mt-0.5">
                        {selectedProduct.unit}
                      </span>
                    </div>

                    {/* Plus button */}
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(1)}
                      className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 active:scale-90 transition font-bold shrink-0"
                      aria-label="Increase by 1"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Quick Increment Chips */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/80 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 shrink-0 mr-0.5">
                      Quick:
                    </span>
                    {[1, 5, 10, 25, 50].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => handleQuickAdd(step)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 active:scale-95 transition shrink-0"
                      >
                        +{step}
                      </button>
                    ))}
                  </div>

                  {/* Live Calculation Preview */}
                  {numQty > 0 && (
                    <div className={`mt-3 p-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all ${
                      isOverdraw
                        ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                        : adjustType === "add"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40"
                        : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isOverdraw ? (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <TrendingUp className={`w-4 h-4 ${adjustType === "add" ? "text-emerald-500" : "text-blue-500"} shrink-0`} />
                        )}
                        <span>{isOverdraw ? "Exceeds Available Stock" : "Projected Total:"}</span>
                      </div>
                      <span className="font-bold tabular-nums text-sm">
                        {selectedProduct.stock.toFixed(2)} → {isOverdraw ? "Insufficient" : `${projectedStock.toFixed(2)} ${selectedProduct.unit}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Note (optional) */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block px-1">
                    Note (optional)
                  </label>
                  <textarea
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="e.g. Shipment received, sample cuts, cycle count adjustment..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none border border-neutral-200/60 dark:border-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                {/* Standout Bottom Action Bar */}
                <div className="flex items-center gap-2.5 pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustModal(false);
                      setSelectedProduct(null);
                      setAdjustQuantity("");
                      setAdjustNote("");
                    }}
                    className="w-1/3 py-3.5 px-4 rounded-2xl text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800 active:scale-[0.98] transition flex items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock()}
                    disabled={!isValid}
                    className={`w-2/3 py-3.5 px-5 rounded-2xl text-sm font-bold text-white shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed ${
                      adjustType === "add"
                        ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                        : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {numQty > 0
                        ? `${adjustType === "add" ? "Add" : "Reduce"} ${numQty} ${selectedProduct.unit}`
                        : "Done"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Sheet>

        <Sheet
          open={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setProductTransactions([]);
            if (!showAdjustModal) {
              setSelectedProduct(null);
            }
          }}
          title="Transaction History"
          subtitle={selectedProduct?.productName}
          zIndex="z-[60]"
        >
          <div className="p-4">
            {uiLoading ? (
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
                {productTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl"
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          t.quantityChange > 0
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-rose-100 dark:bg-rose-900/30"
                        }`}>
                          {t.quantityChange > 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          )}
                        </div>
                        <div>
                          <div className={`text-base font-bold tabular-nums ${
                            t.quantityChange > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}>
                            {t.quantityChange > 0 ? "+" : ""}
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
                ))}
              </div>
            )}
          </div>
        </Sheet>

        {/* Full Image Preview Modal (Rendered on top of all Sheets with z-[100]) */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 select-none"
            onClick={closeImage}
            style={{ touchAction: "manipulation" }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeImage();
              }}
              style={{ top: `calc(${SAFE_TOP} + 16px)` }}
              className="absolute right-4 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-90 transition z-10 shadow-lg"
              aria-label="Close photo"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Image Container */}
            <div
              className="max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-[92vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl pointer-events-none"
                draggable={false}
              />
            </div>

            {/* Bottom info banner */}
            <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none px-4">
              <p className="text-white font-medium text-sm drop-shadow truncate max-w-md mx-auto">
                {previewImage.title}
              </p>
              <p className="text-white/60 text-xs mt-0.5 drop-shadow">
                Tap anywhere outside to close
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InventoryPage;
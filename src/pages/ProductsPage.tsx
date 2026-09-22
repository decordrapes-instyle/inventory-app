// src/pages/ProductsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useProducts, Transaction } from "../hooks/useProducts";
import {
  ArrowLeft, History, Package, TrendingUp, TrendingDown,
  Loader2, ChevronDown, ChevronUp, Search, X,
} from "lucide-react";
import { useNavigation } from "../context/NavigationContext";

const SAFE_TOP = "env(safe-area-inset-top, 0px)";

/* ---------- helpers ---------- */
const isLow = (s: number) => s > 0 && s <= 10;
const isOut = (s: number) => s === 0;
const isAvailable = (s: number) => s > 10;

const stockTone = (s: number) => {
  if (isOut(s)) return {
    text: "text-red-600 dark:text-red-400",
    pill: "bg-red-500 text-white",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    label: "Out",
  };
  if (isLow(s)) return {
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

/* ---------- skeleton ---------- */
const ProductSkeleton = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden animate-pulse">
    <div className="p-4">
      <div className="flex justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded mb-2" />
          <div className="h-3 w-1/3 bg-gray-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="text-right">
          <div className="h-5 w-20 bg-gray-200 dark:bg-neutral-800 rounded mb-1.5" />
          <div className="h-3 w-14 bg-gray-200 dark:bg-neutral-800 rounded ml-auto" />
        </div>
      </div>
      <div className="h-9 w-full bg-gray-100 dark:bg-neutral-900 rounded-xl" />
    </div>
  </div>
);

/* ---------- main page ---------- */
const ProductsPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { products, transactions, loading, fetchAllTransactions } = useProducts();
  const [txLoading, setTxLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // load transaction history once products are ready
  useEffect(() => {
    if (!loading && products.length > 0 && Object.keys(transactions).length === 0) {
      setTxLoading(true);
      fetchAllTransactions().finally(() => setTxLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products.length]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const t = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.productName.toLowerCase().includes(t) ||
        p.productId.toLowerCase().includes(t)
    );
  }, [products, searchTerm]);

  const counts = useMemo(() => {
    let low = 0, out = 0, ok = 0;
    for (const p of products) {
      if (isOut(p.stock)) out++;
      else if (isLow(p.stock)) low++;
      else ok++;
    }
    return { low, out, ok, total: products.length };
  }, [products]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalTx = Object.values(transactions).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24">
      {/* ============== SOFT HEADER ============== */}
      <header
        style={{ paddingTop: SAFE_TOP }}
        className="fixed top-0 left-0 right-0 z-30
          bg-white/85 dark:bg-black/85 backdrop-blur-xl
          shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.10)]
          dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_28px_-14px_rgba(0,0,0,0.8)]"
      >
        <div className="h-14 flex items-center px-3 gap-1.5">
          {showSearch ? (
            <>
              <button
                onClick={() => { setShowSearch(false); setSearchTerm(""); }}
                className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                aria-label="Close search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or code…"
                  className="w-full h-10 pl-9 pr-9 rounded-full bg-gray-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 border-0"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full"
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
                Products
              </h1>
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* spacer mirrors header */}
      <div style={{ height: `calc(56px + ${SAFE_TOP})` }} />

      {/* ============== SUMMARY STRIP ============== */}
      {!loading && products.length > 0 && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold">
                Total
              </p>
              <p className="text-xl font-bold tabular-nums mt-0.5">
                {counts.total}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
              <p className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
                Low
              </p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-0.5">
                {counts.low}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
              <p className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-semibold">
                Out
              </p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-0.5">
                {counts.out}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============== LIST ============== */}
      <div className="p-4 space-y-3">
        {loading ? (
          <>
            <ProductSkeleton />
            <ProductSkeleton />
            <ProductSkeleton />
          </>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No products found
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No products match "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm"
            >
              Clear search
            </button>
          </div>
        ) : (
          filtered.map((product) => {
            const tone = stockTone(product.stock);
            const isOpen = !!expanded[product.id];
            const txCount = transactions[product.id]?.length || 0;
            const txList = transactions[product.id] || [];

            return (
              <div
                key={product.id}
                className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                {/* --- HEADER --- */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* left: package icon */}
                    <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isOut(product.stock)
                        ? "bg-red-50 dark:bg-red-950/40"
                        : isLow(product.stock)
                        ? "bg-orange-50 dark:bg-orange-950/40"
                        : "bg-emerald-50 dark:bg-emerald-950/40"
                    }`}>
                      <Package className={`w-5 h-5 ${
                        isOut(product.stock)
                          ? "text-red-600 dark:text-red-400"
                          : isLow(product.stock)
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`} />
                    </div>

                    {/* middle: name + code */}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
                        {product.productName}
                      </h2>
                      <p className="text-[11px] text-gray-500 dark:text-neutral-500 mt-0.5 truncate">
                        {product.productId}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone.chip}`}>
                          {tone.label}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-neutral-500">
                          Updated{" "}
                          {new Date(product.lastupdatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* right: big stock number */}
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-bold tabular-nums leading-none ${tone.text}`}>
                        {product.stock}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1 uppercase tracking-wider">
                        {product.unit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* --- EXPAND BUTTON --- */}
                <button
                  onClick={() => toggleExpand(product.id)}
                  className="w-full flex items-center justify-between px-4 h-10 border-t border-gray-100 dark:border-neutral-900
                    text-[12px] font-semibold text-gray-700 dark:text-gray-300
                    hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Transaction History
                    {txCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] tabular-nums text-neutral-600 dark:text-neutral-300">
                        {txCount}
                      </span>
                    )}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* --- EXPANDED HISTORY --- */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-neutral-900 bg-neutral-50/60 dark:bg-neutral-900/30">
                    {txLoading ? (
                      <div className="py-8 flex flex-col items-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500 dark:text-neutral-400">
                          Loading transactions…
                        </p>
                      </div>
                    ) : txList.length === 0 ? (
                      <div className="py-8 flex flex-col items-center">
                        <History className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-2" />
                        <p className="text-xs text-gray-500 dark:text-neutral-400">
                          No transactions yet
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {txList.map((t: Transaction) => {
                          const positive = t.quantityChange > 0;
                          return (
                            <div
                              key={t.id}
                              className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-gray-100 dark:border-neutral-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                                    positive
                                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                                      : "bg-rose-100 dark:bg-rose-900/30"
                                  }`}>
                                    {positive ? (
                                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className={`font-bold text-sm tabular-nums ${
                                      positive
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                    }`}>
                                      {positive ? "+" : ""}
                                      {Number(t.quantityChange).toFixed(2)}
                                      <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 ml-1">
                                        {t.unit}
                                      </span>
                                    </div>
                                    {t.note && (
                                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                                        {t.note}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
                                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                  </p>
                                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                                    {new Date(t.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* subtle footer note when there are transactions loaded */}
        {!loading && totalTx > 0 && (
          <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-600 pt-4">
            {totalTx} total transaction{totalTx === 1 ? "" : "s"} across {products.length} product{products.length === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
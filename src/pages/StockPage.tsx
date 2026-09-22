// src/pages/StockPage.tsx
import React from "react";
import { useStockData } from "../hooks/useStockData";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Box,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  ClipboardList,
  IndianRupee,
  BarChart3,
} from "lucide-react";
import { useNavigation } from "../context/NavigationContext";

const SAFE_TOP = "env(safe-area-inset-top, 0px)";

/* ---------- helpers ---------- */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

/* ============================================================
   Page
   ============================================================ */
const StockPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { analytics, loading } = useStockData();

  const avgPerItem = analytics.totalItems
    ? analytics.totalValue / analytics.totalItems
    : 0;

  const netPositive = analytics.todayNetChange >= 0;

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
          <button
            onClick={goBack}
            className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold truncate flex-1 ml-1">
            Stock Analytics
          </h1>
          <div className="pr-2">
            <BarChart3 className="w-5 h-5 text-neutral-400" />
          </div>
        </div>
      </header>

      {/* spacer mirrors header */}
      <div style={{ height: `calc(56px + ${SAFE_TOP})` }} />

      {/* ============== CONTENT ============== */}
      <div className="p-4 space-y-4">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* ---------- HERO: Total Stock Value ---------- */}
            <div
              className="relative overflow-hidden rounded-3xl p-5
                bg-gradient-to-br from-neutral-900 to-neutral-800
                dark:from-neutral-950 dark:to-neutral-900
                text-white
                shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_20px_40px_-20px_rgba(0,0,0,0.4)]"
            >
              {/* subtle radial glow */}
              <div
                className="absolute -top-20 -right-16 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, #6366f1 0%, transparent 70%)",
                }}
              />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-white/60">
                    Total Stock Value
                  </p>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[10px] font-medium">
                    <IndianRupee className="w-3 h-3" />
                    INR
                  </div>
                </div>

                <p className="mt-2 text-[34px] leading-tight font-bold tabular-nums tracking-tight">
                  {formatCurrency(analytics.totalValue)}
                </p>

                <div className="mt-4 h-px bg-white/10" />

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/80">
                      <Layers className="w-3.5 h-3.5" />
                      Inventory
                    </div>
                    <p className="mt-1 text-[15px] font-semibold tabular-nums text-white">
                      {formatCurrency(analytics.inventoryValue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-amber-300/80">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Manual
                    </div>
                    <p className="mt-1 text-[15px] font-semibold tabular-nums text-white">
                      {formatCurrency(analytics.manualValue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- Inventory / Manual split ---------- */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Inventory
                  </span>
                </div>
                <p className="text-lg font-bold tabular-nums leading-tight">
                  {formatCurrency(analytics.inventoryValue)}
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <Box className="w-3 h-3" />
                  {formatNumber(analytics.inventoryCount)} items
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Manual
                  </span>
                </div>
                <p className="text-lg font-bold tabular-nums leading-tight">
                  {formatCurrency(analytics.manualValue)}
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  <ShoppingBag className="w-3 h-3" />
                  {formatNumber(analytics.manualCount)} items
                </div>
              </div>
            </div>

            {/* ---------- TODAY ---------- */}
            <div className="rounded-3xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="font-semibold text-[14px]">Today</h2>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long" })}
                </span>
              </div>

              <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-neutral-900 border-t border-gray-100 dark:border-neutral-900">
                {/* Added */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                      Added
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 leading-tight">
                    {formatCurrency(analytics.todayAddedValue)}
                  </p>
                </div>

                {/* Reduced */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">
                      Reduced
                    </span>
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <p className="text-[15px] font-bold tabular-nums text-rose-600 dark:text-rose-400 leading-tight">
                    {formatCurrency(analytics.todayReducedValue)}
                  </p>
                </div>

                {/* Net */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold ${
                        netPositive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      Net
                    </span>
                    {netPositive ? (
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                  </div>
                  <p
                    className={`text-[15px] font-bold tabular-nums leading-tight ${
                      netPositive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {netPositive ? "+" : "−"}
                    {formatCurrency(Math.abs(analytics.todayNetChange))}
                  </p>
                </div>
              </div>
            </div>

            {/* ---------- QUICK STATS ---------- */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  Total Units
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
                  {formatNumber(Math.round(analytics.totalUnits))}
                </p>
                <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                  across {formatNumber(analytics.totalItems)} items
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  Avg / Item
                </p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
                  {formatCurrency(avgPerItem)}
                </p>
                <p className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                  total value ÷ items
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   Skeleton
   ============================================================ */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    {/* hero */}
    <div className="rounded-3xl bg-neutral-200 dark:bg-neutral-900 h-44" />

    {/* split */}
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-neutral-200 dark:bg-neutral-900 h-28" />
      <div className="rounded-2xl bg-neutral-200 dark:bg-neutral-900 h-28" />
    </div>

    {/* today */}
    <div className="rounded-3xl bg-neutral-200 dark:bg-neutral-900 h-32" />

    {/* quick stats */}
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-neutral-200 dark:bg-neutral-900 h-24" />
      <div className="rounded-2xl bg-neutral-200 dark:bg-neutral-900 h-24" />
    </div>
  </div>
);

export default StockPage;
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
} from "lucide-react";
import { useNavigation } from "../context/NavigationContext";

const StockPage: React.FC = () => {
  const { goBack } = useNavigation();
  const { analytics, loading } = useStockData();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-IN").format(value);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="pt-safe sticky top-0 z-20 bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stock Analytics
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-6 dark:bg-black">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading analytics…</p>
          </div>
        ) : (
          <>
            {/* ===== Summary Cards ===== */}
            <div className="space-y-4">
              <div className="rounded-2xl p-5 bg-slate-900 text-white shadow-sm dark:bg-neutral-950 dark:border dark:border-neutral-800">
                {/* Context */}
                <p className="text-xs uppercase tracking-wide opacity-70">
                  Total Stock Value
                </p>

                {/* Hero Value */}
                <p className="mt-1 text-3xl font-semibold leading-tight">
                  {formatCurrency(analytics.totalValue)}
                </p>

                {/* Divider */}
                <div className="my-4 h-px bg-white/10" />

                {/* Breakdown */}
                <div className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Layers className="w-4 h-4" />
                      Inventory
                    </span>
                    <span className="font-medium">
                      {formatCurrency(analytics.inventoryValue)}
                    </span>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="flex items-center justify-end gap-1 text-slate-400">
                      <ClipboardList className="w-4 h-4" />
                      Manual
                    </span>
                    <span className="font-medium">
                      {formatCurrency(analytics.manualValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory + Manual - SAME ROW */}
              <div className="grid grid-cols-2 gap-4">
                {/* Inventory */}
                <div className="rounded-2xl p-4 bg-white border border-gray-200 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
                  <div className="flex justify-between mb-1">
                    <Layers className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      INVENTORY
                    </span>
                  </div>

                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(analytics.inventoryValue)}
                  </p>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <Box className="inline w-3 h-3 mr-1" />
                    {analytics.inventoryCount} items
                  </div>
                </div>

                {/* Manual */}
                <div className="rounded-2xl p-4 bg-white border border-gray-200 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
                  <div className="flex justify-between mb-1">
                    <ClipboardList className="w-5 h-5 text-amber-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      MANUAL
                    </span>
                  </div>

                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(analytics.manualValue)}
                  </p>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <ShoppingBag className="inline w-3 h-3 mr-1" />
                    {analytics.manualCount} items
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Today ===== */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-gray-200 dark:border-neutral-800">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Today
                  </h2>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex justify-between text-xs text-emerald-700">
                    Added <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <p className="mt-2 font-semibold">
                    {formatCurrency(analytics.todayAddedValue)}
                  </p>
                </div>

                <div className="rounded-xl p-3 bg-rose-50 dark:bg-rose-900/20">
                  <div className="flex justify-between text-xs text-rose-700">
                    Reduced <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <p className="mt-2 font-semibold">
                    {formatCurrency(analytics.todayReducedValue)}
                  </p>
                </div>

                <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex justify-between text-xs">
                    Net{" "}
                    {analytics.todayNetChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="mt-2 font-semibold">
                    {formatCurrency(Math.abs(analytics.todayNetChange))}
                  </p>
                </div>
              </div>
            </div>

            {/* ===== Quick Stats ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-gray-200 dark:border-neutral-800">
                <p className="text-xs text-gray-500 mb-1">Total Units</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(Math.round(analytics.totalUnits))}
                </p>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-gray-200 dark:border-neutral-800">
                <p className="text-xs text-gray-500 mb-1">Avg. Value / Item</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(
                    analytics.totalItems
                      ? analytics.totalValue / analytics.totalItems
                      : 0
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockPage;

// src/hooks/useStockData.ts
import { useEffect, useState, useCallback, useMemo } from "react";
import { database } from "../config/firebase";
import { loadFirebase } from "../config/firebaseLoader";
import { cache } from "../lib/cache";

const { ref, onValue } = await loadFirebase();

export interface StockProduct {
  id: string;
  name: string;
  stock: number;
  rate?: number;
  cost?: number;
  imageUrl?: string;
  timestamp: number;
  source: "inventory" | "manual";
  originalId: string;
  productId?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: "add" | "remove" | "adjust" | "update";
  quantity: number;
  quantityChange?: number;
  previousQuantity?: number;
  rate?: number;
  previousRate?: number;
  timestamp: number;
  createdAt: number;
  remarks?: string;
  source?: "inventory" | "manual";
}

interface AnalyticsData {
  totalValue: number;
  totalItems: number;
  totalUnits: number;
  todayAddedValue: number;
  todayReducedValue: number;
  todayNetChange: number;
  todayAddedUnits: number;
  todayReducedUnits: number;
  todayNetUnits: number;
  inventoryCount: number;
  manualCount: number;
  inventoryValue: number;
  manualValue: number;
  recentProducts: StockProduct[];
  recentTransactions: InventoryTransaction[];
}

const S_KEY = "stockData";
const T_KEY = "stockTx";

export function useStockData() {
  const [stockData, setStockData] = useState<StockProduct[]>(
    () => cache.get<StockProduct[]>(S_KEY) ?? []
  );
  const [allTransactions, setAllTransactions] = useState<InventoryTransaction[]>(
    () => cache.get<InventoryTransaction[]>(T_KEY) ?? []
  );
  const [loading, setLoading] = useState(() => !cache.get(S_KEY));

  const getTodayRange = useCallback(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const startOfDay = t.getTime();
    return { startOfDay, endOfDay: startOfDay + 86400000 };
  }, []);

  // Transactions — read from quotations/inventoryTransactions
  useEffect(() => {
    const txRef = ref(database, "quotations/inventoryTransactions");
    const unsub = onValue(txRef, (snap) => {
      if (!snap.exists()) {
        setAllTransactions([]);
        cache.set(T_KEY, []);
        return;
      }
      const list: InventoryTransaction[] = [];
      snap.forEach((productNode) => {
        const pid = productNode.key!;
        productNode.forEach((txNode) => {
          const t: any = txNode.val();
          const rawQtyChange =
            typeof t.quantityChange === "number"
              ? t.quantityChange
              : typeof t.quantity === "number"
              ? t.quantity
              : 0;
          const determinedType =
            t.type || (rawQtyChange > 0 ? "add" : rawQtyChange < 0 ? "remove" : "update");
          list.push({
            id: `${pid}_${txNode.key}`,
            productId: t.productId || pid,
            productName: t.productName || "Unknown Product",
            type: determinedType,
            quantity: Math.abs(rawQtyChange),
            quantityChange: rawQtyChange,
            previousQuantity: t.previousQuantity,
            rate: typeof t.rate === "number" ? t.rate : undefined,
            previousRate: t.previousRate,
            timestamp: t.timestamp || t.createdAt || Date.now(),
            createdAt: t.createdAt || t.timestamp || Date.now(),
            remarks: t.remarks || t.note,
            source: t.source,
          });
        });
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      setAllTransactions(list);
      cache.set(T_KEY, list);
    });
    return () => unsub();
  }, []);

  // Inventory + manual inventory + product rates
  useEffect(() => {
    let invList: StockProduct[] = [];
    let manualList: StockProduct[] = [];
    let productsMap: Record<string, any> = {};
    let a = false, b = false, c = false;

    const commit = () => {
      if (!(a && b && c)) return;
      const inv = invList.map((p) => {
        const info =
          productsMap[p.originalId] ||
          (p.productId ? productsMap[p.productId] : null) ||
          {};
        const rate = p.rate || info.rate || info.cost || 0;
        const cost = p.cost || info.cost || info.rate || 0;
        return { ...p, rate, cost };
      });
      const combined = [...inv, ...manualList].sort((x, y) => y.timestamp - x.timestamp);
      setStockData(combined);
      cache.set(S_KEY, combined);
      setLoading(false);
    };

    const u1 = onValue(ref(database, "quotations/inventory"), (snap) => {
      invList = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const v: any = child.val();
          const r = v.rate ?? v.cost ?? 0;
          invList.push({
            id: `inventory_${child.key}`,
            name: v.productName || v.name || "Unnamed",
            stock: typeof v.stock === "number" ? v.stock : 0,
            rate: r,
            cost: v.cost ?? v.rate ?? r,
            imageUrl: v.imageUrl,
            timestamp: v.timestamp || v.modifiedAt || v.createdAt || Date.now(),
            source: "inventory",
            originalId: child.key!,
            productId: v.productId || child.key!,
          });
        });
      }
      a = true;
      commit();
    });

    const u2 = onValue(ref(database, "quotations/manualInventory"), (snap) => {
      manualList = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          const v: any = child.val();
          const r = v.rate ?? v.cost ?? 0;
          manualList.push({
            id: `manual_${child.key}`,
            name: v.productName || v.name || "Unnamed",
            stock: typeof v.stock === "number" ? v.stock : 0,
            rate: r,
            cost: v.cost ?? v.rate ?? r,
            imageUrl: v.imageUrl,
            timestamp: v.timestamp || v.modifiedAt || v.createdAt || Date.now(),
            source: "manual",
            originalId: child.key!,
            productId: v.productId || child.key!,
          });
        });
      }
      b = true;
      commit();
    });

    const u3 = onValue(ref(database, "quotations/products"), (snap) => {
      const map: Record<string, any> = {};
      if (snap.exists()) {
        snap.forEach((child) => {
          const v = child.val() || {};
          const r = v.rate ?? v.cost ?? 0;
          const entry = { ...v, rate: r, cost: r };
          map[child.key!] = entry;
          if (v.productId) map[v.productId] = entry;
          if (v.name) map[v.name.toLowerCase().trim()] = entry;
          if (v.productName) map[v.productName.toLowerCase().trim()] = entry;
        });
      }
      productsMap = map;
      c = true;
      commit();
    });

    return () => { u1(); u2(); u3(); };
  }, []);

  const analytics = useMemo<AnalyticsData>(() => {
    let inventoryValue = 0;
    let manualValue = 0;
    for (const p of stockData) {
      const v = p.stock * (p.rate || 0);
      if (p.source === "inventory") inventoryValue += v;
      else manualValue += v;
    }
    const totalValue = inventoryValue + manualValue;
    const totalItems = stockData.length;
    const totalUnits = stockData.reduce((s, p) => s + p.stock, 0);
    const inventoryCount = stockData.filter((p) => p.source === "inventory").length;
    const manualCount = stockData.filter((p) => p.source === "manual").length;

    // Build price lookup map from stockData and productsMap
    const priceLookup = new Map<string, number>();
    for (const p of stockData) {
      if (p.rate && p.rate > 0) {
        if (p.id) priceLookup.set(p.id, p.rate);
        if (p.originalId) priceLookup.set(p.originalId, p.rate);
        if (p.productId) priceLookup.set(p.productId, p.rate);
        if (p.name) priceLookup.set(p.name.toLowerCase().trim(), p.rate);
      }
    }

    const { startOfDay, endOfDay } = getTodayRange();
    let todayAddedValue = 0;
    let todayReducedValue = 0;
    let todayAddedUnits = 0;
    let todayReducedUnits = 0;

    for (const t of allTransactions) {
      const ts = t.timestamp || t.createdAt || 0;
      if (ts < startOfDay || ts > endOfDay) continue;

      const rate =
        typeof t.rate === "number" && t.rate > 0
          ? t.rate
          : priceLookup.get(t.productId) ??
            priceLookup.get(t.productName?.toLowerCase()?.trim()) ??
            0;

      const qty = Math.abs(t.quantityChange ?? t.quantity ?? 0);
      const v = qty * rate;

      const isAdd =
        t.type === "add" ||
        (t.quantityChange !== undefined
          ? t.quantityChange > 0
          : t.type === "adjust" && t.quantity > 0);
      const isRemove =
        t.type === "remove" ||
        (t.quantityChange !== undefined
          ? t.quantityChange < 0
          : t.type === "adjust" && t.quantity < 0);

      if (isAdd) {
        todayAddedValue += v;
        todayAddedUnits += qty;
      } else if (isRemove) {
        todayReducedValue += v;
        todayReducedUnits += qty;
      }
    }

    return {
      totalValue,
      totalItems,
      totalUnits,
      todayAddedValue,
      todayReducedValue,
      todayNetChange: todayAddedValue - todayReducedValue,
      todayAddedUnits,
      todayReducedUnits,
      todayNetUnits: todayAddedUnits - todayReducedUnits,
      inventoryCount,
      manualCount,
      inventoryValue,
      manualValue,
      recentProducts: [...stockData].sort((x, y) => y.timestamp - x.timestamp).slice(0, 8),
      recentTransactions: allTransactions.slice(0, 10),
    };
  }, [stockData, allTransactions, getTodayRange]);

  const refreshData = useCallback(() => { /* realtime keeps fresh */ }, []);

  return { analytics, loading, stockData, transactions: allTransactions, refreshData };
}
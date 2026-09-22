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
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: "add" | "remove" | "adjust" | "update";
  quantity: number;
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

  // Transactions — read from the CORRECT path (plural).
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
          list.push({
            id: `${pid}_${txNode.key}`,
            productId: pid,
            productName: t.productName || "Unknown Product",
            type: t.type || "update",
            quantity: t.quantity ?? t.quantityChange ?? 0,
            previousQuantity: t.previousQuantity,
            rate: t.rate,
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
        const info = productsMap[p.originalId] || {};
        return { ...p, rate: info.rate || info.cost || 0, cost: info.cost || info.rate || 0 };
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
          invList.push({
            id: `inventory_${child.key}`,
            name: v.productName || v.name || "Unnamed",
            stock: v.stock || 0,
            rate: 0,
            cost: 0,
            imageUrl: v.imageUrl,
            timestamp: v.timestamp || v.modifiedAt || v.createdAt || Date.now(),
            source: "inventory",
            originalId: child.key!,
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
          manualList.push({
            id: `manual_${child.key}`,
            name: v.productName || v.name || "Unnamed",
            stock: v.stock || 0,
            rate: v.rate || 0,
            cost: v.cost || v.rate || 0,
            imageUrl: v.imageUrl,
            timestamp: v.timestamp || v.modifiedAt || v.createdAt || Date.now(),
            source: "manual",
            originalId: child.key!,
          });
        });
      }
      b = true;
      commit();
    });

    const u3 = onValue(ref(database, "quotations/products"), (snap) => {
      productsMap = snap.exists() ? snap.val() : {};
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

    const { startOfDay, endOfDay } = getTodayRange();
    let todayAddedValue = 0;
    let todayReducedValue = 0;

    for (const t of allTransactions) {
      if (t.timestamp < startOfDay || t.timestamp > endOfDay) continue;
      const v = Math.abs(t.quantity) * (t.rate || 0);
      if (t.type === "add" || (t.type === "adjust" && t.quantity > 0)) todayAddedValue += v;
      else if (t.type === "remove" || (t.type === "adjust" && t.quantity < 0)) todayReducedValue += v;
    }

    return {
      totalValue,
      totalItems,
      totalUnits,
      todayAddedValue,
      todayReducedValue,
      todayNetChange: todayAddedValue - todayReducedValue,
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
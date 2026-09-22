// src/hooks/useInventory.ts
import { useState, useEffect, useCallback } from "react";
import { database } from "../config/firebase";
import { loadFirebase } from "../config/firebaseLoader";
import { cache } from "../lib/cache";

const { ref, onValue, get, update, push, set } = await loadFirebase();

type InventoryUnit =
  | "piece" | "meter" | "foot" | "length" | "box" | "sqft" | "pcs"
  | "kgs" | "pkt" | "roll" | "set" | "carton" | "bundle" | "dozen"
  | "kg" | "inch" | "cm" | "mm";

export interface Product {
  id: string;
  productId: string;
  /** which Firebase path this product came from — used by adjustStock */
  __path?: "manualInventory" | "inventory";
  rate?: number;
  productName: string;
  stock: number;
  unit: InventoryUnit;
  imageUrl?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryGroup {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  items: Array<{
    productId: string;
    productName: string;
    unit: InventoryUnit;
    addedAt: number;
    inventoryType: "product" | "manual";
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
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

const PRODUCTS_KEY = "inv:mergedProducts";
const GROUPS_KEY = "inv:groups";
const CHUNK_INITIAL = 24;
const CHUNK_STEP = 24;

export const useInventoryData = (enableChunkedLoading = true) => {
  const [products, setProducts] = useState<Product[]>(
    () => cache.get<Product[]>(PRODUCTS_KEY) ?? []
  );
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>(
    () => cache.get<InventoryGroup[]>(GROUPS_KEY) ?? []
  );
  const [loading, setLoading] = useState(
    () => !cache.get<Product[]>(PRODUCTS_KEY)
  );
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(CHUNK_INITIAL);

  useEffect(() => {
    const manualRef = ref(database, "quotations/manualInventory");
    const autoRef = ref(database, "quotations/inventory");
    const groupsRef = ref(database, "quotations/inventoryGrp");

    let manualList: Product[] = [];
    let autoList: Product[] = [];
    let manualReady = false;
    let autoReady = false;

    const commit = () => {
      if (!manualReady || !autoReady) return;
      // manualInventory entries win on productId collision
      const map = new Map<string, Product>();
      for (const p of manualList) map.set(p.productId || p.id, p);
      for (const p of autoList) {
        const key = p.productId || p.id;
        if (!map.has(key)) map.set(key, p);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );
      setProducts(merged);
      cache.set(PRODUCTS_KEY, merged);
      setLoading(false);
    };

    const normalize = (
      snap: any,
      path: "manualInventory" | "inventory"
    ): Product[] => {
      const list: Product[] = [];
      if (!snap.exists()) return list;
      snap.forEach((child: any) => {
        const v: any = child.val() || {};
        list.push({
          id: child.key!,
          __path: path,
          productId: v.productId || child.key!,
          productName: v.productName || "Unnamed Product",
          stock: typeof v.stock === "number" ? v.stock : 0,
          unit: v.unit || "pcs",
          rate: v.rate ?? v.cost,
          imageUrl: v.imageUrl,
          notes: v.notes,
          createdAt: v.createdAt || 0,
          updatedAt: v.updatedAt || 0,
        });
      });
      return list;
    };

    const unsubManual = onValue(
      manualRef,
      (snap) => {
        manualList = normalize(snap, "manualInventory");
        manualReady = true;
        commit();
      },
      (err) => {
        console.error("[inv] manual listener", err);
        manualReady = true;
        commit();
      }
    );

    const unsubAuto = onValue(
      autoRef,
      (snap) => {
        autoList = normalize(snap, "inventory");
        autoReady = true;
        commit();
      },
      (err) => {
        console.error("[inv] auto listener", err);
        autoReady = true;
        commit();
      }
    );

    const unsubGroups = onValue(
      groupsRef,
      (snap) => {
        const list: InventoryGroup[] = [];
        if (snap.exists()) {
          snap.forEach((child: any) => {
            const g: any = { id: child.key!, ...(child.val() || {}) };
            if (!Array.isArray(g.items)) return;
            const manual = g.items.filter(
              (i: any) => i?.inventoryType === "manual"
            );
            if (manual.length === 0) return;
            list.push({ ...g, items: manual });
          });
        }
        setInventoryGroups(list);
        cache.set(GROUPS_KEY, list);
      },
      (err) => console.error("[inv] groups listener", err)
    );

    return () => {
      unsubManual();
      unsubAuto();
      unsubGroups();
    };
  }, []);

  const displayProducts = enableChunkedLoading
    ? products.slice(0, displayLimit)
    : products;
  const hasMore = enableChunkedLoading && products.length > displayLimit;

  const loadMore = useCallback(() => setDisplayLimit((p) => p + CHUNK_STEP), []);

  const searchProducts = useCallback(
    (term: string) => {
      if (!term.trim()) return products;
      const t = term.toLowerCase();
      return products.filter(
        (p) =>
          p.productName.toLowerCase().includes(t) ||
          p.productId.toLowerCase().includes(t)
      );
    },
    [products]
  );

  const adjustStock = useCallback(
    async (
      product: Product,
      quantityChange: number,
      note: string,
      performedBy: string
    ) => {
      const path = product.__path || "manualInventory";
      const productRef = ref(database, `quotations/${path}/${product.id}`);
      const snap = await get(productRef);
      const cur = snap.val();
      if (!cur) throw new Error("Product not found");
      const newStock = (cur.stock || 0) + quantityChange;
      if (newStock < 0) throw new Error("Stock cannot be negative");

      const txRef = push(
        ref(database, `quotations/inventoryTransactions/${product.id}`)
      );
      await set(txRef, {
        productId: product.productId,
        productName: product.productName,
        quantityChange,
        unit: product.unit,
        source: "manual",
        note,
        performedBy,
        createdAt: Date.now(),
      });
      await update(productRef, { stock: newStock, updatedAt: Date.now() });
    },
    []
  );

  const getProductHistory = useCallback(
    async (productId: string): Promise<Transaction[]> => {
      const snap = await get(
        ref(database, `quotations/inventoryTransactions/${productId}`)
      );
      if (!snap.exists()) return [];
      const out: Transaction[] = [];
      snap.forEach((c: any) => {
        out.push({ id: c.key!, ...c.val() });
      });
      return out.sort((a, b) => b.createdAt - a.createdAt);
    },
    []
  );

  const refreshData = useCallback(async () => {}, []);

  return {
    products,
    inventoryGroups,
    loading,
    error,
    adjustStock,
    getProductHistory,
    refreshData,
    displayProducts,
    loadMore,
    hasMore,
    searchProducts,
    allProducts: products,
  };
};

export const cleanupInventoryListeners = () => {
  /* realtime handles itself */
};
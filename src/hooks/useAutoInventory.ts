import { useState, useEffect, useCallback } from "react";
import { database } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { loadFirebase } from "../config/firebaseLoader";
import { cache } from "../lib/cache";
import toast from "react-hot-toast";

const { ref, push, set, get, update, onValue } = await loadFirebase();

type InventoryUnit =
  | "piece" | "meter" | "foot" | "length" | "box" | "sqft" | "pcs"
  | "kgs" | "pkt" | "roll" | "set" | "carton" | "bundle" | "dozen"
  | "kg" | "inch" | "cm" | "mm";

export interface Product {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  cost?: number | null;
  unit: InventoryUnit;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  category?: string;
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

const P_KEY = "autoInv";
const G_KEY = "autoGrp";
const C_KEY = "autoCost";
const CHUNK_INITIAL = 24;
const CHUNK_STEP = 24;

const safeArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []);

export function useAutoInventory(enableChunkedLoading = true) {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>(() =>
    safeArray<Product>(cache.get(P_KEY))
  );
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>(() =>
    safeArray<InventoryGroup>(cache.get(G_KEY))
  );
  const [productsCostMap, setProductsCostMap] = useState<Record<string, number>>(
    () => cache.get<Record<string, number>>(C_KEY) ?? {}
  );
  const [loading, setLoading] = useState(
    () => !cache.get(P_KEY)
  );
  const [displayLimit, setDisplayLimit] = useState(CHUNK_INITIAL);

  useEffect(() => {
    const productsRef = ref(database, "quotations/inventory");
    const groupsRef = ref(database, "quotations/inventoryGrp");
    const productsCostRef = ref(database, "quotations/products");

    const unsubProducts = onValue(
      productsRef,
      (snap) => {
        const list: Product[] = [];
        if (snap.exists()) {
          snap.forEach((child) => {
            const v: any = child.val() || {};
            list.push({
              id: child.key!,
              productId: v.productId || child.key!,
              productName: v.productName || "Unnamed Product",
              stock: typeof v.stock === "number" ? v.stock : 0,
              unit: v.unit || "pcs",
              cost: v.cost ?? null,
              notes: v.notes,
              category: v.category,
              createdAt: v.createdAt || 0,
              updatedAt: v.updatedAt || 0,
            });
          });
          list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        }
        setProducts(list);
        cache.set(P_KEY, list);
        setLoading(false);
      },
      (err) => {
        console.error("[auto-inv] products", err);
        toast.error("Failed to load products");
        setLoading(false);
      }
    );

    const unsubCosts = onValue(
      productsCostRef,
      (snap) => {
        const map: Record<string, number> = {};
        if (snap.exists()) {
          snap.forEach((child) => {
            const v: any = child.val();
            if (v && typeof v.cost === "number") map[child.key!] = v.cost;
          });
        }
        setProductsCostMap(map);
        cache.set(C_KEY, map);
      },
      (err) => console.error("[auto-inv] costs", err)
    );

    const unsubGroups = onValue(
      groupsRef,
      (snap) => {
        const list: InventoryGroup[] = [];
        if (snap.exists()) {
          snap.forEach((child) => {
            const g: any = { id: child.key!, ...(child.val() || {}) };
            if (!Array.isArray(g.items)) return;
            if (!g.items.some((i: any) => i?.inventoryType === "product")) return;
            list.push(g);
          });
        }
        setInventoryGroups(list);
        cache.set(G_KEY, list);
      },
      (err) => console.error("[auto-inv] groups", err)
    );

    return () => {
      unsubProducts();
      unsubCosts();
      unsubGroups();
    };
  }, []);

  const displayProducts = enableChunkedLoading
    ? products.slice(0, displayLimit)
    : products;

  const hasMore = enableChunkedLoading && products.length > displayLimit;

  const loadMore = useCallback(
    () => setDisplayLimit((p) => p + CHUNK_STEP),
    []
  );

  const adjustStock = useCallback(
    async (
      product: Product,
      quantityChange: number,
      note: string,
      performedBy: string
    ) => {
      const productRef = ref(database, `quotations/inventory/${product.id}`);
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

  const getProductHistory = useCallback(async (productId: string) => {
  const snap = await get(
    ref(database, `quotations/inventoryTransactions/${productId}`)
  );
  if (!snap.exists()) return [] as Transaction[];
  const out: Transaction[] = [];
  snap.forEach((c) => {
    out.push({ id: c.key!, ...c.val() });
  });
  return out.sort((a, b) => b.createdAt - a.createdAt);
}, []);

  const getGroupProducts = useCallback(
    (groupId: string): Product[] => {
      const group = inventoryGroups.find((g) => g.id === groupId);
      if (!group || !Array.isArray(group.items)) return [];
      const ids = new Set(
        group.items
          .filter((i) => i?.inventoryType === "product")
          .map((i) => i.productId)
      );
      return products.filter((p) => ids.has(p.productId));
    },
    [inventoryGroups, products]
  );

  return {
    products,
    displayProducts,
    hasMore,
    loadMore,
    inventoryGroups,
    productsCostMap,
    loading,
    adjustStock,
    getProductHistory,
    getGroupProducts,
    allProducts: products,
  };
}
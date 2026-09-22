// src/hooks/useProducts.ts
import { useState, useEffect } from "react";
import { database } from "../config/firebase";
import { loadFirebase } from "../config/firebaseLoader";
import { cache } from "../lib/cache";
import toast from "react-hot-toast";

const { ref, onValue } = await loadFirebase();

export interface Product {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  unit: string;
  lastupdatedAt: number;
}

export interface Transaction {
  id: string;
  productId: string;
  productName: string;
  quantityChange: number;
  unit: string;
  source: "quotation" | "manual" | "purchase";
  quotationId?: string;
  purchaseId?: string;
  note?: string;
  createdAt: number;
}

const P_KEY = "products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(
    () => cache.get<Product[]>(P_KEY) ?? []
  );
  const [transactions, setTransactions] = useState<{ [k: string]: Transaction[] }>({});
  const [loading, setLoading] = useState(() => !cache.get<Product[]>(P_KEY));

  useEffect(() => {
    const productsRef = ref(database, "quotations/manualInventory");

    const unsub = onValue(productsRef, (snap) => {
      if (!snap.exists()) {
        setProducts([]);
        cache.set(P_KEY, []);
        setLoading(false);
        return;
      }
      const list: Product[] = [];
      snap.forEach((child) => {
        const v: any = child.val();
        list.push({
          id: child.key!,
          productId: v.productId || child.key!,
          productName: v.productName || "Unknown Product",
          stock: v.stock || 0,
          unit: v.unit || "piece",
          lastupdatedAt: v.updatedAt || v.createdAt || Date.now(),
        });
      });
      setProducts(list);
      cache.set(P_KEY, list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Transactions are lazy-loaded by the page when it needs them.
  // Keeping them out of the mount path is what makes this tab snap.
  const fetchAllTransactions = async () => {
    const { get } = await loadFirebase();
    const map: { [k: string]: Transaction[] } = {};
    await Promise.all(
      products.map(async (p) => {
        const snap = await get(
          ref(database, `quotations/inventoryTransactions/${p.id}`)
        );
        if (!snap.exists()) { map[p.id] = []; return; }
        const arr: Transaction[] = [];
        snap.forEach((c) => arr.push({ id: c.key!, ...c.val() }));
        map[p.id] = arr.sort((a, b) => b.createdAt - a.createdAt);
      })
    );
    setTransactions(map);
    return map;
  };

  return { products, transactions, loading, fetchAllTransactions };
}
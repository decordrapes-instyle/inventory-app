// src/hooks/useInventoryData.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { database } from "../config/firebase";
import { loadFirebase } from "../config/firebaseLoader";
const { ref, onValue, get, update, push, set } = await loadFirebase();
// import { isValid } from "date-fns";


type InventoryUnit =
  | "piece"
  | "meter"
  | "foot"
  | "length"
  | "box"
  | "sqft"
  | "pcs"
  | "kgs"
  | "pkt"
  | "roll"
  | "set"
  | "carton"
  | "bundle"
  | "dozen"
  | "kg"
  | "inch"
  | "cm"
  | "mm";

interface Product {
  id: string;
  productId: string;
  rate?: number;
  productName: string;
  stock: number;
  unit: InventoryUnit;
  imageUrl?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface InventoryGroup {
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

// Add these to the existing return type interface
interface UseInventoryDataReturn {
  products: Product[];
  inventoryGroups: InventoryGroup[];
  loading: boolean;
  error: string | null;
  adjustStock: (
    productId: string,
    productName: string,
    quantityChange: number,
    unit: InventoryUnit,
    note: string,
    performedBy: string
  ) => Promise<void>;
  getProductHistory: (productId: string) => Promise<Transaction[]>;
  refreshData: () => Promise<void>;
  // Add search function
  searchProducts: (searchTerm: string) => Product[];
  // Add this
  allProducts: Product[];
}

// Configuration
const CHUNK_SIZE = 30; // Load 30 items initially
const CHUNK_INCREMENT = 20; // Load 20 more items each time
const INITIAL_LOAD_DELAY = 2000; // 2 seconds before loading more

// Simple memory cache
const memoryCache = {
  products: null as Product[] | null,
  groups: null as InventoryGroup[] | null,
  lastUpdated: 0,
  loadedChunks: 0,
  displayLimit: CHUNK_SIZE,
  isValid: false, // Add isValid property
};

// Track listeners
let isListening = false;
let unsubscribeCallbacks: Array<() => void> = [];

export const useInventoryData = (enableChunkedLoading = true): UseInventoryDataReturn & { 
  loadMore: () => void;
  hasMore: boolean;
  displayProducts: Product[];
  searchProducts: (searchTerm: string) => Product[];
  allProducts: Product[];

} => {
  const [products, setProducts] = useState<Product[]>(() => {
    if (memoryCache.products) {
      return memoryCache.products;
    }
    return [];
  });
  
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>(() => {
    if (memoryCache.groups) {
      return memoryCache.groups;
    }
    return [];
  });
  
  const [loading, setLoading] = useState(() => !memoryCache.isValid);
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(() => 
    enableChunkedLoading ? memoryCache.displayLimit : Infinity
  );
  const [chunkLoading, setChunkLoading] = useState(false);
  
  const mountedRef = useRef(true);
  const initialLoadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate products to display
  const displayProducts = enableChunkedLoading 
    ? products.slice(0, displayLimit)
    : products;

  const hasMore = enableChunkedLoading && products.length > displayLimit;

  // Setup realtime listeners
  useEffect(() => {
    mountedRef.current = true;

    const setupListeners = () => {
      if (isListening) {
        // Already listening, just update from cache
        if (memoryCache.products) {
          setProducts(memoryCache.products);
        }
        if (memoryCache.groups) {
          setInventoryGroups(memoryCache.groups);
        }
        setLoading(false);
        return;
      }

      isListening = true;
      
      // Only show loading on initial app load
      if (!memoryCache.products || !memoryCache.groups) {
        setLoading(true);
      }

      try {
        // Products listener
        const productsRef = ref(database, "quotations/manualInventory");
        const productsUnsubscribe = onValue(
          productsRef,
          (snapshot) => {
            if (!mountedRef.current) return;

            if (snapshot.exists()) {
              const data = snapshot.val();
              const productsList = Object.entries(data).map(([key, value]: any) => ({
                id: key,
                ...value,
              }));
              
              // Sort by most recent update
              productsList.sort((a, b) => b.updatedAt - a.updatedAt);
              
              setProducts(productsList);
              memoryCache.products = productsList;
              memoryCache.lastUpdated = Date.now();
              
              // Reset display limit when new products come in
              if (enableChunkedLoading) {
                setDisplayLimit(CHUNK_SIZE);
                memoryCache.displayLimit = CHUNK_SIZE;
              }
            } else {
              setProducts([]);
              memoryCache.products = [];
              memoryCache.lastUpdated = Date.now();
            }
            
            setLoading(false);
          },
          (err) => {
            console.error("Error in products listener:", err);
            if (mountedRef.current) {
              setError("Failed to sync products in realtime");
              setLoading(false);
            }
          }
        );

        // Groups listener
        const groupsRef = ref(database, "quotations/inventoryGrp");
        const groupsUnsubscribe = onValue(
          groupsRef,
          (snapshot) => {
            if (!mountedRef.current) return;

            if (snapshot.exists()) {
              const groupsData = snapshot.val();
              const groupsList = Object.entries(groupsData)
                .map(([key, value]: any) => ({
                  id: key,
                  ...value,
                }))
                .filter((group: InventoryGroup) =>
                  group.items.some((item) => item.inventoryType === "manual")
                )
                .map((group: InventoryGroup) => ({
                  ...group,
                  items: group.items.filter(
                    (item) => item.inventoryType === "manual"
                  ),
                }));

              setInventoryGroups(groupsList);
              memoryCache.groups = groupsList;
              memoryCache.lastUpdated = Date.now();
            } else {
              setInventoryGroups([]);
              memoryCache.groups = [];
              memoryCache.lastUpdated = Date.now();
            }
            
            setLoading(false);
          },
          (err) => {
            console.error("Error in groups listener:", err);
            if (mountedRef.current) {
              setError("Failed to sync groups in realtime");
              setLoading(false);
            }
          }
        );

        unsubscribeCallbacks.push(productsUnsubscribe, groupsUnsubscribe);
      } catch (err) {
        console.error("Error setting up listeners:", err);
        if (mountedRef.current) {
          setError("Failed to initialize inventory data");
          setLoading(false);
        }
      }
    };

    // Delay setup to prevent blocking main thread
    const timer = setTimeout(() => {
      setupListeners();
    }, 50);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
    };
  }, [enableChunkedLoading]);

  // Auto-load more chunks after initial load
  useEffect(() => {
    if (!enableChunkedLoading || !hasMore || loading) return;

    // Clear any existing timers
    if (initialLoadTimerRef.current) {
      clearTimeout(initialLoadTimerRef.current);
    }

    // Load first chunk automatically after 2 seconds
    initialLoadTimerRef.current = setTimeout(() => {
      if (mountedRef.current && hasMore && !chunkLoading) {
        loadMore();
      }
    }, INITIAL_LOAD_DELAY);

    return () => {
      if (initialLoadTimerRef.current) {
        clearTimeout(initialLoadTimerRef.current);
      }
    };
  }, [enableChunkedLoading, hasMore, loading]);

  // Load more products function
  const loadMore = useCallback(() => {
    if (!enableChunkedLoading || !hasMore || chunkLoading) return;

    setChunkLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      if (mountedRef.current) {
        const newLimit = Math.min(
          displayLimit + CHUNK_INCREMENT,
          products.length
        );
        setDisplayLimit(newLimit);
        memoryCache.displayLimit = newLimit;
        setChunkLoading(false);
      }
    }, 300);
  }, [enableChunkedLoading, displayLimit, hasMore, chunkLoading, products.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (initialLoadTimerRef.current) {
        clearTimeout(initialLoadTimerRef.current);
      }
      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current);
      }
    };
  }, []);

  const adjustStock = useCallback(
    async (
      productId: string,
      productName: string,
      quantityChange: number,
      unit: InventoryUnit,
      note: string,
      performedBy: string
    ): Promise<void> => {
      try {
        const productRef = ref(database, `quotations/manualInventory/${productId}`);
        const snapshot = await get(productRef);
        const currentProduct = snapshot.val();

        if (!currentProduct) {
          throw new Error("Product not found");
        }

        const currentStock = currentProduct.stock || 0;
        const newStock = currentStock + quantityChange;

        // Create transaction
        const transactionRef = push(
          ref(database, `quotations/inventoryTransactions/${productId}`)
        );
        const transactionData = {
          productId: productId,
          productName: productName,
          quantityChange: quantityChange,
          unit: unit,
          source: "manual",
          note: note,
          performedBy: performedBy,
          createdAt: Date.now(),
        };

        await set(transactionRef, transactionData);
        await update(productRef, {
          stock: newStock,
          updatedAt: Date.now(),
        });

        // Update local cache
        if (memoryCache.products) {
          const updatedProducts = memoryCache.products.map((p) =>
            p.id === productId
              ? { ...p, stock: newStock, updatedAt: Date.now() }
              : p
          );
          memoryCache.products = updatedProducts;
          setProducts(updatedProducts);
        }
        
      } catch (err: any) {
        console.error("Transaction error:", err);
        throw new Error("Failed to update stock");
      }
    },
    []
  );

  const getProductHistory = useCallback(async (productId: string): Promise<Transaction[]> => {
    try {
      const transactionsRef = ref(
        database,
        `quotations/inventoryTransactions/${productId}`
      );
      const snapshot = await get(transactionsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const transactionsList = Object.entries(data)
          .map(([key, value]: any) => ({
            id: key,
            ...value,
          }))
          .sort((a: Transaction, b: Transaction) => b.createdAt - a.createdAt);
        return transactionsList;
      } else {
        return [];
      }
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      throw new Error("Failed to load history");
    }
  }, []);
  const searchProducts = useCallback((searchTerm: string): Product[] => {
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter((product) =>
      product.productName.toLowerCase().includes(term) ||
      product.productId.toLowerCase().includes(term)
    );
  }, [products]);


  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Invalidate cache
      memoryCache.products = null;
      memoryCache.groups = null;
      
      const productsRef = ref(database, "quotations/manualInventory");
      const groupsRef = ref(database, "quotations/inventoryGrp");
      
      const [productsSnapshot, groupsSnapshot] = await Promise.all([
        get(productsRef),
        get(groupsRef)
      ]);

      if (productsSnapshot.exists()) {
        const data = productsSnapshot.val();
        const productsList = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        setProducts(productsList);
        memoryCache.products = productsList;
      }

      if (groupsSnapshot.exists()) {
        const groupsData = groupsSnapshot.val();
        const groupsList = Object.entries(groupsData)
          .map(([key, value]: any) => ({
            id: key,
            ...value,
          }))
          .filter((group: InventoryGroup) =>
            group.items.some((item) => item.inventoryType === "manual")
          )
          .map((group: InventoryGroup) => ({
            ...group,
            items: group.items.filter(
              (item) => item.inventoryType === "manual"
            ),
          }));

        setInventoryGroups(groupsList);
        memoryCache.groups = groupsList;
      }
    } catch (err: any) {
      console.error("Error refreshing data:", err);
      setError("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, []);

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
  console.log('Cleaning up inventory listeners...');
  unsubscribeCallbacks.forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (err) {
      console.warn('Error unsubscribing:', err);
    }
  });
  unsubscribeCallbacks = [];
  isListening = false;
  memoryCache.products = null;
  memoryCache.groups = null;
  memoryCache.displayLimit = CHUNK_SIZE;
};
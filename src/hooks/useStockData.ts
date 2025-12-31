import { useEffect, useState, useCallback, useMemo } from "react";
import { database } from "../config/firebase";
import { onValue, ref } from "firebase/database";

export interface StockProduct {
  id: string;
  name: string;
  stock: number;
  rate?: number;
  cost?: number;
  imageUrl?: string;
  timestamp: number;
  source: 'inventory' | 'manual';
  originalId: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'add' | 'remove' | 'adjust' | 'update';
  quantity: number;
  previousQuantity?: number;
  rate?: number;
  previousRate?: number;
  timestamp: number;
  createdAt: number;
  remarks?: string;
  source?: 'inventory' | 'manual';
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


interface UseStockDataReturn {
  analytics: AnalyticsData;
  loading: boolean;
  stockData: StockProduct[];
  transactions: InventoryTransaction[];
  refreshData: () => void;
}

export function useStockData(): UseStockDataReturn {
  const [stockData, setStockData] = useState<StockProduct[]>([]);
  const [allTransactions, setAllTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Get today's date range (start of day to now)
  const getTodayRange = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    return { startOfDay, endOfDay };
  }, []);

  // Fetch all transactions for analytics
  const fetchAllTransactions = useCallback(() => {
    const transactionsRef = ref(database, "quotations/inventoryTransaction");
    
    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const transactionsList: InventoryTransaction[] = [];
        
        // Loop through all products
        Object.entries(data).forEach(([productId, productTransactions]: [string, any]) => {
          if (productTransactions) {
            // Loop through all transactions for this product
            Object.entries(productTransactions).forEach(([firebaseKey, transactionData]: [string, any]) => {
              if (transactionData) {
                transactionsList.push({
                  id: `${productId}_${firebaseKey}`,
                  productId,
                  productName: transactionData.productName || "Unknown Product",
                  type: transactionData.type || 'update',
                  quantity: transactionData.quantity || 0,
                  previousQuantity: transactionData.previousQuantity,
                  rate: transactionData.rate,
                  previousRate: transactionData.previousRate,
                  timestamp: transactionData.timestamp || transactionData.createdAt || Date.now(),
                  createdAt: transactionData.createdAt || transactionData.timestamp || Date.now(),
                  remarks: transactionData.remarks,
                  source: transactionData.source,
                });
              }
            });
          }
        });
        
        // Sort by timestamp descending (newest first)
        transactionsList.sort((a, b) => b.timestamp - a.timestamp);
        setAllTransactions(transactionsList);
      } else {
        setAllTransactions([]);
      }
    });

    return unsubscribe;
  }, []);

  const fetchInventoryData = useCallback(() => {
    const inventoryRef = ref(database, "quotations/inventory");
    const manualInventoryRef = ref(database, "quotations/manualInventory");
    const productsRef = ref(database, "quotations/products");

    let inventoryLoaded = false;
    let manualLoaded = false;
    let productsLoaded = false;
    
    let inventoryData: StockProduct[] = [];
    let manualData: StockProduct[] = [];
    let productsData: Record<string, any> = {};

    const checkAndUpdate = () => {
      if (inventoryLoaded && manualLoaded && productsLoaded) {
        // Process inventory items with rates from products
        const processedInventoryData = inventoryData.map(item => {
          const productInfo = productsData[item.originalId] || {};
          return {
            ...item,
            rate: productInfo.rate || productInfo.cost || 0,
            cost: productInfo.cost || productInfo.rate || 0,
          };
        });

        const combined = [...processedInventoryData, ...manualData]
          .sort((a, b) => b.timestamp - a.timestamp);
        setStockData(combined);
        setLoading(false);
      }
    };

    const unsubscribeInventory = onValue(inventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        inventoryData = Object.entries(data).map(([id, product]: [string, any]) => ({
          id: `inventory_${id}`,
          name: product.productName || product.name || "Unnamed Product",
          stock: product.stock || 0,
          rate: 0, // Will be filled from products data
          cost: 0, // Will be filled from products data
          imageUrl: product.imageUrl,
          timestamp: product.timestamp || product.modifiedAt || product.createdAt || Date.now(),
          source: 'inventory' as const,
          originalId: id,
        }));
      } else {
        inventoryData = [];
      }
      inventoryLoaded = true;
      checkAndUpdate();
    });

    const unsubscribeManual = onValue(manualInventoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        manualData = Object.entries(data).map(([id, product]: [string, any]) => ({
          id: `manual_${id}`,
          name: product.productName || product.name || "Unnamed Product",
          stock: product.stock || 0,
          rate: product.rate || 0,
          cost: product.cost || product.rate || 0,
          imageUrl: product.imageUrl,
          timestamp: product.timestamp || product.modifiedAt || product.createdAt || Date.now(),
          source: 'manual' as const,
          originalId: id,
        }));
      } else {
        manualData = [];
      }
      manualLoaded = true;
      checkAndUpdate();
    });

    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        productsData = data;
      } else {
        productsData = {};
      }
      productsLoaded = true;
      checkAndUpdate();
    });

    return () => {
      unsubscribeInventory();
      unsubscribeManual();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    const unsubscribeInventory = fetchInventoryData();
    const unsubscribeTransactions = fetchAllTransactions();

    return () => {
      unsubscribeInventory();
      unsubscribeTransactions();
    };
  }, [fetchInventoryData, fetchAllTransactions]);

  // Calculate analytics data
  const analytics = useMemo((): AnalyticsData => {
    if (loading) {
      return {
        totalValue: 0,
        totalItems: 0,
        totalUnits: 0,
        todayAddedValue: 0,
        todayReducedValue: 0,
        todayNetChange: 0,
        inventoryCount: 0,
        manualCount: 0,
        inventoryValue: 0, // NEW
        manualValue: 0, // NEW
        recentProducts: [],
        recentTransactions: [],
      };
    }
     // Calculate separate values
    let inventoryValue = 0;
    let manualValue = 0;
    stockData.forEach(product => {
    const productValue = product.stock * (product.rate || 0);
    if (product.source === 'inventory') {
      inventoryValue += productValue;
    } else {
      manualValue += productValue;
    }
  });
  
    // Calculate totals using rate for value calculation
    const totalValue = stockData.reduce((acc, product) => 
      acc + (product.stock * (product.rate || 0)), 0
    );
    
    const totalItems = stockData.length;
    const totalUnits = stockData.reduce((acc, product) => acc + product.stock, 0);
    
    const inventoryCount = stockData.filter(p => p.source === 'inventory').length;
    const manualCount = stockData.filter(p => p.source === 'manual').length;

    // Get today's transactions
    const { startOfDay, endOfDay } = getTodayRange();
    const todayTransactions = allTransactions.filter(
      t => t.timestamp >= startOfDay && t.timestamp <= endOfDay
    );

    // Calculate today's added and reduced values
    let todayAddedValue = 0;
    let todayReducedValue = 0;

    todayTransactions.forEach(transaction => {
      const transactionValue = Math.abs(transaction.quantity) * (transaction.rate || 0);
      
      if (transaction.type === 'add') {
        todayAddedValue += transactionValue;
      } else if (transaction.type === 'remove') {
        todayReducedValue += transactionValue;
      } else if (transaction.type === 'adjust') {
        // For adjustments, we need to check if it's positive or negative
        if (transaction.quantity > 0) {
          todayAddedValue += transactionValue;
        } else {
          todayReducedValue += Math.abs(transactionValue);
        }
      }
    });

    const todayNetChange = todayAddedValue - todayReducedValue;

    // Get recent products (top 8 by modification date)
    const recentProducts = [...stockData]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);

    // Get recent transactions (top 10)
    const recentTransactions = allTransactions.slice(0, 10);

    return {
      totalValue,
      totalItems,
      totalUnits,
      todayAddedValue,
      todayReducedValue,
      todayNetChange,
      inventoryCount,
      manualCount,
      recentProducts,
      inventoryValue, // NEW
      manualValue, // NEW
      recentTransactions,
    };
  }, [stockData, allTransactions, loading, getTodayRange]);

  const refreshData = useCallback(() => {
    setLoading(true);
    // Re-fetch both data sources
    fetchInventoryData();
    fetchAllTransactions();
  }, [fetchInventoryData, fetchAllTransactions]);

  return {
    analytics,
    loading,
    stockData,
    transactions: allTransactions,
    refreshData,
  };
}

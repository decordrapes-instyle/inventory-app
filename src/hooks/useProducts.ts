
import { useState, useEffect } from 'react';
import { database } from '../config/firebase';
import toast from 'react-hot-toast';
import { loadFirebase } from '../config/firebaseLoader';
const { ref, onValue, get } = await loadFirebase();

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
  source: 'quotation' | 'manual' | 'purchase';
  quotationId?: string;
  purchaseId?: string;
  note?: string;
  createdAt: number;
  cls?: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<{[key: string]: Transaction[]}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = ref(database, 'quotations/manualInventory');
    setLoading(true);

    const fetchProducts = async () => {
      try {
        const snapshot = await get(productsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const productsList: Product[] = Object.entries(data).map(([key, value]: any) => ({
            id: key,
            productId: value.productId || key,
            productName: value.productName || 'Unknown Product',
            stock: value.stock || 0,
            unit: value.unit || 'piece',
            lastupdatedAt: value.updatedAt || value.createdAt || Date.now(),
          }));
          setProducts(productsList);
          fetchTransactionsForAllProducts(productsList);
        } else {
          setProducts([]);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading products:', err);
        toast.error('Failed to load products');
        setLoading(false);
      }
    };

    const fetchTransactionsForAllProducts = async (products: Product[]) => {
        const transactionsData: {[key: string]: Transaction[]} = {};
        for (const product of products) {
            try {
                const transactionsRef = ref(database, `quotations/inventoryTransactions/${product.id}`);
                const snapshot = await get(transactionsRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const transactionsList = Object.entries(data)
                        .map(([key, value]: any) => ({
                        id: key,
                        ...value,
                        }))
                        .sort((a: Transaction, b: Transaction) => b.createdAt - a.createdAt);
                    transactionsData[product.id] = transactionsList;
                } else {
                    transactionsData[product.id] = [];
                }
            } catch (err: any) {
                console.error(`Error loading transactions for product ${product.id}:`, err);
                toast.error(`Failed to load transaction history for ${product.productName}`);
            }
        }
        setTransactions(transactionsData);
        setLoading(false);
    }

    fetchProducts();
    
    const unsubscribe = onValue(productsRef, (_snapshot) => {
      fetchProducts();
    });

    return () => unsubscribe();
  }, []);

  return { products, transactions, loading };
}

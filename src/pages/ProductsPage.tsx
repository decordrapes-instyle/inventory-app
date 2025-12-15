// src/pages/ProductsPage.tsx
import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../config/firebase';
import { ArrowLeft, History, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  unit: string;
  lastupdatedAt: number;
}

interface Transaction {
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
  performedBy?: string;
}

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-900 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Product Overview</h1>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No products found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map(product => (
              <div key={product.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white">{product.productName}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">ID: {product.productId}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{product.stock} {product.unit}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: {new Date(product.lastupdatedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Transaction History</h3>
                    {transactions[product.id] && transactions[product.id].length > 0 ? (
                        <div className="space-y-2">
                            {transactions[product.id].map(transaction => (
                                <div key={transaction.id} className="p-3 bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {transaction.quantityChange > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                                            <span className="font-medium text-gray-800 dark:text-gray-200">{transaction.quantityChange > 0 ? '+' : ''}{transaction.quantityChange} {transaction.unit}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(transaction.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                    {transaction.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">{transaction.note}</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <History className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No transaction history for this product.</p>
                        </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;

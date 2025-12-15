// src/pages/InventoryLog.tsx
import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  Search, Package, History, 
  ArrowLeft, Image as ImageIcon,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type InventoryUnit = 'piece' | 'meter' | 'foot' | 'length' | 'box' | 'sqft' | 'pcs' | 'kgs' | 'pkt' | 'roll' | 'set' | 'carton' | 'bundle' | 'dozen' | 'kg' | 'inch' | 'cm' | 'mm';

interface Product {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  unit: InventoryUnit;
  imageUrl?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface Transaction {
  id:string;
  productId: string;
  productName: string;
  quantityChange: number;
  unit: InventoryUnit;
  source: 'quotation' | 'manual' | 'purchase';
  quotationId?: string;
  purchaseId?: string;
  note?: string;
  createdAt: number;
  performedBy?: string;
}

const InventoryLog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = ref(database, 'quotations/inventory');
    
    const unsubscribe = onValue(
      productsRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const productsList = Object.entries(data).map(([key, value]: any) => ({
            id: key,
            productId: value.productId || key,
            productName: value.productName || 'Unknown Product',
            stock: value.stock || 0,
            unit: value.unit || 'piece',
            imageUrl: value.imageUrl,
            notes: value.notes,
            createdAt: value.createdAt || Date.now(),
            updatedAt: value.updatedAt || Date.now(),
          }));
          setProducts(productsList);
        } else {
          setProducts([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading products:', error);
        toast.error('Failed to load products');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleViewHistory = async (product: Product) => {
    setSelectedProduct(product);
    setLoading(true);
    
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
        setProductTransactions(transactionsList);
      } else {
        setProductTransactions([]);
      }
      
      setShowHistoryModal(true);
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading inventory log...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-900 dark:text-white',
        }}
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
        {/* Search Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-900 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 border-transparent focus:border-blue-500 dark:focus:border-blue-600 rounded-xl focus:outline-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="p-4">
          {filteredProducts.length === 0 ? (
            <div className="w-full text-center py-12">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{searchTerm ? 'No products found' : 'No products in inventory log'}</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-600 transition-all duration-300 flex flex-col"
                >
                  <div className="h-32 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate flex-grow">{product.productName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {product.productId}</p>
                    
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock</span>
                            <span className={`text-sm font-bold ${
                                product.stock > 10 
                                ? 'text-green-600 dark:text-green-400'
                                : product.stock > 0
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>{product.stock} {product.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div className={`h-2 rounded-full ${
                                product.stock > 10 
                                ? 'bg-green-500'
                                : product.stock > 0
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }`} style={{width: `${product.stock > 100 ? 100 : product.stock}%`}}></div>
                        </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => handleViewHistory(product)}
                        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <History className="w-4 h-4" />
                        View History
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History Modal - Mobile Style */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 w-full md:max-w-lg md:rounded-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedProduct(null);
                    setProductTransactions([]);
                  }}
                  className="p-2 text-gray-500 dark:text-gray-400"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">Transaction History</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{selectedProduct.productName}</p>
                </div>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading transactions...</p>
                  </div>
                ) : productTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${transaction.quantityChange > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                              {transaction.quantityChange > 0 ? (
                                <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-lg text-gray-900 dark:text-white">
                                {`${transaction.quantityChange > 0 ? '+' : ''}${Number(transaction.quantityChange).toFixed(2)} ${transaction.unit}`}

                              </span>
                              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">Via {transaction.source}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(transaction.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        
                        {transaction.note && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                            {transaction.note}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            By: {transaction.performedBy || 'System'}
                          </span>
                          {(transaction.quotationId || transaction.purchaseId) && (
                            <span className="text-gray-600 dark:text-gray-400 text-xs">
                              Ref: {transaction.quotationId || transaction.purchaseId}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default InventoryLog;

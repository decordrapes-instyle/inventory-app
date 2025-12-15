// src/pages/AutoInventory.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, push, set, get, update, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  Search, Package, History, 
  TrendingUp, TrendingDown, ArrowLeft
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

const AutoInventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'reduce'>('add');

  useEffect(() => {
    setLoading(true);
    const productsRef = ref(database, 'quotations/inventory');

    const listener = onValue(productsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const productList: Product[] = Object.entries(data).map(([key, value]: any) => ({
                id: key,
                productId: value.productId || '',
                productName: value.productName || 'Unnamed Product',
                stock: value.stock || 0,
                unit: value.unit || 'pcs',
                createdAt: value.createdAt || 0,
                updatedAt: value.updatedAt || 0,
            })).sort((a, b) => b.updatedAt - a.updatedAt);
            setProducts(productList);
        } else {
            setProducts([]);
        }
        setLoading(false);
    }, (error) => {
        console.error("Firebase error:", error);
        toast.error("Failed to load products in real-time.");
        setLoading(false);
    });

    return () => {
        off(productsRef, 'value', listener);
    };
  }, []);

  useEffect(() => {
    if (showHistoryModal || showAdjustModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showHistoryModal, showAdjustModal]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQuantity) {
      toast.error('Please enter a quantity');
      return;
    }

    try {
      let quantityChange = parseFloat(adjustQuantity);
      
      if (isNaN(quantityChange) || quantityChange <= 0) {
        toast.error('Please enter a valid positive quantity');
        return;
      }

      if (adjustType === 'reduce') {
        quantityChange = -quantityChange;
      }

      const productRef = ref(database, `quotations/inventory/${selectedProduct.id}`);
      const snapshot = await get(productRef);
      const currentProduct = snapshot.val();
      
      if (!currentProduct) {
        toast.error('Product not found');
        return;
      }

      const currentStock = currentProduct.stock || 0;
      const newStock = currentStock + quantityChange;

      if (newStock < 0) {
        toast.error('Stock cannot be negative');
        return;
      }

      const userInfo = user ? (user.displayName && user.email || user.uid) : 'Unknown User';
      const finalNote = adjustNote ? 
        `${adjustNote} (By: ${userInfo})` : 
        `${quantityChange > 0 ? 'Added' : 'Removed'} stock (By: ${userInfo})`;

      const transactionRef = push(ref(database, `quotations/inventoryTransactions/${selectedProduct.id}`));
      const transactionData = {
        productId: selectedProduct.productId,
        productName: selectedProduct.productName,
        quantityChange: quantityChange,
        unit: selectedProduct.unit,
        source: 'manual',
        note: finalNote,
        performedBy: userInfo,
        createdAt: Date.now(),
      };

      await set(transactionRef, transactionData);
      await update(productRef, {
        stock: newStock,
        updatedAt: Date.now(),
      });

      toast.success(`Stock ${quantityChange > 0 ? 'added' : 'removed'} successfully`);
      
      setShowAdjustModal(false);
      setAdjustQuantity('');
      setAdjustNote('');
      setSelectedProduct(null);
    } catch (err: any) {
      console.error('Transaction error:', err);
      toast.error(err.message || 'Failed to record transaction');
    }
  };

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
          <p className="text-gray-600 dark:text-gray-400">Loading auto inventory...</p>
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
      
      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-20">
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
              <p className="text-gray-500 dark:text-gray-400">{searchTerm ? 'No products found' : 'No products in auto inventory'}</p>
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
                  onClick={() => handleViewHistory(product)}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-600 transition-all duration-300 flex flex-col cursor-pointer"
                >
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
                            }`}>{product.stock.toFixed(2)} {product.unit}</span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          setShowAdjustModal(true);
                        }}
                        className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adjust Stock Modal - Mobile Style */}
        {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={() => setShowAdjustModal(false)}>
            <div className="bg-white dark:bg-gray-900 w-full md:max-w-md md:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedProduct(null);
                    setAdjustQuantity('');
                    setAdjustNote('');
                  }}
                  className="p-2 text-gray-500 dark:text-gray-400"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Adjust Stock</h2>
              </div>

              <div className="p-4">
                {/* Product Info */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{selectedProduct.productName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">ID: {selectedProduct.productId}</p>
                      <div className="mt-2">
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                          selectedProduct.stock > 10 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : selectedProduct.stock > 0
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {selectedProduct.stock.toFixed(2)} {selectedProduct.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">
                        <button
                            onClick={() => setAdjustType('add')}
                            className={`${adjustType === 'add' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Add Stock
                        </button>
                        <button
                            onClick={() => setAdjustType('reduce')}
                            className={`${adjustType === 'reduce' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Reduce Stock
                        </button>
                    </nav>
                </div>

                <form onSubmit={handleAdjustStock} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantity
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          step="0.001"
                          value={adjustQuantity}
                          onChange={(e) => setAdjustQuantity(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                      <div className="px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium">
                        {selectedProduct.unit}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="e.g. Stock correction, new shipment"
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdjustModal(false);
                        setSelectedProduct(null);
                        setAdjustQuantity('');
                        setAdjustNote('');
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                      Update Stock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History Modal - Mobile Style */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={() => setShowHistoryModal(false)}>
            <div className="bg-white dark:bg-gray-900 w-full md:max-w-lg md:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

export default AutoInventoryPage;

// src/pages/AutoInventory.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, push, set, get, update, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  Search, Package, History, 
  TrendingUp, TrendingDown, 
  Plus, Minus, Filter, X,
  ChevronRight, Calendar, User
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
  category?: string;
}

interface Transaction {
  id: string;
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
  const [showFilters, setShowFilters] = useState(false);
  const [filterByStock, setFilterByStock] = useState<'all' | 'low' | 'out'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adjustInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  }, []);

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
          category: value.category || 'Uncategorized',
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
      toast.error("Failed to load products");
      setLoading(false);
    });

    return () => {
      off(productsRef, 'value', listener);
    };
  }, []);

  useEffect(() => {
    if (showAdjustModal) {
      setTimeout(() => {
        adjustInputRef.current?.focus();
      }, 100);
    }
  }, [showAdjustModal]);

  useEffect(() => {
    if (showHistoryModal || showAdjustModal || showFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showHistoryModal, showAdjustModal, showFilters]);

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

  const handleQuickAdjust = (product: Product, type: 'add' | 'reduce') => {
    setSelectedProduct(product);
    setAdjustType(type);
    setAdjustQuantity('');
    setAdjustNote('');
    setShowAdjustModal(true);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterByStock === 'all') return matchesSearch;
    if (filterByStock === 'low') return matchesSearch && p.stock > 0 && p.stock <= 10;
    if (filterByStock === 'out') return matchesSearch && p.stock === 0;
    return matchesSearch;
  });

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    if (stock <= 10) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  };

  const getStockStatusText = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading inventory...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          className: 'dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-800',
          duration: 3000,
        }}
      />
      
      <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white pb-24">
        {/* Enhanced Search Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex-1">Inventory</h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl ${showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Bar */}
        {showFilters && (
          <div className="sticky top-20 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterByStock('all')}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${filterByStock === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'}`}
              >
                All ({products.length})
              </button>
              <button
                onClick={() => setFilterByStock('low')}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${filterByStock === 'low' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'}`}
              >
                Low Stock ({products.filter(p => p.stock > 0 && p.stock <= 10).length})
              </button>
              <button
                onClick={() => setFilterByStock('out')}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${filterByStock === 'out' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'}`}
              >
                Out of Stock ({products.filter(p => p.stock === 0).length})
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="px-4 py-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">In Stock</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{products.filter(p => p.stock > 10).length}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{products.filter(p => p.stock > 0 && p.stock <= 10).length}</p>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="px-4 pb-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium text-lg mb-2">
                {searchTerm ? 'No products found' : 'No products in inventory'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                {searchTerm ? 'Try a different search term' : 'Add products to get started'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:active:bg-blue-800 text-white rounded-xl font-medium active:scale-[0.98] transition-all"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm active:scale-[0.995] transition-transform"
                >
                  <div 
                    className="p-4"
                    onClick={() => handleViewHistory(product)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">
                            {product.productName}
                          </h3>
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">ID: {product.productId}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStockStatusColor(product.stock)}`}>
                            {getStockStatusText(product.stock)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-500">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Stock</span>
                        <span className={`text-lg font-bold ${
                          product.stock === 0 
                            ? 'text-red-600 dark:text-red-400'
                            : product.stock <= 10
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {product.stock.toFixed(2)} {product.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${
                          product.stock === 0 
                            ? 'bg-red-500'
                            : product.stock <= 10
                            ? 'bg-orange-500'
                            : 'bg-green-500'
                        }`} 
                        style={{ 
                          width: `${Math.min(100, (product.stock / (product.stock > 10 ? 100 : 10)) * 100)}%` 
                        }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdjust(product, 'add');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 active:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 dark:active:bg-green-800 text-white rounded-xl font-medium active:scale-[0.98] transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdjust(product, 'reduce');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 active:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:active:bg-red-800 text-white rounded-xl font-medium active:scale-[0.98] transition-all"
                    >
                      <Minus className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adjust Stock Modal - Bottom Sheet */}
        {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/50 dark:bg-black/70"
              onClick={() => {
                setShowAdjustModal(false);
                setSelectedProduct(null);
                setAdjustQuantity('');
                setAdjustNote('');
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-gray-200 dark:border-gray-800">
              {/* Draggable Handle */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(85vh-40px)]">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adjust Stock</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {selectedProduct.productId}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAdjustModal(false);
                        setSelectedProduct(null);
                        setAdjustQuantity('');
                        setAdjustNote('');
                      }}
                      className="p-2 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{selectedProduct.productName}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getStockStatusColor(selectedProduct.stock)}`}>
                            {getStockStatusText(selectedProduct.stock)}
                          </span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {selectedProduct.stock.toFixed(2)} {selectedProduct.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adjust Type Toggle */}
                  <div className="mb-6">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
                      <button
                        onClick={() => setAdjustType('add')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium transition-all ${adjustType === 'add' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
                      >
                        <Plus className="w-5 h-5" />
                        Add Stock
                      </button>
                      <button
                        onClick={() => setAdjustType('reduce')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium transition-all ${adjustType === 'reduce' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
                      >
                        <Minus className="w-5 h-5" />
                        Reduce Stock
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAdjustStock} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Quantity to {adjustType === 'add' ? 'Add' : 'Remove'}
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input
                            ref={adjustInputRef}
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={adjustQuantity}
                            onChange={(e) => setAdjustQuantity(e.target.value)}
                            placeholder="Enter quantity"
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white text-lg"
                            required
                          />
                        </div>
                        <div className="px-5 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
                          {selectedProduct.unit}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Reason (Optional)
                      </label>
                      <textarea
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder="e.g., Stock correction, new shipment, damaged goods"
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full py-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-sm active:scale-[0.99] transition-all"
                      >
                        {adjustType === 'add' ? 'Add to Stock' : 'Remove from Stock'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History Modal - Bottom Sheet */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/50 dark:bg-black/70"
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedProduct(null);
                setProductTransactions([]);
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90vh] overflow-hidden border-t border-gray-200 dark:border-gray-800">
              {/* Draggable Handle */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-40px)]">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{selectedProduct.productName}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        setSelectedProduct(null);
                        setProductTransactions([]);
                      }}
                      className="p-2 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Product Summary */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Current Stock</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProduct.stock.toFixed(2)} {selectedProduct.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{productTransactions.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div>
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Loading transactions...</p>
                      </div>
                    ) : productTransactions.length === 0 ? (
                      <div className="text-center py-12">
                        <History className="w-16 h-16 text-gray-400 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium">No transactions yet</p>
                        <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Adjust stock to see history</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                        {productTransactions.map((transaction) => (
                          <div 
                            key={transaction.id} 
                            className={`p-4 rounded-2xl border ${transaction.quantityChange > 0 ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${transaction.quantityChange > 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                                  {transaction.quantityChange > 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                                    {`${transaction.quantityChange > 0 ? '+' : ''}${Number(transaction.quantityChange).toFixed(2)} ${transaction.unit}`}
                                  </span>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mt-1">Via {transaction.source}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(transaction.createdAt).toLocaleDateString()}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            
                            {transaction.note && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-3 bg-white dark:bg-black/30 rounded-lg">
                                {transaction.note}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <User className="w-4 h-4" />
                                <span>{transaction.performedBy || 'System'}</span>
                              </div>
                              {(transaction.quotationId || transaction.purchaseId) && (
                                <span className="text-gray-500 dark:text-gray-500 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
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
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AutoInventoryPage;
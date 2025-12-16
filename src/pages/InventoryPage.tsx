import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, push, set, get, update } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  Search, Package, History, 
  TrendingUp, TrendingDown, Plus, 
  Minus, Filter, X, Check, 
  RefreshCw, AlertCircle, Clock, User,
  Maximize2, ZoomIn, ZoomOut
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

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'reduce'>('add');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out'>('all');
  const [imageZoom, setImageZoom] = useState(1);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products from Firebase
  const fetchProducts = async () => {
    try {
      const productsRef = ref(database, 'quotations/manualInventory');
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productsList = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        setProducts(productsList);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      toast.error('Failed to load inventory');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    toast.success('Refreshed');
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQuantity) {
      toast.error('Enter quantity');
      return;
    }

    try {
      let quantityChange = parseFloat(adjustQuantity);
      
      if (isNaN(quantityChange) || quantityChange <= 0) {
        toast.error('Enter valid quantity');
        return;
      }

      if (adjustType === 'reduce') {
        if (quantityChange > selectedProduct.stock) {
          toast.error('Cannot reduce more than available stock');
          return;
        }
        quantityChange = -quantityChange;
      }

      const productRef = ref(database, `quotations/manualInventory/${selectedProduct.id}`);
      const snapshot = await get(productRef);
      const currentProduct = snapshot.val();
      
      if (!currentProduct) {
        toast.error('Product not found');
        return;
      }

      const currentStock = currentProduct.stock || 0;
      const newStock = currentStock + quantityChange;

      const userInfo = user ? (user.displayName || user.email || user.uid) : 'User';
      const finalNote = adjustNote ? 
        `${adjustNote} (${userInfo})` : 
        `${quantityChange > 0 ? 'Added' : 'Removed'} by ${userInfo}`;

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

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === selectedProduct.id 
          ? {...p, stock: newStock, updatedAt: Date.now()}
          : p
      ));
      
      toast.success(`Stock ${quantityChange > 0 ? 'added' : 'removed'}`);
      
      setShowAdjustModal(false);
      setAdjustQuantity('');
      setAdjustNote('');
      setSelectedProduct(null);
    } catch (err: any) {
      console.error('Transaction error:', err);
      toast.error('Failed to update');
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
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setImageZoom(1);
    setShowImageModal(true);
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
  };

  // Filter products based on active tab
  const getFilteredProducts = () => {
    let filtered = products.filter(p =>
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.productId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeTab === 'low') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= 10);
    } else if (activeTab === 'out') {
      filtered = filtered.filter(p => p.stock === 0);
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  useEffect(() => {
    if (showHistoryModal || showAdjustModal || showImageModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showHistoryModal, showAdjustModal, showImageModal]);

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
          },
        }}
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-900 px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Inventory</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{totalProducts} products</p>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg"
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              All ({totalProducts})
            </button>
            <button
              onClick={() => setActiveTab('low')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'low'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Low ({lowStockCount})
            </button>
            <button
              onClick={() => setActiveTab('out')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'out'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Out ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="p-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No products found' : 'No products available'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  onClick={() => handleViewHistory(product)}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 active:scale-[0.98] transition-transform"
                >
                  <div className="p-3 flex items-start gap-3">
                    {/* Product Image with click to zoom */}
                    <div 
                      onClick={(e) => handleImageClick(product, e)}
                      className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 relative group cursor-pointer"
                    >
                      {product.imageUrl ? (
                        <>
                          <img 
                            src={product.imageUrl} 
                            alt={product.productName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold truncate text-sm">
                          {product.productName}
                        </h3>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          product.stock === 0
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                            : product.stock <= 10
                            ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                        }`}>
                          {product.stock.toFixed(2)} {product.unit}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">ID: {product.productId}</p>
                      
                      {/* Stock Indicator */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Stock</span>
                          <span className="text-gray-500 dark:text-gray-400">{product.stock <= 100 ? product.stock.toFixed(0) : '100'}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${
                            product.stock === 0
                              ? 'bg-red-500'
                              : product.stock <= 10
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`} style={{ width: `${Math.min(100, product.stock)}%` }}></div>
                        </div>
                      </div>

                      {/* Adjust Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          setShowAdjustModal(true);
                        }}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium active:scale-95 transition-transform"
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

        {/* Add Product FAB */}
        <button
          onClick={() => toast('Add Product feature coming soon!')}
          className="fixed bottom-24 right-4 bg-blue-500 text-white rounded-full p-4 shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-900 p-3">
          <div className="flex justify-around">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex flex-col items-center p-2 text-blue-500"
            >
              <Package className="w-5 h-5 mb-1" />
              <span className="text-xs">Inventory</span>
            </button>
            <button
              onClick={() => toast('Coming soon')}
              className="flex flex-col items-center p-2 text-gray-500 dark:text-gray-400"
            >
              <Filter className="w-5 h-5 mb-1" />
              <span className="text-xs">Reports</span>
            </button>
            <button
              onClick={() => toast('Coming soon')}
              className="flex flex-col items-center p-2 text-gray-500 dark:text-gray-400"
            >
              <TrendingUp className="w-5 h-5 mb-1" />
              <span className="text-xs">Analytics</span>
            </button>
          </div>
        </div>

        {/* Image Zoom Modal */}
        {showImageModal && selectedProduct && selectedProduct.imageUrl && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/90 dark:bg-black/90"
              onClick={() => {
                setShowImageModal(false);
                setImageZoom(1);
              }}
            />
            
            {/* Image Container */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div 
                ref={imageContainerRef}
                className="relative w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${imageZoom})`, transition: 'transform 0.2s' }}
              >
                <img 
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.productName}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                
                {/* Zoom Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full p-2 flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
                  >
                    <ZoomOut className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-3 py-1 rounded-full text-sm font-medium bg-gray-800 hover:bg-gray-700 text-white"
                  >
                    {Math.round(imageZoom * 100)}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700"
                  >
                    <ZoomIn className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowImageModal(false);
                setImageZoom(1);
              }}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Adjust Stock Modal - Mobile Bottom Sheet */}
        {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/70 dark:bg-black/70"
              onClick={() => {
                setShowAdjustModal(false);
                setSelectedProduct(null);
                setAdjustQuantity('');
                setAdjustNote('');
              }}
            />
            
            {/* Modal Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-gray-200 dark:border-gray-800">
              {/* Handle */}
              <div className="flex justify-center pt-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Adjust Stock</h2>
                  <button
                    onClick={() => {
                      setShowAdjustModal(false);
                      setSelectedProduct(null);
                      setAdjustQuantity('');
                      setAdjustNote('');
                    }}
                    className="p-2"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedProduct.productName}</p>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {/* Current Stock */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
                      <p className="text-2xl font-bold">{selectedProduct.stock.toFixed(2)} {selectedProduct.unit}</p>
                    </div>
                    <div className={`text-lg font-bold ${
                      selectedProduct.stock === 0
                        ? 'text-red-600 dark:text-red-400'
                        : selectedProduct.stock <= 10
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {selectedProduct.stock === 0 ? 'Out of Stock' : 
                       selectedProduct.stock <= 10 ? 'Low Stock' : 'In Stock'}
                    </div>
                  </div>
                </div>

                {/* Adjust Type */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setAdjustType('add')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                      adjustType === 'add'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Stock
                  </button>
                  <button
                    onClick={() => setAdjustType('reduce')}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                      adjustType === 'reduce'
                        ? 'bg-red-500 text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    Reduce Stock
                  </button>
                </div>

                {/* Quantity Input */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quantity</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.001"
                      value={adjustQuantity}
                      onChange={(e) => setAdjustQuantity(e.target.value)}
                      placeholder="Enter amount"
                      className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400">
                      {selectedProduct.unit}
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Note (Optional)</p>
                  <textarea
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    placeholder="Reason for adjustment"
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAdjustModal(false);
                      setSelectedProduct(null);
                      setAdjustQuantity('');
                      setAdjustNote('');
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium active:scale-95 text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdjustStock}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Modal - Mobile Bottom Sheet */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/70 dark:bg-black/70"
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedProduct(null);
                setProductTransactions([]);
              }}
            />
            
            {/* Modal Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-gray-200 dark:border-gray-800">
              {/* Handle */}
              <div className="flex justify-center pt-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Transaction History</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{selectedProduct.productName}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowHistoryModal(false);
                      setSelectedProduct(null);
                      setProductTransactions([]);
                    }}
                    className="p-2"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                  </div>
                ) : productTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-16 h-16 text-gray-300 dark:text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              transaction.quantityChange > 0 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                              {transaction.quantityChange > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <span className={`text-lg font-bold ${
                                transaction.quantityChange > 0 
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {transaction.quantityChange > 0 ? '+' : ''}{Number(transaction.quantityChange).toFixed(2)} {transaction.unit}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">{transaction.source}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        
                        {transaction.note && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                            {transaction.note}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{transaction.performedBy || 'System'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
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

export default InventoryPage;
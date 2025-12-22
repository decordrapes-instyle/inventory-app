import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { ref, push, set, get, update } from "firebase/database";
import { database } from "../config/firebase";
import {
  Search,
  Package,
  History,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Image as ImageIcon,
  Edit,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

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
  source: "quotation" | "manual" | "purchase";
  quotationId?: string;
  purchaseId?: string;
  note?: string;
  createdAt: number;
  performedBy?: string;
}

// Image caching utility
class ImageCache {
  private static cacheKey = 'inventory_image_cache';
  private static maxAge = 24 * 60 * 60 * 1000; // 24 hours

  static getCache(): Record<string, { url: string; timestamp: number }> {
    try {
      const cache = localStorage.getItem(this.cacheKey);
      return cache ? JSON.parse(cache) : {};
    } catch {
      return {};
    }
  }

  static setCache(cache: Record<string, { url: string; timestamp: number }>) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache images:', error);
    }
  }

  static getCachedUrl(productId: string, currentUrl?: string): string | null {
    const cache = this.getCache();
    const cached = cache[productId];
    
    if (cached && currentUrl && cached.url === currentUrl) {
      // Check if cache is still valid (less than 24 hours old)
      if (Date.now() - cached.timestamp < this.maxAge) {
        return cached.url;
      }
    }
    return null;
  }

  static cacheImage(productId: string, url: string) {
    const cache = this.getCache();
    cache[productId] = {
      url,
      timestamp: Date.now()
    };
    this.setCache(cache);
  }

  static clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
    }
  }
}

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "low" | "out">("all");
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products from Firebase - only once on mount
  const fetchProducts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const productsRef = ref(database, "quotations/manualInventory");
      const snapshot = await get(productsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const productsList = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        
        // Cache images for products that have them
        productsList.forEach(product => {
          if (product.imageUrl && !forceRefresh) {
            const cachedUrl = ImageCache.getCachedUrl(product.id, product.imageUrl);
            if (cachedUrl) {
              setCachedImages(prev => ({ ...prev, [product.id]: cachedUrl }));
            } else if (product.imageUrl) {
              ImageCache.cacheImage(product.id, product.imageUrl);
              setCachedImages(prev => ({ ...prev, [product.id]: product.imageUrl }));
            }
          }
        });
        
        setProducts(productsList);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error("Error loading products:", err);
      toast.error("Failed to load inventory");
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch products only once on mount
  useEffect(() => {
    fetchProducts();
    // Cleanup function
    return () => {
      // Reset states if component unmounts
      setProducts([]);
      setCachedImages({});
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Force refresh from database
    await fetchProducts(true);
    toast.success("Refreshed");
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQuantity) {
      toast.error("Enter quantity");
      return;
    }

    try {
      let quantityChange = parseFloat(adjustQuantity);

      if (isNaN(quantityChange) || quantityChange <= 0) {
        toast.error("Enter valid quantity");
        return;
      }

      if (adjustType === "reduce") {
        if (quantityChange > selectedProduct.stock) {
          toast.error("Cannot reduce more than available stock");
          return;
        }
        quantityChange = -quantityChange;
      }

      const productRef = ref(
        database,
        `quotations/manualInventory/${selectedProduct.id}`
      );
      const snapshot = await get(productRef);
      const currentProduct = snapshot.val();

      if (!currentProduct) {
        toast.error("Product not found");
        return;
      }

      const currentStock = currentProduct.stock || 0;
      const newStock = currentStock + quantityChange;
      const userNameInfo = user
        ? user.displayName ||user.email || user.uid
        : "Naam nhi hai";
      const userInfo = user
        ? user.email || user.uid
        : "User";
      const finalNote = adjustNote
        ? `${adjustNote} (${userInfo})`
        : `${quantityChange > 0 ? "Added" : "Removed"} by ${userNameInfo}`;

      const transactionRef = push(
        ref(database, `quotations/inventoryTransactions/${selectedProduct.id}`)
      );
      const transactionData = {
        productId: selectedProduct.productId,
        productName: selectedProduct.productName,
        quantityChange: quantityChange,
        unit: selectedProduct.unit,
        source: "manual",
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
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, stock: newStock, updatedAt: Date.now() }
            : p
        )
      );

      toast.success(`Stock ${quantityChange > 0 ? "added" : "removed"}`);

      setShowAdjustModal(false);
      setAdjustQuantity("");
      setAdjustNote("");
      setSelectedProduct(null);
    } catch (err: any) {
      console.error("Transaction error:", err);
      toast.error("Failed to update");
    }
  };

  const handleViewHistory = async (product: Product) => {
    setSelectedProduct(product);
    setLoading(true);

    try {
      const transactionsRef = ref(
        database,
        `quotations/inventoryTransactions/${product.id}`
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
        setProductTransactions(transactionsList);
      } else {
        setProductTransactions([]);
      }

      setShowHistoryModal(true);
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  // Get image URL with caching
  const getImageUrl = (product: Product): string | undefined => {
    if (cachedImages[product.id]) {
      return cachedImages[product.id];
    }
    return product.imageUrl;
  };

  const handleImageClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setShowImageModal(true);
  };

  const handleImageLoad = (productId: string) => {
    setImageLoaded((prev) => ({ ...prev, [productId]: true }));
  };

  // Filter products based on active tab - NO API CALL, just client-side filtering
  const getFilteredProducts = () => {
    let filtered = products.filter(
      (p) =>
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (activeTab === "low") {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10);
    } else if (activeTab === "out") {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Stats - calculated from cached products
  const totalProducts = products.length;
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= 10
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  // Handle body overflow for modals
  useEffect(() => {
    if (showHistoryModal || showAdjustModal || showImageModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showHistoryModal, showAdjustModal, showImageModal]);

  // Skeleton Loading
  const ProductSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800"></div>
      <div className="p-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 mb-3"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    </div>
  );

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-3">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProductSkeleton key={index} />
          ))}
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
            background: "#1a1a1a",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "14px",
          },
        }}
      />

      <div className="pt-safe min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-900 px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Inventory</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {totalProducts} products
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg"
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
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
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            )}
          </div>

          {/* Tabs - No API calls on tab switch */}
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              All ({totalProducts})
            </button>
            <button
              onClick={() => setActiveTab("low")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "low"
                  ? "bg-orange-500 text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Low ({lowStockCount})
            </button>
            <button
              onClick={() => setActiveTab("out")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === "out"
                  ? "bg-red-500 text-white"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Out ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Products List - Two Column Grid */}
        <div className="p-3">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? "No products found" : "No products available"}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const imageUrl = getImageUrl(product);
                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col"
                  >
                    {/* Product Image Square with Caching */}
                    <div
                      onClick={(e) => handleImageClick(product, e)}
                      className="w-full aspect-square bg-gray-100 dark:bg-gray-800 relative cursor-pointer overflow-hidden"
                    >
                      {imageUrl ? (
                        <>
                          {/* Skeleton while loading */}
                          {!imageLoaded[product.id] && (
                            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                          )}
                          
                          {/* Actual Image - Using cached URL if available */}
                          <img
                            src={imageUrl}
                            alt={product.productName}
                            className={`w-full h-full object-cover ${
                              imageLoaded[product.id] ? 'opacity-100' : 'opacity-0'
                            } transition-opacity duration-300`}
                            onLoad={() => handleImageLoad(product.id)}
                            loading="lazy"
                            crossOrigin="anonymous"
                          />
                          
                          {/* Image overlay icon */}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                        {product.productName}
                      </h3>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Code: {product.productId}
                      </p>

                      {/* Stock Display */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Stock
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              product.stock === 0
                                ? "text-red-600 dark:text-red-400"
                                : product.stock <= 10
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {product.stock.toFixed(2)} {product.unit}
                          </span>
                        </div>

                        {/* Adjust and History Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                              setShowAdjustModal(true);
                            }}
                            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Adjust
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewHistory(product);
                            }}
                            className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium active:scale-95 transition-transform flex items-center justify-center gap-1"
                          >
                            <History className="w-3 h-3" />
                            History
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Simplified Image Modal */}
        {showImageModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/90 dark:bg-black/90"
              onClick={() => {
                setShowImageModal(false);
              }}
            />

            {/* Image Container */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={getImageUrl(selectedProduct) || selectedProduct.imageUrl}
                alt={selectedProduct.productName}
                className="max-w-full max-h-full object-contain rounded-lg"
                crossOrigin="anonymous"
              />
            </div>

            {/* Close Button at Bottom */}
            <button
              onClick={() => {
                setShowImageModal(false);
              }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 hover:bg-white text-black font-medium py-3 px-8 rounded-full active:scale-95 transition-transform"
            >
              Close
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
                setAdjustQuantity("");
                setAdjustNote("");
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
                      setAdjustQuantity("");
                      setAdjustNote("");
                    }}
                    className="p-2"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedProduct.productName}
                </p>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {/* Current Stock */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Current Stock
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedProduct.stock.toFixed(2)}{" "}
                        {selectedProduct.unit}
                      </p>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        selectedProduct.stock === 0
                          ? "text-red-600 dark:text-red-400"
                          : selectedProduct.stock <= 10
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {selectedProduct.stock === 0
                        ? "Out of Stock"
                        : selectedProduct.stock <= 10
                        ? "Low Stock"
                        : "In Stock"}
                    </div>
                  </div>
                </div>

                {/* Adjust Type */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setAdjustType("add")}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                      adjustType === "add"
                        ? "bg-blue-500 text-white"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Stock
                  </button>
                  <button
                    onClick={() => setAdjustType("reduce")}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                      adjustType === "reduce"
                        ? "bg-red-500 text-white"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    Reduce Stock
                  </button>
                </div>

                {/* Quantity Input */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Quantity
                  </p>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Note (Optional)
                  </p>
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
                      setAdjustQuantity("");
                      setAdjustNote("");
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {selectedProduct.productName}
                    </p>
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
                    <p className="text-gray-500 dark:text-gray-400">
                      Loading...
                    </p>
                  </div>
                ) : productTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-16 h-16 text-gray-300 dark:text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No transactions yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                transaction.quantityChange > 0
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-red-100 dark:bg-red-900/30"
                              }`}
                            >
                              {transaction.quantityChange > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <span
                                className={`text-lg font-bold ${
                                  transaction.quantityChange > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {transaction.quantityChange > 0 ? "+" : ""}
                                {Number(transaction.quantityChange).toFixed(
                                  2
                                )}{" "}
                                {transaction.unit}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                                {transaction.source}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(
                                transaction.createdAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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
                            <span>{transaction.performedBy || "System"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(
                                transaction.createdAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
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
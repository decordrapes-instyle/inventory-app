import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ref, push, set, get, update, onValue, off } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  Search, Package, History, ArrowLeft,
  TrendingUp, TrendingDown, Layers,
  Plus, Minus, Filter, X, Check,
  Clock, User} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type InventoryUnit = 'piece' | 'meter' | 'foot' | 'length' | 'box' | 'sqft' | 'pcs' | 'kgs' | 'pkt' | 'roll' | 'set' | 'carton' | 'bundle' | 'dozen' | 'kg' | 'inch' | 'cm' | 'mm';

interface Product {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  unit: InventoryUnit;
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

interface InventoryGroup {
  id: string;
  name: string;
  description?: string;
  items: Array<{
    productId: string;
    productName: string;
    unit: InventoryUnit;
    addedAt: number;
    inventoryType: 'product' | 'manual'; // Updated to include type
  }>;
  createdAt: number;
  updatedAt: number;
}

const AutoInventoryPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adjustInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const stockFilterRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [showHeader, setShowHeader] = useState(true);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showStockFilter, setShowStockFilter] = useState(false);
  const lastScrollY = useRef(0);

  // Measure header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(height);
      }
    };

    updateHeaderHeight();
    
    const observer = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }
    
    return () => observer.disconnect();
  }, [showSearchInput, showGroupFilter, showStockFilter, stockFilter, searchTerm, selectedGroup]);

  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Don't hide header if any filter is expanded
      const isFilterExpanded = showGroupFilter || showStockFilter || showSearchInput;
      if (isFilterExpanded) {
        setShowHeader(true);
        return;
      }

      if (currentScrollY < lastScrollY.current) {
        setShowHeader(true);
      } else if (currentScrollY > lastScrollY.current + 10) {
        setShowHeader(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showGroupFilter, showStockFilter, showSearchInput]);

  // Fetch products and groups
  useEffect(() => {
    setLoading(true);
    
    const productsRef = ref(database, 'quotations/inventory');
    const groupsRef = ref(database, 'quotations/inventoryGrp');

    // Fetch products
    const productsListener = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productList: Product[] = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          productId: value.productId || '',
          productName: value.productName || 'Unnamed Product',
          stock: value.stock || 0,
          unit: value.unit || 'pcs',
          notes: value.notes,
          category: value.category,
          createdAt: value.createdAt || 0,
          updatedAt: value.updatedAt || 0,
        })).sort((a, b) => b.updatedAt - a.updatedAt);
        setProducts(productList);
      } else {
        setProducts([]);
      }
    }, (error) => {
      console.error("Firebase error:", error);
      toast.error("Failed to load products");
    });

    // Fetch groups - Filter only groups with inventoryType "product"
    const groupsListener = onValue(groupsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const groupsList: InventoryGroup[] = Object.entries(data).map(
          ([key, value]: any) => ({
            id: key,
            ...value,
          })
        );
        
        // Filter groups to only include those with at least one item of inventoryType "product"
        const filteredGroups = groupsList.filter(group => {
          // Check if group has items and at least one has inventoryType "product"
          if (!group.items || !Array.isArray(group.items)) return false;
          
          return group.items.some(item => item.inventoryType === "product");
        });
        
        setInventoryGroups(filteredGroups);
      } else {
        setInventoryGroups([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase groups error:", error);
      setInventoryGroups([]);
      setLoading(false);
    });

    return () => {
      off(productsRef, 'value', productsListener);
      off(groupsRef, 'value', groupsListener);
    };
  }, []);

  // Keep focus for adjust modal when it opens
  useEffect(() => {
    if (showAdjustModal) {
      setTimeout(() => {
        adjustInputRef.current?.focus();
      }, 100);
    }
  }, [showAdjustModal]);

  // Handle body overflow for modals
  useEffect(() => {
    if (showHistoryModal || showAdjustModal || showGroupFilter || showStockFilter) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showHistoryModal, showAdjustModal, showGroupFilter, showStockFilter]);

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        groupFilterRef.current &&
        !groupFilterRef.current.contains(event.target as Node)
      ) {
        setShowGroupFilter(false);
      }
      if (
        stockFilterRef.current &&
        !stockFilterRef.current.contains(event.target as Node)
      ) {
        setShowStockFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle search input
  const toggleSearch = () => {
    setShowSearchInput(!showSearchInput);
    setShowGroupFilter(false);
    setShowStockFilter(false);
    if (!showSearchInput && searchTerm) {
      setSearchTerm("");
    }
  };

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

      const userInfo = user ? (user.displayName || user.email || user.uid) : 'Unknown User';
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

  // Get products for selected group - only include items with inventoryType "product"
  const getGroupProducts = (groupId: string): Product[] => {
    const group = inventoryGroups.find((g) => g.id === groupId);
    if (!group) return [];

    // Filter items to only include those with inventoryType "product"
    const productItems = group.items.filter(item => item.inventoryType === "product");
    const groupProductIds = new Set(productItems.map((item) => item.productId));
    
    return products.filter((product) => groupProductIds.has(product.productId));
  };

  // Filter products based on selected group, stock filter, and search term
  const getFilteredProducts = () => {
    let filtered = selectedGroup ? getGroupProducts(selectedGroup) : products;

    // Apply stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.productId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

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

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'text-red-600 dark:text-red-400';
    if (stock <= 10) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Skeleton Loading
  const ProductSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse p-4">
      <div className="flex justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded mt-3"></div>
    </div>
  );

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4">
        <div className="space-y-3">
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
          className: 'dark:bg-gray-900 dark:text-white border border-gray-200 dark:border-gray-800',
          duration: 3000,
        }}
      />
      
      <div className="pt-safe min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-16">
        {/* HEADER */}
        <div
          ref={headerRef}
          className={`
            fixed top-0 left-0 right-0 z-20
            bg-white/90 dark:bg-black/90 backdrop-blur-sm
            border-b border-gray-200 dark:border-gray-900
            transition-transform duration-300 ease-in-out pt-safe
            ${showHeader ? "translate-y-0" : "-translate-y-full"}
          `}
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between h-14 px-4 pt-safe">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold truncate">Fabric Inventory</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* SEARCH ICON */}
              <button
                onClick={toggleSearch}
                className={`p-2 rounded-lg transition-colors ${
                  searchTerm || showSearchInput
                    ? "bg-blue-500 text-white" 
                    : ""
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* GROUP ICON - Only show if we have product groups */}
              {inventoryGroups.length > 0 && (
                <button
                  onClick={() => {
                    setShowGroupFilter(!showGroupFilter);
                    setShowStockFilter(false);
                    setShowSearchInput(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedGroup || showGroupFilter
                      ? "bg-purple-500 text-white" 
                      : ""
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </button>
              )}

              {/* STOCK ICON */}
              <button
                onClick={() => {
                  setShowStockFilter(!showStockFilter);
                  setShowGroupFilter(false);
                  setShowSearchInput(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  stockFilter !== 'all' || showStockFilter
                    ? "bg-orange-500 text-white" 
                    : ""
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SEARCH INPUT ROW */}
          {showSearchInput && (
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search fabrics by name or code..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-100 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border-0"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-200 dark:bg-gray-800"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GROUP FILTER ROW - Grid layout */}
          {showGroupFilter && inventoryGroups.length > 0 && (
            <div className="px-4 pb-3" ref={groupFilterRef}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSelectedGroup(null);
                    setShowGroupFilter(false);
                  }}
                  className={`py-3 px-3 rounded-xl text-left transition-all duration-200 ${
                    !selectedGroup
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="font-medium truncate block">All Groups</span>
                </button>
                {inventoryGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedGroup(group.id);
                      setShowGroupFilter(false);
                    }}
                    className={`py-3 px-3 rounded-xl text-left transition-all duration-200 ${
                      selectedGroup === group.id
                        ? "bg-purple-500 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="font-medium truncate block">{group.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STOCK FILTER ROW - Grid layout */}
          {showStockFilter && (
            <div className="px-4 pb-3" ref={stockFilterRef}>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setStockFilter("all");
                    setShowStockFilter(false);
                  }}
                  className={`py-3 px-2 rounded-xl text-center transition-all duration-200 ${
                    stockFilter === "all"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="font-medium text-sm">All</span>
                </button>
                <button
                  onClick={() => {
                    setStockFilter("low");
                    setShowStockFilter(false);
                  }}
                  className={`py-3 px-2 rounded-xl text-center transition-all duration-200 ${
                    stockFilter === "low"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="font-medium text-sm">Low Stock</span>
                </button>
                <button
                  onClick={() => {
                    setStockFilter("out");
                    setShowStockFilter(false);
                  }}
                  className={`py-3 px-2 rounded-xl text-center transition-all duration-200 ${
                    stockFilter === "out"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="font-medium text-sm">Out of Stock</span>
                </button>
              </div>
            </div>
          )}

          {/* APPLIED FILTERS ROW */}
          {(searchTerm || selectedGroup || stockFilter !== "all") && (
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-2">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">
                  Filters:
                </span>
                
                {/* SEARCH CHIP */}
                {searchTerm && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs shrink-0">
                    <Search className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">"{searchTerm}"</span>
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* GROUP CHIP */}
                {selectedGroup && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">
                      {inventoryGroups.find((g) => g.id === selectedGroup)?.name}
                    </span>
                    <button 
                      onClick={() => setSelectedGroup(null)}
                      className="ml-1 p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* STOCK CHIP */}
                {stockFilter !== "all" && (
                  <div
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs shrink-0 ${
                      stockFilter === "low"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>
                      {stockFilter === "low" ? "Low Stock" : "Out of Stock"}
                    </span>
                    <button 
                      onClick={() => setStockFilter("all")}
                      className={`ml-1 p-0.5 rounded-full ${
                        stockFilter === "low" 
                          ? "hover:bg-orange-200 dark:hover:bg-orange-800/50" 
                          : "hover:bg-red-200 dark:hover:bg-red-800/50"
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* CLEAR ALL */}
                {(searchTerm ? 1 : 0) + (selectedGroup ? 1 : 0) + (stockFilter !== "all" ? 1 : 0) > 1 && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedGroup(null);
                      setStockFilter("all");
                    }}
                    className="ml-auto text-xs text-gray-500 dark:text-gray-400 px-2 py-1.5 shrink-0 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div 
          className="p-4 transition-[padding-top] duration-300 ease-in-out"
          style={{ paddingTop: `${headerHeight + 8}px` }}
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Fabrics</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{products.length}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">items</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">In Stock</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {products.filter(p => p.stock > 10).length}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">items</span>
              </div>
            </div>
          </div>

          {/* Products List - Single Column without Images */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium text-base mb-2">
                {searchTerm ? 'No fabrics found' : 'No fabrics in inventory'}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                {searchTerm ? 'Try a different search term' : 'Add fabrics to get started'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
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
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 active:bg-gray-50 dark:active:bg-gray-800"
                  onClick={() => handleViewHistory(product)}
                >
                  <div className="p-4">
                    {/* Product Info Row */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-1">
                            {product.productName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Code: {product.productId}
                          </p>
                        </div>
                        
                        {/* Category and Stock Status */}
                        <div className="flex items-center gap-2 mt-2">
                          {product.category && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                              <Layers className="w-3 h-3" />
                              {product.category}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStockStatusColor(product.stock)}`}>
                            {getStockStatusText(product.stock)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Stock Quantity */}
                      <div className="text-right pl-2">
                        <div className={`text-xl font-bold ${getStockColor(product.stock)}`}>
                          {product.stock.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {product.unit}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdjust(product, 'add');
                        }}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdjust(product, 'reduce');
                        }}
                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        Remove
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewHistory(product);
                        }}
                        className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" />
                        History
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adjust Stock Modal */}
        {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/70 dark:bg-black/70"
              onClick={() => {
                setShowAdjustModal(false);
                setSelectedProduct(null);
                setAdjustQuantity('');
                setAdjustNote('');
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-gray-200 dark:border-gray-800">
              <div className="flex justify-center pt-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>

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
                    <div className={`text-lg font-bold ${getStockColor(selectedProduct.stock)}`}>
                      {getStockStatusText(selectedProduct.stock)}
                    </div>
                  </div>
                </div>

                {/* Adjust Type */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setAdjustType("add")}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${
                      adjustType === "add"
                        ? "bg-green-500 text-white"
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
                      ref={adjustInputRef}
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

        {/* History Modal */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            <div 
              className="absolute inset-0 bg-black/70 dark:bg-black/70"
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedProduct(null);
                setProductTransactions([]);
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-gray-200 dark:border-gray-800">
              <div className="flex justify-center pt-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>

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
                                {Number(transaction.quantityChange).toFixed(2)}{" "}
                                {transaction.unit}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-1">
                                {transaction.source}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(transaction.createdAt).toLocaleTimeString([], {
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
                              {new Date(transaction.createdAt).toLocaleTimeString([], {
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

export default AutoInventoryPage;
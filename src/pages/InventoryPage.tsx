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
  Clock,
  User,
  Image as ImageIcon,
  Edit,
  Filter,
  Layers,
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

interface InventoryGroup {
  id: string;
  name: string;
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

// Image caching utility
class ImageCache {
  private static cacheKey = "inventory_image_cache";
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
      console.warn("Failed to cache images:", error);
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
      timestamp: Date.now(),
    };
    this.setCache(cache);
  }

  static clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn("Failed to clear image cache:", error);
    }
  }
}

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(72);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>(
    []
  );
  const [_refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showStockFilter, setShowStockFilter] = useState(false);
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const stockFilterRef = useRef<HTMLDivElement>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const lastScrollY = useRef(0);

  // Add this custom hook at the top of your component (before the InventoryPage function)
  const useSafeAreaHeight = () => {
    const [safeAreaHeight, setSafeAreaHeight] = useState(0);

    useEffect(() => {
      const calculateSafeArea = () => {
        // Create a test element to measure safe area
        const testEl = document.createElement("div");
        testEl.style.position = "fixed";
        testEl.style.top = "0";
        testEl.style.left = "0";
        testEl.style.width = "0";
        testEl.style.height = "0";
        testEl.style.paddingTop = "env(safe-area-inset-top)";
        testEl.style.visibility = "hidden";
        document.body.appendChild(testEl);

        const computedStyle = window.getComputedStyle(testEl);
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

        document.body.removeChild(testEl);
        return paddingTop;
      };

      // Calculate after mount
      const timer = setTimeout(() => {
        const height = calculateSafeArea();
        setSafeAreaHeight(height);
      }, 100);

      return () => clearTimeout(timer);
    }, []);

    return safeAreaHeight;
  };

  // Then in your InventoryPage component, add:
  const safeAreaHeight = useSafeAreaHeight();

  // Update the header measurement useEffect to account for safe area:
  // Replace the useEffect for measuring header height with this improved version:

  // Measure header height with proper support for pt-safe in APK
  useEffect(() => {
    let mounted = true;
    let observer: ResizeObserver | null = null;

    const updateHeaderHeight = () => {
      if (!mounted || !headerRef.current) return;

      const height = headerRef.current.getBoundingClientRect().height;
      // Add extra padding for spacing
      const calculatedHeight = Math.max(height + 8, 80); // Minimum 80px
      setHeaderHeight(calculatedHeight);
    };

    // Initial measurement
    if (headerRef.current) {
      updateHeaderHeight();
    }

    // Multiple attempts to account for APK timing issues
    const attempts = [0, 50, 100, 200, 500];
    attempts.forEach((delay) => {
      setTimeout(updateHeaderHeight, delay);
    });

    // Use ResizeObserver for dynamic changes
    if (headerRef.current) {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
    }

    // Also update on window resize
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      mounted = false;
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, [
    
    showGroupFilter,
    showStockFilter,
    showSearchInput,
    selectedGroup,
    stockFilter,
    searchTerm,
    showHeader,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(height + 8);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Handle scroll to hide/show header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Don't hide header if any filter is expanded
      const isFilterExpanded =
        showGroupFilter || showStockFilter || showSearchInput;
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

  // Handle back button for modals
  useEffect(() => {
    const handlePopState = () => {
      if (showHistoryModal) {
        setShowHistoryModal(false);
        setSelectedProduct(null);
        setProductTransactions([]);
      } else if (showAdjustModal) {
        setShowAdjustModal(false);
        setSelectedProduct(null);
        setAdjustQuantity("");
        setAdjustNote("");
      } else if (showImageModal) {
        setShowImageModal(false);
        setSelectedProduct(null);
      } else if (showGroupFilter) {
        setShowGroupFilter(false);
      } else if (showStockFilter) {
        setShowStockFilter(false);
      } else if (showSearchInput) {
        setShowSearchInput(false);
      }
    };

    // Push state when modals open
    if (
      showHistoryModal ||
      showAdjustModal ||
      showImageModal ||
      showGroupFilter ||
      showStockFilter ||
      showSearchInput
    ) {
      window.history.pushState({ modalOpen: true }, "");
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    showHistoryModal,
    showAdjustModal,
    showImageModal,
    showGroupFilter,
    showStockFilter,
    showSearchInput,
  ]);

  // Fetch products and groups from Firebase
  const fetchProducts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setShowSearchInput(true);
      setShowSearchInput(false);

      // Fetch products
      const productsRef = ref(database, "quotations/manualInventory");
      const productsSnapshot = await get(productsRef);

      // Fetch inventory groups
      const groupsRef = ref(database, "quotations/inventoryGrp");
      const groupsSnapshot = await get(groupsRef);

      if (productsSnapshot.exists()) {
        const data = productsSnapshot.val();
        const productsList = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));

        // Store item count in localStorage for sync checking
        localStorage.setItem("inventory_items", JSON.stringify(productsList));

        // Cache images for products that have them
        productsList.forEach((product) => {
          if (product.imageUrl && !forceRefresh) {
            const cachedUrl = ImageCache.getCachedUrl(
              product.id,
              product.imageUrl
            );
            if (cachedUrl) {
              setCachedImages((prev) => ({ ...prev, [product.id]: cachedUrl }));
            } else if (product.imageUrl) {
              ImageCache.cacheImage(product.id, product.imageUrl);
              setCachedImages((prev) => ({
                ...prev,
                [product.id]: product.imageUrl,
              }));
            }
          }
        });

        setProducts(productsList);
      } else {
        setProducts([]);
        localStorage.setItem("inventory_items", JSON.stringify([]));
      }

      if (groupsSnapshot.exists()) {
        const groupsData = groupsSnapshot.val();
        const groupsList = Object.entries(groupsData)
          .map(([key, value]: any) => ({
            id: key,
            ...value,
          }))
          // Filter groups to only include those with manual inventory items
          .filter((group: InventoryGroup) =>
            group.items.some((item) => item.inventoryType === "manual")
          )
          // Also filter each group's items to only include manual items
          .map((group: InventoryGroup) => ({
            ...group,
            items: group.items.filter(
              (item) => item.inventoryType === "manual"
            ),
          }));

        setInventoryGroups(groupsList);
      } else {
        setInventoryGroups([]);
      }
    } catch (err: any) {
      console.error("Error loading inventory:", err);
      toast.error("Failed to load inventory");
      setProducts([]);
      setInventoryGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch products and groups on mount
  useEffect(() => {
    fetchProducts();

    return () => {
      setProducts([]);
      setCachedImages({});
      setInventoryGroups([]);
    };
  }, []);

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

  // Focus search input when opened
  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

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
        ? user.displayName || user.email || user.uid
        : "Naam nhi hai";
      const userInfo = user ? user.email || user.uid : "User";
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

  // Get products for selected group - ONLY include items with inventoryType "manual"
  const getGroupProducts = (groupId: string): Product[] => {
    const group = inventoryGroups.find((g) => g.id === groupId);
    if (!group) return [];

    // Group items are already filtered to only manual items in fetchProducts
    const groupProductIds = new Set(group.items.map((item) => item.productId));
    return products.filter((product) => groupProductIds.has(product.productId));
  };

  // Filter products based on selected group and search term
  const getFilteredProducts = () => {
    let filtered = selectedGroup ? getGroupProducts(selectedGroup) : products;

    // Apply stock filter
    if (stockFilter === "low") {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10);
    } else if (stockFilter === "out") {
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

  // Handle body overflow for modals
  useEffect(() => {
    if (
      showHistoryModal ||
      showAdjustModal ||
      showImageModal ||
      showGroupFilter ||
      showStockFilter
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [
    showHistoryModal,
    showAdjustModal,
    showImageModal,
    showGroupFilter,
    showStockFilter,
  ]);

  // Toggle search input
  const toggleSearch = () => {
    setShowSearchInput(!showSearchInput);
    setShowGroupFilter(false);
    setShowStockFilter(false);
    if (!showSearchInput && searchTerm) {
      setSearchTerm("");
    }
  };

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, index) => (
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

      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24">
        {/* HEADER */}
        <div
          ref={headerRef}
          className={`
            fixed top-0 left-0 right-0 z-20 pt-safe
            bg-white/90 dark:bg-black/90 backdrop-blur-sm
            border-b border-gray-200 dark:border-gray-900
            transition-transform duration-300 ease-in-out
            ${showHeader ? "translate-y-0" : "-translate-y-full"}
          `}
        >
          {/* TOP BAR (always one line) */}
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2 min-w-0">
              {/* LOGO */}
              <img
                src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
                alt="Company Logo"
                className="w-7 h-7 rounded object-contain"
              />

              <h1 className="text-lg font-bold truncate">Inventory</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* SEARCH ICON */}
              <button
                onClick={toggleSearch}
                className={`p-2 rounded-lg transition-colors ${
                  searchTerm || showSearchInput ? "text-white" : ""
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* GROUP ICON */}
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

              {/* STOCK ICON */}
              <button
                onClick={() => {
                  setShowStockFilter(!showStockFilter);
                  setShowGroupFilter(false);
                  setShowSearchInput(false);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  stockFilter !== "all" || showStockFilter
                    ? "bg-orange-500 text-white"
                    : ""
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SEARCH INPUT ROW - Hidden by default */}
          {showSearchInput && (
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name or code..."
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
          {showGroupFilter && (
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
                  <span className="font-medium">All Groups</span>
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
                    <span className="font-medium truncate block">
                      {group.name}
                    </span>
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

          {/* APPLIED FILTERS ROW - Always shows when filters are active */}
          {(searchTerm || selectedGroup || stockFilter !== "all") && (
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">
                  Filters:
                </span>

                {/* SEARCH CHIP */}
                {searchTerm && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs shrink-0">
                    <Search className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">
                      "{searchTerm}"
                    </span>
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
                      {
                        inventoryGroups.find((g) => g.id === selectedGroup)
                          ?.name
                      }
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

                {/* CLEAR ALL - Only show if more than one filter */}
                {(searchTerm ? 1 : 0) +
                  (selectedGroup ? 1 : 0) +
                  (stockFilter !== "all" ? 1 : 0) >
                  1 && (
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

        {/* Products List - Two Column Grid with dynamic padding AND GAP */}
        <div
          className="p-4 transition-[padding-top] duration-300 ease-in-out"
          style={{ 
            paddingTop: `${Math.max(headerHeight, safeAreaHeight > 0 ? safeAreaHeight + 64 : 72)}px`
          }}
        >
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? "No products found" : "No products available"}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {" "}
              {/* Increased gap from 3 to 4 */}
              {filteredProducts.map((product) => {
                const imageUrl = getImageUrl(product);
                return (
                  <div
                    key={product.id}
                    onClick={() => handleViewHistory(product)} // CARD CLICK → HISTORY
                    className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  >
                    {/* Product Image */}
                    <div
                      onClick={(e) => handleImageClick(product, e)} // IMAGE CLICK → IMAGE
                      className="w-full aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden"
                    >
                      {imageUrl ? (
                        <>
                          {!imageLoaded[product.id] && (
                            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                          )}

                          <img
                            src={imageUrl}
                            alt={product.productName}
                            className={`w-full h-full object-cover ${
                              imageLoaded[product.id]
                                ? "opacity-100"
                                : "opacity-0"
                            } transition-opacity duration-300`}
                            onLoad={() => handleImageLoad(product.id)}
                            loading="lazy"
                            crossOrigin="anonymous"
                          />

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
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                        {product.productName}
                      </h3>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Code: {product.productId}
                      </p>

                      {/* Stock */}
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-4">
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

                        {/* Adjust Button ONLY */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // ⛔ prevent history click
                            setSelectedProduct(product);
                            setShowAdjustModal(true);
                          }}
                          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Adjust
                        </button>
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
                setSelectedProduct(null);
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
                setSelectedProduct(null);
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

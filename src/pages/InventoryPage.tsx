import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useInventoryData } from "../hooks/useInventory";
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
  ChevronDown,
  Loader2,
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
  rate?: number;
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
const InventoryPage: React.FC = () => {
  const { user, initializing } = useAuth();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(72);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>(
    []
  );
  const [uiLoading, setUiLoading] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
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
  const [chunkLoading, setChunkLoading] = useState(false);

  const {
    inventoryGroups,
    loading: dataLoading,
    adjustStock,
    getProductHistory,
    displayProducts,
    loadMore,
    hasMore,
    searchProducts,
    allProducts,
  } = useInventoryData(true);

  const useSafeAreaHeight = () => {
    const [safeAreaHeight, setSafeAreaHeight] = useState(0);

    useEffect(() => {
      const calculateSafeArea = () => {
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

      const timer = setTimeout(() => {
        const height = calculateSafeArea();
        setSafeAreaHeight(height);
      }, 100);

      return () => clearTimeout(timer);
    }, []);

    return safeAreaHeight;
  };

  const safeAreaHeight = useSafeAreaHeight();

  useEffect(() => {
    let mounted = true;
    let observer: ResizeObserver | null = null;

    const updateHeaderHeight = () => {
      if (!mounted || !headerRef.current) return;

      const height = headerRef.current.getBoundingClientRect().height;
      const calculatedHeight = Math.max(height + 8, 80);
      setHeaderHeight(calculatedHeight);
    };

    if (headerRef.current) {
      updateHeaderHeight();
    }

    const attempts = [0, 50, 100, 200, 500];
    attempts.forEach((delay) => {
      setTimeout(updateHeaderHeight, delay);
    });

    if (headerRef.current) {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
    }

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

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

      const userNameInfo = user
        ? user.displayName || user.email || user.uid
        : "Naam nhi hai";
      const userInfo = user ? user.email || user.uid : "User";
      const finalNote = adjustNote
        ? `${adjustNote} (${userInfo})`
        : `${quantityChange > 0 ? "Added" : "Removed"} by ${userNameInfo}`;

      // Use the hook's adjustStock function
      await adjustStock(
        selectedProduct.id,
        selectedProduct.productName,
        quantityChange,
        selectedProduct.unit,
        finalNote,
        userInfo
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
    setUiLoading(true);

    try {
      // Use the hook's getProductHistory function
      const transactionsList = await getProductHistory(product.id);
      setProductTransactions(transactionsList);
      setShowHistoryModal(true);
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      toast.error("Failed to load history");
    } finally {
      setUiLoading(false);
    }
  };

  const handleImageClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setShowImageModal(true);
  };

  const handleImageLoad = (productId: string) => {
    setImageLoaded((prev) => ({ ...prev, [productId]: true }));
  };

  const getGroupProducts = (groupId: string): Product[] => {
    const group = inventoryGroups.find((g) => g.id === groupId);
    if (!group) return [];

    const groupProductIds = new Set(group.items.map((item) => item.productId));
    return allProducts.filter((product) =>
      groupProductIds.has(product.productId)
    );
  };

  const getFilteredProducts = () => {
    let filtered: Product[] = [];

    // If searching, use the search function that searches ALL products
    if (searchTerm) {
      filtered = searchProducts(searchTerm);
    }
    // If no search but has group filter
    else if (selectedGroup) {
      filtered = getGroupProducts(selectedGroup);
    }
    // If no search and no group filter, use displayProducts for chunked loading
    else {
      filtered = displayProducts;
    }

    // Apply stock filter to the filtered results
    if (stockFilter === "low") {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10);
    } else if (stockFilter === "out") {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  const handleLoadMore = () => {
    setChunkLoading(true);
    loadMore();
    // Reset chunk loading after a short delay
    setTimeout(() => {
      setChunkLoading(false);
    }, 300);
  };

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

  const toggleSearch = () => {
    setShowSearchInput(!showSearchInput);
    setShowGroupFilter(false);
    setShowStockFilter(false);
    if (!showSearchInput && searchTerm) {
      setSearchTerm("");
    }
  };

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

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-3">
        <div className="mt-[45px] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProductSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center p-4">
          <img
            src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
            alt="Company Logo"
            className="w-24 h-24 rounded-full object-contain mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Inventory Management
          </h1>
          <p className="mb-8 text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Please log in to access the dashboard and manage your products.
          </p>
          <a
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Only show skeleton on initial app load
  if (
    dataLoading &&
    displayProducts.length === 0 &&
    inventoryGroups.length === 0
  ) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-3">
        <div className="mt-[45px] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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

      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pb-24">
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
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="https://res.cloudinary.com/dmiwq3l2s/image/upload/v1764768203/vfw82jmca7zl5p86czhy.png"
                alt="Company Logo"
                className="w-7 h-7 rounded object-contain"
              />
              <h1 className="text-lg font-bold truncate">Inventory</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSearch}
                className={`p-2 rounded-lg transition-colors ${
                  searchTerm || showSearchInput ? "text-white" : ""
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

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

          {showGroupFilter && (
            <div
              ref={groupFilterRef}
              className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800"
            >
              <div className="flex gap-5 px-4 py-3 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroup(null);
                    setShowGroupFilter(false);
                  }}
                  className="shrink-0 flex flex-col items-center min-w-[76px] active:scale-[0.96] transition-transform"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mb-1
            ${
              !selectedGroup
                ? "bg-purple-600 shadow-sm"
                : "bg-gray-200 dark:bg-gray-800"
            }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        !selectedGroup ? "text-white" : "text-gray-600"
                      }`}
                    >
                      ALL
                    </span>
                  </div>

                  <span
                    className={`text-xs text-center leading-tight
            ${
              !selectedGroup
                ? "text-purple-600 font-semibold"
                : "text-gray-600 dark:text-gray-400"
            }`}
                  >
                    All Groups
                  </span>

                  {!selectedGroup && (
                    <div className="h-[3px] w-5 bg-purple-600 rounded-full mt-1" />
                  )}
                </button>

                {inventoryGroups.map((group) => {
                  const isSelected = selectedGroup === group.id;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroup(group.id);
                        setShowGroupFilter(false);
                      }}
                      className="shrink-0 flex flex-col items-center min-w-[76px] active:scale-[0.96] transition-transform"
                    >
                      <div
                        className={`w-14 h-14 rounded-full overflow-hidden mb-1
                ${
                  isSelected
                    ? "bg-white shadow-sm"
                    : "bg-gray-200 dark:bg-gray-800"
                }`}
                      >
                        <img
                          src={
                            group.imageUrl || "/images/group-placeholder.png"
                          }
                          alt={group.name}
                          onError={(e) => {
                            e.currentTarget.src =
                              "/images/group-placeholder.png";
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <span
                        className={`text-xs text-center leading-tight max-w-[76px]
                ${
                  isSelected
                    ? "text-purple-600 font-semibold"
                    : "text-gray-600 dark:text-gray-400"
                }`}
                      >
                        {group.name}
                      </span>

                      {isSelected && (
                        <div className="h-[3px] w-5 bg-purple-600 rounded-full mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {(searchTerm || selectedGroup || stockFilter !== "all") && (
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">
                  Filters:
                </span>

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

        <div
          className="p-4 transition-[padding-top] duration-300 ease-in-out"
          style={{
            paddingTop: `${Math.max(
              headerHeight,
              safeAreaHeight > 0 ? safeAreaHeight + 64 : 72
            )}px`,
          }}
        >
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-gray-300 dark:text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? "No products found" : "No products available"}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Clear Search
                </button>
              ) : (
                hasMore &&
                !dataLoading && (
                  <button
                    onClick={handleLoadMore}
                    className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load Products
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredProducts.map((product) => {
                  const imageUrl = product.imageUrl;
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleViewHistory(product)}
                      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    >
                      {/* IMAGE */}
                      <div
                        onClick={(e) => handleImageClick(product, e)}
                        className="w-full aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden"
                      >
                        {imageUrl ? (
                          <>
                            {!imageLoaded[product.id] && (
                              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
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

                      {/* CONTENT */}
                      <div className="p-4 flex-1 flex flex-col p-4 flex-1 flex flex-col dark:bg-neutral-950">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                          {product.productName}
                        </h3>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          Code: {product.productId}
                        </p>

                        <div className="mt-auto">
                          {/* INVENTORY VALUE (rate × stock) */}
                          {product?.rate != null && (
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Value
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                ₹
                                {Math.round(
                                  product.rate * product.stock
                                ).toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}

                          {/* STOCK */}
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

                          {/* ADJUST BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(product);
                              setShowAdjustModal(true);
                            }}
                            className="w-full py-2.5
bg-gray-100 hover:bg-gray-200
dark:bg-neutral-800 dark:hover:bg-neutral-700
text-gray-900 dark:text-gray-200
border border-gray-200 dark:border-neutral-700
rounded-lg text-xs font-medium
active:scale-95 transition-all duration-200
flex items-center justify-center gap-1.5
"
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

              {/* Load More Button - Only show when no filters are active */}
              {hasMore &&
                !searchTerm &&
                selectedGroup === null &&
                stockFilter === "all" && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={handleLoadMore}
                      disabled={chunkLoading}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {chunkLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Load More Products
                        </>
                      )}
                    </button>
                  </div>
                )}
            </>
          )}
        </div>

        {showImageModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/90 dark:bg-black/90"
              onClick={() => {
                setShowImageModal(false);
                setSelectedProduct(null);
              }}
            />

            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.productName}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

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

        {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/70 dark:bg-black/70"
              onClick={() => {
                setShowAdjustModal(false);
                setSelectedProduct(null);
                setAdjustQuantity("");
                setAdjustNote("");
              }}
            />

            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 rounded-t-3xl max-h-[90vh] overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
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

            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 rounded-t-3xl max-h-[90vh] overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
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
                {uiLoading ? (
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
                        className="p-3 bg-gray-50 dark:bg-neutral-900 rounded-xl"
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
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white/50 dark:bg-neutral-900/50 rounded-lg">
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

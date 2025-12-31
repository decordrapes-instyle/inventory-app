
import { useState, useEffect, useRef } from 'react';
import { database } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { loadFirebase } from '../config/firebaseLoader';
const { ref, push, set, get, update, onValue, off } = await loadFirebase();

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

export interface Product {
  id: string;
  productId: string;
  productName: string;
  stock: number;
  cost?: number | null;
  unit: InventoryUnit;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  category?: string;
}

export async function fetchProductCost(productId: string): Promise<number | null> {
  const costRef = ref(database, `quotations/products/${productId}/cost`);
  const snapshot = await get(costRef);

  return snapshot.exists() ? snapshot.val() : null;
}

export interface Transaction {
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

export interface InventoryGroup {
  imageUrl?: string;
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

export function useAutoInventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [productTransactions, setProductTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "reduce">("add");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [inventoryGroups, setInventoryGroups] = useState<InventoryGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const adjustInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const groupFilterRef = useRef<HTMLDivElement>(null);
  const stockFilterRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(72);
  const [showHeader, setShowHeader] = useState(true);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showGroupFilter, setShowGroupFilter] = useState(false);
  const [showStockFilter, setShowStockFilter] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(height + 8);
      }
    };

    updateHeaderHeight();

    const observer = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, [
    showSearchInput,
    showGroupFilter,
    showStockFilter,
    stockFilter,
    searchTerm,
    selectedGroup,
  ]);

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
    setLoading(true);
    setShowSearchInput(true);
    setShowSearchInput(false);

    const productsRef = ref(database, "quotations/inventory");
    const groupsRef = ref(database, "quotations/inventoryGrp");

    const productsListener = onValue(
      productsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const productList: Product[] = Object.entries(data)
            .map(([key, value]: any) => ({
              id: key,
              productId: value.productId || "",
              productName: value.productName || "Unnamed Product",
              stock: value.stock || 0,
              unit: value.unit || "pcs",
              notes: value.notes,
              category: value.category,
              createdAt: value.createdAt || 0,
              updatedAt: value.updatedAt || 0,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt);
          setProducts(productList);
        } else {
          setProducts([]);
        }
      },
      (error) => {
        console.error("Firebase error:", error);
        toast.error("Failed to load products");
      }
    );

    const groupsListener = onValue(
      groupsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const groupsList: InventoryGroup[] = Object.entries(data).map(
            ([key, value]: any) => ({
              id: key,
              ...value,
            })
          );

          const filteredGroups = groupsList.filter((group) => {
            if (!group.items || !Array.isArray(group.items)) return false;

            return group.items.some((item) => item.inventoryType === "product");
          });

          setInventoryGroups(filteredGroups);
        } else {
          setInventoryGroups([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firebase groups error:", error);
        setInventoryGroups([]);
        setLoading(false);
      }
    );

    return () => {
      off(productsRef, "value", productsListener);
      off(groupsRef, "value", groupsListener);
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
    if (
      showHistoryModal ||
      showAdjustModal ||
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
  }, [showHistoryModal, showAdjustModal, showGroupFilter, showStockFilter]);

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
      toast.error("Please enter a quantity");
      return;
    }

    try {
      let quantityChange = parseFloat(adjustQuantity);

      if (isNaN(quantityChange) || quantityChange <= 0) {
        toast.error("Please enter a valid positive quantity");
        return;
      }

      if (adjustType === "reduce") {
        quantityChange = -quantityChange;
      }

      const productRef = ref(
        database,
        `quotations/inventory/${selectedProduct.id}`
      );
      const snapshot = await get(productRef);
      const currentProduct = snapshot.val();

      if (!currentProduct) {
        toast.error("Product not found");
        return;
      }

      const currentStock = currentProduct.stock || 0;
      const newStock = currentStock + quantityChange;

      if (newStock < 0) {
        toast.error("Stock cannot be negative");
        return;
      }

      const userInfo = user
        ? user.displayName || user.email || user.uid
        : "Unknown User";
      const finalNote = adjustNote
        ? `${adjustNote} (By: ${userInfo})`
        : `${quantityChange > 0 ? "Added" : "Removed"} stock (By: ${userInfo})`;

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

      toast.success(
        `Stock ${quantityChange > 0 ? "added" : "removed"} successfully`
      );

      setShowAdjustModal(false);
      setAdjustQuantity("");
      setAdjustNote("");
      setSelectedProduct(null);
    } catch (err: any) {
      console.error("Transaction error:", err);
      toast.error(err.message || "Failed to record transaction");
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
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdjust = (product: Product, type: "add" | "reduce") => {
    setSelectedProduct(product);
    setAdjustType(type);
    setAdjustQuantity("");
    setAdjustNote("");
    setShowAdjustModal(true);
  };

  const getGroupProducts = (groupId: string): Product[] => {
    const group = inventoryGroups.find((g) => g.id === groupId);
    if (!group) return [];
    const productItems = group.items.filter(
      (item) => item.inventoryType === "product"
    );
    const groupProductIds = new Set(productItems.map((item) => item.productId));

    return products.filter((product) => groupProductIds.has(product.productId));
  };

  const getFilteredProducts = () => {
    let filtered = selectedGroup ? getGroupProducts(selectedGroup) : products;

    if (stockFilter === "low") {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 10);
    } else if (stockFilter === "out") {
      filtered = filtered.filter((p) => p.stock === 0);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.productId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  return {
    products,
    searchTerm,
    setSearchTerm,
    selectedProduct,
    setSelectedProduct,
    showHistoryModal,
    setShowHistoryModal,
    showAdjustModal,
    setShowAdjustModal,
    productTransactions,
    setProductTransactions,
    loading,
    adjustQuantity,
    setAdjustQuantity,
    adjustNote,
    setAdjustNote,
    adjustType,
    setAdjustType,
    stockFilter,
    setStockFilter,
    inventoryGroups,
    selectedGroup,
    setSelectedGroup,
    searchInputRef,
    adjustInputRef,
    headerRef,
    groupFilterRef,
    stockFilterRef,
    headerHeight,
    showHeader,
    showSearchInput,
    setShowSearchInput,
    showGroupFilter,
    setShowGroupFilter,
    showStockFilter,
    setShowStockFilter,
    toggleSearch,
    handleAdjustStock,
    handleViewHistory,
    handleQuickAdjust,
    getFilteredProducts,
  };
}

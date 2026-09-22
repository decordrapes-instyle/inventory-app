// src/pages/NotificationsPage.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation, useBackHandler } from "../context/NavigationContext";
import { loadFirebase } from "../config/firebaseLoader";
import { database } from "../config/firebase";
import { cache } from "../lib/cache";
import {
  ArrowLeft, History, Package, TrendingUp, TrendingDown,
  Users, Calendar, Clock, X, ChevronDown, Check,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "../components/ui/popover";
import { Calendar as CalendarComponent } from "../components/ui/calender";
import { format } from "date-fns";

const { ref, get } = await loadFirebase();
const SAFE_TOP = "env(safe-area-inset-top, 0px)";

interface Transaction {
  id: string;
  productId: string;
  productName: string;
  quantityChange: number;
  unit: string;
  source: "quotation" | "manual" | "purchase";
  quotationId?: string;
  purchaseId?: string;
  note?: string;
  createdAt: number;
  performedBy?: string;
  performedByName?: string;
  performedByImage?: string;
  performedByRole?: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  profileImage: string;
  role: string;
}

const TX_CACHE = "notifications:tx";
const TX_SIG = "notifications:sig";

const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children }) => {
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startT = useRef(0);

  useEffect(() => {
    if (!open) { setDragY(0); dragging.current = false; }
  }, [open]);

  const begin = (y: number) => {
    dragging.current = true;
    startY.current = y;
    startT.current = performance.now();
  };
  const move = (y: number) => {
    if (!dragging.current) return;
    const d = y - startY.current;
    if (d > 0) setDragY(d);
  };
  const end = (y: number) => {
    if (!dragging.current) return;
    const d = y - startY.current;
    const v = d / Math.max(1, performance.now() - startT.current);
    dragging.current = false;
    if (d > 120 || v > 0.5) onClose();
    else setDragY(0);
  };

  if (!open) return null;
  const backdropOpacity = Math.max(0.25, 1 - dragY / 500);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity * 0.6, transition: "opacity 150ms" }}
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 rounded-t-[28px] overflow-hidden shadow-2xl"
        style={{
          maxHeight: "92vh",
          transform: `translateY(${dragY}px)`,
          transition: dragging.current
            ? "none"
            : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          touchAction: "none",
        }}
      >
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onTouchStart={(e) => begin(e.touches[0].clientY)}
          onTouchMove={(e) => move(e.touches[0].clientY)}
          onTouchEnd={(e) => end(e.changedTouches[0].clientY)}
          onMouseDown={(e) => {
            begin(e.clientY);
            const mv = (ev: MouseEvent) => move(ev.clientY);
            const up = (ev: MouseEvent) => {
              end(ev.clientY);
              document.removeEventListener("mousemove", mv);
              document.removeEventListener("mouseup", up);
            };
            document.addEventListener("mousemove", mv);
            document.addEventListener("mouseup", up);
          }}
        >
          <div className="w-10 h-1.5 bg-black/25 dark:bg-white/25 rounded-full" />
        </div>

        {(title || subtitle) && (
          <div className="px-5 pb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && (
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        )}

        <div
          className="overflow-y-auto overscroll-contain"
          style={{ maxHeight: "calc(92vh - 80px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const CountUp: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const [count, setCount] = useState(value);
  useEffect(() => {
    let start = count;
    const end = value;
    if (start === end) return;
    const duration = 300;
    const step = (end - start) / (duration / 16);
    let cur = start;
    const id = setInterval(() => {
      cur += step;
      if ((step > 0 && cur >= end) || (step < 0 && cur <= end)) {
        cur = end;
        clearInterval(id);
      }
      setCount(Math.floor(cur));
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className={className}>{count}</span>;
};

const Avatar: React.FC<{
  name?: string;
  src?: string;
  size?: number;
}> = ({ name, src, size = 24 }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name || ""}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-800"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center"
    >
      <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
        {name?.charAt(0)?.toUpperCase() || "?"}
      </span>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { goBack } = useNavigation();

  const [transactions, setTransactions] = useState<Transaction[]>(
    () => cache.get<Transaction[]>(TX_CACHE) ?? []
  );
  const [loading, setLoading] = useState(() => !cache.get<Transaction[]>(TX_CACHE));
  const [userRole, setUserRole] = useState<string>("production");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "today" | "yesterday" | "last7" | "all" | "specific"
  >("today");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTeamSheet, setShowTeamSheet] = useState(false);
  const sigRef = useRef<string>(cache.get<string>(TX_SIG) ?? "");

  /* ---------- back button ---------- */
  useBackHandler(showTeamSheet, () => setShowTeamSheet(false));
  useBackHandler(showDatePicker, () => setShowDatePicker(false));

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await get(ref(database, `users/${user.uid}`));
        if (snap.exists()) {
          const r = snap.val()?.role || "production";
          setUserRole(r);
          if (r === "admin") await fetchAllUsers();
        }
      } catch (e) {
        console.error("[notif] role", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAllUsers = async () => {
    try {
      const snap = await get(ref(database, "users"));
      if (!snap.exists()) return;
      const list: UserProfile[] = [];
      snap.forEach((child) => {
        const v: any = child.val();
        if (v) {
          list.push({
            uid: child.key!,
            displayName: v.displayName || v.email?.split("@")[0] || "User",
            email: v.email || "",
            profileImage: v.profileImage || "",
            role: v.role || "production",
          });
        }
      });
      setAllUsers(list);
    } catch (e) {
      console.error("[notif] users", e);
    }
  };

  const getUserIdentifiers = () => {
    if (!user) return [];
    return [
      ...new Set(
        [user.uid, user.email, user.displayName, user.email?.split("@")[0]]
          .filter(Boolean) as string[]
      ),
    ];
  };

  const enrich = async (flat: any[], users: UserProfile[]) => {
    const ids = getUserIdentifiers();
    const isAdmin = userRole === "admin";
    const out: Transaction[] = [];

    for (const t of flat) {
      if (!t.performedBy) continue;
      if (!isAdmin) {
        const match = ids.some(
          (i) => String(i).toLowerCase() === String(t.performedBy).toLowerCase()
        );
        if (!match) continue;
      }
      let name = t.performedBy;
      let image = "";
      let role = "";
      if (users.length) {
        const found = users.find((u) => {
          const uids = [u.uid, u.email, u.displayName, u.email?.split("@")[0]]
            .filter(Boolean) as string[];
          return uids.some(
            (i) => String(i).toLowerCase() === String(t.performedBy).toLowerCase()
          );
        });
        if (found) {
          name = found.displayName;
          image = found.profileImage;
          role = found.role;
        }
      }
      out.push({ ...t, performedByName: name, performedByImage: image, performedByRole: role });
    }
    return out;
  };

  useEffect(() => {
    const txRef = ref(database, "quotations/inventoryTransactions");

    const run = async () => {
      try {
        const snap = await get(txRef);
        if (!snap.exists()) {
          setTransactions([]);
          cache.set(TX_CACHE, []);
          cache.set(TX_SIG, "0:0");
          setLoading(false);
          return;
        }
        const data = snap.val();
        let total = 0;
        let latest = 0;
        const flat: any[] = [];
        for (const pid in data) {
          for (const tid in data[pid]) {
            total++;
            const tx = data[pid][tid] || {};
            const ts = tx.createdAt || 0;
            if (ts > latest) latest = ts;
            flat.push({ id: tid, productId: pid, ...tx });
          }
        }
        const sig = `${total}:${latest}`;
        if (sig === sigRef.current) {
          setLoading(false);
          return;
        }
        sigRef.current = sig;
        cache.set(TX_SIG, sig);

        const enriched = await enrich(flat, allUsers);
        enriched.sort((a, b) => b.createdAt - a.createdAt);
        setTransactions(enriched);
        cache.set(TX_CACHE, enriched);
      } catch (e: any) {
        console.error("[notif] tx", e);
        toast.error("Failed to load activities");
      } finally {
        setLoading(false);
      }
    };

    run();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, allUsers.length]);

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (selectedFilter === "specific" && selectedDate) {
      const s = new Date(selectedDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      filtered = filtered.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= s && d < e;
      });
    } else {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      const l7Start = new Date(todayStart);
      l7Start.setDate(l7Start.getDate() - 7);
      switch (selectedFilter) {
        case "today":
          filtered = filtered.filter((t) => new Date(t.createdAt) >= todayStart);
          break;
        case "yesterday":
          filtered = filtered.filter((t) => {
            const d = new Date(t.createdAt);
            return d >= yStart && d < todayStart;
          });
          break;
        case "last7":
          filtered = filtered.filter((t) => new Date(t.createdAt) >= l7Start);
          break;
        case "all":
          break;
      }
    }
    if (userRole === "admin" && selectedUser !== "all") {
      const su = allUsers.find((u) => u.uid === selectedUser);
      if (su) {
        const uids = [su.uid, su.email, su.displayName, su.email?.split("@")[0]]
          .filter(Boolean) as string[];
        filtered = filtered.filter((t) => {
          const tu = t.performedBy || t.performedByName || "";
          return uids.some(
            (i) => String(i).toLowerCase() === String(tu).toLowerCase()
          );
        });
      }
    }
    return filtered;
  }, [transactions, selectedFilter, selectedDate, selectedUser, userRole, allUsers]);

  const getTotalForPeriod = (period: "today" | "yesterday" | "last7" | "all") => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yStart = new Date(todayStart);
    yStart.setDate(yStart.getDate() - 1);
    const l7Start = new Date(todayStart);
    l7Start.setDate(l7Start.getDate() - 7);
    let f = [...transactions];
    switch (period) {
      case "today":
        f = f.filter((t) => new Date(t.createdAt) >= todayStart);
        break;
      case "yesterday":
        f = f.filter((t) => {
          const d = new Date(t.createdAt);
          return d >= yStart && d < todayStart;
        });
        break;
      case "last7":
        f = f.filter((t) => new Date(t.createdAt) >= l7Start);
        break;
      case "all":
        break;
    }
    return f.length;
  };

  const formatDate = (d?: Date) => (d ? format(d, "PPP") : "");

  const selectedTeamUser = allUsers.find((u) => u.uid === selectedUser);

  const contextLabel = useMemo(() => {
    if (selectedFilter === "specific" && selectedDate)
      return formatDate(selectedDate);
    const period =
      selectedFilter === "today"
        ? "Today"
        : selectedFilter === "yesterday"
        ? "Yesterday"
        : selectedFilter === "last7"
        ? "Last 7 days"
        : "All time";
    if (userRole === "admin" && selectedTeamUser)
      return `${selectedTeamUser.displayName} · ${period}`;
    if (userRole === "admin") return `All team · ${period}`;
    return period;
  }, [selectedFilter, selectedDate, userRole, selectedTeamUser]);

  const renderCard = (t: Transaction) => {
    const positive = t.quantityChange > 0;
    return (
      <div
        key={t.id}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800
          bg-white dark:bg-neutral-950 overflow-hidden
          shadow-[0_1px_2px_rgba(0,0,0,0.03)]
          hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-shadow"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                positive
                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                  : "bg-rose-50 dark:bg-rose-900/20"
              }`}
            >
              {positive ? (
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-lg text-neutral-900 dark:text-white tabular-nums">
                    {positive ? "+" : ""}
                    {Number(t.quantityChange).toFixed(2)}{" "}
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      {t.unit}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                    <Package size={13} className="shrink-0" />
                    <span className="truncate">{t.productName}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {new Date(t.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-500 tabular-nums">
                    {new Date(t.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {userRole === "admin" && t.performedByName && (
            <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
              <Avatar
                name={t.performedByName}
                src={t.performedByImage}
                size={24}
              />
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {t.performedByName}
              </p>
              {t.performedByRole && (
                <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full">
                  {t.performedByRole}
                </span>
              )}
            </div>
          )}

          {t.note && (
            <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60">
              <p className="text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                "{t.note}"
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="capitalize px-2 py-1 bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 rounded-md font-medium">
              {t.source}
            </span>
            <span className="text-neutral-500 dark:text-neutral-500">
              {t.quotationId
                ? "From Quotation"
                : t.purchaseId
                ? "From Purchase"
                : "Manual Entry"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black">
        <div style={{ height: SAFE_TOP }} />
        <div className="h-14 flex items-center px-3 gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-900 animate-pulse" />
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-900 rounded animate-pulse" />
        </div>
        <div className="px-4 pt-3 space-y-3">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-900 rounded-full animate-pulse" />
          <div className="h-24 bg-neutral-200 dark:bg-neutral-900 rounded-2xl animate-pulse" />
          <div className="h-24 bg-neutral-200 dark:bg-neutral-900 rounded-2xl animate-pulse" />
          <div className="h-24 bg-neutral-200 dark:bg-neutral-900 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black pb-20">
      <header
        style={{ paddingTop: SAFE_TOP }}
        className="sticky top-0 z-30 bg-white/85 dark:bg-black/85 backdrop-blur-xl
          shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.10)]
          dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_28px_-14px_rgba(0,0,0,0.8)]"
      >
        <div className="h-14 flex items-center px-3 gap-2">
          <button
            onClick={goBack}
            className="p-2 -ml-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold truncate flex-1 ml-1">
            {userRole === "admin" ? "Team Activities" : "Activities"}
          </h1>
          {userRole === "admin" && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full
              bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Admin
            </span>
          )}
        </div>
      </header>

      <div className="px-4 pt-3">
        <div className="-mx-4 px-4 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {(["today", "yesterday", "last7", "all"] as const).map((f) => {
            const label =
              f === "today"
                ? "Today"
                : f === "yesterday"
                ? "Yesterday"
                : f === "last7"
                ? "7 days"
                : "All";
            const active = selectedFilter === f;
            return (
              <button
                key={f}
                onClick={() => {
                  setSelectedFilter(f);
                  setSelectedDate(undefined);
                }}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                  active
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black shadow-sm"
                    : "bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <span>{label}</span>
                <span className={`tabular-nums ${active ? "opacity-60" : "opacity-50"}`}>
                  {getTotalForPeriod(f)}
                </span>
              </button>
            );
          })}

          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <button
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                  selectedFilter === "specific"
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black shadow-sm"
                    : "bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>
                  {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-full sm:w-auto p-0"
              align="start"
              side="bottom"
              sideOffset={8}
            >
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(d: any) => {
                  if (d) {
                    setSelectedDate(d);
                    setSelectedFilter("specific");
                    setShowDatePicker(false);
                  }
                }}
                initialFocus
                className="rounded-lg border shadow-lg"
              />
              {selectedDate && (
                <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {formatDate(selectedDate)}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedDate(undefined);
                      setSelectedFilter("today");
                      setShowDatePicker(false);
                    }}
                    className="text-sm text-rose-500 hover:text-rose-600"
                  >
                    Clear
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {userRole === "admin" && allUsers.length > 0 && (
            <button
              onClick={() => setShowTeamSheet(true)}
              className={`shrink-0 h-8 pl-1.5 pr-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                selectedUser !== "all"
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black shadow-sm"
                  : "bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {selectedTeamUser ? (
                <Avatar
                  name={selectedTeamUser.displayName}
                  src={selectedTeamUser.profileImage}
                  size={22}
                />
              ) : (
                <Users className="w-3.5 h-3.5 ml-0.5" />
              )}
              <span className="truncate max-w-[90px]">
                {selectedTeamUser
                  ? selectedTeamUser.displayName.split(" ")[0]
                  : "Team"}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pb-3 pt-1">
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-neutral-500 dark:text-neutral-500 truncate">
            {contextLabel}
          </span>
          <CountUp
            value={filteredTransactions.length}
            className="text-[11px] font-bold tabular-nums text-neutral-700 dark:text-neutral-300"
          />
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <History className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
            </div>
            <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              No activities
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 max-w-xs mx-auto">
              {selectedFilter === "today"
                ? "Nothing recorded today."
                : selectedFilter === "yesterday"
                ? "Nothing recorded yesterday."
                : selectedFilter === "last7"
                ? "Nothing recorded in the last 7 days."
                : selectedFilter === "specific" && selectedDate
                ? `Nothing recorded on ${formatDate(selectedDate)}.`
                : "No activities found."}
            </p>
            {(selectedFilter !== "all" || selectedUser !== "all" || selectedDate) && (
              <button
                onClick={() => {
                  setSelectedFilter("all");
                  setSelectedUser("all");
                  setSelectedDate(undefined);
                }}
                className="px-4 py-2 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black rounded-xl text-sm font-medium active:scale-95 transition"
              >
                Show all activities
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTransactions.map(renderCard)}
          </div>
        )}
      </div>

      <Sheet
        open={showTeamSheet}
        onClose={() => setShowTeamSheet(false)}
        title="Filter by team member"
        subtitle={
          selectedTeamUser
            ? `Viewing ${selectedTeamUser.displayName}'s activities`
            : "Showing all team members"
        }
      >
        <div className="p-4 space-y-2">
          <button
            onClick={() => {
              setSelectedUser("all");
              setShowTeamSheet(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition active:scale-[0.98] ${
              selectedUser === "all"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                : "bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                selectedUser === "all"
                  ? "bg-white/20"
                  : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-[15px]">All team</p>
              <p className="text-xs opacity-70 mt-0.5">
                {allUsers.length} members
              </p>
            </div>
            {selectedUser === "all" && <Check className="w-5 h-5" />}
          </button>

          {allUsers.map((u) => {
            const active = selectedUser === u.uid;
            return (
              <button
                key={u.uid}
                onClick={() => {
                  setSelectedUser(u.uid);
                  setShowTeamSheet(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition active:scale-[0.98] ${
                  active
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black"
                    : "bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                <Avatar name={u.displayName} src={u.profileImage} size={36} />
                <div className="text-left flex-1 min-w-0">
                  <p className="font-semibold text-[15px] truncate">
                    {u.displayName}
                  </p>
                  <p
                    className={`text-xs mt-0.5 capitalize ${
                      active ? "opacity-70" : "opacity-60"
                    }`}
                  >
                    {u.role}
                  </p>
                </div>
                {active && <Check className="w-5 h-5 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="h-4" />
      </Sheet>
    </div>
  );
};

export default NotificationsPage;
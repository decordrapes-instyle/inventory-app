import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  ArrowLeft, History, Package, TrendingUp, TrendingDown,
  Users, Calendar, Clock, X} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar as CalendarComponent } from "../components/ui/calender";
import { format } from "date-fns";

interface Transaction {
  id: string;
  productId: string;
  productName: string;
  quantityChange: number;
  unit: string;
  source: 'quotation' | 'manual' | 'purchase';
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

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('production');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'yesterday' | 'last7' | 'all' | 'specific'>('today');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch current user's role
  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      if (!user) return;
      
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserRole(userData.role || 'production');
          
          if (userData.role === 'admin') {
            await fetchAllUsers();
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('production');
      }
    };

    fetchCurrentUserRole();
  }, [user]);

  // Fetch all users for admin view
  const fetchAllUsers = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList: UserProfile[] = [];
        
        Object.keys(usersData).forEach(uid => {
          if (usersData[uid]) {
            usersList.push({
              uid,
              displayName: usersData[uid].displayName || usersData[uid].email?.split('@')[0] || 'User',
              email: usersData[uid].email || '',
              profileImage: usersData[uid].profileImage || '',
              role: usersData[uid].role || 'production'
            });
          }
        });
        
        setAllUsers(usersList);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Get user identifiers for matching transactions
  const getUserIdentifiers = () => {
    if (!user) return [];
    const identifiers = [
      user.uid,
      user.email,
      user.displayName,
      user.email?.split('@')[0]
    ].filter(Boolean) as string[];
    
    return [...new Set(identifiers)];
  };

  // Enrich transactions with user data
  const enrichTransactionsWithUserData = async (transactionsData: any[]) => {
    const enrichedTransactions: Transaction[] = [];
    const userIdentifiers = getUserIdentifiers();
    const isAdmin = userRole === 'admin';

    for (const transaction of transactionsData) {
      if (!transaction.performedBy) continue;

      // For production users, check if transaction belongs to them
      if (!isAdmin) {
        const transactionPerformedBy = String(transaction.performedBy).toLowerCase();
        const userMatches = userIdentifiers.some(id => 
          String(id).toLowerCase() === transactionPerformedBy
        );
        
        if (!userMatches) continue;
      }

      // Find user details
      let userName = transaction.performedBy;
      let userImage = '';
      let userRole = '';

      if (allUsers.length > 0) {
        const foundUser = allUsers.find(u => {
          const userIdentifiers = [
            u.uid,
            u.email,
            u.displayName,
            u.email?.split('@')[0]
          ].filter(Boolean) as string[];
          
          return userIdentifiers.some(id => 
            String(id).toLowerCase() === String(transaction.performedBy).toLowerCase()
          );
        });
        
        if (foundUser) {
          userName = foundUser.displayName;
          userImage = foundUser.profileImage;
          userRole = foundUser.role;
        }
      }

      enrichedTransactions.push({
        ...transaction,
        id: transaction.id || Math.random().toString(),
        performedByName: userName,
        performedByImage: userImage,
        performedByRole: userRole
      });
    }
    
    return enrichedTransactions;
  };

  // Fetch transactions
  useEffect(() => {
    const transactionsRef = ref(database, 'quotations/inventoryTransactions');
    setLoading(true);

    const fetchTransactions = async () => {
      try {
        const snapshot = await get(transactionsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const allTransactions: any[] = [];
          
          Object.keys(data).forEach(productId => {
            const productTransactions = data[productId];
            if (productTransactions && typeof productTransactions === 'object') {
              Object.keys(productTransactions).forEach(transactionId => {
                const transactionData = productTransactions[transactionId];
                if (transactionData) {
                  allTransactions.push({
                    id: transactionId,
                    productId,
                    ...transactionData,
                  });
                }
              });
            }
          });

          const enrichedTransactions = await enrichTransactionsWithUserData(allTransactions);
          const sortedTransactions = enrichedTransactions.sort((a, b) => 
            b.createdAt - a.createdAt
          );
          
          setTransactions(sortedTransactions);
        } else {
          setTransactions([]);
        }
      } catch (err: any) {
        console.error('Error loading transactions:', err);
        toast.error('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    const unsubscribe = onValue(transactionsRef, () => {
      fetchTransactions();
    });

    return () => unsubscribe();
  }, [user, userRole, allUsers]);

  // Filter transactions
  useEffect(() => {
    let filtered = [...transactions];
    
    if (selectedFilter === 'specific' && selectedDate) {
      const selectedStart = new Date(selectedDate);
      selectedStart.setHours(0, 0, 0, 0);
      const selectedEnd = new Date(selectedStart);
      selectedEnd.setDate(selectedEnd.getDate() + 1);
      
      filtered = filtered.filter(t => {
        const date = new Date(t.createdAt);
        return date >= selectedStart && date < selectedEnd;
      });
    } else {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const last7DaysStart = new Date(todayStart);
      last7DaysStart.setDate(last7DaysStart.getDate() - 7);
      
      switch (selectedFilter) {
        case 'today':
          filtered = filtered.filter(t => new Date(t.createdAt) >= todayStart);
          break;
        case 'yesterday':
          filtered = filtered.filter(t => {
            const date = new Date(t.createdAt);
            return date >= yesterdayStart && date < todayStart;
          });
          break;
        case 'last7':
          filtered = filtered.filter(t => new Date(t.createdAt) >= last7DaysStart);
          break;
        case 'all':
          break;
      }
    }
    
    if (userRole === 'admin' && selectedUser !== 'all') {
      const selectedUserData = allUsers.find(u => u.uid === selectedUser);
      if (selectedUserData) {
        const userIdentifiers = [
          selectedUserData.uid,
          selectedUserData.email,
          selectedUserData.displayName,
          selectedUserData.email?.split('@')[0]
        ].filter(Boolean) as string[];
        
        filtered = filtered.filter(t => {
          const transactionUser = t.performedBy || t.performedByName || '';
          return userIdentifiers.some(id => 
            String(id).toLowerCase() === String(transactionUser).toLowerCase()
          );
        });
      }
    }
    
    setFilteredTransactions(filtered);
  }, [transactions, selectedFilter, selectedDate, selectedUser, userRole, allUsers]);

  // Get total count for each period
  const getTotalForPeriod = (period: 'today' | 'yesterday' | 'last7' | 'all') => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const last7DaysStart = new Date(todayStart);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);
    
    let filtered = [...transactions];
    
    switch (period) {
      case 'today':
        filtered = filtered.filter(t => new Date(t.createdAt) >= todayStart);
        break;
      case 'yesterday':
        filtered = filtered.filter(t => {
          const date = new Date(t.createdAt);
          return date >= yesterdayStart && date < todayStart;
        });
        break;
      case 'last7':
        filtered = filtered.filter(t => new Date(t.createdAt) >= last7DaysStart);
        break;
      case 'all':
        break;
    }
    
    return filtered.length;
  };

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return format(date, "PPP"); // e.g., "January 15th, 2023"
  };

  // Render transaction card
  const renderTransactionCard = (transaction: Transaction) => (
    <div key={transaction.id} className="mb-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${transaction.quantityChange > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {transaction.quantityChange > 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-lg text-gray-900 dark:text-white block">
                    {`${transaction.quantityChange > 0 ? '+' : ''}${Number(transaction.quantityChange).toFixed(2)} ${transaction.unit}`}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <Package size={14} /> {transaction.productName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </p>
                </div>
              </div>

              {/* User info for admin */}
              {userRole === 'admin' && transaction.performedByName && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  {transaction.performedByImage ? (
                    <img 
                      src={transaction.performedByImage} 
                      alt={transaction.performedByName}
                      className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        // const parent = (e.target as HTMLImageElement).parentElement;
                        // if (parent) {
                        //   const fallback = document.createElement('div');
                        //   fallback.className = 'w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center';
                        //   fallback.innerHTML = `<span class="text-xs font-medium text-blue-600 dark:text-blue-300">${transaction.performedByName.charAt(0).toUpperCase()}</span>`;
                        //   parent.appendChild(fallback);
                        // }
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-300">
                        {transaction.performedByName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {transaction.performedByName}
                    </p>
                  </div>
                  {transaction.performedByRole && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {transaction.performedByRole}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {transaction.note && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">"{transaction.note}"</p>
          </div>
        )}
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="capitalize px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
            {transaction.source}
          </span>
          <span>
            {transaction.quotationId ? 'From Quotation' : transaction.purchaseId ? 'From Purchase' : 'Manual Entry'}
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading Activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {userRole === 'admin' ? 'Team Activities' : 'My Activities'}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userRole === 'admin' ? 'Monitor all team members' : 'Track your production work'}
                </p>
              </div>
            </div>
            {userRole === 'admin' && (
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Admin</span>
              </div>
            )}
          </div>

          {/* Time Period Filters - Responsive */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setSelectedFilter('today');
                setSelectedDate(undefined);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${selectedFilter === 'today' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'}`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden xs:inline">Today</span>
              <span className="ml-1">({getTotalForPeriod('today')})</span>
            </button>
            
            <button
              onClick={() => {
                setSelectedFilter('yesterday');
                setSelectedDate(undefined);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${selectedFilter === 'yesterday' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'}`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden xs:inline">Yesterday</span>
              <span className="ml-1">({getTotalForPeriod('yesterday')})</span>
            </button>
            
            <button
              onClick={() => {
                setSelectedFilter('last7');
                setSelectedDate(undefined);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${selectedFilter === 'last7' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'}`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">7 Days</span>
              <span className="hidden xs:inline sm:hidden">7D</span>
              <span className="ml-1">({getTotalForPeriod('last7')})</span>
            </button>
            
            <button
              onClick={() => {
                setSelectedFilter('all');
                setSelectedDate(undefined);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${selectedFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'}`}
            >
              <History className="w-4 h-4" />
              <span className="hidden xs:inline">All</span>
              <span className="ml-1">({getTotalForPeriod('all')})</span>
            </button>
            
            {/* Shadcn Calendar Picker */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <button
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${selectedFilter === 'specific' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700'}`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden xs:inline">
                    {selectedDate ? format(selectedDate, "MMM d") : 'Date'}
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
                  onSelect={(date: React.SetStateAction<Date | undefined>) => {
                    if (date) {
                      setSelectedDate(date);
                      setSelectedFilter('specific');
                      setShowDatePicker(false);
                    }
                  }}
                  initialFocus
                  className="rounded-lg border shadow-lg"
                />
                {selectedDate && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Selected: {formatDate(selectedDate)}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDate(undefined);
                          setSelectedFilter('today');
                          setShowDatePicker(false);
                        }}
                        className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Date Display */}
          {selectedFilter === 'specific' && selectedDate && (
            <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {formatDate(selectedDate)}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedDate(undefined);
                  setSelectedFilter('today');
                }}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded"
              >
                <X className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </button>
            </div>
          )}
        </div>

        {/* Team Members Filter - Admin Only */}
        {userRole === 'admin' && allUsers.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Team Member
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedUser === 'all' ? 'All Members' : 'Filtered'}
              </div>
            </div>
            
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedUser('all')}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border ${selectedUser === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    All Team
                  </span>
                </button>
                
                {allUsers.map((teamUser) => (
                  <button
                    key={teamUser.uid}
                    onClick={() => setSelectedUser(selectedUser === teamUser.uid ? 'all' : teamUser.uid)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border ${selectedUser === teamUser.uid ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                  >
                    {teamUser.profileImage ? (
                      <img 
                        src={teamUser.profileImage} 
                        alt={teamUser.displayName}
                        className="w-8 h-8 rounded-full object-cover border border-white dark:border-gray-800"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center';
                            fallback.innerHTML = `<span class="text-sm font-semibold text-gray-600 dark:text-gray-300">${teamUser.displayName.charAt(0).toUpperCase()}</span>`;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {teamUser.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="text-left">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block truncate max-w-[80px]">
                        {teamUser.displayName.split(' ')[0]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {teamUser.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {selectedUser !== 'all' && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Filtered: 
                  <span className="font-semibold text-gray-900 dark:text-white ml-1">
                    {allUsers.find(u => u.uid === selectedUser)?.displayName}
                  </span>
                </span>
                <button
                  onClick={() => setSelectedUser('all')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="p-4">
        {/* Summary */}
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                {selectedFilter === 'today' && "Today's Work"}
                {selectedFilter === 'yesterday' && "Yesterday's Work"}
                {selectedFilter === 'last7' && "Last 7 Days Work"}
                {selectedFilter === 'all' && "All Activities"}
                {selectedFilter === 'specific' && selectedDate && "Selected Date"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedFilter === 'specific' && selectedDate 
                  ? formatDate(selectedDate)
                  : userRole === 'admin' && selectedUser !== 'all' 
                  ? `${allUsers.find(u => u.uid === selectedUser)?.displayName}'s activities`
                  : userRole === 'admin' 
                  ? 'All team members'
                  : 'Your activities'
                }
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredTransactions.length}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Activities</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <History className="w-8 h-8 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Activities Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {selectedFilter === 'today' 
                ? "No activities recorded for today"
                : selectedFilter === 'yesterday'
                ? "No activities recorded for yesterday"
                : selectedFilter === 'last7'
                ? "No activities in the last 7 days"
                : selectedFilter === 'specific' && selectedDate
                ? `No activities found for ${formatDate(selectedDate)}`
                : "No activities found"
              }
            </p>
            {(selectedFilter !== 'all' || selectedUser !== 'all' || selectedDate) && (
              <button
                onClick={() => {
                  setSelectedFilter('all');
                  setSelectedUser('all');
                  setSelectedDate(undefined);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Show All Activities
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTransactions.map(renderTransactionCard)}
          </div>
        )}
      </div>

      {/* Custom scrollbar hide */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @media (max-width: 475px) {
          .xs\\:inline {
            display: inline !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationsPage;
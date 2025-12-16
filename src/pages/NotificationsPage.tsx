import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  ArrowLeft, History, Package, TrendingUp, TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const transactionsRef = ref(database, 'quotations/inventoryTransactions');
    setLoading(true);

    const fetchTransactions = async () => {
      try {
        const snapshot = await get(transactionsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const allTransactions: Transaction[] = [];
          Object.keys(data).forEach(productId => {
            const productTransactions = data[productId];
            Object.keys(productTransactions).forEach(transactionId => {
              allTransactions.push({
                id: transactionId,
                ...productTransactions[transactionId],
              });
            });
          });
          
          const userIdentifier = user ? (user.displayName && user.email || user.uid) : null;
          const userTransactions = allTransactions.filter(t => t.performedBy === userIdentifier);
          const sortedTransactions = userTransactions.sort((a, b) => b.createdAt - a.createdAt);
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

    const unsubscribe = onValue(transactionsRef, (_snapshot) => {
        fetchTransactions();
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading Your Activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-safe min-h-screen bg-white dark:bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-900 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">My Activity</h1>
        </div>
      </div>

      <div className="p-4">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              You haven't performed any transactions yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize flex items-center gap-2">
                          <Package size={14} /> {transaction.productName}
                      </p>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
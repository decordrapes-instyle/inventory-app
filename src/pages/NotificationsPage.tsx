import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { 
  ArrowLeft, Bell, Package, TrendingUp, 
  Calendar, AlertCircle, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
  id: string;
  type: 'stock_update' | 'low_stock' | 'out_of_stock' | 'transaction';
  title: string;
  message: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  read: boolean;
  createdAt: number;
}

const NotificationsPage: React.FC = () => {
  useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const notificationsRef = ref(database, 'notifications');
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notificationsList = Object.entries(data)
          .map(([key, value]: any) => ({
            id: key,
            ...value,
          }))
          .sort((a: NotificationItem, b: NotificationItem) => b.createdAt - a.createdAt);
        
        setNotifications(notificationsList);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = (id: string) => {
    // Implement mark as read functionality
    console.log('Mark as read:', id);
  };

  const markAllAsRead = () => {
    // Implement mark all as read functionality
    console.log('Mark all as read');
  };

  const deleteNotification = (id: string) => {
    // Implement delete functionality
    console.log('Delete notification:', id);
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-900 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {notifications.filter(n => !n.read).length} unread
          </p>
        </div>
        <button
          onClick={markAllAsRead}
          className="text-sm text-blue-500 dark:text-blue-400 font-medium"
        >
          Mark all read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-900">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
              : 'text-gray-600 dark:text-gray-400'}`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'unread' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
              : 'text-gray-600 dark:text-gray-400'}`}
          >
            Unread ({notifications.filter(n => !n.read).length})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border ${notification.read 
                  ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800' 
                  : 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2.5 rounded-lg ${
                      notification.type === 'stock_update' ? 'bg-green-100 dark:bg-green-900/30' :
                      notification.type === 'low_stock' ? 'bg-orange-100 dark:bg-orange-900/30' :
                      notification.type === 'out_of_stock' ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {notification.type === 'stock_update' ? (
                        <TrendingUp className={`w-5 h-5 ${
                          notification.quantity && notification.quantity > 0 
                            ? 'text-green-500 dark:text-green-400' 
                            : 'text-red-500 dark:text-red-400'
                        }`} />
                      ) : notification.type === 'low_stock' || notification.type === 'out_of_stock' ? (
                        <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                      ) : (
                        <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white">{notification.title}</h3>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>
                      
                      {notification.productName && (
                        <div className="mt-2 flex items-center gap-2">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {notification.productName}
                            {notification.quantity && ` (${notification.quantity > 0 ? '+' : ''}${notification.quantity} ${notification.unit})`}
                          </span>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(notification.createdAt).toLocaleDateString()}
                          <span className="mx-1">•</span>
                          {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
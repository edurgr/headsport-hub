'use client';

import { useEffect, useState, useCallback } from 'react'; // Import useCallback

import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'archived';
  title: string;
  message: string;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Used for mark all as read

  // Stable callback — no user in deps so token refreshes don't recreate it and
  // trigger an immediate re-fetch. The effect below guards against user=null.
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(
          data.notifications?.filter((n: Notification) => n.status === 'unread').length || 0,
        );
      } else if (response.status !== 401) {
        // 401 is expected during the brief window before auth cookies are synced — suppress it
        console.error('Failed to fetch notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []); // stable — intentionally no deps

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications]); // only re-run when the user ID actually changes

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
              : n,
          ),
        );
        // Update unread count based on the actual change
        setUnreadCount((prev) => {
           const notification = notifications.find(n => n.id === notificationId);
           return notification?.status === 'unread' ? Math.max(0, prev - 1) : prev;
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to mark as read:", errorData.error || "Unknown error");
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };


  const markAllAsRead = async () => {
    // Prevent marking if already 0 unread
    if (unreadCount === 0) return;

    try {
      setLoading(true); // Indicate loading state
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });

      if (response.ok) {
        // Optimistic update locally
        setNotifications((prev) =>
          prev.map((n) =>
            n.status === 'unread' ? { ...n, status: 'read' as const, read_at: new Date().toISOString() } : n
          ),
        );
        setUnreadCount(0);
      } else {
         const errorData = await response.json().catch(() => ({}));
         console.error("Failed to mark all as read:", errorData.error || "Unknown error");
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', notificationId }),
      });

      if (response.ok) {
        // Find the notification before filtering to check its status
        const notificationToArchive = notifications.find(n => n.id === notificationId);
        const wasUnread = notificationToArchive?.status === 'unread';

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // Only decrement unread count if the archived notification was unread
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } else {
         const errorData = await response.json().catch(() => ({}));
         console.error("Failed to archive notification:", errorData.error || "Unknown error");
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-blue-600 bg-blue-100';
      case 'low':
      default: // Default case for safety
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    // Using Lucide icons could be an alternative for consistency
    switch (type) {
      case 'order_pending':
      case 'order_approved':
      case 'order_rejected':
        return ( /* ShoppingCart Icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> );
      case 'user_registered':
        return ( /* User Icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> );
      case 'content_uploaded':
        return ( /* Upload Icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> );
      case 'system_alert':
      case 'security_alert':
        return ( /* AlertTriangle Icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg> );
      default:
        return ( /* Bell Icon as default */ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 3h5l-5-5v5z" /></svg> );
    }
  };

  if (!user) return null; // Don't render anything if not logged in

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`} // Improved accessibility
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md" // Added offset
      >
        {/* Bell Icon */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 3h5l-5-5v5z" /></svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold"> {/* Adjusted size/font */}
            {unreadCount > 9 ? '9+' : unreadCount} {/* Simplified count display */}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <> {/* Use fragment */}
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div
             role="dialog" // ARIA role
             aria-modal="true" // ARIA attribute
             aria-labelledby="notification-heading" // ARIA attribute
             className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 id="notification-heading" className="text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading || unreadCount === 0} // Disable if 0 unread
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed" // Added disabled state
                  >
                    {loading ? 'Marking...' : 'Mark all read'}
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {/* No notifications Icon */}
                   <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 3h5l-5-5v5z" /></svg>
                  <p className="text-sm">No new notifications</p> {/* Updated text */}
                </div>
              ) : (
                <ul className="divide-y divide-gray-200"> {/* Use ul for list semantics */}
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`hover:bg-gray-50 ${
                        notification.status === 'unread' ? 'bg-blue-50' : ''
                      }`}
                    >
                      <button // Use button for clickable items
                        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300" // Added focus styles
                        onClick={() => {
                          if (notification.status === 'unread') {
                            markAsRead(notification.id);
                          }
                          if (notification.action_url) {
                            // Consider opening in new tab for external links?
                            window.location.href = notification.action_url;
                          }
                          // Optionally close dropdown on click
                          // setIsOpen(false);
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-full ${getPriorityColor(notification.priority)} shrink-0`} // Added shrink-0
                          >
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-sm font-medium truncate ${ // Added truncate
                                  notification.status === 'unread' ? 'text-gray-900 font-semibold' : 'text-gray-700' // Bolder unread title
                                }`}
                                title={notification.title} // Add title attribute for long text
                              >
                                {notification.title}
                              </p>
                              <div className="flex items-center space-x-2 shrink-0"> {/* Added shrink-0 */}
                                {notification.status === 'unread' && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" aria-label="Unread"></div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent parent onClick
                                    archiveNotification(notification.id);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-1 rounded focus:outline-none focus:ring-1 focus:ring-gray-400" // Added focus styles
                                  title="Archive"
                                  aria-label="Archive notification"
                                >
                                   {/* Archive Icon */}
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4m0 0l4-4m-4 4V3" /></svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2"> {/* Limit message lines */}
                               {notification.message}
                             </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {/* Consider using a relative time library */}
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsOpen(false);
                     // Consider using Next.js Link component if appropriate
                    window.location.href = '/admin/notifications'; // Adjust path if needed
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-300 rounded p-1" // Added focus styles
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
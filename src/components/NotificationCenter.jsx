import { useState, useEffect } from 'react';
import { X, Bell, Check } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function NotificationCenter({ onClose, onRead }) {
  const { user } = useOrganisation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiClient.entities.Notification.filter({ user_id: user.id }, '-created_date', 20)
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, [user]);

  const markRead = async (id) => {
    await apiClient.entities.Notification.update(id, { read_at: new Date().toISOString() });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read_at);
    await Promise.all(unread.map(n => apiClient.entities.Notification.update(n.id, { read_at: new Date().toISOString() })));
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    onRead?.();
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute right-4 top-16 w-96 max-h-[70vh] bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                <Check className="w-3 h-3 mr-1" /> Mark all read
              </Button>
            )}
            <button onClick={onClose}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read_at ? 'bg-primary/5' : ''}`}
                onClick={() => !n.read_at && markRead(n.id)}
              >
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {n.created_date ? formatDistanceToNow(parseISO(n.created_date), { addSuffix: true }) : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
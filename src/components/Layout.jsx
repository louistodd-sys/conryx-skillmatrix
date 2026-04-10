import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Grid3X3, BarChart3, Users, FolderKanban,
  BookOpen, ScrollText, Settings, Bell, Menu, X, LogOut, Zap,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import useOrganisation from '@/lib/useOrganisation';
import NotificationCenter from '@/components/NotificationCenter';

const adminNav = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/' },
  { label: 'Skills Matrix', icon: Grid3X3,          path: '/matrix' },
  { label: 'Gap Analysis',  icon: BarChart3,         path: '/gap-analysis' },
  { label: 'Teams',         icon: FolderKanban,      path: '/teams' },
  { label: 'Users',         icon: Users,             path: '/users' },
  { label: 'Skills Library',icon: BookOpen,          path: '/skills-library' },
  { label: 'Audit Log',     icon: ScrollText,        path: '/audit-log' },
  { label: 'Settings',      icon: Settings,          path: '/settings' },
  { label: 'My Skills',     icon: BookOpen,          path: '/my-profile' },
];

const managerNav = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/' },
  { label: 'Skills Matrix', icon: Grid3X3,          path: '/matrix' },
  { label: 'Gap Analysis',  icon: BarChart3,         path: '/gap-analysis' },
  { label: 'My Team',       icon: FolderKanban,      path: '/teams' },
  { label: 'Users',         icon: Users,             path: '/users' },
  { label: 'My Skills',     icon: BookOpen,          path: '/my-profile' },
];

const viewerNav = [
  { label: 'My Skills',     icon: BookOpen,          path: '/my-profile' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const { org, user } = useOrganisation();

  const role      = user?.role || 'viewer';
  const navItems  = role === 'admin' ? adminNav : role === 'manager' ? managerNav : viewerNav;

  // Poll unread notifications count every 60 seconds
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const notifs = await base44.entities.Notification.filter(
          { user_id: user.id },
          '-created_date',
          50
        );
        if (!cancelled) {
          setUnreadCount(notifs.filter(n => !n.read_at).length);
        }
      } catch (_) {}
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.id]);

  const handleNotifOpen = () => {
    setNotifOpen(o => !o);
    // Optimistically clear the badge when panel opens
    if (!notifOpen) setUnreadCount(0);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border shrink-0">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {org?.logo_url
              ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="w-8 h-8 rounded-lg object-contain border border-border bg-white"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Grid3X3 className="w-4 h-4 text-primary-foreground" />
                </div>
              )
            }
            <span className="font-semibold text-foreground text-[15px] tracking-tight truncate">
              {org?.name || 'SkillsMatrix'}
            </span>
          </Link>
          <button className="lg:hidden shrink-0 ml-2" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map(item => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                  `}
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Trial banner */}
        {user?.role === 'admin' && org && !org.subscription_plan || org?.subscription_plan === 'trial' ? (
          <div className="mx-3 mb-2">
            <Link to="/upgrade" className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors">
              <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium">Upgrade to Pro</span>
            </Link>
          </div>
        ) : null}

        {/* User section */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <Link to="/my-profile" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0 hover:bg-primary/20 transition-colors">
              {(user?.full_name || 'U')[0].toUpperCase()}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to="/my-profile" className="text-sm font-medium text-foreground truncate block hover:text-primary">{user?.full_name || 'User'}</Link>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <button onClick={() => base44.auth.logout()} title="Logout" className="shrink-0">
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex-1" />

          {/* Notification bell with unread badge */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={handleNotifOpen}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Notification panel */}
      {notifOpen && (
        <NotificationCenter
          onClose={() => setNotifOpen(false)}
          onRead={() => setUnreadCount(0)}
        />
      )}
    </div>
  );
}
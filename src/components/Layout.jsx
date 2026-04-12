import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Grid3X3, BarChart3, Users, Users2, FolderKanban,
  BookOpen, ScrollText, Settings, Bell, Menu, X, LogOut, ChevronRight,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import useOrganisation from '@/lib/useOrganisation';
import NotificationCenter from '@/components/NotificationCenter';

// ─── Navigation definitions ───────────────────────────────────────────────
const adminNav = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard',      icon: LayoutDashboard, path: '/' },
      { label: 'Skills Matrix',  icon: Grid3X3,         path: '/matrix' },
      { label: 'Gap Analysis',   icon: BarChart3,        path: '/gap-analysis' },
    ],
  },
  {
    section: 'People',
    items: [
      { label: 'Teams',          icon: FolderKanban,    path: '/teams' },
      { label: 'People',         icon: Users2,          path: '/people' },
      { label: 'Users',          icon: Users,           path: '/users' },
    ],
  },
  {
    section: 'Library',
    items: [
      { label: 'Skills Library', icon: BookOpen,        path: '/skills-library' },
      { label: 'Audit Log',      icon: ScrollText,      path: '/audit-log' },
      { label: 'Settings',       icon: Settings,        path: '/settings' },
    ],
  },
];

const managerNav = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard',      icon: LayoutDashboard, path: '/' },
      { label: 'Skills Matrix',  icon: Grid3X3,         path: '/matrix' },
      { label: 'Gap Analysis',   icon: BarChart3,        path: '/gap-analysis' },
    ],
  },
  {
    section: 'People',
    items: [
      { label: 'My Team',        icon: FolderKanban,    path: '/teams' },
      { label: 'People',         icon: Users2,          path: '/people' },
    ],
  },
];

const viewerNav = [
  {
    section: 'My Workspace',
    items: [
      { label: 'My Skills',      icon: BookOpen,        path: '/my-profile' },
    ],
  },
];

// Page title map for the header
const pageTitles = {
  '/':              'Dashboard',
  '/matrix':        'Skills Matrix',
  '/gap-analysis':  'Gap Analysis',
  '/teams':         'Teams',
  '/people':        'People',
  '/users':         'Users',
  '/skills-library':'Skills Library',
  '/audit-log':     'Audit Log',
  '/settings':      'Settings',
  '/my-profile':    'My Skills',
};

function getPageTitle(pathname) {
  if (pathname.startsWith('/teams/'))  return 'Team Detail';
  if (pathname.startsWith('/users/'))  return 'User Profile';
  return pageTitles[pathname] || 'SkillsMatrix';
}

// ─── Sidebar nav item ────────────────────────────────────────────────────
function NavItem({ item, isActive, onClick }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-150
        ${isActive
          ? 'bg-sidebar-primary/15 text-white border border-sidebar-primary/30 shadow-sm'
          : 'text-sidebar-foreground hover:text-white hover:bg-sidebar-accent'}
      `}
    >
      <item.icon
        className={`w-[17px] h-[17px] shrink-0 transition-colors ${
          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground group-hover:text-white'
        }`}
      />
      <span className="flex-1">{item.label}</span>
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
      )}
    </Link>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const { org, user } = useOrganisation();

  const role     = user?.role || 'viewer';
  const navGroups = role === 'admin' ? adminNav : role === 'manager' ? managerNav : viewerNav;

  const pageTitle = getPageTitle(location.pathname);

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
    if (!notifOpen) setUnreadCount(0);
  };

  // User initials
  const initials = (user?.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-sidebar border-r border-sidebar-border shadow-sidebar
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border shrink-0">
          <Link to="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setSidebarOpen(false)}>
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="w-8 h-8 rounded-lg object-contain border border-sidebar-border bg-white/10"
              />
            ) : (
              /* Brand logomark — teal grid on navy */
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center shrink-0">
                <Grid3X3 className="w-4 h-4 text-sidebar-primary" />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-jakarta font-700 text-white text-[15px] tracking-tight truncate block leading-tight">
                {org?.name || 'SkillsMatrix'}
              </span>
              <span className="text-[11px] text-sidebar-foreground/60 font-medium tracking-wide uppercase">
                Skills Intelligence
              </span>
            </div>
          </Link>
          <button
            className="lg:hidden shrink-0 ml-2 p-1 rounded-md hover:bg-sidebar-accent transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4 text-sidebar-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.section}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1.5">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <NavItem
                      key={item.path}
                      item={item}
                      isActive={isActive}
                      onClick={() => setSidebarOpen(false)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center text-sidebar-primary text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-sidebar-foreground/60 capitalize font-medium">{role}</p>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              title="Sign out"
              className="shrink-0 p-1 rounded-md hover:bg-sidebar-border transition-colors"
            >
              <LogOut className="w-4 h-4 text-sidebar-foreground/60 hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 shadow-card">
          {/* Left: mobile menu + page title */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="hidden lg:block">
              <h1 className="font-jakarta text-xl font-700 text-foreground leading-tight">{pageTitle}</h1>
            </div>
            <div className="lg:hidden">
              <h1 className="font-jakarta text-lg font-700 text-foreground leading-tight">{pageTitle}</h1>
            </div>
          </div>

          {/* Right: notification bell */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg hover:bg-muted"
              onClick={handleNotifOpen}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-[18px] h-[18px] text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-xs font-bold flex items-center justify-center px-1 border-2 border-card">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-4 lg:px-6 py-6 animate-fade-in">
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

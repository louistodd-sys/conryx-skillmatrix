import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import SiteFooter from '@/components/SiteFooter';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Grid3X3, BarChart3, Users, Users2, FolderKanban,
  BookOpen, ScrollText, Settings, Bell, Menu, X, LogOut,
  ShieldCheck, FileText, ClipboardList, AlertTriangle, Truck,
  Wrench, MessageSquare, FlaskConical, Bug, GraduationCap,
  TrendingUp, CheckSquare, Briefcase, ListChecks,
} from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import useOrganisation from '@/lib/useOrganisation';
import NotificationCenter from '@/components/NotificationCenter';
import ModuleSwitcher from '@/components/ModuleSwitcher';
import { hasBrcModule, hasSkillsMatrixModule, hasMultipleModules, MODULE_SKILLS_MATRIX, MODULE_BRC_COMPLIANCE } from '@/lib/brcModuleGuard';

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
      { label: 'Job Roles',      icon: Briefcase,       path: '/job-roles' },
      { label: 'People',         icon: Users2,          path: '/people' },
      { label: 'Users',          icon: Users,           path: '/users' },
    ],
  },
  {
    section: 'Training',
    items: [
      { label: 'Training',       icon: ListChecks,      path: '/training-modules' },
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
      { label: 'Teams',           icon: FolderKanban,    path: '/teams' },
      { label: 'Job Roles',       icon: Briefcase,       path: '/job-roles' },
      { label: 'People',         icon: Users2,          path: '/people' },
    ],
  },
  {
    section: 'Training',
    items: [
      { label: 'Training',       icon: ListChecks,      path: '/training-modules' },
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

// ─── BRC nav (admin/quality_manager) ───────────────────────────────────────
const brcAdminNav = [
  {
    section: 'Getting Started',
    items: [
      { label: 'Audit Guide',        icon: BookOpen,       path: '/brc/guide' },
    ],
  },
  {
    section: 'Compliance',
    items: [
      { label: 'BRC Dashboard',      icon: ShieldCheck,    path: '/brc' },
      { label: 'Action Centre',      icon: Bell,           path: '/brc/action-centre' },
      { label: 'Analytics',          icon: TrendingUp,     path: '/brc/analytics' },
      { label: 'Audit Checklist',    icon: CheckSquare,    path: '/brc/audit-checklist' },
      { label: 'Clause Mapping',     icon: ClipboardList,  path: '/brc/clauses' },
      { label: 'Documents',          icon: FileText,       path: '/brc/documents' },
    ],
  },
  {
    section: 'Workflows',
    items: [
      { label: 'Internal Audits',    icon: ScrollText,     path: '/brc/audits' },
      { label: 'Non-Conformances',   icon: AlertTriangle,  path: '/brc/non-conformances' },
      { label: 'CAPAs',              icon: ClipboardList,  path: '/brc/capas' },
      { label: 'Complaints',         icon: MessageSquare,  path: '/brc/complaints' },
    ],
  },
  {
    section: 'Registers',
    items: [
      { label: 'Suppliers',          icon: Truck,          path: '/brc/suppliers' },
      { label: 'Calibration',        icon: Wrench,         path: '/brc/calibration' },
      { label: 'Glass Register',     icon: FlaskConical,   path: '/brc/glass-register' },
      { label: 'Pest Control',       icon: Bug,            path: '/brc/pest-control' },
      { label: 'Training',           icon: GraduationCap,  path: '/brc/training' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { label: 'Mgmt Review',        icon: Users2,         path: '/brc/management-review' },
      { label: 'BRC Settings',       icon: Settings,       path: '/brc/settings' },
    ],
  },
];

// Page title map for the header
const pageTitles = {
  '/':                       'Dashboard',
  '/matrix':                 'Skills Matrix',
  '/gap-analysis':           'Gap Analysis',
  '/teams':                  'Teams',
  '/people':                 'People',
  '/users':                  'Users',
  '/job-roles':              'Job Roles',
  '/skills-library':         'Skills Library',
  '/audit-log':              'Audit Log',
  '/settings':               'Settings',
  '/my-profile':             'My Skills',
  '/training-modules':       'Training Modules',
  '/brc':                    'BRC Dashboard',
  '/brc/clauses':            'Clause Mapping',
  '/brc/documents':          'Document Control',
  '/brc/audits':             'Internal Audits',
  '/brc/non-conformances':   'Non-Conformances',
  '/brc/capas':              'CAPA Register',
  '/brc/suppliers':          'Supplier Register',
  '/brc/calibration':        'Calibration Register',
  '/brc/complaints':         'Complaint Register',
  '/brc/management-review':  'Management Review',
  '/brc/glass-register':     'Glass Register',
  '/brc/pest-control':       'Pest Control',
  '/brc/training':           'Training Register',
  '/brc/action-centre':      'Action Centre',
  '/brc/analytics':          'Compliance Analytics',
  '/brc/audit-checklist':    'Pre-Audit Checklist',
  '/brc/guide':              'Audit Preparation Guide',
  '/brc/settings':           'BRC Settings',
};

function getPageTitle(pathname) {
  if (pathname.startsWith('/teams/'))           return 'Team Detail';
  if (pathname.startsWith('/users/'))           return 'User Profile';
  if (pathname.startsWith('/brc/clauses/'))     return 'Clause Detail';
  if (pathname.startsWith('/brc/documents/'))   return 'Document Detail';
  if (pathname.startsWith('/brc/audits/'))      return 'Audit Detail';
  if (pathname.startsWith('/brc/non-conformances/')) return 'NC Detail';
  if (pathname.startsWith('/brc/suppliers/'))   return 'Supplier Detail';
  if (pathname.startsWith('/brc/calibration/')) return 'Calibration Record';
  if (pathname.startsWith('/brc/complaints/'))  return 'Complaint Detail';
  return pageTitles[pathname] || 'Skills Matrix App';
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
  const navigate = useNavigate();

  const role = user?.role || 'viewer';

  // ── Module switcher state (Section 3.1) ───────────────────────────────
  const isBrcRoute = location.pathname.startsWith('/brc');
  const defaultModule = isBrcRoute && hasBrcModule(org) ? MODULE_BRC_COMPLIANCE : MODULE_SKILLS_MATRIX;
  const [activeModule, setActiveModule] = useState(() => {
    const stored = sessionStorage.getItem('activeModule');
    // Validate stored value is still entitled
    return stored || defaultModule;
  });

  // Keep activeModule in sync when route changes
  useEffect(() => {
    if (isBrcRoute && hasBrcModule(org)) {
      setActiveModule(MODULE_BRC_COMPLIANCE);
    }
  }, [isBrcRoute, org]);

  const handleModuleSwitch = (mod) => {
    setActiveModule(mod);
    sessionStorage.setItem('activeModule', mod);
    // Navigate to the module's home to avoid URL/nav mismatch
    if (mod === MODULE_BRC_COMPLIANCE) navigate('/brc');
    else navigate('/');
  };

  // Determine which nav to show based on active module + role
  let navGroups;
  if (activeModule === MODULE_BRC_COMPLIANCE && hasBrcModule(org)) {
    navGroups = (role === 'admin' || role === 'quality_manager') ? brcAdminNav : viewerNav;
  } else {
    navGroups = role === 'admin' ? adminNav : role === 'manager' ? managerNav : viewerNav;
  }

  const pageTitle = getPageTitle(location.pathname);

  // Poll unread notifications count every 60 seconds
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const notifs = await apiClient.entities.Notification.filter(
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
                {org?.name || 'Skills Matrix App'}
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

        {/* Module switcher */}
        <ModuleSwitcher org={org} activeModule={activeModule} onSwitch={handleModuleSwitch} />

        {/* BRC stage progress indicator */}
        {activeModule === MODULE_BRC_COMPLIANCE && hasBrcModule(org) && (() => {
          const hasSetup = !!(org?.brc_standard && org?.brc_audit_target_date);
          const score = org?.brc_readiness_score?.overall_percent ?? 0;
          let stage = 1;
          if (hasSetup && score === 0) stage = 2;
          else if (hasSetup && score > 0 && score < 50) stage = 3;
          else if (hasSetup && score >= 50 && score < 80) stage = 4;
          else if (hasSetup && score >= 80) stage = 5;
          const STAGE_LABELS = ['', 'Setup', 'Map Clauses', 'Add Evidence', 'Close Gaps', 'Verify', 'Audit Ready'];
          return (
            <div className="mx-3 mt-1 mb-1 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Audit Readiness</span>
                <span className="text-[10px] font-bold text-sidebar-primary">Stage {stage}/6</span>
              </div>
              <div className="w-full h-1 rounded-full bg-sidebar-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-sidebar-primary transition-all duration-500"
                  style={{ width: `${Math.round((stage / 6) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-sidebar-foreground/50 mt-1">{STAGE_LABELS[stage]}</p>
            </div>
          );
        })()}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.section}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1.5">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  // '/brc' should only match exactly to avoid highlighting it on every BRC sub-route
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && item.path !== '/brc' && location.pathname.startsWith(item.path));
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
              onClick={() => apiClient.auth.logout()}
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
          <SiteFooter />
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
import React, { useState, useEffect } from 'react';
import { ScrollText, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

const PAGE_SIZE = 50;

export default function AuditLog() {
  const { org } = useOrganisation();
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [page, setPage]           = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    if (org) loadData();
  }, [org]);

  async function loadData() {
    // Fetch without hard cap — use a large limit and paginate client-side
    // For very large logs the backend may need cursor-based pagination
    const l = await apiClient.entities.AuditLogEntry.filter(
      { organisation_id: org.id },
      '-created_date',
      1000
    );
    setLogs(l);
    setLoading(false);
  }

  const actionTypes = [...new Set(logs.map(l => l.action))].sort();

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.actor_display?.toLowerCase().includes(q) &&
        !l.target_display?.toLowerCase().includes(q) &&
        !l.action?.toLowerCase().includes(q)
      ) return false;
    }
    if (dateFrom && l.created_date) {
      if (isBefore(parseISO(l.created_date), startOfDay(new Date(dateFrom)))) return false;
    }
    if (dateTo && l.created_date) {
      if (isAfter(parseISO(l.created_date), endOfDay(new Date(dateTo)))) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  // Parse detail field safely
  const parseDetail = (detail) => {
    if (!detail) return null;
    if (typeof detail === 'object') return detail;
    try { return JSON.parse(detail); } catch { return { raw: detail }; }
  };

  // Action badge colours
  const actionColor = (action = '') => {
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-700';
    if (action.includes('create') || action.includes('invite')) return 'bg-green-100 text-green-700';
    if (action.includes('update') || action.includes('change') || action.includes('edit')) return 'bg-blue-100 text-blue-700';
    if (action.includes('export') || action.includes('login')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tamper-evident record of all significant actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search actor, target, or action…"
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); resetPage(); }}
        >
          <option value="all">All Actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">From</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); resetPage(); }}
            className="h-10 w-36 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">To</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); resetPage(); }}
            className="h-10 w-36 text-sm"
          />
        </div>
        {(search || filterAction !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setFilterAction('all'); setDateFrom(''); setDateTo(''); resetPage(); }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {paginated.length} of {filtered.length} entries
          {filtered.length !== logs.length && ` (filtered from ${logs.length} total)`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit log entries"
          description="Actions will be logged here as they happen."
        />
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-8" />
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">Timestamp</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actor</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(log => {
                    const detail  = parseDetail(log.detail);
                    const isExpanded = expandedRow === log.id;
                    const hasDetail  = detail && Object.keys(detail).length > 0;

                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`hover:bg-muted/30 transition-colors ${hasDetail ? 'cursor-pointer' : ''}`}
                          onClick={() => hasDetail && setExpandedRow(isExpanded ? null : log.id)}
                        >
                          <td className="px-4 py-3 text-center">
                            {hasDetail && (
                              <span className="text-muted-foreground">
                                {isExpanded
                                  ? <ChevronDown className="w-3.5 h-3.5" />
                                  : <ChevronRight className="w-3.5 h-3.5" />}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {log.created_date
                              ? format(parseISO(log.created_date), 'dd MMM yyyy HH:mm')
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${actionColor(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{log.actor_display || 'System'}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{log.target_display || '—'}</td>
                        </tr>
                        {isExpanded && hasDetail && (
                          <tr className="bg-muted/20">
                            <td />
                            <td colSpan={4} className="px-4 pb-3 pt-1">
                              <div className="rounded-md bg-muted border border-border p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Detail</p>
                                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                                  {Object.entries(detail).map(([k, v]) => (
                                    <div key={k}>
                                      <dt className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                                      <dd className="text-xs font-medium text-foreground break-all">
                                        {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
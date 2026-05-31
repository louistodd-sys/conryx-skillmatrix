import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { CheckSquare, Square, Download, Filter, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRC_STANDARD_LABELS } from '@/lib/brcModuleGuard';

const STATUS_CFG = {
  not_started:      { label: 'Not Started',       dot: 'bg-gray-400',  text: 'text-gray-600',  bg: 'bg-gray-50'   },
  in_progress:      { label: 'In Progress',        dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50'  },
  evidence_attached:{ label: 'Evidence Attached',  dot: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50'   },
  ready:            { label: 'Ready',              dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50'  },
  needs_review:     { label: 'Needs Review',       dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50'    },
};

function ClauseRow({ clause, status, checked, onCheck }) {
  const cfg = STATUS_CFG[status?.status || 'not_started'];
  const isReady = status?.status === 'ready';

  return (
    <tr className={`hover:bg-muted/20 transition-colors ${isReady ? 'opacity-70' : ''}`}>
      <td className="px-4 py-3 w-10">
        <button onClick={() => onCheck(clause.id)} className="text-primary">
          {checked
            ? <CheckSquare className="w-4 h-4 text-green-600" />
            : <Square className="w-4 h-4 text-muted-foreground" />}
        </button>
      </td>
      <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground w-20">
        {clause.clause_number}
        {clause.is_fundamental && (
          <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">★</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{clause.title}</td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{status?.evidence_count ?? 0}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-xs truncate">{status?.notes || '—'}</td>
    </tr>
  );
}

function BrcAuditChecklistContent() {
  const { org } = useOrganisation();
  const [clauses, setClauses] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});
  const [filter, setFilter] = useState('all'); // all | not_ready | fundamental

  useEffect(() => {
    if (!org) return;
    Promise.all([
      org.brc_standard ? base44.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order', 200) : Promise.resolve([]),
      base44.entities.BRCClauseStatus.filter({ organisation_id: org.id }),
    ]).then(([cl, st]) => {
      setClauses(cl); setStatuses(st); setLoading(false);
    });
  }, [org?.id, org?.brc_standard]);

  const statusMap = useMemo(() => Object.fromEntries(statuses.map(s => [s.clause_id, s])), [statuses]);

  const filtered = useMemo(() => {
    return clauses.filter(c => {
      const st = statusMap[c.id];
      if (filter === 'not_ready') return st?.status !== 'ready';
      if (filter === 'fundamental') return c.is_fundamental;
      return true;
    });
  }, [clauses, statusMap, filter]);

  const toggleCheck = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const checkAll = () => {
    const all = {};
    filtered.forEach(c => { all[c.id] = true; });
    setChecked(all);
  };
  const clearAll = () => setChecked({});

  const readyCount = filtered.filter(c => statusMap[c.id]?.status === 'ready').length;
  const checkedCount = filtered.filter(c => checked[c.id]).length;
  const progress = filtered.length > 0 ? Math.round((readyCount / filtered.length) * 100) : 0;

  const exportCSV = () => {
    const rows = [['Clause', 'Title', 'Fundamental', 'Status', 'Evidence Count', 'Notes', 'Pre-Audit Checked']];
    filtered.forEach(c => {
      const st = statusMap[c.id];
      rows.push([
        c.clause_number, c.title, c.is_fundamental ? 'Yes' : 'No',
        st?.status || 'not_started', st?.evidence_count ?? 0, st?.notes || '',
        checked[c.id] ? 'Yes' : 'No'
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brc-audit-checklist-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary" /> Pre-Audit Checklist
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {org?.brc_standard ? BRC_STANDARD_LABELS[org.brc_standard] : 'No standard set'} · Use this checklist to verify readiness before your audit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Overall Readiness</span>
          <span className={`text-sm font-bold ${progress >= 80 ? 'text-green-700' : progress >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{progress}%</span>
        </div>
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="text-green-700">{readyCount} ready</span>
          <span className="text-amber-700">{filtered.filter(c => ['in_progress','evidence_attached','needs_review'].includes(statusMap[c.id]?.status)).length} in progress</span>
          <span className="text-gray-500">{filtered.filter(c => !statusMap[c.id] || statusMap[c.id].status === 'not_started').length} not started</span>
          <span className="text-primary ml-auto">{checkedCount} reviewed in this session</span>
        </div>
      </div>

      {/* Filter + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: 'All Clauses' },
            { key: 'not_ready', label: 'Not Ready' },
            { key: 'fundamental', label: 'Fundamentals Only' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={checkAll} className="text-xs text-primary hover:underline">Check all</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">Clear</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 w-10" />
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20">Clause</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-36 hidden sm:table-cell">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20 hidden md:table-cell">Evidence</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => (
                <ClauseRow
                  key={c.id}
                  clause={c}
                  status={statusMap[c.id]}
                  checked={!!checked[c.id]}
                  onCheck={toggleCheck}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No clauses match the selected filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BrcAuditChecklist() {
  return <BrcModuleGuard><BrcAuditChecklistContent /></BrcModuleGuard>;
}
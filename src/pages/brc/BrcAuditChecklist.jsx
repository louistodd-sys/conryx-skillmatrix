import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { CheckSquare, Download, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BRC_STANDARD_LABELS } from '@/lib/brcModuleGuard';
import NCFormModal from '@/components/brc/NCFormModal';

const STATUS_CFG = {
  not_started:      { label: 'Not Started',       dot: 'bg-gray-400',  text: 'text-gray-600',  bg: 'bg-gray-50'   },
  in_progress:      { label: 'In Progress',        dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50'  },
  evidence_attached:{ label: 'Evidence Attached',  dot: 'bg-blue-400',  text: 'text-blue-700',  bg: 'bg-blue-50'   },
  ready:            { label: 'Ready',              dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50'  },
  needs_review:     { label: 'Needs Review',       dot: 'bg-red-500',   text: 'text-red-700',   bg: 'bg-red-50'    },
};

const SECTION_NAMES = {
  '1': 'Senior Management Commitment',
  '2': 'Hazard & Risk Management',
  '3': 'Food Safety & Quality Management',
  '4': 'Site Standards',
  '5': 'Product & Process Control',
  '6': 'Process Control',
  '7': 'Personnel',
};

function ReadinessGate({ clauses, statusMap, capasOverdue, ncsOverdue }) {
  const fundamentals = clauses.filter(c => c.is_fundamental);
  const fundamentalsReady = fundamentals.filter(c => statusMap[c.id]?.status === 'ready').length;
  const allFundamentalsReady = fundamentalsReady === fundamentals.length && fundamentals.length > 0;
  const totalReady = clauses.filter(c => statusMap[c.id]?.status === 'ready').length;
  const pct = clauses.length > 0 ? Math.round((totalReady / clauses.length) * 100) : 0;
  const scoreOk = pct >= 80;
  const noOverdueCAPAs = capasOverdue === 0;
  const noOverdueNCs = ncsOverdue === 0;
  const allGreen = allFundamentalsReady && scoreOk && noOverdueCAPAs && noOverdueNCs;

  const gates = [
    { ok: allFundamentalsReady, label: `All fundamental clauses ready`, sub: `${fundamentalsReady}/${fundamentals.length} fundamentals marked Ready` },
    { ok: scoreOk,              label: `Readiness score ≥ 80%`,         sub: `Current score: ${pct}%` },
    { ok: noOverdueCAPAs,       label: `No overdue CAPAs`,              sub: capasOverdue > 0 ? `${capasOverdue} overdue — resolve in Action Centre` : 'All CAPAs on track' },
    { ok: noOverdueNCs,         label: `No overdue Non-Conformances`,   sub: ncsOverdue > 0 ? `${ncsOverdue} overdue — resolve in Action Centre` : 'All NCs on track' },
  ];

  return (
    <div className={`border rounded-xl p-5 space-y-3 ${allGreen ? 'bg-green-50 border-green-200' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-2">
        {allGreen
          ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
        <h2 className="text-sm font-semibold text-foreground">
          {allGreen ? 'Audit Readiness: All criteria met ✓' : 'Audit Readiness Gate'}
        </h2>
      </div>
      <div className="space-y-2">
        {gates.map((g, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${g.ok ? 'bg-green-500' : 'bg-gray-200'}`}>
              {g.ok && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className={`text-sm font-medium ${g.ok ? 'text-green-800' : 'text-foreground'}`}>{g.label}</p>
              <p className="text-xs text-muted-foreground">{g.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionGroup({ sectionNum, sectionName, clauses, statusMap, filter, onRaiseNC }) {
  const [collapsed, setCollapsed] = useState(false);

  const sectionClauses = useMemo(() => {
    return clauses.filter(c => {
      const sn = c.issue_number || c.clause_number?.split('.')[0];
      if (sn !== sectionNum) return false;
      const st = statusMap[c.id];
      if (filter === 'not_ready') return st?.status !== 'ready';
      if (filter === 'fundamental') return c.is_fundamental;
      return true;
    });
  }, [clauses, sectionNum, filter, statusMap]);

  if (sectionClauses.length === 0) return null;

  const readyCount = sectionClauses.filter(c => statusMap[c.id]?.status === 'ready').length;
  const sorted = [...sectionClauses].sort((a, b) => {
    if (a.is_fundamental && !b.is_fundamental) return -1;
    if (!a.is_fundamental && b.is_fundamental) return 1;
    return 0;
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Section {sectionNum} — {sectionName}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${readyCount === sectionClauses.length ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {readyCount}/{sectionClauses.length} ready
          </span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <table className="w-full border-t border-border">
          <tbody className="divide-y divide-border">
            {sorted.map(c => {
              const st = statusMap[c.id];
              const cfg = STATUS_CFG[st?.status || 'not_started'];
              const isReady = st?.status === 'ready';
              return (
                <tr key={c.id} className={`hover:bg-muted/20 transition-colors ${isReady ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground w-20">
                    {c.clause_number}
                    {c.is_fundamental && (
                      <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">★</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell w-20">
                    {st?.evidence_count ?? 0} evidence
                  </td>
                  <td className="px-4 py-3 w-32">
                    <div className="flex items-center gap-2 justify-end">
                      {!isReady && (
                        <button
                          onClick={() => onRaiseNC(c)}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                          title="Raise Non-Conformance"
                        >
                          <Plus className="w-3 h-3" /> NC
                        </button>
                      )}
                      <Link
                        to={`/brc/clauses/${c.id}`}
                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BrcAuditChecklistContent() {
  const { org } = useOrganisation();
  const [clauses, setClauses] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [capas, setCapas] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [ncModalClause, setNcModalClause] = useState(null);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      org.brc_standard ? apiClient.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order', 200) : Promise.resolve([]),
      apiClient.entities.BRCClauseStatus.filter({ organisation_id: org.id }),
      apiClient.entities.BRCCAPA.filter({ organisation_id: org.id }),
      apiClient.entities.BRCNonConformance.filter({ organisation_id: org.id }),
    ]).then(([cl, st, cp, nc]) => {
      setClauses(cl); setStatuses(st); setCapas(cp); setNcs(nc); setLoading(false);
    });
  }, [org?.id, org?.brc_standard]);

  const statusMap = useMemo(() => Object.fromEntries(statuses.map(s => [s.clause_id, s])), [statuses]);

  const today = new Date();
  const capasOverdue = capas.filter(c => c.status === 'overdue' || (c.due_date && new Date(c.due_date) < today && c.status !== 'completed' && c.status !== 'verified')).length;
  const ncsOverdue   = ncs.filter(n => (n.status === 'open' || n.status === 'under_investigation') && n.due_date && new Date(n.due_date) < today).length;

  const sections = useMemo(() => {
    const seen = new Set();
    const secs = [];
    clauses.forEach(c => {
      const sn = c.issue_number || c.clause_number?.split('.')[0] || '1';
      if (!seen.has(sn)) { seen.add(sn); secs.push(sn); }
    });
    return secs.sort((a, b) => Number(a) - Number(b));
  }, [clauses]);

  const totalReady = clauses.filter(c => statusMap[c.id]?.status === 'ready').length;
  const progress = clauses.length > 0 ? Math.round((totalReady / clauses.length) * 100) : 0;

  const exportCSV = () => {
    const rows = [['Clause', 'Title', 'Fundamental', 'Status', 'Evidence Count', 'Notes']];
    clauses.forEach(c => {
      const st = statusMap[c.id];
      rows.push([c.clause_number, c.title, c.is_fundamental ? 'Yes' : 'No', st?.status || 'not_started', st?.evidence_count ?? 0, st?.notes || '']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `brc-audit-checklist-${new Date().toISOString().split('T')[0]}.csv`; link.click();
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
            {org?.brc_standard ? BRC_STANDARD_LABELS[org.brc_standard] : 'No standard set'} · Verify readiness before your audit. Click any clause to open and manage evidence.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Readiness gate */}
      {!loading && (
        <ReadinessGate
          clauses={clauses}
          statusMap={statusMap}
          capasOverdue={capasOverdue}
          ncsOverdue={ncsOverdue}
        />
      )}

      {/* Progress bar */}
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
          <span className="text-green-700">{totalReady} ready</span>
          <span className="text-amber-700">{clauses.filter(c => ['in_progress','evidence_attached','needs_review'].includes(statusMap[c.id]?.status)).length} in progress</span>
          <span className="text-gray-500">{clauses.filter(c => !statusMap[c.id] || statusMap[c.id].status === 'not_started').length} not started</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {[
          { key: 'all',         label: 'All Clauses' },
          { key: 'not_ready',   label: 'Not Ready' },
          { key: 'fundamental', label: '★ Fundamentals' },
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

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {sections.map(sn => (
            <SectionGroup
              key={sn}
              sectionNum={sn}
              sectionName={SECTION_NAMES[sn] || `Section ${sn}`}
              clauses={clauses}
              statusMap={statusMap}
              filter={filter}
              onRaiseNC={setNcModalClause}
            />
          ))}
        </div>
      )}

      {ncModalClause && (
        <NCFormModal
          org={org}
          nc={null}
          clause={ncModalClause}
          onClose={() => setNcModalClause(null)}
          onSaved={() => setNcModalClause(null)}
        />
      )}
    </div>
  );
}

export default function BrcAuditChecklist() {
  return <BrcModuleGuard><BrcAuditChecklistContent /></BrcModuleGuard>;
}

import BrcModuleGuard from '@/components/BrcModuleGuard';
import { ShieldCheck, Search, ChevronDown, ChevronUp, Plus, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import EvidenceLinkModal from '@/components/brc/EvidenceLinkModal';
import { toast } from 'sonner';

const STATUS_COLORS = {
  not_started:      { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400',  label: 'Not Started'       },
  in_progress:      { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'In Progress'        },
  evidence_attached:{ bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-500',  label: 'Evidence Attached'  },
  ready:            { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Ready'              },
  needs_review:     { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500',   label: 'Needs Review'       },
};
const STATUS_OPTIONS = ['not_started','in_progress','evidence_attached','ready','needs_review'];

const SECTION_NAMES = {
  '1': 'Senior Management Commitment',
  '2': 'Hazard & Risk Management',
  '3': 'Food Safety & Quality Management',
  '4': 'Site Standards',
  '5': 'Product & Process Control',
  '6': 'Process Control',
  '7': 'Personnel',
};

function StatusBadge({ status, clauseId, onStatusChange, saving }) {
  const cfg = STATUS_COLORS[status || 'not_started'];
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} hover:opacity-80 transition-opacity`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {saving ? '…' : cfg.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 left-0 top-7 bg-card border border-border rounded-lg shadow-lg min-w-44 py-1">
            {STATUS_OPTIONS.map(s => {
              const c = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                  onClick={() => { onStatusChange(clauseId, s); setOpen(false); }}
                >
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`font-medium ${c.text}`}>{c.label}</span>
                  {s === status && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SectionPanel({ sectionNum, sectionName, clauses, statusMap, savingId, onStatusChange, onAddEvidence, collapsed, onToggle, search }) {
  const sectionClauses = useMemo(() => {
    return clauses.filter(c => {
      const matchSection = (c.issue_number || c.clause_number?.split('.')[0]) === sectionNum;
      if (!matchSection) return false;
      if (!search) return true;
      return c.clause_number.includes(search) || c.title.toLowerCase().includes(search.toLowerCase());
    });
  }, [clauses, sectionNum, search]);

  if (sectionClauses.length === 0) return null;

  const readyCount = sectionClauses.filter(c => statusMap[c.id]?.status === 'ready').length;
  const totalCount = sectionClauses.length;
  const pct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const allAddressed = sectionClauses.every(c => statusMap[c.id] && statusMap[c.id].status !== 'not_started');

  // Pin fundamentals first
  const sorted = [...sectionClauses].sort((a, b) => {
    if (a.is_fundamental && !b.is_fundamental) return -1;
    if (!a.is_fundamental && b.is_fundamental) return 1;
    return (a.display_order || 0) - (b.display_order || 0);
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Section {sectionNum}</span>
            <span className="text-sm text-muted-foreground">{sectionName}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 max-w-32 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-300'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${pct === 100 ? 'text-green-700' : 'text-muted-foreground'}`}>
              {readyCount}/{totalCount} ready
            </span>
          </div>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {!collapsed && (
        <>
          <div className="divide-y divide-border border-t border-border">
            {sorted.map(clause => {
              const st = statusMap[clause.id];
              const currentStatus = st?.status || 'not_started';
              return (
                <div key={clause.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                  {/* Clause number */}
                  <div className="w-16 shrink-0">
                    <span className="font-mono text-sm font-semibold text-foreground">{clause.clause_number}</span>
                    {clause.is_fundamental && (
                      <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">★</span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{clause.title}</p>
                    {st?.evidence_count > 0 && (
                      <p className="text-xs text-muted-foreground">{st.evidence_count} evidence item{st.evidence_count !== 1 ? 's' : ''} linked</p>
                    )}
                  </div>

                  {/* Status badge (clickable) */}
                  <div className="shrink-0 hidden sm:block">
                    <StatusBadge
                      status={currentStatus}
                      clauseId={clause.id}
                      onStatusChange={onStatusChange}
                      saving={savingId === clause.id}
                    />
                  </div>

                  {/* Add Evidence */}
                  <button
                    onClick={() => onAddEvidence(clause)}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Add evidence"
                    title="Add evidence"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* View link */}
                  <Link
                    to={`/brc/clauses/${clause.id}`}
                    className="shrink-0 text-primary hover:underline text-xs font-medium"
                  >
                    View →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Section footer CTA */}
          {allAddressed && (
            <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-700 font-medium">
                All clauses in Section {sectionNum} addressed. {readyCount < totalCount ? 'Mark remaining clauses as Ready when evidence is confirmed.' : 'Section complete!'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BrcClausesContent() {
  const { org } = useOrganisation();
  const [clauses, setClauses] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [evidenceModalClause, setEvidenceModalClause] = useState(null);
  const [evidenceLinks, setEvidenceLinks] = useState([]);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      org.brc_standard
        ? apiClient.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order')
        : Promise.resolve([]),
      apiClient.entities.BRCClauseStatus.filter({ organisation_id: org.id }),
    ]).then(([cl, st]) => {
      setClauses(cl);
      setStatuses(st);
      setLoading(false);
    });
  }, [org?.id, org?.brc_standard]);

  const statusMap = useMemo(() => Object.fromEntries(statuses.map(s => [s.clause_id, s])), [statuses]);

  // Apply filter for sections to collapse/show
  const filteredClauses = useMemo(() => {
    return clauses.filter(c => {
      const st = statusMap[c.id];
      if (statusFilter === 'not_started') return !st || st.status === 'not_started';
      if (statusFilter === 'fundamental') return c.is_fundamental;
      if (statusFilter !== 'all') return st?.status === statusFilter;
      return true;
    });
  }, [clauses, statusMap, statusFilter]);

  const sections = useMemo(() => {
    const seen = new Set();
    const secs = [];
    filteredClauses.forEach(c => {
      const sn = c.issue_number || c.clause_number?.split('.')[0] || '1';
      if (!seen.has(sn)) { seen.add(sn); secs.push(sn); }
    });
    return secs.sort((a, b) => Number(a) - Number(b));
  }, [filteredClauses]);

  const notStartedCount = clauses.filter(c => !statusMap[c.id] || statusMap[c.id]?.status === 'not_started').length;
  const readyCount = clauses.filter(c => statusMap[c.id]?.status === 'ready').length;

  const handleStatusChange = async (clauseId, newStatus) => {
    setSavingId(clauseId);
    try {
      const existing = statusMap[clauseId];
      const payload = { organisation_id: org.id, clause_id: clauseId, status: newStatus };
      let updated;
      if (existing?.id) {
        updated = await apiClient.entities.BRCClauseStatus.update(existing.id, payload);
      } else {
        updated = await apiClient.entities.BRCClauseStatus.create(payload);
      }
      setStatuses(prev => {
        const without = prev.filter(s => s.clause_id !== clauseId);
        return [...without, updated];
      });
      toast.success(`Status updated to ${STATUS_COLORS[newStatus].label}`);
    } catch {
      toast.error('Failed to update status');
    }
    setSavingId(null);
  };

  const handleAddEvidence = async (clause) => {
    const links = await apiClient.entities.BRCClauseEvidenceLink.filter({ organisation_id: org.id, clause_id: clause.id });
    setEvidenceLinks(links);
    setEvidenceModalClause(clause);
  };

  const handleEvidenceLinked = async () => {
    setEvidenceModalClause(null);
    // Refresh statuses to update evidence counts
    const st = await apiClient.entities.BRCClauseStatus.filter({ organisation_id: org.id });
    setStatuses(st);
  };

  const toggleSection = (sn) => setCollapsedSections(p => ({ ...p, [sn]: !p[sn] }));

  if (!org?.brc_standard) {
    return (
      <div className="text-center py-16 space-y-3">
        <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-semibold text-foreground">No BRC standard selected</p>
        <p className="text-sm text-muted-foreground">Go to <a href="/brc/settings" className="underline text-primary">BRC Settings</a> to choose your standard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clause Mapping</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Work through each section and attach evidence to every clause.</p>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9 text-sm" placeholder="Search clauses…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary + filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all',           label: `All (${clauses.length})` },
          { key: 'not_started',   label: `Not Started (${notStartedCount})` },
          { key: 'in_progress',   label: 'In Progress' },
          { key: 'evidence_attached', label: 'Evidence Attached' },
          { key: 'ready',         label: `Ready (${readyCount})` },
          { key: 'fundamental',   label: '★ Fundamentals' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : clauses.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No clauses found for this standard. An admin can seed clause data from the super-admin panel.
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">No clauses match the selected filter.</div>
      ) : (
        <div className="space-y-3">
          {sections.map(sn => (
            <SectionPanel
              key={sn}
              sectionNum={sn}
              sectionName={SECTION_NAMES[sn] || `Section ${sn}`}
              clauses={filteredClauses}
              statusMap={statusMap}
              savingId={savingId}
              onStatusChange={handleStatusChange}
              onAddEvidence={handleAddEvidence}
              collapsed={!!collapsedSections[sn]}
              onToggle={() => toggleSection(sn)}
              search={search}
            />
          ))}
        </div>
      )}

      {evidenceModalClause && (
        <EvidenceLinkModal
          clause={evidenceModalClause}
          org={org}
          existingLinks={evidenceLinks}
          onClose={() => setEvidenceModalClause(null)}
          onLinked={handleEvidenceLinked}
        />
      )}
    </div>
  );
}

export default function BrcClauses() {
  return <BrcModuleGuard><BrcClausesContent /></BrcModuleGuard>;
}

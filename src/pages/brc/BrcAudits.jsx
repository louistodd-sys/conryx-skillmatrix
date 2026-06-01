import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ScrollText, Search, Calendar, CheckCircle2, Clock, AlertTriangle, Link2 } from 'lucide-react';
import AuditFormModal from '@/components/brc/AuditFormModal';
import ClausePickerModal from '@/components/brc/ClausePickerModal';

const STATUS_CFG = {
  planned:     { label: 'Planned',     bg: 'bg-blue-100',  text: 'text-blue-700',  icon: Clock },
  in_progress: { label: 'In Progress', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  completed:   { label: 'Completed',   bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  overdue:     { label: 'Overdue',     bg: 'bg-red-100',   text: 'text-red-700',   icon: AlertTriangle },
};
const RATING_CFG = {
  satisfactory: { label: 'Satisfactory', bg: 'bg-green-100', text: 'text-green-700' },
  minor_issues: { label: 'Minor Issues', bg: 'bg-amber-100', text: 'text-amber-700' },
  major_issues: { label: 'Major Issues', bg: 'bg-red-100',   text: 'text-red-700'   },
  critical:     { label: 'Critical',     bg: 'bg-red-200',   text: 'text-red-900'   },
};

function BrcAuditsContent() {
  const { org } = useOrganisation();
  const [audits, setAudits] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clausePicker, setClausePicker] = useState(null);

  const load = () => {
    if (!org) return;
    base44.entities.BRCAudit.filter({ organisation_id: org.id }, '-scheduled_date').then(d => {
      setAudits(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = audits.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !(a.lead_auditor_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" /> Internal Audits
        </h1>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
          </select>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search audits…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Audit
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => {
          const count = audits.filter(a => a.status === k).length;
          return (
            <div key={k} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
              <p className="text-2xl font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <ScrollText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No audits found. Schedule your first internal audit.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> New Audit</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Audit</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden md:table-cell">Rating</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(a => {
                const sc = STATUS_CFG[a.status] || STATUS_CFG.planned;
                const rc = RATING_CFG[a.overall_rating];
                return (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      {a.lead_auditor_name && <p className="text-xs text-muted-foreground">Lead: {a.lead_auditor_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden sm:table-cell">{(a.audit_type || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.scheduled_date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {rc ? <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>{rc.label}</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setClausePicker(a)} className="text-muted-foreground hover:text-primary transition-colors" title="Link to clause" aria-label="Link to clause">
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditing(a); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AuditFormModal
          org={org}
          audit={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {clausePicker && (
        <ClausePickerModal
          org={org}
          entityType="BRCAudit"
          recordId={clausePicker.id}
          recordLabel={clausePicker.title}
          onClose={() => setClausePicker(null)}
        />
      )}
    </div>
  );
}

export default function BrcAudits() {
  return <BrcModuleGuard><BrcAuditsContent /></BrcModuleGuard>;
}
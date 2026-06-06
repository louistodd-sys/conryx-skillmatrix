import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, AlertTriangle, Search, Link2 } from 'lucide-react';
import NCFormModal from '@/components/brc/NCFormModal';
import ClausePickerModal from '@/components/brc/ClausePickerModal';

const SEV_CFG = {
  observation: { bg: 'bg-gray-100',  text: 'text-gray-600'  },
  minor:        { bg: 'bg-amber-100', text: 'text-amber-700' },
  major:        { bg: 'bg-red-100',   text: 'text-red-700'   },
  critical:     { bg: 'bg-red-200',   text: 'text-red-900'   },
};
const STATUS_CFG = {
  open:                 { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Open'            },
  under_investigation:  { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Investigating'   },
  capa_raised:          { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'CAPA Raised'     },
  closed:               { bg: 'bg-green-100', text: 'text-green-700', label: 'Closed'          },
  overdue:              { bg: 'bg-red-200',   text: 'text-red-900',   label: 'Overdue'         },
};

function BrcNCContent() {
  const { org } = useOrganisation();
  const [ncs, setNcs] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clausePicker, setClausePicker] = useState(null);

  const load = () => {
    if (!org) return;
    apiClient.entities.BRCNonConformance.filter({ organisation_id: org.id }, '-raised_date').then(d => {
      setNcs(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = ncs.filter(n => {
    if (statusFilter && n.status !== statusFilter) return false;
    if (search && !(n.title || '').toLowerCase().includes(search.toLowerCase()) && !(n.ref_number || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCount = ncs.filter(n => n.status === 'open' || n.status === 'under_investigation').length;
  const overdueCount = ncs.filter(n => n.status === 'overdue').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-primary" /> Non-Conformances
        </h1>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
          </select>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search NCs…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Raise NC
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    val: ncs.length,     color: 'text-foreground' },
          { label: 'Open',     val: openCount,       color: 'text-red-600'   },
          { label: 'Overdue',  val: overdueCount,    color: 'text-red-800'   },
          { label: 'Closed',   val: ncs.filter(n => n.status === 'closed').length, color: 'text-green-700' },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No non-conformances found.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Raise NC</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">Ref</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24 hidden sm:table-cell">Severity</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-32">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24 hidden md:table-cell">Raised</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24 hidden md:table-cell">Due</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(n => {
                const sc = STATUS_CFG[n.status] || STATUS_CFG.open;
                const sv = SEV_CFG[n.severity] || SEV_CFG.minor;
                return (
                  <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{n.ref_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{(n.source || '').replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${sv.bg} ${sv.text}`}>{n.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{n.raised_date || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{n.due_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setClausePicker(n)} className="text-muted-foreground hover:text-primary transition-colors" title="Link to clause" aria-label="Link to clause">
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditing(n); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
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
        <NCFormModal
          org={org}
          nc={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {clausePicker && (
        <ClausePickerModal
          org={org}
          entityType="BRCNonConformance"
          recordId={clausePicker.id}
          recordLabel={`${clausePicker.ref_number || ''} ${clausePicker.title}`}
          onClose={() => setClausePicker(null)}
        />
      )}
    </div>
  );
}

export default function BrcNonConformances() {
  return <BrcModuleGuard><BrcNCContent /></BrcModuleGuard>;
}
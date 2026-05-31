import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ClipboardList, Search, CheckCircle2, Clock } from 'lucide-react';
import CAPAFormModal from '@/components/brc/CAPAFormModal';

const STATUS_CFG = {
  open:        { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Open'        },
  in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  completed:   { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Completed'   },
  verified:    { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified'    },
  overdue:     { bg: 'bg-red-200',   text: 'text-red-900',   label: 'Overdue'     },
};

function BrcCapasContent() {
  const { org } = useOrganisation();
  const [capas, setCapas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    if (!org) return;
    base44.entities.BRCCAPA.filter({ organisation_id: org.id }, '-raised_date').then(d => {
      setCapas(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = capas.filter(c =>
    !search || (c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.ref_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" /> CAPA Register
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search CAPAs…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New CAPA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
            <p className="text-2xl font-bold text-foreground">{capas.filter(c => c.status === k).length}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No CAPAs found.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> New CAPA</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">Ref</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-32 hidden sm:table-cell">Responsible</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24 hidden md:table-cell">Due</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => {
                const sc = STATUS_CFG[c.status] || STATUS_CFG.open;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{c.ref_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      {c.nc_ref && <p className="text-xs text-muted-foreground">NC: {c.nc_ref}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{c.responsible_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{c.due_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(c); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CAPAFormModal
          org={org}
          capa={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

export default function BrcCapas() {
  return <BrcModuleGuard><BrcCapasContent /></BrcModuleGuard>;
}
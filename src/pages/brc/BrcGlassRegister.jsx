import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FlaskConical, Search, AlertTriangle } from 'lucide-react';
import GlassItemFormModal from '@/components/brc/GlassItemFormModal';

const STATUS_CFG = {
  ok:       { bg: 'bg-green-100', text: 'text-green-700', label: 'OK'       },
  damaged:  { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Damaged'  },
  replaced: { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Replaced' },
  removed:  { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Removed'  },
};
const RISK_CFG = {
  low:    { bg: 'bg-green-100', text: 'text-green-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  high:   { bg: 'bg-red-100',   text: 'text-red-700'   },
};

function BrcGlassRegisterContent() {
  const { org } = useOrganisation();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    if (!org) return;
    base44.entities.BRCGlassItem.filter({ organisation_id: org.id }, 'location').then(d => {
      setItems(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = items.filter(i =>
    !search || (i.item_description || '').toLowerCase().includes(search.toLowerCase()) || (i.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const damaged = items.filter(i => i.status === 'damaged').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" /> Glass & Hard Plastic Register
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      {damaged > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{damaged}</strong> item{damaged !== 1 ? 's' : ''} marked as damaged — immediate action required</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
            <p className="text-2xl font-bold text-foreground">{items.filter(i => i.status === k).length}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <FlaskConical className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No items in the glass register.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Add Item</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Item</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-32 hidden sm:table-cell">Location</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20 hidden md:table-cell">Risk</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden lg:table-cell">Last Checked</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(i => {
                const sc = STATUS_CFG[i.status] || STATUS_CFG.ok;
                const rc = RISK_CFG[i.risk_level] || RISK_CFG.medium;
                return (
                  <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{i.item_description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden sm:table-cell">{(i.item_type || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{i.location || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${rc.bg} ${rc.text}`}>{i.risk_level}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{i.last_checked_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditing(i); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <GlassItemFormModal
          org={org}
          item={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

export default function BrcGlassRegister() {
  return <BrcModuleGuard><BrcGlassRegisterContent /></BrcModuleGuard>;
}
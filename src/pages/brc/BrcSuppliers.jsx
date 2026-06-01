import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Truck, Search, Link2 } from 'lucide-react';
import SupplierFormModal from '@/components/brc/SupplierFormModal';
import ClausePickerModal from '@/components/brc/ClausePickerModal';

const APPROVAL_CFG = {
  approved:     { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved'      },
  conditional:  { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Conditional'   },
  unapproved:   { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Unapproved'   },
  suspended:    { bg: 'bg-red-200',   text: 'text-red-900',   label: 'Suspended'    },
  under_review: { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Under Review' },
};
const RISK_CFG = {
  low:      { bg: 'bg-green-100', text: 'text-green-700' },
  medium:   { bg: 'bg-amber-100', text: 'text-amber-700' },
  high:     { bg: 'bg-red-100',   text: 'text-red-700'   },
  critical: { bg: 'bg-red-200',   text: 'text-red-900'   },
};

function BrcSuppliersContent() {
  const { org } = useOrganisation();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clausePicker, setClausePicker] = useState(null);

  const load = () => {
    if (!org) return;
    base44.entities.BRCSupplier.filter({ organisation_id: org.id }, 'name').then(d => {
      setSuppliers(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.supplier_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <Truck className="w-6 h-6 text-primary" /> Supplier Approval Register
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Supplier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(APPROVAL_CFG).filter(([k]) => k !== 'conditional').map(([k, cfg]) => (
          <div key={k} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
            <p className="text-2xl font-bold text-foreground">{suppliers.filter(s => s.approval_status === k).length}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No suppliers found.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Add Supplier</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Supplier</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20 hidden md:table-cell">Risk</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden lg:table-cell">Next Review</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => {
                const ac = APPROVAL_CFG[s.approval_status] || APPROVAL_CFG.under_review;
                const rc = RISK_CFG[s.risk_rating] || RISK_CFG.medium;
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      {s.supplier_code && <p className="text-xs text-muted-foreground">{s.supplier_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden sm:table-cell">{(s.category || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${ac.bg} ${ac.text}`}>{ac.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${rc.bg} ${rc.text}`}>{s.risk_rating}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{s.next_review_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setClausePicker(s)} className="text-muted-foreground hover:text-primary transition-colors" title="Link to clause" aria-label="Link to clause">
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditing(s); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
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
        <SupplierFormModal
          org={org}
          supplier={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {clausePicker && (
        <ClausePickerModal
          org={org}
          entityType="BRCSupplier"
          recordId={clausePicker.id}
          recordLabel={clausePicker.name}
          onClose={() => setClausePicker(null)}
        />
      )}
    </div>
  );
}

export default function BrcSuppliers() {
  return <BrcModuleGuard><BrcSuppliersContent /></BrcModuleGuard>;
}
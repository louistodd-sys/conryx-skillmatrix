import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, Search } from 'lucide-react';
import ComplaintFormModal from '@/components/brc/ComplaintFormModal';

const STATUS_CFG = {
  new:           { bg: 'bg-red-100',   text: 'text-red-700',   label: 'New'          },
  investigating: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Investigating' },
  resolved:      { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Resolved'     },
  closed:        { bg: 'bg-green-100', text: 'text-green-700', label: 'Closed'       },
};
const SEV_CFG = {
  low:      { bg: 'bg-gray-100',  text: 'text-gray-600'  },
  medium:   { bg: 'bg-amber-100', text: 'text-amber-700' },
  high:     { bg: 'bg-red-100',   text: 'text-red-700'   },
  critical: { bg: 'bg-red-200',   text: 'text-red-900'   },
};

function BrcComplaintsContent() {
  const { org } = useOrganisation();
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    if (!org) return;
    apiClient.entities.BRCComplaint.filter({ organisation_id: org.id }, '-complaint_date').then(d => {
      setComplaints(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = complaints.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !(c.customer_name || '').toLowerCase().includes(search.toLowerCase()) && !(c.ref_number || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Customer Complaint Register
        </h1>
        <div className="flex items-center gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_CFG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
          </select>
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search complaints…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Log Complaint
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
            <p className="text-2xl font-bold text-foreground">{complaints.filter(c => c.status === k).length}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No complaints found.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Log Complaint</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">Ref</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell w-24">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20 hidden md:table-cell">Severity</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24 hidden lg:table-cell">Date</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(c => {
                const sc = STATUS_CFG[c.status] || STATUS_CFG.new;
                const sv = SEV_CFG[c.severity] || SEV_CFG.medium;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{c.ref_number || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{c.customer_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden sm:table-cell">{c.category}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${sv.bg} ${sv.text}`}>{c.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{c.complaint_date}</td>
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
        <ComplaintFormModal
          org={org}
          complaint={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

export default function BrcComplaints() {
  return <BrcModuleGuard><BrcComplaintsContent /></BrcModuleGuard>;
}
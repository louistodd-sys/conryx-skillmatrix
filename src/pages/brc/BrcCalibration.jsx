import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Wrench, Search, AlertTriangle, Link2 } from 'lucide-react';
import CalibrationFormModal from '@/components/brc/CalibrationFormModal';
import ClausePickerModal from '@/components/brc/ClausePickerModal';

const STATUS_CFG = {
  in_calibration: { bg: 'bg-green-100', text: 'text-green-700', label: 'In Calibration' },
  due_soon:       { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Due Soon'       },
  overdue:        { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Overdue'        },
  out_of_service: { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Out of Service' },
};

function BrcCalibrationContent() {
  const { org } = useOrganisation();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clausePicker, setClausePicker] = useState(null);

  const load = () => {
    if (!org) return;
    apiClient.entities.BRCCalibrationRecord.filter({ organisation_id: org.id }, 'next_calibration_date').then(d => {
      setRecords(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const filtered = records.filter(r =>
    !search || (r.equipment_name || '').toLowerCase().includes(search.toLowerCase()) || (r.equipment_id || '').toLowerCase().includes(search.toLowerCase())
  );

  const overdueOrDue = records.filter(r => r.status === 'overdue' || r.status === 'due_soon').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" /> Calibration Register
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search equipment…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Equipment
          </Button>
        </div>
      </div>

      {overdueOrDue > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{overdueOrDue}</strong> item{overdueOrDue !== 1 ? 's' : ''} require attention (overdue or due soon)</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => r.status === k).length}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No calibration records found.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Add Equipment</Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Equipment</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Location</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden md:table-cell">Last Cal.</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden md:table-cell">Next Due</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => {
                const sc = STATUS_CFG[r.status] || STATUS_CFG.in_calibration;
                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{r.equipment_name}</p>
                      <p className="text-xs text-muted-foreground">{r.equipment_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{r.location || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{r.last_calibration_date || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{r.next_calibration_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setClausePicker(r)} className="text-muted-foreground hover:text-primary transition-colors" title="Link to clause" aria-label="Link to clause">
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditing(r); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
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
        <CalibrationFormModal
          org={org}
          record={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {clausePicker && (
        <ClausePickerModal
          org={org}
          entityType="BRCCalibrationRecord"
          recordId={clausePicker.id}
          recordLabel={`${clausePicker.equipment_id || ''} ${clausePicker.equipment_name}`}
          onClose={() => setClausePicker(null)}
        />
      )}
    </div>
  );
}

export default function BrcCalibration() {
  return <BrcModuleGuard><BrcCalibrationContent /></BrcModuleGuard>;
}
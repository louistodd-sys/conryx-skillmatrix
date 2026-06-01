import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Plus, Bug, Calendar, CheckCircle2, AlertTriangle, Clock, Link2 } from 'lucide-react';
import PestControlFormModal from '@/components/brc/PestControlFormModal';
import ClausePickerModal from '@/components/brc/ClausePickerModal';

const STATUS_CFG = {
  scheduled:       { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Scheduled'       },
  completed:       { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed'        },
  action_required: { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Action Required'  },
};
const ACTIVITY_CFG = {
  none:   { bg: 'bg-green-100', text: 'text-green-700' },
  low:    { bg: 'bg-amber-100', text: 'text-amber-700' },
  medium: { bg: 'bg-orange-100',text: 'text-orange-700' },
  high:   { bg: 'bg-red-100',   text: 'text-red-700'   },
};

function BrcPestControlContent() {
  const { org } = useOrganisation();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clausePicker, setClausePicker] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = () => {
    if (!org) return;
    base44.entities.BRCPestControlVisit.filter({ organisation_id: org.id }, '-visit_date').then(d => {
      setVisits(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  const actionRequired = visits.filter(v => v.status === 'action_required').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <Bug className="w-6 h-6 text-primary" /> Pest Control Log
        </h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Log Visit
        </Button>
      </div>

      {actionRequired > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>{actionRequired}</strong> visit{actionRequired !== 1 ? 's' : ''} require follow-up action</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
            <p className="text-2xl font-bold text-foreground">{visits.filter(v => v.status === k).length}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <Bug className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No pest control visits recorded.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> Log Visit</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(v => {
            const sc = STATUS_CFG[v.status] || STATUS_CFG.scheduled;
            const ac = ACTIVITY_CFG[v.activity_level] || ACTIVITY_CFG.none;
            return (
              <div key={v.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />{v.visit_date}
                    </span>
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">({(v.visit_type || '').replace('_', ' ')})</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Contractor: <span className="text-foreground/80">{v.contractor_name}</span></p>
                  {v.findings && <p className="text-xs text-foreground/70 line-clamp-2 mt-0.5">{v.findings}</p>}
                  {v.activity_level && v.activity_level !== 'none' && (
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ac.bg} ${ac.text}`}>
                      Activity: {v.activity_level}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setClausePicker(v)} className="text-muted-foreground hover:text-primary transition-colors" title="Link to clause" aria-label="Link to clause">
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(v); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
                </div>
              </div>
            );
          })}
          {visits.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Previous</Button>
              <span className="text-xs text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visits.length)} of {visits.length}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= visits.length}>Next</Button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <PestControlFormModal
          org={org}
          visit={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {clausePicker && (
        <ClausePickerModal
          org={org}
          entityType="BRCPestControlVisit"
          recordId={clausePicker.id}
          recordLabel={`Pest Control Visit ${clausePicker.visit_date || ''}`}
          onClose={() => setClausePicker(null)}
        />
      )}
    </div>
  );
}

export default function BrcPestControl() {
  return <BrcModuleGuard><BrcPestControlContent /></BrcModuleGuard>;
}
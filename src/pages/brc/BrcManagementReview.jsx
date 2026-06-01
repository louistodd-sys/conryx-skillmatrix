import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Plus, Users2, Calendar, CheckCircle2, Link2 } from 'lucide-react';
import ManagementReviewFormModal from '@/components/brc/ManagementReviewFormModal';
import ClausePickerModal from '@/components/brc/ClausePickerModal';

const STATUS_CFG = {
  scheduled:         { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Scheduled'        },
  completed:         { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Completed'         },
  minutes_approved:  { bg: 'bg-green-100', text: 'text-green-700', label: 'Minutes Approved'  },
};

function BrcManagementReviewContent() {
  const { org } = useOrganisation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clausePicker, setClausePicker] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = () => {
    if (!org) return;
    base44.entities.BRCManagementReview.filter({ organisation_id: org.id }, '-meeting_date').then(d => {
      setReviews(d); setLoading(false);
    });
  };
  useEffect(load, [org?.id]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <Users2 className="w-6 h-6 text-primary" /> Management Review
        </h1>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New Review
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <Users2 className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No management reviews recorded. Schedule your first review.</p>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" /> New Review</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(r => {
            const sc = STATUS_CFG[r.status] || STATUS_CFG.scheduled;
            return (
              <div key={r.id} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {r.meeting_date}
                    </span>
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Chair: {r.chair_name}</p>
                  {r.attendees?.length > 0 && (
                    <p className="text-xs text-muted-foreground">Attendees: {r.attendees.join(', ')}</p>
                  )}
                  {r.actions && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{r.actions}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setClausePicker(r)} className="text-muted-foreground hover:text-primary transition-colors" title="Link to clause" aria-label="Link to clause">
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditing(r); setShowModal(true); }} className="text-primary hover:underline text-xs font-medium">Edit</button>
                </div>
              </div>
            );
          })}
          {reviews.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Previous</Button>
              <span className="text-xs text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, reviews.length)} of {reviews.length}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= reviews.length}>Next</Button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ManagementReviewFormModal
          org={org}
          review={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {clausePicker && (
        <ClausePickerModal
          org={org}
          entityType="BRCManagementReview"
          recordId={clausePicker.id}
          recordLabel={`Management Review ${clausePicker.meeting_date || ''}`}
          onClose={() => setClausePicker(null)}
        />
      )}
    </div>
  );
}

export default function BrcManagementReview() {
  return <BrcModuleGuard><BrcManagementReviewContent /></BrcModuleGuard>;
}
import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { FileText, ExternalLink, CheckCircle2 } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = ['not_started','in_progress','evidence_attached','ready','needs_review'];
const STATUS_LABELS  = { not_started:'Not Started', in_progress:'In Progress', evidence_attached:'Evidence Attached', ready:'Ready', needs_review:'Needs Review' };

const DOC_TYPE_LABELS = {
  procedure:'Procedure', policy:'Policy', work_instruction:'Work Instruction',
  form:'Form', record_template:'Record Template', external_standard:'External Standard',
};
const DOC_STATUS_COLORS = {
  approved:     { bg: 'bg-green-100', text: 'text-green-700' },
  under_review: { bg: 'bg-amber-100', text: 'text-amber-700' },
  draft:        { bg: 'bg-gray-100',  text: 'text-gray-600'  },
  superseded:   { bg: 'bg-blue-100',  text: 'text-blue-700'  },
  retired:      { bg: 'bg-red-100',   text: 'text-red-700'   },
};

function BrcClauseDetailContent() {
  const { clauseId } = useParams();
  const { org, user } = useOrganisation();
  const [clause, setClause] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('not_started');
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!org || !clauseId) return;
    Promise.all([
      base44.entities.BRCClause.filter({ id: clauseId }),
      base44.entities.BRCClauseStatus.filter({ organisation_id: org.id, clause_id: clauseId }),
      base44.entities.BRCClauseEvidenceLink.filter({ organisation_id: org.id, clause_id: clauseId }),
    ]).then(async ([cl, st, links]) => {
      if (cl[0]) setClause(cl[0]);
      if (st[0]) {
        setStatus(st[0]);
        setNotes(st[0].notes || '');
        setSelectedStatus(st[0].status || 'not_started');
      }

      // Fetch linked documents
      const docLinks = links.filter(l => l.linked_entity_type === 'document_version');
      if (docLinks.length > 0) {
        const docIds = [...new Set(docLinks.map(l => l.linked_entity_id))];
        const allDocs = await base44.entities.BRCDocument.filter({ organisation_id: org.id });
        const matched = allDocs.filter(d => docIds.includes(d.id));
        setLinkedDocs(matched);
      }
    });
  }, [org?.id, clauseId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      organisation_id:    org.id,
      clause_id:          clauseId,
      status:             selectedStatus,
      notes,
      last_reviewed_date: new Date().toISOString().split('T')[0],
      last_reviewed_by:   user?.id,
    };
    let record;
    if (status?.id) {
      record = await base44.entities.BRCClauseStatus.update(status.id, payload);
    } else {
      record = await base44.entities.BRCClauseStatus.create(payload);
    }
    setStatus(record);
    await base44.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id:   user?.id,
      actor_display:   user?.full_name || user?.email,
      action:          'brc_clause_status.updated',
      target_type:     'brc_clause_status',
      target_id:       record.id || clauseId,
      target_display:  clause?.clause_number || clauseId,
      detail:          JSON.stringify({ status: selectedStatus }),
    }).catch(() => {});
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  if (!clause) return <div className="h-32 bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb items={[
        { label: 'Clause Mapping', href: '/brc/clauses' },
        { label: `${clause.clause_number} — ${clause.title}` },
      ]} />
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">{clause.clause_number} — {clause.title}</h1>
        {clause.is_fundamental && (
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">★ Fundamental</span>
        )}
      </div>

      {/* Clause info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
          <p className="text-sm text-foreground">{clause.description}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Evidence Requirement</p>
          <p className="text-sm text-foreground">{clause.evidence_requirement}</p>
        </div>
      </div>

      {/* Linked Evidence Documents — shown inline */}
      {linkedDocs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Linked Evidence</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{linkedDocs.length} document{linkedDocs.length !== 1 ? 's' : ''} attached as evidence</p>
            </div>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {linkedDocs.length} Evidence
            </span>
          </div>
          <div className="divide-y divide-border">
            {linkedDocs.map(doc => {
              const cfg = DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.draft;
              const isOverdue = doc.next_review_date && new Date(doc.next_review_date) < new Date();
              return (
                <Link
                  key={doc.id}
                  to={`/brc/documents/${doc.id}`}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{doc.title}</p>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
                        {(doc.status || '').replace('_', ' ')}
                      </span>
                      {isOverdue && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Review Overdue</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {doc.doc_reference && <span className="text-xs font-mono text-muted-foreground">{doc.doc_reference}</span>}
                      <span className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</span>
                      <span className="text-xs text-muted-foreground">v{doc.current_version_number}</span>
                      {doc.next_review_date && <span className="text-xs text-muted-foreground">Review: {doc.next_review_date}</span>}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1 group-hover:text-primary transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Compliance status form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold">Compliance Status</h2>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
          <select
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</label>
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24 resize-y"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about evidence, actions, or observations…"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Status'}
        </Button>
      </div>
    </div>
  );
}

export default function BrcClauseDetail() {
  return <BrcModuleGuard><BrcClauseDetailContent /></BrcModuleGuard>;
}
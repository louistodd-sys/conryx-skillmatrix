import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { FileText, ExternalLink, CheckCircle2, Plus, Trash2, ScrollText, ClipboardList, AlertTriangle, Wrench, Truck, Users2, Bug, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import EvidenceLinkModal from '@/components/brc/EvidenceLinkModal';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['not_started','in_progress','evidence_attached','ready','needs_review'];
const STATUS_LABELS  = { not_started:'Not Started', in_progress:'In Progress', evidence_attached:'Evidence Attached', ready:'Ready', needs_review:'Needs Review' };

const STATUS_COLORS = {
  not_started:      'bg-gray-100 text-gray-600',
  in_progress:      'bg-amber-100 text-amber-700',
  evidence_attached:'bg-blue-100 text-blue-700',
  ready:            'bg-green-100 text-green-700',
  needs_review:     'bg-red-100 text-red-700',
};

const ENTITY_TYPE_CONFIG = {
  document_version:   { label: 'Document',        icon: FileText,      linkPrefix: '/brc/documents/',          nameField: 'title',         subField: 'doc_reference', entity: 'BRCDocument' },
  internal_audit:     { label: 'Internal Audit',   icon: ScrollText,    linkPrefix: '/brc/audits/',             nameField: 'title',         subField: 'scheduled_date', entity: 'BRCAudit' },
  non_conformance:    { label: 'Non-Conformance',  icon: AlertTriangle, linkPrefix: '/brc/non-conformances/',   nameField: 'title',         subField: 'ref_number',    entity: 'BRCNonConformance' },
  capa:               { label: 'CAPA',             icon: ClipboardList, linkPrefix: '/brc/capas/',              nameField: 'title',         subField: 'ref_number',    entity: 'BRCCAPA' },
  calibration_record: { label: 'Calibration',      icon: Wrench,        linkPrefix: '/brc/calibration/',        nameField: 'equipment_name',subField: 'equipment_id',  entity: 'BRCCalibrationRecord' },
  supplier_record:    { label: 'Supplier',         icon: Truck,         linkPrefix: '/brc/suppliers/',          nameField: 'name',          subField: 'supplier_code', entity: 'BRCSupplier' },
  management_review:  { label: 'Mgmt Review',      icon: Users2,        linkPrefix: '/brc/management-review/',  nameField: 'meeting_date',  subField: 'chair_name',    entity: 'BRCManagementReview' },
  pest_control_visit: { label: 'Pest Control',     icon: Bug,           linkPrefix: '/brc/pest-control/',       nameField: 'visit_date',    subField: 'contractor_name',entity: 'BRCPestControlVisit' },
  complaint_record:   { label: 'Complaint',        icon: MessageSquare, linkPrefix: '/brc/complaints/',         nameField: 'customer_name', subField: 'ref_number',    entity: 'BRCComplaint' },
};

function BrcClauseDetailContent() {
  const { clauseId } = useParams();
  const { org, user } = useOrganisation();
  const [clause, setClause] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('not_started');
  const [evidenceLinks, setEvidenceLinks] = useState([]);
  const [evidenceRecords, setEvidenceRecords] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);

  const loadEvidence = async () => {
    const links = await apiClient.entities.BRCClauseEvidenceLink.filter({ organisation_id: org.id, clause_id: clauseId });
    setEvidenceLinks(links);

    // Batch-load all referenced records
    const byType = {};
    links.forEach(l => {
      if (!byType[l.linked_entity_type]) byType[l.linked_entity_type] = [];
      byType[l.linked_entity_type].push(l.linked_entity_id);
    });

    const records = {};
    await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
      const cfg = ENTITY_TYPE_CONFIG[type];
      if (!cfg) return;
      const all = await apiClient.entities[cfg.entity].filter({ organisation_id: org.id });
      all.filter(r => ids.includes(r.id)).forEach(r => { records[r.id] = r; });
    }));
    setEvidenceRecords(records);
  };

  useEffect(() => {
    if (!org || !clauseId) return;
    Promise.all([
      apiClient.entities.BRCClause.filter({ id: clauseId }),
      apiClient.entities.BRCClauseStatus.filter({ organisation_id: org.id, clause_id: clauseId }),
    ]).then(([cl, st]) => {
      if (cl[0]) setClause(cl[0]);
      if (st[0]) {
        setStatus(st[0]);
        setNotes(st[0].notes || '');
        setSelectedStatus(st[0].status || 'not_started');
      }
    });
    loadEvidence();
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
      record = await apiClient.entities.BRCClauseStatus.update(status.id, payload);
    } else {
      record = await apiClient.entities.BRCClauseStatus.create(payload);
    }
    setStatus(record);
    await apiClient.entities.AuditLogEntry.create({
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
    toast.success('Clause status saved');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRemoveEvidence = async (linkId) => {
    try {
      await apiClient.entities.BRCClauseEvidenceLink.delete(linkId);
      await loadEvidence();
      toast.success('Evidence removed');
    } catch {
      toast.error('Failed to remove evidence');
    }
  };

  if (!clause) return <div className="h-32 bg-muted animate-pulse rounded-xl" />;

  // Group evidence by type
  const evidenceByType = {};
  evidenceLinks.forEach(l => {
    if (!evidenceByType[l.linked_entity_type]) evidenceByType[l.linked_entity_type] = [];
    evidenceByType[l.linked_entity_type].push(l);
  });
  const totalEvidence = evidenceLinks.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <Breadcrumb items={[
        { label: 'Clause Mapping', href: '/brc/clauses' },
        { label: `${clause.clause_number} — ${clause.title}` },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">{clause.clause_number} — {clause.title}</h1>
          {clause.is_fundamental && (
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">★ Fundamental</span>
          )}
          {status?.status && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[status.status]}`}>
              {STATUS_LABELS[status.status]}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setShowEvidenceModal(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Evidence
        </Button>
      </div>

      {/* Clause info + guidance */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
          <p className="text-sm text-foreground">{clause.description}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Evidence Requirement</p>
          <p className="text-sm text-foreground italic text-primary">{clause.evidence_requirement}</p>
        </div>
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowGuidance(g => !g)}
        >
          {showGuidance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showGuidance ? 'Hide guidance' : 'Show evidence guidance'}
        </button>
        {showGuidance && (
          <div className="mt-2 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Typical evidence for this clause:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Written procedures or policies referencing this clause</li>
              <li>Completed records or forms demonstrating implementation</li>
              <li>Internal audit findings confirming compliance</li>
              <li>Training records for personnel responsible for this area</li>
              <li>Supplier or contractor documentation if applicable</li>
            </ul>
            <p className="pt-1 text-xs text-muted-foreground">Use the <strong>Add Evidence</strong> button to link existing records as evidence, then set status to <strong>Ready</strong> once all evidence is attached.</p>
          </div>
        )}
      </div>

      {/* Evidence panel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Linked Evidence</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalEvidence > 0
                ? `${totalEvidence} item${totalEvidence !== 1 ? 's' : ''} attached as evidence`
                : 'No evidence linked yet — click Add Evidence to attach records'}
            </p>
          </div>
          {totalEvidence > 0 && (
            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {totalEvidence}
            </span>
          )}
        </div>

        {totalEvidence === 0 ? (
          <div className="px-5 py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No evidence linked yet.</p>
            <Button size="sm" variant="outline" onClick={() => setShowEvidenceModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Evidence
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(evidenceByType).map(([type, links]) => {
              const cfg = ENTITY_TYPE_CONFIG[type];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return links.map(link => {
                const record = evidenceRecords[link.linked_entity_id];
                return (
                  <div key={link.id} className="flex items-center gap-3 px-5 py-3 group">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{cfg.label}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {record ? record[cfg.nameField] || '—' : 'Loading…'}
                      </p>
                      {record && cfg.subField && record[cfg.subField] && (
                        <p className="text-xs text-muted-foreground">{record[cfg.subField]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {record && (
                        <Link
                          to={`${cfg.linkPrefix}${link.linked_entity_id}`}
                          className="text-xs text-primary hover:underline flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleRemoveEvidence(link.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Remove evidence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>

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
          <p className="text-xs text-muted-foreground mt-1">
            Set to <strong>Ready</strong> once evidence is attached and you are confident this clause is audit-ready.
          </p>
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

      {showEvidenceModal && (
        <EvidenceLinkModal
          clause={clause}
          org={org}
          existingLinks={evidenceLinks}
          onClose={() => setShowEvidenceModal(false)}
          onLinked={() => { setShowEvidenceModal(false); loadEvidence(); }}
        />
      )}
    </div>
  );
}

export default function BrcClauseDetail() {
  return <BrcModuleGuard><BrcClauseDetailContent /></BrcModuleGuard>;
}

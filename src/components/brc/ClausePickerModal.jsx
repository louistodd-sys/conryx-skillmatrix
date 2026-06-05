import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Search, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const ENTITY_TYPE_MAP = {
  BRCAudit:             'internal_audit',
  BRCNonConformance:    'non_conformance',
  BRCCAPA:              'capa',
  BRCCalibrationRecord: 'calibration_record',
  BRCSupplier:          'supplier_record',
  BRCManagementReview:  'management_review',
  BRCPestControlVisit:  'pest_control_visit',
  BRCComplaint:         'complaint_record',
  BRCDocument:          'document_version',
};

export default function ClausePickerModal({ org, entityType, recordId, recordLabel, onClose }) {
  const [clauses, setClauses] = useState([]);
  const [existingLinks, setExistingLinks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const linkedEntityType = ENTITY_TYPE_MAP[entityType] || entityType;

  useEffect(() => {
    if (!org?.brc_standard) return;
    Promise.all([
      apiClient.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order', 200),
      apiClient.entities.BRCClauseStatus.filter({ organisation_id: org.id }),
      apiClient.entities.BRCClauseEvidenceLink.filter({ organisation_id: org.id, linked_entity_id: recordId }),
    ]).then(([cls, sts, links]) => {
      setClauses(cls);
      setStatuses(sts);
      setExistingLinks(links.filter(l => l.linked_entity_type === linkedEntityType));
      setLoading(false);
    });
  }, [org?.id, recordId]);

  const statusMap = Object.fromEntries(statuses.map(s => [s.clause_id, s]));
  const alreadyLinkedClauseIds = new Set(existingLinks.map(l => l.clause_id));

  const filtered = clauses.filter(c => {
    if (!search) return true;
    return c.clause_number.includes(search) || c.title.toLowerCase().includes(search.toLowerCase());
  });

  const STATUS_COLORS = {
    not_started:      'bg-gray-100 text-gray-600',
    in_progress:      'bg-amber-100 text-amber-700',
    evidence_attached:'bg-blue-100 text-blue-700',
    ready:            'bg-green-100 text-green-700',
    needs_review:     'bg-red-100 text-red-700',
  };

  const handleLink = async (clause) => {
    if (alreadyLinkedClauseIds.has(clause.id)) return;
    setSaving(clause.id);
    try {
      await apiClient.entities.BRCClauseEvidenceLink.create({
        organisation_id:    org.id,
        clause_id:          clause.id,
        linked_entity_type: linkedEntityType,
        linked_entity_id:   recordId,
      });
      setExistingLinks(prev => [...prev, { clause_id: clause.id, linked_entity_type: linkedEntityType }]);
      toast.success(`Linked to clause ${clause.clause_number}`);
    } catch {
      toast.error('Failed to link to clause');
    }
    setSaving(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-card-lg flex flex-col max-h-[85vh]">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold font-jakarta">Link to Clause</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{recordLabel}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-sm" placeholder="Search clauses…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No clauses found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(c => {
                const isLinked = alreadyLinkedClauseIds.has(c.id);
                const st = statusMap[c.id];
                const statusCls = STATUS_COLORS[st?.status || 'not_started'];
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-foreground">{c.clause_number}</span>
                        {c.is_fundamental && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">★ Fund.</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusCls}`}>
                          {st?.status?.replace('_', ' ') || 'Not Started'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.title}</p>
                    </div>
                    {isLinked ? (
                      <span className="text-xs text-green-700 font-medium shrink-0">Linked ✓</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => handleLink(c)}
                        disabled={saving === c.id}
                      >
                        {saving === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Link2 className="w-3 h-3 mr-1" />Link</>}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-4 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Search, CheckCircle2, Link2, FileText, ScrollText, ClipboardList, AlertTriangle, Wrench, Truck, Users2, Bug, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { key: 'document_version',   label: 'Documents',          icon: FileText,     entity: 'BRCDocument',          searchFields: ['title','doc_reference'],    nameField: 'title',         subField: 'doc_reference' },
  { key: 'internal_audit',     label: 'Audits',             icon: ScrollText,   entity: 'BRCAudit',             searchFields: ['title','lead_auditor_name'],nameField: 'title',         subField: 'scheduled_date' },
  { key: 'non_conformance',    label: 'Non-Conformances',   icon: AlertTriangle,entity: 'BRCNonConformance',    searchFields: ['title','ref_number'],        nameField: 'title',         subField: 'ref_number' },
  { key: 'capa',               label: 'CAPAs',              icon: ClipboardList,entity: 'BRCCAPA',              searchFields: ['title','ref_number'],        nameField: 'title',         subField: 'ref_number' },
  { key: 'calibration_record', label: 'Calibration',        icon: Wrench,       entity: 'BRCCalibrationRecord', searchFields: ['equipment_name','equipment_id'],nameField:'equipment_name',subField: 'equipment_id' },
  { key: 'supplier_record',    label: 'Suppliers',          icon: Truck,        entity: 'BRCSupplier',          searchFields: ['name','supplier_code'],      nameField: 'name',          subField: 'supplier_code' },
  { key: 'management_review',  label: 'Mgmt Reviews',       icon: Users2,       entity: 'BRCManagementReview',  searchFields: ['chair_name'],               nameField: 'meeting_date',  subField: 'chair_name' },
  { key: 'pest_control_visit', label: 'Pest Control',       icon: Bug,          entity: 'BRCPestControlVisit',  searchFields: ['contractor_name'],          nameField: 'visit_date',    subField: 'contractor_name' },
  { key: 'complaint_record',   label: 'Complaints',         icon: MessageSquare,entity: 'BRCComplaint',         searchFields: ['customer_name','ref_number'],nameField: 'customer_name', subField: 'ref_number' },
];

export default function EvidenceLinkModal({ clause, org, existingLinks = [], onClose, onLinked }) {
  const [activeTab, setActiveTab] = useState(0);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const tab = TABS[activeTab];

  // IDs already linked for the current tab's entity type
  const alreadyLinkedIds = new Set(
    existingLinks.filter(l => l.linked_entity_type === tab.key).map(l => l.linked_entity_id)
  );

  useEffect(() => {
    setRecords([]);
    setSearch('');
    setSelected(new Set());
    setLoading(true);
    apiClient.entities[tab.entity].filter({ organisation_id: org.id }).then(r => {
      setRecords(r);
      setLoading(false);
    });
  }, [activeTab, org.id]);

  const filtered = records.filter(r => {
    if (!search) return true;
    return tab.searchFields.some(f => (r[f] || '').toLowerCase().includes(search.toLowerCase()));
  });

  const toggleSelect = (id) => {
    if (alreadyLinkedIds.has(id)) return; // already linked — can't re-link
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleLink = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await Promise.all([...selected].map(id =>
        apiClient.entities.BRCClauseEvidenceLink.create({
          organisation_id:    org.id,
          clause_id:          clause.id,
          linked_entity_type: tab.key,
          linked_entity_id:   id,
        })
      ));
      toast.success(`${selected.size} item${selected.size !== 1 ? 's' : ''} linked as evidence`);
      onLinked();
    } catch {
      toast.error('Failed to link evidence');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-card-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold font-jakarta">Add Evidence</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clause {clause.clause_number} — {clause.title}
            </p>
            {clause.evidence_requirement && (
              <p className="text-xs text-primary mt-1 italic">{clause.evidence_requirement}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-border shrink-0 bg-muted/30">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const linkedCount = existingLinks.filter(l => l.linked_entity_type === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === i
                    ? 'border-primary text-primary bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {linkedCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center">{linkedCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + list */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder={`Search ${tab.label.toLowerCase()}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No {tab.label.toLowerCase()} found.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(r => {
                const isLinked = alreadyLinkedIds.has(r.id);
                const isSelected = selected.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleSelect(r.id)}
                    disabled={isLinked}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isLinked ? 'opacity-50 cursor-not-allowed bg-muted/20' :
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isLinked ? 'border-green-400 bg-green-50' :
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}>
                      {(isLinked || isSelected) && (
                        <CheckCircle2 className={`w-3 h-3 ${isLinked ? 'text-green-600' : 'text-white'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r[tab.nameField] || '—'}</p>
                      {tab.subField && r[tab.subField] && (
                        <p className="text-xs text-muted-foreground">{r[tab.subField]}</p>
                      )}
                    </div>
                    {isLinked && (
                      <span className="text-xs text-green-700 font-medium shrink-0">Already linked</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border shrink-0">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : 'Select items to link as evidence'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleLink} disabled={selected.size === 0 || saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Linking…</> : <><Link2 className="w-3.5 h-3.5 mr-1.5" />Link {selected.size > 0 ? selected.size : ''} Item{selected.size !== 1 ? 's' : ''}</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

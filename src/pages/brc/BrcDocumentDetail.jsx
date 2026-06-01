import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { FileText, ExternalLink, Tag, Calendar, Hash, User } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  draft:        { bg: 'bg-gray-100',   text: 'text-gray-700'  },
  under_review: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  approved:     { bg: 'bg-green-100',  text: 'text-green-700' },
  superseded:   { bg: 'bg-blue-100',   text: 'text-blue-700'  },
  retired:      { bg: 'bg-red-100',    text: 'text-red-700'   },
};
const DOC_TYPE_LABELS = {
  procedure: 'Procedure', policy: 'Policy', work_instruction: 'Work Instruction',
  form: 'Form', record_template: 'Record Template', external_standard: 'External Standard',
};

function BrcDocumentDetailContent() {
  const { documentId } = useParams();
  const { org } = useOrganisation();
  const [doc, setDoc] = useState(null);
  const [linkedClauses, setLinkedClauses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org || !documentId || documentId === 'new') { setLoading(false); return; }
    Promise.all([
      base44.entities.BRCDocument.filter({ id: documentId }),
      base44.entities.BRCClauseEvidenceLink.filter({ organisation_id: org.id, linked_entity_id: documentId }),
    ]).then(async ([docs, links]) => {
      const d = docs[0];
      if (d) setDoc(d);

      if (links.length > 0) {
        // Fetch the actual clause records so we can show numbers + titles
        const clauseIds = [...new Set(links.map(l => l.clause_id))];
        const allClauses = await base44.entities.BRCClause.filter(
          { standard: org.brc_standard || 'brcgs_packaging' }, 'display_order', 200
        );
        const matched = allClauses.filter(c => clauseIds.includes(c.id));
        setLinkedClauses(matched);
      }
      setLoading(false);
    });
  }, [org?.id, documentId]);

  if (loading) return <div className="h-64 bg-muted animate-pulse rounded-xl" />;
  if (!doc) return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Documents', href: '/brc/documents' }, { label: 'Not found' }]} />
      <p className="text-muted-foreground text-sm">Document not found.</p>
    </div>
  );

  const cfg = STATUS_COLORS[doc.status] || STATUS_COLORS.draft;
  const isOverdueReview = doc.next_review_date && new Date(doc.next_review_date) < new Date();

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumb items={[
        { label: 'Documents', href: '/brc/documents' },
        { label: doc.title },
      ]} />
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {doc.title}
        </h1>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
          {(doc.status || '').replace('_', ' ')}
        </span>
      </div>

      {/* Document metadata */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Document Details</h2>

        {doc.description && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground">{doc.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Hash className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="text-sm font-mono font-medium text-foreground">{doc.doc_reference || '—'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm text-foreground">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="text-sm font-mono font-medium text-foreground">{doc.current_version_number}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Next Review</p>
              <p className={`text-sm font-medium ${isOverdueReview ? 'text-red-600' : 'text-foreground'}`}>
                {doc.next_review_date || '—'} {isOverdueReview && '(Overdue)'}
              </p>
            </div>
          </div>
        </div>

        {/* BRC Clause References */}
        {doc.brc_clause_refs && doc.brc_clause_refs.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">BRC Clause References</p>
            <div className="flex flex-wrap gap-1.5">
              {doc.brc_clause_refs.map(ref => (
                <span key={ref} className="text-xs font-mono font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {ref}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Linked Clauses (navigable) */}
      {linkedClauses.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">Linked Clauses — Evidence</h2>
            <p className="text-xs text-muted-foreground mt-0.5">This document is linked as evidence for the following clauses</p>
          </div>
          <div className="divide-y divide-border">
            {linkedClauses.map(c => (
              <Link
                key={c.id}
                to={`/brc/clauses/${c.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-primary">{c.clause_number}</span>
                  {c.is_fundamental && <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">★ Fund.</span>}
                  <p className="text-sm text-foreground mt-0.5">{c.title}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrcDocumentDetail() {
  return <BrcModuleGuard><BrcDocumentDetailContent /></BrcModuleGuard>;
}
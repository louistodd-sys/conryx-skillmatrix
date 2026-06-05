import BrcModuleGuard from '@/components/BrcModuleGuard';
import { FileText, Plus, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  draft:        { bg: 'bg-gray-100',  text: 'text-gray-600'  },
  under_review: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved:     { bg: 'bg-green-100', text: 'text-green-700' },
  superseded:   { bg: 'bg-blue-100',  text: 'text-blue-700'  },
  retired:      { bg: 'bg-red-100',   text: 'text-red-700'   },
};
const DOC_TYPE_LABELS = {
  procedure:'Procedure', policy:'Policy', work_instruction:'Work Instruction',
  form:'Form', record_template:'Record Template', external_standard:'External Standard',
};

function BrcDocumentsContent() {
  const { org } = useOrganisation();
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    apiClient.entities.BRCDocument.filter({ organisation_id: org.id }, '-created_date').then(d => {
      setDocs(d);
      setLoading(false);
    });
  }, [org?.id]);

  const filtered = docs.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) || (d.doc_reference || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Document Control
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-9 text-sm" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" asChild>
            <Link to="/brc/documents/new"><Plus className="w-3.5 h-3.5 mr-1" /> New Document</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">{docs.length === 0 ? 'No documents yet. Create your first document.' : 'No documents match your search.'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20 hidden sm:table-cell">Version</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-32">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden md:table-cell">Review Date</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(doc => {
                const cfg = STATUS_COLORS[doc.status] || STATUS_COLORS.draft;
                return (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{doc.title}</p>
                      {doc.doc_reference && <p className="text-xs text-muted-foreground">{doc.doc_reference}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden sm:table-cell">{doc.current_version_number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cfg.bg} ${cfg.text}`}>
                        {(doc.status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {doc.next_review_date || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/brc/documents/${doc.id}`} className="text-primary hover:underline text-xs font-medium">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BrcDocuments() {
  return <BrcModuleGuard><BrcDocumentsContent /></BrcModuleGuard>;
}
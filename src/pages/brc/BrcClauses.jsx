import BrcModuleGuard from '@/components/BrcModuleGuard';
import { ShieldCheck, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  not_started:     { bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400',  label: 'Not Started'      },
  in_progress:     { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'In Progress'       },
  evidence_attached:{ bg: 'bg-blue-100', text: 'text-blue-700',  dot: 'bg-blue-500',  label: 'Evidence Attached' },
  ready:           { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Ready'             },
  needs_review:    { bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500',   label: 'Needs Review'      },
};

function BrcClausesContent() {
  const { org } = useOrganisation();
  const [clauses, setClauses] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      org.brc_standard
        ? base44.entities.BRCClause.filter({ standard: org.brc_standard }, 'display_order')
        : Promise.resolve([]),
      base44.entities.BRCClauseStatus.filter({ organisation_id: org.id }),
    ]).then(([cl, st]) => {
      setClauses(cl);
      setStatuses(st);
      setLoading(false);
    });
  }, [org?.id, org?.brc_standard]);

  const statusMap = Object.fromEntries(statuses.map(s => [s.clause_id, s]));

  const filtered = clauses.filter(c => {
    const matchSearch = !search || c.clause_number.includes(search) || c.title.toLowerCase().includes(search.toLowerCase());
    const st = statusMap[c.id];
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'not_started' ? (!st || st.status === 'not_started') :
      statusFilter === 'fundamental' ? c.is_fundamental :
      st?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const notStartedCount = clauses.filter(c => !statusMap[c.id] || statusMap[c.id]?.status === 'not_started').length;
  const readyCount = clauses.filter(c => statusMap[c.id]?.status === 'ready').length;

  if (!org?.brc_standard) {
    return (
      <div className="text-center py-16 space-y-3">
        <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-semibold text-foreground">No BRC standard selected</p>
        <p className="text-sm text-muted-foreground">Go to <a href="/brc/settings" className="underline text-primary">BRC Settings</a> to choose your standard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Clause Mapping</h1>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-9 text-sm" placeholder="Search clauses…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Summary + filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all',          label: `All (${clauses.length})` },
          { key: 'not_started',  label: `Not Started (${notStartedCount})` },
          { key: 'in_progress',  label: 'In Progress' },
          { key: 'evidence_attached', label: 'Evidence Attached' },
          { key: 'ready',        label: `Ready (${readyCount})` },
          { key: 'fundamental',  label: '★ Fundamentals' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : clauses.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No clauses found for this standard. An admin can seed clause data from the super-admin panel.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">Clause</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-36 hidden sm:table-cell">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-20 hidden md:table-cell">Evidence</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(clause => {
                const st = statusMap[clause.id];
                const cfg = STATUS_COLORS[st?.status || 'not_started'];
                return (
                  <tr key={clause.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">
                      {clause.clause_number}
                      {clause.is_fundamental && (
                        <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">★ Fund.</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{clause.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                      {st?.evidence_count ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/brc/clauses/${clause.id}`} className="text-primary hover:underline text-xs font-medium">View →</Link>
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

export default function BrcClauses() {
  return <BrcModuleGuard><BrcClausesContent /></BrcModuleGuard>;
}
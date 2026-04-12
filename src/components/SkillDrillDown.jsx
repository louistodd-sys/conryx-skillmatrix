import { X, CheckCircle, XCircle, AlertTriangle, Clock, User } from 'lucide-react';
import { getRAGStatus, getProficiencyLabel } from '@/lib/ragUtils';
import { format, parseISO, differenceInDays } from 'date-fns';

function StatusIcon({ status }) {
  if (status === 'green') return <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />;
  if (status === 'amber') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (status === 'red') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Clock className="w-4 h-4 text-gray-400 shrink-0" />;
}

function statusLabel(status) {
  if (status === 'green') return { text: 'Compliant', cls: 'bg-green-100 text-green-800' };
  if (status === 'amber') return { text: 'Expiring Soon', cls: 'bg-amber-100 text-amber-800' };
  if (status === 'red') return { text: 'Expired / Missing', cls: 'bg-red-100 text-red-800' };
  return { text: 'Not Assessed', cls: 'bg-gray-100 text-gray-600' };
}

export default function SkillDrillDown({ skillItem, teamMembers, currentAssessments, onClose }) {
  const { skill, category, req } = skillItem;

  const rows = teamMembers.map(m => {
    const assessment = currentAssessments[`${m.user_id}-${skill.id}`];
    const status = getRAGStatus(assessment, skill, req);
    const expiryDays = assessment?.expiry_date
      ? differenceInDays(parseISO(assessment.expiry_date), new Date())
      : null;
    return { ...m, assessment, status, expiryDays };
  }).sort((a, b) => {
    const order = { grey: 0, red: 1, amber: 2, green: 3 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  });

  const compliantCount = rows.filter(r => r.status === 'green').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((compliantCount / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {category && (
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.colour || '#6B7280' }} />
            )}
            <h2 className="text-base font-semibold truncate">{skill.name}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {category?.name} · {skill.scale_type === 'binary' ? 'Pass/Fail' : 'Levelled 1–4'}
            {skill.requires_expiry && ' · Requires expiry date'}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary bar */}
      <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Team coverage</span>
            <span className={`font-semibold ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-600'}`}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="text-right shrink-0 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{compliantCount}</span> / {total} compliant
        </div>
      </div>

      {/* Member list */}
      <div className="overflow-y-auto flex-1 divide-y divide-border">
        {rows.map(m => {
          const sl = statusLabel(m.status);
          return (
            <div key={m.user_id} className="px-5 py-3 flex items-center gap-3">
              <StatusIcon status={m.status} />
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                {(m.user_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.user_name || 'Unknown'}</div>
                {m.assessment ? (
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                    {skill.scale_type === 'levelled' && (
                      <span>Level {m.assessment.proficiency_level}</span>
                    )}
                    <span>Assessed {m.assessment.assessed_date ? format(parseISO(m.assessment.assessed_date), 'dd MMM yyyy') : '—'}</span>
                    {m.assessment.expiry_date && (
                      <span className={m.expiryDays !== null && m.expiryDays < 0 ? 'text-red-600 font-medium' : m.expiryDays !== null && m.expiryDays < 30 ? 'text-amber-600 font-medium' : ''}>
                        Expires {format(parseISO(m.assessment.expiry_date), 'dd MMM yyyy')}
                        {m.expiryDays !== null && m.expiryDays < 0 && ` (${Math.abs(m.expiryDays)}d ago)`}
                        {m.expiryDays !== null && m.expiryDays >= 0 && m.expiryDays < 60 && ` (${m.expiryDays}d)`}
                      </span>
                    )}
                    {m.assessment.assessed_by_name && <span>by {m.assessment.assessed_by_name}</span>}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground mt-0.5">No assessment on record</div>
                )}
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${sl.cls}`}>{sl.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
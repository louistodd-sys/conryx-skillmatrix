import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { RAG_THEME, RAG_ORDER, PROFICIENCY_SCALE } from '@/lib/ragTheme';

/**
 * The key to reading the grid. Always shows the four statuses (they are the whole
 * point of the page); tucks the fuller explanation behind a disclosure so the
 * legend costs one line of vertical space once the user knows the app.
 */
export default function MatrixLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap px-4 py-2.5">
        {RAG_ORDER.map(key => {
          const t = RAG_THEME[key];
          return (
            <span key={key} className="flex items-center gap-1.5" title={t.description}>
              <span
                className="w-3.5 h-3.5 rounded-[3px] shrink-0"
                style={{
                  background: key === 'grey' ? 'transparent' : t.bg,
                  border: key === 'grey' ? '1px dashed hsl(var(--border))' : '1px solid rgba(0,0,0,0.08)',
                }}
              />
              <span className="text-xs font-semibold text-foreground">{t.label}</span>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline no-print"
          aria-expanded={open}
        >
          <Info className="w-3.5 h-3.5" />
          {open ? 'Hide guide' : 'How to read this'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-3 grid gap-4 sm:grid-cols-2 animate-fade-in">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              What the colours mean
            </p>
            <ul className="space-y-1">
              {RAG_ORDER.map(key => {
                const t = RAG_THEME[key];
                return (
                  <li key={key} className="flex gap-2 text-xs leading-relaxed">
                    <span className="w-2 h-2 rounded-sm mt-1 shrink-0" style={{ background: t.dot }} />
                    <span>
                      <span className="font-semibold text-foreground">{t.label}</span>
                      <span className="text-muted-foreground"> — {t.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Amber cells carry a corner flag and gaps carry an underline, so status
              is readable in black and white and without relying on colour.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              What the numbers mean
            </p>
            <ul className="space-y-1">
              {PROFICIENCY_SCALE.map(p => (
                <li key={p.level} className="flex gap-2 text-xs leading-relaxed">
                  <span className="font-bold text-foreground w-3 shrink-0 tabular-nums">{p.level}</span>
                  <span>
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <span className="text-muted-foreground"> — {p.hint}</span>
                  </span>
                </li>
              ))}
              <li className="flex gap-2 text-xs leading-relaxed">
                <span className="font-bold text-foreground w-3 shrink-0">✓</span>
                <span className="text-muted-foreground">
                  A pass/fail skill that has been signed off (<span className="font-bold">✕</span> = not yet signed off).
                </span>
              </li>
              <li className="flex gap-2 text-xs leading-relaxed">
                <span className="font-bold text-foreground w-3 shrink-0">–</span>
                <span className="text-muted-foreground">Never assessed.</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

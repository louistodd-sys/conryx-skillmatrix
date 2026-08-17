import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { RAG_THEME, coverageStyle } from '@/lib/ragTheme';

/**
 * Presentational skills-matrix grid.
 *
 * Deliberately dumb: it receives rows, columns and a cell lookup, and owns nothing
 * but layout and interaction. That keeps the data-fetching page thin and lets the
 * grid be rendered in isolation.
 *
 * The layout problem this solves
 * ------------------------------
 * A skills matrix has a variable number of columns. Sizing the columns to a fixed
 * width means a 12-skill matrix leaves most of the screen empty (and, with an auto
 * table layout, the name column absorbs the slack — pushing the grid into the far
 * right of the page). So the column width is *derived* from the measured container:
 * grow columns to fill the width, up to a readable maximum, and only fall back to
 * horizontal scrolling once columns would be too narrow to read.
 *
 * Once columns are wide enough, skill labels are drawn horizontally (wrapped) — far
 * easier to read than rotated text. Rotation is a fallback for dense matrices only.
 */

const DENSITY = {
  comfortable: {
    cell: 38, colMin: 54, colMax: 150, rowPad: 9, nameW: 244, scoreW: 74,
    nameFont: 14, cellFont: 16, catH: 34,
  },
  compact: {
    cell: 26, colMin: 38, colMax: 112, rowPad: 3, nameW: 196, scoreW: 60,
    nameFont: 13, cellFont: 13, catH: 28,
  },
};

/** Width at which horizontal labels beat rotated ones. */
const HORIZONTAL_LABEL_MIN = 88;

/** Rough px width of a label at the header font size — good enough for layout maths. */
const estimateLabelWidth = (text) => Math.ceil(String(text || '').length * 6.4);

// ─── Cell corner markers: status cues that survive greyscale and colour blindness ──
function CellMarker({ marker, colour }) {
  if (marker === 'flag') {
    // Top-right triangle
    return (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0, width: 0, height: 0,
          borderTop: `7px solid ${colour}`, borderLeft: '7px solid transparent',
          borderTopRightRadius: 3,
        }}
      />
    );
  }
  if (marker === 'bar') {
    // Bottom edge bar
    return (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', left: 4, right: 4, bottom: 2, height: 2.5,
          background: colour, borderRadius: 2,
        }}
      />
    );
  }
  return null;
}

export default function SkillsMatrixGrid({
  members,
  categories,
  getCell,
  coverage = {},
  density = 'comfortable',
  onCellClick,
  onSkillClick,
  maxHeight = 'calc(100vh - 330px)',
}) {
  const D = DENSITY[density] || DENSITY.comfortable;
  const wrapRef = useRef(null);      // full-width: what space is available
  const viewportRef = useRef(null);  // scroll container: hugs the table
  const [viewportW, setViewportW] = useState(0);
  const [hover, setHover] = useState(null); // { cell, skill, member, rect }

  const columns = useMemo(
    () => categories.flatMap(cat => cat.skills.map(skill => ({ skill, cat }))),
    [categories]
  );
  const nCols = columns.length;

  // ── Measure the available width so columns can be sized to fill it ────────
  // Measured on the outer wrapper, never the scroll container: the card hugs the
  // table, so measuring the card would make the width depend on the very column
  // size being derived from it.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const longestLabel = useMemo(
    () => columns.reduce((m, c) => Math.max(m, estimateLabelWidth(c.skill.name)), 0),
    [columns]
  );

  // ── Derive column width + label orientation from the available space ──────
  const layout = useMemo(() => {
    const frozen = D.nameW + D.scoreW;
    // Reserve room for a vertical scrollbar plus a couple of pixels, so a table that
    // "just fits" never trips a horizontal scrollbar. The card hugs the table, so the
    // reserve is invisible rather than showing up as a gap.
    const available = Math.max(0, (viewportW || 0) - frozen - 14);

    if (nCols === 0) return { colW: D.colMin, rotated: false, headerH: 56, spacer: 0, totalW: frozen };

    const fit = (space) => Math.min(D.colMax, Math.max(D.colMin, Math.floor(space / nCols)));

    let colW = fit(available);
    let rotated = colW < HORIZONTAL_LABEL_MIN;
    let spacer = 0;

    if (rotated) {
      // Rotated labels rise up and to the right, so the last column needs run-off
      // room in the header or its label gets clipped by the scroll viewport.
      spacer = Math.ceil(Math.min(longestLabel, 150) * 0.7071) + 6;
      colW = fit(Math.max(0, available - spacer));
      // If widening for the spacer pushed us back over the threshold, take the
      // horizontal layout instead and drop the run-off column entirely.
      if (colW >= HORIZONTAL_LABEL_MIN) {
        rotated = false;
        spacer = 0;
        colW = fit(available);
      }
    }

    const headerH = rotated
      ? Math.min(164, 30 + Math.ceil(Math.min(longestLabel, 170) * 0.7071))
      : (density === 'compact' ? 52 : 64);

    return { colW, rotated, headerH, spacer, totalW: frozen + nCols * colW + spacer };
  }, [viewportW, nCols, longestLabel, D.nameW, D.scoreW, D.colMin, D.colMax, density]);

  const { colW, rotated, headerH, spacer, totalW } = layout;

  // ── Arrow-key navigation, so the grid feels like the spreadsheet it replaces ──
  const handleKeyDown = useCallback((e) => {
    const keys = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const delta = keys[e.key];
    if (!delta) return;
    const el = e.target.closest('[data-r]');
    if (!el) return;
    const r = Number(el.dataset.r) + delta[0];
    const c = Number(el.dataset.c) + delta[1];
    const next = viewportRef.current?.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    if (next) {
      e.preventDefault();
      next.focus();
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, []);

  // Hover card follows the pointer target; a single instance regardless of grid size.
  const showHover = (e, payload) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({ ...payload, rect });
  };
  const clearHover = () => setHover(null);
  useEffect(() => {
    const onScroll = () => setHover(null);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  // Rotated skill labels overhang the columns to their right. Header cells are
  // opaque (they have to be — the body scrolls under them), so paint order matters:
  // each header cell sits above every header cell after it, letting its label spill
  // over its neighbours instead of being covered by them.
  const skillZ = (ci) => 10 + (nCols - ci);
  const catZ = 10 + nCols + 5;
  const cornerZ = 10 + nCols + 10;

  const stickyName = {
    position: 'sticky', left: 0, zIndex: 3,
    width: D.nameW, minWidth: D.nameW, maxWidth: D.nameW,
  };
  const stickyScore = {
    position: 'sticky', left: D.nameW, zIndex: 3,
    width: D.scoreW, minWidth: D.scoreW, maxWidth: D.scoreW,
    borderRight: '2px solid hsl(var(--border))',
  };

  return (
    <div ref={wrapRef} className="w-full">
      {/* The card hugs the table. A few skills should give a smaller, deliberate-looking
          grid — not a full-width box with a lake of empty space beside the data. */}
      <div
        className="matrix-card rounded-xl border border-border bg-card shadow-card overflow-hidden"
        style={{ width: 'max-content', maxWidth: '100%' }}
      >
        <div
          ref={viewportRef}
          className="matrix-viewport overflow-auto"
          style={{ maxHeight }}
          onKeyDown={handleKeyDown}
        >
          <table
            className="matrix-table"
            /* An explicit pixel width is required: `table-layout: fixed` is ignored on a
               table sized by an intrinsic keyword, which would hand column widths back
               to the content and undo the fill-the-viewport maths above. */
            style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: totalW }}
          >
            <colgroup>
              <col style={{ width: D.nameW }} />
              <col style={{ width: D.scoreW }} />
              {columns.map(({ skill }) => <col key={skill.id} style={{ width: colW }} />)}
              {spacer > 0 && <col style={{ width: spacer }} />}
            </colgroup>

            <thead>
              {/* Row 1 — frozen corner + category colour bands */}
              <tr>
                <th
                  rowSpan={2}
                  className="matrix-corner"
                  style={{
                    ...stickyName, top: 0, zIndex: cornerZ,
                    height: D.catH + headerH,
                    padding: '0 14px 10px',
                    verticalAlign: 'bottom', textAlign: 'left',
                    borderBottom: '2px solid hsl(var(--border))',
                  }}
                >
                  <span className="block text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                    Team member
                  </span>
                  <span className="block text-[11px] text-muted-foreground/70 font-medium mt-0.5">
                    {members.length} {members.length === 1 ? 'person' : 'people'} · {nCols} {nCols === 1 ? 'skill' : 'skills'}
                  </span>
                </th>

                <th
                  rowSpan={2}
                  className="matrix-corner"
                  style={{
                    ...stickyScore, top: 0, zIndex: cornerZ,
                    height: D.catH + headerH,
                    padding: '0 8px 10px',
                    verticalAlign: 'bottom', textAlign: 'center',
                    borderBottom: '2px solid hsl(var(--border))',
                  }}
                >
                  <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground leading-tight">
                    Ready
                  </span>
                </th>

                {categories.map(cat => (
                  <th
                    key={cat.id}
                    colSpan={cat.skills.length}
                    title={cat.name}
                    style={{
                      position: 'sticky', top: 0, zIndex: catZ,
                      background: cat.colour || '#64748b',
                      color: '#ffffff',
                      height: D.catH,
                      padding: '0 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      borderRight: '2px solid hsl(var(--card))',
                      borderBottom: '2px solid hsl(var(--card))',
                    }}
                  >
                    {cat.name}
                  </th>
                ))}
                {spacer > 0 && <th rowSpan={2} className="matrix-skillhead" style={{ position: 'sticky', top: 0, zIndex: 9, borderBottom: '2px solid hsl(var(--border))' }} />}
              </tr>

              {/* Row 2 — skill labels */}
              <tr>
                {columns.map(({ skill, cat }, ci) => (
                  <th
                    key={skill.id}
                    className="matrix-skillhead"
                    style={{
                      position: 'sticky', top: D.catH, zIndex: skillZ(ci),
                      height: headerH,
                      padding: 0,
                      borderBottom: '2px solid hsl(var(--border))',
                      borderRight: '1px solid hsl(var(--border))',
                      verticalAlign: 'bottom',
                      overflow: 'visible',
                    }}
                  >
                    <button
                      type="button"
                      className="matrix-skillbtn group"
                      onClick={() => onSkillClick?.(skill)}
                      onMouseEnter={e => showHover(e, { kind: 'skill', skill, cat })}
                      onMouseLeave={clearHover}
                      onFocus={e => showHover(e, { kind: 'skill', skill, cat })}
                      onBlur={clearHover}
                      aria-label={`${skill.name} (${cat.name}) — assess every listed person on this skill`}
                      style={{
                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                        cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible',
                      }}
                    >
                      {rotated ? (
                        <span
                          style={{
                            flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end',
                            paddingLeft: Math.floor(colW / 2) - 2, overflow: 'visible',
                          }}
                        >
                          <span
                            style={{
                              display: 'block', transformOrigin: 'left bottom',
                              transform: 'rotate(-45deg)', whiteSpace: 'nowrap',
                              fontSize: 12, fontWeight: 600, lineHeight: 1.2,
                              color: 'hsl(var(--foreground))', userSelect: 'none',
                            }}
                          >
                            {skill.name}
                          </span>
                        </span>
                      ) : (
                        <span
                          style={{
                            flex: 1, width: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '6px 5px 2px', overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontSize: density === 'compact' ? 11 : 12,
                              fontWeight: 600, lineHeight: 1.22, textAlign: 'center',
                              color: 'hsl(var(--foreground))', userSelect: 'none',
                              overflowWrap: 'break-word',
                            }}
                          >
                            {skill.name}
                          </span>
                        </span>
                      )}
                      <Users
                        aria-hidden="true"
                        className="opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70 transition-opacity"
                        style={{ width: 12, height: 12, marginBottom: 4, flexShrink: 0, color: 'hsl(var(--primary))' }}
                      />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={nCols + 2 + (spacer > 0 ? 1 : 0)} className="py-14 text-center text-sm text-muted-foreground">
                    No people match your filters.
                  </td>
                </tr>
              )}

              {members.map((member, ri) => {
                const cs = coverageStyle(member.score ?? 0);
                return (
                  <tr key={member.id} className="matrix-row">
                    {/* Frozen person cell */}
                    <td
                      style={{
                        ...stickyName,
                        padding: `${D.rowPad}px 14px`,
                        borderBottom: '1px solid hsl(var(--border))',
                      }}
                    >
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span
                          className="font-semibold text-foreground truncate"
                          style={{ fontSize: D.nameFont }}
                          title={member.name}
                        >
                          {member.name}
                        </span>
                        {member.badge && (
                          <span className="text-[10px] text-muted-foreground/70 shrink-0">{member.badge}</span>
                        )}
                      </div>
                      {density === 'comfortable' && (
                        <div className="flex items-center gap-1 mt-1">
                          {member.counts?.red > 0 && (
                            <span className="text-[10px] font-bold rounded px-1.5 py-px" style={{ background: RAG_THEME.red.chipBg, color: RAG_THEME.red.chipFg }}>
                              {member.counts.red} gap{member.counts.red === 1 ? '' : 's'}
                            </span>
                          )}
                          {member.counts?.amber > 0 && (
                            <span className="text-[10px] font-bold rounded px-1.5 py-px" style={{ background: RAG_THEME.amber.chipBg, color: RAG_THEME.amber.chipFg }}>
                              {member.counts.amber} expiring
                            </span>
                          )}
                          {member.counts?.red === 0 && member.counts?.amber === 0 && member.counts?.green > 0 && (
                            <span className="text-[10px] font-bold rounded px-1.5 py-px" style={{ background: RAG_THEME.green.chipBg, color: RAG_THEME.green.chipFg }}>
                              All current
                            </span>
                          )}
                          {member.subtitle && (
                            <span className="text-[10px] text-muted-foreground truncate">{member.subtitle}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Frozen per-person readiness score */}
                    <td
                      style={{
                        ...stickyScore,
                        padding: `${D.rowPad}px 8px`,
                        textAlign: 'center',
                        borderBottom: '1px solid hsl(var(--border))',
                      }}
                    >
                      <span
                        className="inline-block rounded-md font-bold tabular-nums"
                        style={{ background: cs.bg, color: cs.fg, fontSize: 12, padding: '3px 6px', minWidth: 44 }}
                        title={`${member.name} is current on ${member.counts?.green ?? 0} of ${member.requiredTotal ?? 0} required skills`}
                      >
                        {member.score === null ? '—' : `${member.score}%`}
                      </span>
                    </td>

                    {/* Skill cells */}
                    {columns.map(({ skill, cat }, ci) => {
                      const cell = getCell(member.id, skill.id);
                      const theme = RAG_THEME[cell.status] || RAG_THEME.grey;
                      const isQuiet = cell.status === 'grey';
                      return (
                        <td
                          key={skill.id}
                          className="matrix-cell"
                          style={{
                            padding: 2,
                            textAlign: 'center',
                            borderBottom: '1px solid hsl(var(--border))',
                            borderRight: '1px solid hsl(var(--border))',
                          }}
                        >
                          <button
                            type="button"
                            data-r={ri}
                            data-c={ci}
                            className="matrix-cellbtn"
                            onClick={() => onCellClick?.(member, skill, cell)}
                            onMouseEnter={e => showHover(e, { kind: 'cell', cell, skill, cat, member })}
                            onMouseLeave={clearHover}
                            onFocus={e => showHover(e, { kind: 'cell', cell, skill, cat, member })}
                            onBlur={clearHover}
                            aria-label={`${member.name} — ${skill.name}: ${cell.label}. ${cell.levelLabel}. Click to record an assessment.`}
                            style={{
                              width: '100%',
                              height: D.cell,
                              borderRadius: 5,
                              background: isQuiet ? 'transparent' : theme.bg,
                              color: theme.fg,
                              border: isQuiet ? '1px dashed hsl(var(--border))' : '1px solid rgba(0,0,0,0.08)',
                              fontSize: isQuiet ? 12 : D.cellFont,
                              fontWeight: 800,
                              lineHeight: 1,
                              position: 'relative',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {cell.symbol}
                            <CellMarker marker={theme.marker} colour={theme.fg} />
                          </button>
                        </td>
                      );
                    })}
                    {spacer > 0 && <td style={{ borderBottom: '1px solid hsl(var(--border))' }} />}
                  </tr>
                );
              })}
            </tbody>

            {/* Coverage footer — frozen to the bottom of the viewport */}
            {members.length > 0 && (
              <tfoot>
                <tr className="matrix-foot">
                  <td
                    style={{
                      ...stickyName, bottom: 0, zIndex: 6,
                      padding: '8px 14px',
                      borderTop: '2px solid hsl(var(--border))',
                    }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
                      Coverage
                    </span>
                  </td>
                  <td
                    style={{
                      ...stickyScore, bottom: 0, zIndex: 6,
                      padding: '8px', textAlign: 'center',
                      borderTop: '2px solid hsl(var(--border))',
                    }}
                  >
                    <span className="text-[11px] text-muted-foreground">%</span>
                  </td>
                  {columns.map(({ skill }) => {
                    const pct = coverage[skill.id];
                    // null = nobody in view needs this skill, so a percentage would be
                    // meaningless (and a red 0% would read as a failure that isn't one).
                    const cs = pct === null || pct === undefined
                      ? { bg: 'transparent', fg: 'hsl(var(--muted-foreground))' }
                      : coverageStyle(pct);
                    return (
                      <td
                        key={skill.id}
                        style={{
                          position: 'sticky', bottom: 0, zIndex: 2,
                          padding: '6px 3px', textAlign: 'center',
                          borderTop: '2px solid hsl(var(--border))',
                          borderRight: '1px solid hsl(var(--border))',
                        }}
                      >
                        <span
                          className="inline-block rounded font-bold tabular-nums w-full"
                          style={{ background: cs.bg, color: cs.fg, fontSize: 11, padding: '3px 0' }}
                          title={
                            pct === null || pct === undefined
                              ? `${skill.name}: not required by anyone in this view`
                              : `${skill.name}: ${pct}% of the people this skill applies to are current`
                          }
                        >
                          {pct === null || pct === undefined ? '—' : `${pct}%`}
                        </span>
                      </td>
                    );
                  })}
                  {spacer > 0 && <td style={{ position: 'sticky', bottom: 0, zIndex: 2, borderTop: '2px solid hsl(var(--border))' }} />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* One shared hover card for the whole grid */}
      {hover && <HoverCard hover={hover} />}
    </div>
  );
}

// ─── Hover card ─────────────────────────────────────────────────────────────
function HoverCard({ hover }) {
  const { rect } = hover;
  const [flip, setFlip] = useState(false);
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setFlip(rect.bottom + el.offsetHeight + 12 > window.innerHeight);
  }, [rect]);

  const style = {
    position: 'fixed',
    left: Math.min(Math.max(8, rect.left + rect.width / 2 - 130), window.innerWidth - 268),
    top: flip ? undefined : rect.bottom + 8,
    bottom: flip ? window.innerHeight - rect.top + 8 : undefined,
    width: 260,
    zIndex: 60,
    pointerEvents: 'none',
  };

  if (hover.kind === 'skill') {
    return (
      <div ref={ref} style={style} className="rounded-lg border border-border bg-popover shadow-card-lg p-3 text-popover-foreground animate-fade-in">
        <p className="text-sm font-semibold leading-snug">{hover.skill.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hover.cat.name}</p>
        {hover.skill.description && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{hover.skill.description}</p>
        )}
        <p className="text-xs font-medium text-primary mt-2">Click to assess everyone on this skill →</p>
      </div>
    );
  }

  const { cell, skill, member } = hover;
  const theme = RAG_THEME[cell.status] || RAG_THEME.grey;
  return (
    <div ref={ref} style={style} className="rounded-lg border border-border bg-popover shadow-card-lg p-3 text-popover-foreground animate-fade-in">
      <p className="text-sm font-semibold leading-snug">{member.name}</p>
      <p className="text-xs text-muted-foreground">{skill.name}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: theme.dot }} />
        <span className="text-xs font-semibold">{cell.label}</span>
      </div>
      <dl className="mt-1.5 space-y-0.5 text-xs">
        <Row k="Level" v={cell.levelLabel} />
        {cell.requiredLabel && <Row k="Required" v={cell.requiredLabel} />}
        {cell.assessedDate && <Row k="Assessed" v={cell.assessedDate} />}
        {cell.expiryDate && <Row k="Expires" v={cell.expiryDate} />}
        {cell.assessedBy && <Row k="By" v={cell.assessedBy} />}
      </dl>
      {cell.notes && <p className="text-xs italic text-muted-foreground mt-1.5 leading-snug">“{cell.notes}”</p>}
      <p className="text-xs font-medium text-primary mt-2">Click to record an assessment →</p>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground shrink-0">{k}:</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

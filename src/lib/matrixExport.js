/**
 * Skills-matrix CSV export.
 *
 * The point of the export is that it opens in Excel looking like the matrix on
 * screen — same people down the side, same skills across the top, same category
 * grouping — so it can be dropped straight into a training pack or audit file.
 */

const escapeCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCSV = (rows) => rows.map(r => r.map(escapeCell).join(',')).join('\r\n');

export function buildMatrixCSV({ orgName, teamLabel, members, categories, getCell, coverage }) {
  const columns = categories.flatMap(cat => cat.skills.map(skill => ({ skill, cat })));

  const rows = [
    [`${orgName || 'Skills matrix'} — Skills Matrix`],
    [`Team: ${teamLabel}`],
    [`Exported: ${new Date().toISOString().slice(0, 10)}`],
    [],
    // Category band row, aligned above the skill names
    ['', '', ...columns.map(c => c.cat.name)],
    ['Team member', 'Ready %', ...columns.map(c => c.skill.name)],
  ];

  for (const member of members) {
    rows.push([
      member.name,
      member.score === null ? '' : member.score,
      ...columns.map(({ skill }) => {
        const cell = getCell(member.id, skill.id);
        // Human-readable, because a bare number loses the RAG meaning in Excel.
        if (cell.status === 'grey') return 'Not required';
        if (!cell.assessment) return cell.label;
        return `${cell.levelLabel} (${cell.label})`;
      }),
    ]);
  }

  rows.push([]);
  rows.push(['Coverage %', '', ...columns.map(({ skill }) => coverage[skill.id] ?? 'n/a')]);

  return toCSV(rows);
}

export function downloadCSV(csv, filename) {
  // BOM so Excel on Windows reads UTF-8 names correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { useState } from 'react';
import { X, Download, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const TEMPLATE_CSV = `Team,Member Name,Member Email
Shift Team A,Jane Smith,jane.smith@example.com
Shift Team A,John Doe,john.doe@example.com
Production Test,Alice Brown,alice.brown@example.com`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bulk_import_template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  // Skip header row
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return { team: cols[0] || '', name: cols[1] || '', email: cols[2] || '' };
  }).filter(r => r.team && r.name);
}

export default function BulkImportModal({ orgId, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // parsed rows
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { created, skipped, errors }
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      if (rows.length === 0) {
        setError('No valid rows found. Make sure the CSV has Team, Member Name, Member Email columns.');
        setPreview(null);
      } else {
        setPreview(rows);
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    setError('');

    // Load existing teams once
    const existingTeams = await base44.entities.Team.filter({ organisation_id: orgId });
    const teamMap = Object.fromEntries(existingTeams.map(t => [t.name.toLowerCase().trim(), t]));

    // Load existing members to avoid duplicates (by name+team)
    const existingMembers = await base44.entities.TeamMember.filter({ organisation_id: orgId });
    const memberSet = new Set(existingMembers.map(m => `${m.team_id}::${(m.user_name || '').toLowerCase().trim()}`));

    let created = 0, skipped = 0, errors = 0;
    const teamCache = {}; // newly created teams this session

    for (const row of preview) {
      const teamKey = row.team.toLowerCase().trim();
      let team = teamMap[teamKey] || teamCache[teamKey];

      // Auto-create team if it doesn't exist
      if (!team) {
        try {
          team = await base44.entities.Team.create({
            organisation_id: orgId,
            name: row.team.trim(),
            display_order: 0,
            manager_ids: [],
          });
          teamCache[teamKey] = team;
          teamMap[teamKey] = team;
        } catch {
          errors++;
          continue;
        }
      }

      const dupKey = `${team.id}::${row.name.toLowerCase().trim()}`;
      if (memberSet.has(dupKey)) {
        skipped++;
        continue;
      }

      try {
        const memberId = crypto.randomUUID();
        await base44.entities.TeamMember.create({
          organisation_id: orgId,
          team_id: team.id,
          user_id: memberId,
          user_name: row.name.trim(),
          user_email: row.email.trim() || null,
          is_managed_member: true,
          member_id: memberId,
        });
        memberSet.add(dupKey);
        created++;
      } catch {
        errors++;
      }
    }

    setResult({ created, skipped, errors });
    setImporting(false);
    if (created > 0) onImported();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold">Bulk Import Employees</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV to create multiple employee profiles at once</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Step 1: Download template */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-1">Step 1 — Download the template</p>
            <p className="text-xs text-muted-foreground mb-3">
              Fill it in with your employees' team, name, and email. Team names must match exactly (or new teams will be created automatically).
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Template CSV
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-3">Step 2 — Upload your completed file</p>
            <label className="cursor-pointer">
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-background">
                <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : 'Click to choose a CSV file…'}
                </span>
              </div>
            </label>
            {error && (
              <p className="text-sm text-destructive mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          {/* Preview */}
          {preview && !result && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{preview.length} row{preview.length !== 1 ? 's' : ''} ready to import</p>
              <div className="rounded-lg border border-border overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Team</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5">{row.team}</td>
                        <td className="px-3 py-1.5 font-medium">{row.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
              <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Import complete
              </div>
              <p className="text-xs text-green-700">{result.created} employee{result.created !== 1 ? 's' : ''} created</p>
              {result.skipped > 0 && <p className="text-xs text-muted-foreground">{result.skipped} skipped (already exist)</p>}
              {result.errors > 0 && <p className="text-xs text-destructive">{result.errors} failed</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Button>
          {preview && !result && (
            <Button onClick={handleImport} disabled={importing}>
              {importing
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Importing…</>
                : <><Upload className="w-4 h-4 mr-1.5" /> Import {preview.length} Employee{preview.length !== 1 ? 's' : ''}</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
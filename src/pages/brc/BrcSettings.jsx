import BrcModuleGuard from '@/components/BrcModuleGuard';
import { Settings, Loader2, Save, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRC_STANDARD_LABELS } from '@/lib/brcModuleGuard';

function BrcSettingsContent() {
  const { org, user, refreshOrg } = useOrganisation();
  const [form, setForm] = useState({ brc_standard: '', brc_audit_target_date: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  useEffect(() => {
    if (org) {
      setForm({
        brc_standard:          org.brc_standard          || '',
        brc_audit_target_date: org.brc_audit_target_date || '',
      });
    }
  }, [org?.id]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Organisation.update(org.id, {
      brc_standard:          form.brc_standard          || null,
      brc_audit_target_date: form.brc_audit_target_date || null,
    });
    await base44.entities.AuditLogEntry.create({
      organisation_id: org.id,
      actor_user_id:   user?.id,
      actor_display:   user?.full_name || user?.email,
      action:          'brc_settings.updated',
      target_type:     'organisation',
      target_id:       org.id,
      target_display:  org.name,
      detail: JSON.stringify(form),
    }).catch(() => {});
    await refreshOrg();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> BRC Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure your BRC standard and target audit date.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <Label>BRC Standard</Label>
          <select
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={form.brc_standard}
            onChange={e => setForm(f => ({ ...f, brc_standard: e.target.value }))}
          >
            <option value="">— Select standard —</option>
            {Object.entries(BRC_STANDARD_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Target Audit Date</Label>
          <Input
            type="date"
            className="mt-1"
            value={form.brc_audit_target_date}
            onChange={e => setForm(f => ({ ...f, brc_audit_target_date: e.target.value }))}
          />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
            : saved
              ? '✓ Saved'
              : <><Save className="w-4 h-4 mr-1.5" /> Save BRC Settings</>
          }
        </Button>
      </div>

      {/* Demo Data Seeding */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> Seed Demo Data
        </h2>
        <p className="text-sm text-muted-foreground">
          Populate the system with realistic BRC compliance data — documents, clause statuses, and evidence links.
          This is useful for onboarding and demonstration. Existing data will be replaced if you choose to re-seed.
        </p>

        {seedResult && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${seedResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {seedResult.success
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />}
            <div>
              <p className="font-medium">{seedResult.success ? 'Demo data seeded!' : 'Seeding failed'}</p>
              {seedResult.success && (
                <p className="text-xs text-green-700 mt-0.5">
                  {seedResult.documents_created} documents · {seedResult.statuses_created} clause statuses · {seedResult.evidence_links_created} evidence links
                </p>
              )}
              {!seedResult.success && <p className="text-xs mt-0.5">{seedResult.error}</p>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true);
              setSeedResult(null);
              const res = await base44.functions.invoke('seedBrcDemoData', {});
              setSeedResult(res.data);
              setSeeding(false);
            }}
          >
            {seeding ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Seeding…</> : <><Database className="w-3.5 h-3.5 mr-1.5" /> Seed Demo Data</>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={seeding}
            onClick={async () => {
              if (!confirm('This will delete and replace all existing BRC documents and clause statuses. Continue?')) return;
              setSeeding(true);
              setSeedResult(null);
              const res = await base44.functions.invoke('seedBrcDemoData', { force: true });
              setSeedResult(res.data);
              setSeeding(false);
            }}
          >
            Re-seed (Replace All)
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BrcSettings() {
  return <BrcModuleGuard><BrcSettingsContent /></BrcModuleGuard>;
}
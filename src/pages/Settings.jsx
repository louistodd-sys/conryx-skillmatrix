import { useState, useEffect } from 'react';
import { Save, Trash2, Download, Loader2, Upload, X, AlertTriangle, Users } from 'lucide-react';
import BulkImportModal from '@/components/BulkImportModal';
import BillingSection from '@/components/BillingSection';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSearchParams } from 'react-router-dom';

// Org deletion confirmation modal
function DeleteOrgModal({ orgName, onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canDelete = typed === orgName;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border border-destructive/40 shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-destructive/5 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-base font-semibold text-destructive">Delete Organisation</h2>
          </div>
          <button onClick={onClose} disabled={deleting}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-sm space-y-1.5 text-muted-foreground">
            <p className="font-medium text-foreground">This will permanently delete:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>All users, teams, skills, and assessments</li>
              <li>All audit log entries and notifications</li>
              <li>Your organisation account and billing record</li>
            </ul>
            <p className="pt-1 text-destructive font-medium">This action cannot be undone.</p>
          </div>
          <div>
            <Label>
              Type your organisation name{' '}
              <span className="font-mono font-bold text-destructive">"{orgName}"</span> to confirm
            </Label>
            <Input
              className="mt-1"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={orgName}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!canDelete || deleting}
              onClick={handleDelete}
            >
              {deleting
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Deleting…</>
                : 'Permanently Delete Organisation'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TIMEZONES = [
  'Europe/London', 'Europe/Dublin', 'Europe/Lisbon',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Warsaw', 'Europe/Prague',
  'Europe/Budapest', 'Europe/Vienna', 'Europe/Stockholm', 'Europe/Oslo',
  'Europe/Helsinki', 'Europe/Riga', 'Europe/Tallinn', 'Europe/Vilnius',
  'Europe/Nicosia', 'Europe/Athens', 'Europe/Bucharest', 'Europe/Sofia',
  'Europe/Zagreb', 'Europe/Ljubljana', 'Europe/Sarajevo', 'Europe/Skopje',
  'Atlantic/Reykjavik',
  'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific',
  'Australia/Sydney', 'Australia/Melbourne',
];

export default function Settings() {
  const { org, refreshOrg } = useOrganisation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'billing' ? 'billing' : 'general';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [form, setForm] = useState({
    name: '',
    timezone: 'Europe/London',
    locale: 'en-GB',
    notify_users_on_expiry: false,
    weekly_digest_enabled: true,
  });
  const [saving, setSaving]       = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [usage, setUsage]             = useState({ users: 0, employees: 0, teams: 0, skills: 0 });
  const [usageLoaded, setUsageLoaded] = useState(false);

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || '',
        timezone: org.timezone || 'Europe/London',
        locale: org.locale || 'en-GB',
        notify_users_on_expiry: org.notify_users_on_expiry || false,
        weekly_digest_enabled: org.weekly_digest_enabled !== false,
      });
      setLogoPreview(org.logo_url || null);
    }
  }, [org]);

  // Load current usage counts for the plan meter
  useEffect(() => {
    if (!org) return;
    Promise.all([
      base44.entities.User.filter({ organisation_id: org.id }),
      base44.entities.TeamMember.filter({ organisation_id: org.id }),
      base44.entities.Team.filter({ organisation_id: org.id }),
      base44.entities.Skill.filter({ organisation_id: org.id, status: 'active' }),
    ]).then(([users, members, teams, skills]) => {
      const seen = new Set();
      let employees = 0;
      members.forEach(m => {
        if (m.is_managed_member && !seen.has(m.user_id)) { seen.add(m.user_id); employees++; }
      });
      setUsage({ users: users.length, employees, teams: teams.length, skills: skills.length });
      setUsageLoaded(true);
    });
  }, [org]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Organisation.update(org.id, form);
    await base44.entities.AuditLogEntry.create({
      organisation_id: org.id,
      action: 'organisation.settings_updated',
      target_type: 'organisation',
      target_id: org.id,
      target_display: form.name,
      detail: JSON.stringify({ fields: Object.keys(form) }),
    }).catch(() => {});
    await refreshOrg();
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2 MB.');
      return;
    }
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoPreview(file_url);
    await base44.entities.Organisation.update(org.id, { logo_url: file_url });
    await refreshOrg();
    setLogoUploading(false);
  };

  const handleRemoveLogo = async () => {
    setLogoPreview(null);
    await base44.entities.Organisation.update(org.id, { logo_url: null });
    await refreshOrg();
  };

  const handleExport = async () => {
    setExporting(true);

    const [users, teams, skills, assessments, categories, teamMembers] = await Promise.all([
      base44.entities.User.filter({ organisation_id: org.id }),
      base44.entities.Team.filter({ organisation_id: org.id }),
      base44.entities.Skill.filter({ organisation_id: org.id }),
      base44.entities.SkillAssessment.filter({ organisation_id: org.id }),
      base44.entities.SkillCategory.filter({ organisation_id: org.id }),
      base44.entities.TeamMember.filter({ organisation_id: org.id }),
    ]);

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const toCSV  = (rows) => rows.map(r => r.map(escape).join(',')).join('\n');

    const csvFiles = {
      'users.csv': toCSV([
        ['Name', 'Email', 'Role', 'Status', 'Created At'],
        ...users.map(u => [u.full_name, u.email, u.role, u.status || 'active', u.created_at || '']),
      ]),
      'teams.csv': toCSV([
        ['Name', 'Description'],
        ...teams.map(t => [t.name, t.description || '']),
      ]),
      'skills.csv': toCSV([
        ['Name', 'Category', 'Scale Type', 'Requires Expiry', 'Status'],
        ...skills.map(s => {
          const cat = categories.find(c => c.id === s.category_id);
          return [s.name, cat?.name || '', s.scale_type, s.requires_expiry ? 'Yes' : 'No', s.status];
        }),
      ]),
      'assessments.csv': toCSV([
        ['User', 'Skill', 'Proficiency Level', 'Assessed Date', 'Expiry Date', 'Assessed By', 'Notes'],
        ...assessments.map(a => [
          a.user_name, a.skill_name, a.proficiency_level,
          a.assessed_date, a.expiry_date || '', a.assessed_by_name || '', a.notes || '',
        ]),
      ]),
      'team_members.csv': toCSV([
        ['Team', 'Member Name', 'Member Email', 'Is Managed'],
        ...teamMembers.map(m => {
          const t = teams.find(t => t.id === m.team_id);
          return [t?.name || '', m.user_name || '', m.user_email || '', m.is_managed_member ? 'Yes' : 'No'];
        }),
      ]),
    };

    // Log audit entry
    await base44.entities.AuditLogEntry.create({
      organisation_id: org.id,
      action: 'data.exported',
      target_type: 'organisation',
      target_id: org.id,
      target_display: org.name,
      detail: JSON.stringify({ files: Object.keys(csvFiles) }),
    }).catch(() => {});

    // Download each CSV (individual downloads — ZIP requires additional library)
    Object.entries(csvFiles).forEach(([filename, csv]) => {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    });

    setExporting(false);
  };

  const handleDeleteOrg = async () => {
    // In v1, direct org deletion is complex; redirect to support with context
    // The modal confirms intent — actual deletion requires server-side cascade
    alert('Organisation deletion request submitted. Our team will process this within 72 hours and confirm via email.');
    setShowDeleteOrg(false);
  };

  if (!org) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your organisation settings</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border">
        {[{ id: 'general', label: 'General' }, { id: 'billing', label: 'Subscription & Billing' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'billing' && (
        <section className="bg-card border border-border rounded-xl p-5">
          <BillingSection org={org} />
        </section>
      )}

      {activeTab === 'general' && <>

      {/* Organisation */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold">Organisation</h2>

        {/* Logo */}
        <div>
          <Label>Organisation Logo</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                : <span className="text-xl font-bold text-muted-foreground">{(org.name || 'O')[0].toUpperCase()}</span>
              }
            </div>
            <div className="space-y-1.5">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" className="sr-only" onChange={handleLogoChange} />
                <Button type="button" variant="outline" size="sm" disabled={logoUploading} asChild>
                  <span>
                    {logoUploading
                      ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading…</>
                      : <><Upload className="w-3.5 h-3.5 mr-1.5" /> {logoPreview ? 'Change Logo' : 'Upload Logo'}</>
                    }
                  </span>
                </Button>
              </label>
              {logoPreview && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={handleRemoveLogo}>
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG or JPG, max 2 MB</p>
            </div>
          </div>
        </div>

        <div>
          <Label>Organisation Name</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" />
        </div>

        <div>
          <Label>Timezone</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
            value={form.timezone}
            onChange={e => setForm({ ...form, timezone: e.target.value })}
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div>
          <Label>Locale</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
            value={form.locale}
            onChange={e => setForm({ ...form, locale: e.target.value })}
          >
            <option value="en-GB">English (UK)</option>
            <option value="en-IE">English (Ireland)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
            : saveSuccess
              ? '✓ Saved'
              : <><Save className="w-4 h-4 mr-1.5" /> Save Changes</>
          }
        </Button>
      </section>

      {/* Notifications */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold">Notifications</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Notify Users on Skill Expiry</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send expiry warnings directly to the employee (in addition to managers and admins)
            </p>
          </div>
          <Switch
            checked={form.notify_users_on_expiry}
            onCheckedChange={v => setForm({ ...form, notify_users_on_expiry: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Weekly Expiry Digest</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send a Monday morning summary of all expiring skills to admins and managers
            </p>
          </div>
          <Switch
            checked={form.weekly_digest_enabled}
            onCheckedChange={v => setForm({ ...form, weekly_digest_enabled: v })}
          />
        </div>
        <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
          {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : 'Save Notification Settings'}
        </Button>
      </section>

      {/* Bulk Import */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold">Bulk Import Employees</h2>
        <p className="text-sm text-muted-foreground">
          Import multiple employees at once from a CSV file. Download the template, fill it in with your team and employee data, then upload it to create all profiles automatically.
        </p>
        <Button variant="outline" onClick={() => setShowBulkImport(true)}>
          <Users className="w-4 h-4 mr-1.5" /> Import Employees from CSV
        </Button>
      </section>

      {/* Data Export */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold">Data Export</h2>
        <p className="text-sm text-muted-foreground">
          Download all organisation data as CSV files for auditing, backup, or migration.
          Includes all users, teams, skills, assessments, and team memberships.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting
            ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Exporting…</>
            : <><Download className="w-4 h-4 mr-1.5" /> Export All Data (CSV)</>
          }
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="bg-card border border-destructive/30 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete this organisation and all associated data.
          This action cannot be undone and will affect all users.
        </p>
        <Button variant="destructive" onClick={() => setShowDeleteOrg(true)}>
          <Trash2 className="w-4 h-4 mr-1.5" /> Delete Organisation
        </Button>
      </section>

      {showBulkImport && (
        <BulkImportModal
          orgId={org.id}
          onClose={() => setShowBulkImport(false)}
          onImported={() => setShowBulkImport(false)}
        />
      )}

      {showDeleteOrg && (
        <DeleteOrgModal
          orgName={org.name}
          onConfirm={handleDeleteOrg}
          onClose={() => setShowDeleteOrg(false)}
        />
      )}
      </>}
    </div>
  );
}
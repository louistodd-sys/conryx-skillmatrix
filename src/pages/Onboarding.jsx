import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, BookOpen, Users, Send, Check, ArrowRight, ArrowLeft, Loader2, Zap } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import useOrganisation from '@/lib/useOrganisation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { industryTemplates } from '@/lib/industryTemplates';
import { TIER_LIMITS } from '@/lib/tierConfig';
import { toast } from 'sonner';

const steps = [
  { icon: Building2, label: 'Organisation' },
  { icon: Zap,       label: 'Plan'         },
  { icon: BookOpen,  label: 'Skills'       },
  { icon: Users,     label: 'Team'         },
  { icon: Send,      label: 'Invite'       },
];

const PLAN_OPTIONS = [
  {
    tier: 'free',
    label: 'Free',
    price: '£0',
    features: ['Up to 10 members', '10 skills', '3 categories', '1 admin seat'],
    highlight: false,
  },
  {
    tier: 'essential',
    label: 'Essential',
    price: '£50',
    features: ['Up to 50 members', '30 skills', 'Unlimited categories', '2 admins + unlimited managers', 'Gap analysis & CSV export', 'Employee portal'],
    highlight: false,
  },
  {
    tier: 'professional',
    label: 'Professional',
    price: '£150',
    features: ['Up to 500 members', 'Unlimited skills', 'Unlimited admin seats', 'PDF reports', 'Advanced analytics', 'Site-level views'],
    highlight: true,
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshUser, refreshOrg } = useOrganisation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');

  // Step 2 — Tier
  const [selectedTier, setSelectedTier] = useState('free');

  // Step 3 — Skills
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Step 4 — Team
  const [teamName, setTeamName] = useState('');

  // Step 5 — Invite
  const [inviteEmails, setInviteEmails] = useState('');

  const [orgId, setOrgId] = useState(null);

  const timezones = ['Europe/London', 'Europe/Dublin', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'US/Eastern', 'US/Central', 'US/Pacific'];

  const handleStep1 = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    try {
      const { data } = await apiClient.functions.invoke('onboarding', {
        org_name: orgName.trim(),
        user_full_name: user?.full_name || null,
      });
      if (!data?.organisation) throw new Error('Onboarding failed — no organisation returned');
      const newOrg = data.organisation;
      // Patch timezone and slug via admin update now that org exists
      await apiClient.entities.Organisation.update(newOrg.id, {
        slug: orgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
        timezone,
        onboarding_step: 2,
      });
      setOrgId(newOrg.id);
      await refreshUser();
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Could not create organisation — please try again.');
    }
    setLoading(false);
  };

  const handleStep2 = async () => {
    if (!orgId) return;
    if (selectedTier !== 'free') {
      setLoading(true);
      try {
        await apiClient.entities.Organisation.update(orgId, { subscription_tier: selectedTier, onboarding_step: 3 });
        const res = await apiClient.functions.invoke('stripeCheckout', {
          tier: selectedTier,
          success_url: `${window.location.origin}/onboarding?step=3`,
          cancel_url:  `${window.location.origin}/onboarding?step=2`,
        });
        if (res.data?.url) {
          window.location.href = res.data.url;
          return;
        }
      } catch {
        toast.error('Could not start checkout — please try again.');
      }
      setLoading(false);
    }
    setStep(3);
  };

  const handleStep3 = async () => {
    if (!orgId) return;
    setLoading(true);
    if (selectedTemplate) {
      const template = industryTemplates.find(t => t.id === selectedTemplate);
      for (const cat of (template?.categories ?? [])) {
        const newCat = await apiClient.entities.SkillCategory.create({
          organisation_id: orgId, name: cat.name, colour: cat.colour,
        });
        await apiClient.entities.Skill.bulkCreate(
          cat.skills.map(s => ({
            organisation_id: orgId, category_id: newCat.id,
            name: s.name, scale_type: s.scale_type,
            requires_expiry: s.requires_expiry, expiry_warning_days: [30, 60, 90], status: 'active',
          }))
        );
      }
    }
    await apiClient.entities.Organisation.update(orgId, { onboarding_step: 4 });
    setLoading(false);
    setStep(4);
  };

  const handleStep4 = async () => {
    if (!orgId) return;
    setLoading(true);
    if (teamName.trim()) {
      await apiClient.entities.Team.create({
        organisation_id: orgId, name: teamName.trim(), manager_ids: [user?.id],
      });
    }
    await apiClient.entities.Organisation.update(orgId, { onboarding_step: 5 });
    setLoading(false);
    setStep(5);
  };

  const handleStep5 = async () => {
    setLoading(true);
    if (inviteEmails.trim()) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails = inviteEmails.split(/[,\n]/).map(e => e.trim()).filter(Boolean);
      const invalid = emails.filter(e => !emailRe.test(e));
      if (invalid.length) {
        toast.error(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
        setLoading(false);
        return;
      }
      for (const email of emails) {
        try {
          await apiClient.entities.Invitation.create({
            organisation_id: orgId, email, role: 'viewer',
            invited_by_user_id: user?.id, invited_by_name: user?.full_name, status: 'pending',
          });
          await apiClient.users.inviteUser(email, 'user');
        } catch {
          toast.error(`Failed to invite ${email}`);
        }
      }
    }
    await apiClient.entities.Organisation.update(orgId, { onboarding_completed: true, onboarding_step: 6 });
    // Send welcome email
    await apiClient.functions.invoke('sendWelcomeEmail', {
      user_email: user?.email,
      user_name: user?.full_name,
      org_name: orgName,
    }).catch(() => {});
    await refreshOrg();
    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block mr-1">{s.label}</span>
              {i < 4 && <div className={`w-6 h-0.5 ${step > i + 1 ? 'bg-green-500' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8">

          {/* Step 1: Organisation */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Set up your organisation</h2>
                <p className="text-sm text-muted-foreground mt-1">Tell us about your company to get started</p>
              </div>
              <div>
                <Label>Organisation Name <span className="text-destructive">*</span></Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Acme Engineering Ltd" className="mt-1" />
              </div>
              <div>
                <Label>Timezone</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <Button className="w-full" onClick={handleStep1} disabled={loading || !orgName.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          )}

          {/* Step 2: Plan selection */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Choose your plan</h2>
                <p className="text-sm text-muted-foreground mt-1">Start free, or upgrade to unlock more capacity — billed monthly, cancel anytime</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLAN_OPTIONS.map(plan => {
                  const isSelected = selectedTier === plan.tier;
                  return (
                    <button
                      key={plan.tier}
                      onClick={() => setSelectedTier(plan.tier)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : plan.highlight
                            ? 'border-primary/30 hover:border-primary/60'
                            : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{plan.label}</span>
                        {plan.highlight && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <div className="mb-2">
                        <span className="text-xl font-bold">{plan.price}</span>
                        {plan.tier !== 'free' && <span className="text-xs text-muted-foreground">/mo + VAT</span>}
                      </div>
                      <ul className="space-y-0.5">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-600 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleStep2} disabled={loading}>
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : selectedTier === 'free'
                      ? <>Continue on Free <ArrowRight className="w-4 h-4 ml-1" /></>
                      : <>Subscribe to {PLAN_OPTIONS.find(p => p.tier === selectedTier)?.label} <ArrowRight className="w-4 h-4 ml-1" /></>
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Skills */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Add your skills</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose an industry template or add skills manually later</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {industryTemplates.map(t => (
                  <button
                    key={t.id}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${selectedTemplate === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}
                    onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                  >
                    <span className="text-lg mr-2">{t.icon}</span>
                    <span className="text-sm font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleStep3} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedTemplate ? <>Import & Continue <ArrowRight className="w-4 h-4 ml-1" /></> : <>Skip for now <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Team */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Create your first team</h2>
                <p className="text-sm text-muted-foreground mt-1">Teams help you organise your workforce</p>
              </div>
              <div>
                <Label>Team Name</Label>
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Production, Maintenance, Sales" className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleStep4} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : teamName.trim() ? <>Create & Continue <ArrowRight className="w-4 h-4 ml-1" /></> : <>Skip <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Invite */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Invite your team</h2>
                <p className="text-sm text-muted-foreground mt-1">Add email addresses of people you'd like to invite</p>
              </div>
              <div>
                <Label>Email Addresses</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none"
                  rows={4}
                  value={inviteEmails}
                  onChange={e => setInviteEmails(e.target.value)}
                  placeholder="Enter emails, one per line or comma-separated"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button className="flex-1" onClick={handleStep5} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : inviteEmails.trim() ? <>Send Invites & Finish</> : <>Finish Setup</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          You can always change these settings later.
        </p>
      </div>
    </div>
  );
}
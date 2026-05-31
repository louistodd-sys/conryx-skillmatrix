import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, FileText, ClipboardList, AlertTriangle, Truck, Wrench, Users2,
  ArrowRight, CheckCircle2, Loader2, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { hasBrcEntitlement, hasBrcModule } from '@/lib/brcModuleGuard';
import { BRC_PRICING } from '@/lib/tierConfig';

const FEATURES = [
  { icon: ShieldCheck,   label: 'Audit-readiness dashboard',         desc: 'Real-time RAG status across all BRC clauses.' },
  { icon: FileText,      label: 'Document control register',          desc: 'Version-controlled procedures, policies, and forms.' },
  { icon: ClipboardList, label: 'Internal audit scheduling',          desc: 'Plan, conduct, and record internal audits.' },
  { icon: AlertTriangle, label: 'Non-conformance & CAPA workflow',    desc: 'Track NCs from detection to close-out.' },
  { icon: Truck,         label: 'Supplier approval register',         desc: 'Manage and evidence supplier approvals.' },
  { icon: Wrench,        label: 'Equipment calibration register',     desc: 'Track calibration records and due dates.' },
  { icon: Users2,        label: 'Training & competence register',     desc: 'BRC-aligned training records linked to clauses.' },
];

const COLLABORATIVE_FEATURES = [
  'Training Register auto-populated from Skills Matrix assessments',
  'Action Centre aggregates expired skills and open compliance items',
  'BRC readiness score factors in skills compliance data',
  'Shared audit trail, users, teams, and notifications',
];

export default function UpgradeBrc() {
  const { org } = useOrganisation();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const isEntitled = hasBrcEntitlement(org);
  const isActive   = hasBrcModule(org);
  const price      = billingInterval === 'annual' ? BRC_PRICING.annual : BRC_PRICING.monthly;
  const monthlyEquiv = billingInterval === 'annual' ? Math.round(BRC_PRICING.annual / 12) : BRC_PRICING.monthly;

  const handleSubscribe = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('stripeBrcCheckout', { billing_interval: billingInterval });
    if (res.data?.url) window.location.href = res.data.url;
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            BRC Compliance Readiness
          </div>
          <h1 className="text-3xl font-bold text-foreground font-jakarta">
            {isActive ? 'BRC Compliance is Active' : 'Add BRC Compliance Readiness'}
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            A fully integrated compliance module built for food, packaging, and consumer products manufacturers
            working towards BRCGS certification.
          </p>
        </div>

        {/* Already active state */}
        {isActive && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">BRC module is active for your organisation</p>
              <p className="text-xs text-green-700 mt-0.5">
                Your team can access all BRC Compliance features.{' '}
                <Link to="/brc" className="underline font-medium">Go to BRC Dashboard →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Pricing */}
        {!isActive && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Choose billing interval</p>
              <div className="inline-flex rounded-lg border border-border p-1 bg-muted/30">
                <button
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${billingInterval === 'monthly' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setBillingInterval('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors relative ${billingInterval === 'annual' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setBillingInterval('annual')}
                >
                  Annual
                  <span className="ml-1.5 text-xs text-green-600 font-semibold">Save 17%</span>
                </button>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-foreground">£{monthlyEquiv}</span>
              <span className="text-muted-foreground text-sm mb-1">/mo + VAT</span>
            </div>
            {billingInterval === 'annual' && (
              <p className="text-xs text-muted-foreground -mt-3">Billed £{price}/year + VAT</p>
            )}

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleSubscribe}
              disabled={loading || !org}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <>Start 14-day free trial <ArrowRight className="w-4 h-4" /></>
              }
            </Button>
            <p className="text-xs text-center text-muted-foreground">No card required during trial. Cancel anytime.</p>
          </div>
        )}

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-card">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Collaborative benefits */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Better together — Skills Matrix + BRC</p>
          </div>
          <p className="text-xs text-muted-foreground">
            When both modules are active your data works across both sides automatically:
          </p>
          <ul className="space-y-2">
            {COLLABORATIVE_FEATURES.map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA footer */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isActive
            ? <Button asChild size="lg" className="gap-2">
                <Link to="/brc">Go to BRC Dashboard <ArrowRight className="w-4 h-4" /></Link>
              </Button>
            : !isEntitled && (
                <Button size="lg" className="gap-2" onClick={handleSubscribe} disabled={loading || !org}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start free trial <ArrowRight className="w-4 h-4" /></>}
                </Button>
              )
          }
          <Button asChild variant="outline" size="lg">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

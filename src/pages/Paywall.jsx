import { Link } from 'react-router-dom';
import { Zap, Check, ArrowLeft, Users, Grid3X3, BarChart3, Bell, Shield, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useOrganisation from '@/lib/useOrganisation';

const features = [
  { icon: Users,     label: 'Unlimited users & teams' },
  { icon: Grid3X3,   label: 'Full skills matrix & gap analysis' },
  { icon: BarChart3, label: 'Advanced compliance reporting' },
  { icon: Bell,      label: 'Automated expiry notifications' },
  { icon: Shield,    label: 'Audit log & GDPR tools' },
  { icon: Download,  label: 'Data export (CSV)' },
];

export default function Paywall() {
  const { org } = useOrganisation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center space-y-8">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Upgrade to Pro</h1>
          <p className="text-muted-foreground mt-2">
            Your {org?.subscription_plan || 'trial'} plan has reached its limit. Upgrade to unlock full access.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Everything in Pro</p>
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-sm text-foreground">{f.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            className="w-full h-11 text-base font-semibold"
            onClick={() => window.location.href = 'mailto:billing@skillsmatrix.io?subject=Upgrade Request'}
          >
            <Zap className="w-4 h-4 mr-2" /> Upgrade Now
          </Button>
          <p className="text-xs text-muted-foreground">
            Contact us at <a href="mailto:billing@skillsmatrix.io" className="text-primary hover:underline">billing@skillsmatrix.io</a> or speak to your account manager.
          </p>
          <Link to="/" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
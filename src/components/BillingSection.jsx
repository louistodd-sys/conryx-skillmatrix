import { useState, useEffect } from 'react';
import { TrendingUp, CreditCard, Download, Loader2, Check, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { TIER_LABELS, TIER_PRICING, TIER_LIMITS, TIER_FEATURES } from '@/lib/tierConfig';

const TIER_ORDER = ['free', 'starter', 'growth', 'scale'];

const TIER_COLORS = {
  free:    'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  growth:  'bg-primary/10 text-primary',
  scale:   'bg-purple-100 text-purple-700',
};

export default function BillingSection({ org }) {
  const [billingInterval, setBillingInterval] = useState('annual');
  const [loadingTier, setLoadingTier] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const currentTier = org?.subscription_tier || 'free';
  const tierLabel = TIER_LABELS[currentTier] || 'Free';
  const tierColor = TIER_COLORS[currentTier] || TIER_COLORS.free;
  const renewalDate = org?.current_period_end
    ? new Date(org.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const trialEndDate = org?.trial_end_date
    ? new Date(org.trial_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const isTrialing = org?.stripe_subscription_status === 'trialing';

  useEffect(() => {
    base44.functions.invoke('stripeInvoices', {})
      .then(res => setInvoices(res.data?.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, []);

  const handleUpgrade = async (tier) => {
    if (tier === 'free') return;
    setLoadingTier(tier);
    const res = await base44.functions.invoke('stripeCheckout', {
      tier,
      billing_interval: billingInterval,
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
    setLoadingTier(null);
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency?.toUpperCase() || 'GBP' })
      .format(amount / 100);
  };

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">Current Plan</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${tierColor}`}>
              {tierLabel}
            </span>
            {isTrialing && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">
                Trial
              </span>
            )}
          </div>
          {isTrialing && trialEndDate && (
            <p className="text-xs text-amber-700 mt-1">Free trial ends {trialEndDate} — add card to continue</p>
          )}
          {renewalDate && !isTrialing && (
            <p className="text-xs text-muted-foreground mt-1">Renews {renewalDate}</p>
          )}
        </div>
      </div>

      {/* Billing interval toggle */}
      {currentTier !== 'scale' && (
        <div>
          <p className="text-sm font-medium mb-2">Choose billing interval</p>
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
      )}

      {/* Plan cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {['starter', 'growth', 'scale'].map(tier => {
          const price = TIER_PRICING[tier][billingInterval];
          const isCurrentPlan = tier === currentTier;
          const isLower = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentTier);
          const features = TIER_FEATURES[tier];

          return (
            <div
              key={tier}
              className={`rounded-xl border p-4 space-y-3 transition-all ${isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm capitalize">{tier}</p>
                {isCurrentPlan && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <span className="text-2xl font-bold">£{billingInterval === 'annual' ? Math.round(price / 12) : price}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
                {billingInterval === 'annual' && (
                  <p className="text-xs text-muted-foreground">billed £{price}/year</p>
                )}
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Up to {TIER_LIMITS[tier].employees} employees</li>
                <li>• {TIER_LIMITS[tier].skills === null ? 'Unlimited' : TIER_LIMITS[tier].skills} skills</li>
                <li>• {TIER_LIMITS[tier].manager_seats === null ? 'Unlimited' : TIER_LIMITS[tier].manager_seats} manager seats</li>
                {features.pdf_reports && <li className="text-green-700">• PDF reports</li>}
                {features.employee_portal && <li className="text-green-700">• Employee portal</li>}
                {features.advanced_analytics && <li className="text-green-700">• Advanced analytics</li>}
              </ul>
              <Button
                size="sm"
                className="w-full"
                variant={isCurrentPlan ? 'outline' : 'default'}
                disabled={isCurrentPlan || isLower || loadingTier === tier}
                onClick={() => handleUpgrade(tier)}
              >
                {loadingTier === tier
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isCurrentPlan
                    ? 'Current plan'
                    : isLower
                      ? 'Downgrade'
                      : `Upgrade to ${TIER_LABELS[tier]}`
                }
              </Button>
            </div>
          );
        })}
      </div>

      {/* Invoice history */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" /> Invoice History
        </h3>
        {invoicesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading invoices…
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No invoices yet.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs">
                      {new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[160px]">
                      {inv.description || 'SkillsMatrix subscription'}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">
                      {formatAmount(inv.amount, inv.currency)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {inv.pdf_url && (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
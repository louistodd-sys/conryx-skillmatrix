import { useState, useEffect } from 'react';
import { CreditCard, Download, Loader2, Check, Settings, ShieldCheck, ArrowRight } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { TIER_LABELS, TIER_PRICING, TIER_LIMITS, TIER_FEATURES, BRC_PRICING } from '@/lib/tierConfig';
import { Link } from 'react-router-dom';

const TIER_ORDER = ['free', 'essential', 'professional'];

const TIER_COLORS = {
  free:         'bg-gray-100 text-gray-700',
  essential:    'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
};

export default function BillingSection({ org }) {
  const [loadingTier, setLoadingTier] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const currentTier = org?.subscription_tier || 'free';
  const tierLabel = TIER_LABELS[currentTier] || 'Free';
  const tierColor = TIER_COLORS[currentTier] || TIER_COLORS.free;
  const renewalDate = org?.current_period_end
    ? new Date(org.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  useEffect(() => {
    apiClient.functions.invoke('stripeInvoices', {})
      .then(res => setInvoices(res.data?.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setInvoicesLoading(false));
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    const res = await apiClient.functions.invoke('stripePortal', {});
    if (res.data?.url) window.location.href = res.data.url;
    setPortalLoading(false);
  };

  const handleUpgrade = async (tier) => {
    if (tier === 'free') return;
    setLoadingTier(tier);
    const res = await apiClient.functions.invoke('stripeCheckout', { tier });
    if (res.data?.url) window.location.href = res.data.url;
    setLoadingTier(null);
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency?.toUpperCase() || 'GBP' })
      .format(amount / 100);
  };

  const brcStatus = org?.brc_subscription_status;
  const brcActive = brcStatus === 'active';
  const brcRenewalDate = org?.brc_current_period_end
    ? new Date(org.brc_current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const [brcCheckoutLoading, setBrcCheckoutLoading] = useState(false);
  const handleBrcSubscribe = async () => {
    setBrcCheckoutLoading(true);
    const res = await apiClient.functions.invoke('stripeBrcCheckout', {});
    if (res.data?.url) window.location.href = res.data.url;
    setBrcCheckoutLoading(false);
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
          </div>
          {renewalDate && currentTier !== 'free' && (
            <p className="text-xs text-muted-foreground mt-1">Renews {renewalDate}</p>
          )}
        </div>
        {org?.stripe_customer_id && (
          <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <><Settings className="w-3.5 h-3.5 mr-1.5" /> Manage / Cancel</>
            }
          </Button>
        )}
      </div>

      {/* Plan cards — Essential and Professional only (Free is the default/current) */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(['essential', 'professional']).map(tier => {
          const price = TIER_PRICING[tier].monthly;
          const isCurrentPlan = tier === currentTier;
          const isLower = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentTier);
          const features = TIER_FEATURES[tier];

          return (
            <div
              key={tier}
              className={`rounded-xl border p-4 space-y-3 transition-all ${isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{TIER_LABELS[tier]}</p>
                {isCurrentPlan && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <span className="text-2xl font-bold">£{price}</span>
                <span className="text-xs text-muted-foreground">/mo + VAT</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Up to {TIER_LIMITS[tier].employees} members</li>
                <li>• {TIER_LIMITS[tier].skills === null ? 'Unlimited' : TIER_LIMITS[tier].skills} skills</li>
                <li>• {TIER_LIMITS[tier].manager_seats === null ? 'Unlimited' : TIER_LIMITS[tier].manager_seats} manager seats</li>
                {features.csv_export && <li className="text-green-700">• Gap analysis & CSV export</li>}
                {features.employee_portal && <li className="text-green-700">• Employee portal</li>}
                {features.pdf_reports && <li className="text-green-700">• PDF reports</li>}
                {features.advanced_analytics && <li className="text-green-700">• Advanced analytics & site views</li>}
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

      {/* BRC Compliance module billing */}
      <div className="rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">BRC Compliance Readiness</p>
              <p className="text-xs text-muted-foreground">Add-on module — can be used independently or alongside Skills Matrix</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {brcActive ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">Active</span>
            ) : brcStatus === 'past_due' ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">Past Due</span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide">Not Active</span>
            )}
          </div>
        </div>

        {brcActive ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-muted-foreground">{brcRenewalDate ? `Renews ${brcRenewalDate}` : 'Active'}</p>
            <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Settings className="w-3.5 h-3.5 mr-1.5" />Manage BRC Subscription</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">£{BRC_PRICING.monthly}/mo</span> + VAT
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleBrcSubscribe} disabled={brcCheckoutLoading} className="gap-1.5">
                  {brcCheckoutLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ArrowRight className="w-3.5 h-3.5" />Subscribe — £{BRC_PRICING.monthly}/mo</>}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/upgrade-brc">View features</Link>
                </Button>
              </div>
            </div>
            {currentTier !== 'free' && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                💡 Already on Skills Matrix? Both subscriptions share one Stripe customer — you'll receive a single combined invoice.
              </p>
            )}
          </div>
        )}
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
                      {inv.description || 'Subscription'}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">{formatAmount(inv.amount, inv.currency)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{inv.status}</span>
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

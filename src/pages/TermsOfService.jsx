export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: May 2026 · Skillsmatrixapp Ltd</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. The service</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Skills Matrix App is a workforce skills management platform operated by <strong>Skillsmatrixapp Ltd</strong>
          (Company Number: [PLACEHOLDER]), registered in England and Wales.
          By creating an account you agree to these Terms of Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Subscriptions and billing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Paid plans are billed monthly or annually as selected. Prices are displayed exclusive of VAT;
          UK VAT is added at checkout where applicable. You may cancel your subscription at any time via
          Settings → Subscription & Billing → Manage Subscription. Cancellation takes effect at the end
          of the current billing period. No refunds are issued for partial periods.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Free trial</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          New organisations receive a 14-day free trial. No payment method is required during the trial.
          If no payment method is added before the trial ends, the account will revert to the Free tier automatically.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Acceptable use</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You may not use Skills Matrix App for unlawful purposes, to process data of individuals without a
          lawful basis, or to attempt to gain unauthorised access to other organisations' data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Data ownership</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You retain full ownership of all data you input into Skills Matrix App.
          We act as a data processor on your behalf. See our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> and
          <a href="/dpa" className="text-primary hover:underline ml-1">Data Processing Agreement</a> for details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Limitation of liability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To the maximum extent permitted by law, Skillsmatrixapp Ltd is not liable for any indirect, incidental,
          or consequential damages arising from the use of Skills Matrix App. Our total liability shall not
          exceed the fees paid by you in the 12 months preceding the claim.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Governing law</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These Terms are governed by the laws of England and Wales. Disputes shall be subject to the
          exclusive jurisdiction of the courts of England and Wales.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any questions about these Terms, contact us at{' '}
          <a href="mailto:legal@skillsmatrixapp.com" className="text-primary hover:underline">legal@skillsmatrixapp.com</a>.
        </p>
      </section>
    </div>
  );
}
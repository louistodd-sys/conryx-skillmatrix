export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: May 2026 · Skillsmatrixapp Ltd</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Who we are</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Skills Matrix App is operated by <strong>Skillsmatrixapp Ltd</strong>, a company registered in England and Wales
          (Company Number: [PLACEHOLDER]). Registered office: [PLACEHOLDER ADDRESS].
          We are registered with the Information Commissioner's Office (ICO Registration: [PLACEHOLDER]).
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For privacy enquiries, contact us at: <a href="mailto:privacy@skillsmatrixapp.com" className="text-primary hover:underline">privacy@skillsmatrixapp.com</a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. What data we collect</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li>Account information: name, email address, job title, organisational role.</li>
          <li>Skills and competency data: assessment records, proficiency levels, expiry dates.</li>
          <li>Usage data: audit log entries, login timestamps, feature interactions.</li>
          <li>Billing information: processed by Stripe — we do not store card details.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Legal basis for processing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We process your data on the basis of contract performance (to provide the service you subscribed to),
          legitimate interests (security, fraud prevention, product improvement), and legal obligations
          (UK GDPR compliance, tax obligations).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Your rights (UK GDPR)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">You have the right to:</p>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li><strong>Access</strong> — request a copy of all data we hold about you.</li>
          <li><strong>Rectification</strong> — ask us to correct inaccurate data.</li>
          <li><strong>Erasure</strong> — request deletion of your personal data.</li>
          <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
          <li><strong>Restriction</strong> — ask us to stop processing your data in certain circumstances.</li>
          <li><strong>Object</strong> — object to processing based on legitimate interests.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To exercise any right, contact <a href="mailto:privacy@skillsmatrixapp.com" className="text-primary hover:underline">privacy@skillsmatrixapp.com</a>.
          You may also use the "Export My Data" button in your profile or ask your administrator to delete your organisation.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Data retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your data for as long as your subscription is active. Upon cancellation, data is retained for 30 days
          before deletion, unless you request earlier erasure. Audit log entries are anonymised rather than deleted
          to preserve tamper-evident records.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Third parties</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use Stripe for payment processing, and Base44 as our application platform and hosting provider.
          Both are GDPR-compliant processors. We do not sell your data to any third party.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Complaints</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are unhappy with how we handle your data, you have the right to lodge a complaint with the
          Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer" className="text-primary hover:underline">ico.org.uk</a>.
        </p>
      </section>
    </div>
  );
}
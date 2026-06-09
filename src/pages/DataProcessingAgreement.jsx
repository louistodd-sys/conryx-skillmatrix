export default function DataProcessingAgreement() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Data Processing Agreement (DPA)</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: May 2026 · Skillsmatrixapp Ltd</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Parties</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This Data Processing Agreement ("DPA") is between <strong>Skillsmatrixapp Ltd</strong> ("Processor") and
          the organisation that has subscribed to Skills Matrix App ("Controller").
          This DPA forms part of the Terms of Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Subject matter of processing</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Skillsmatrixapp Ltd processes personal data on behalf of the Controller solely to provide the Skills Matrix App service.
          Personal data processed includes: employee names, email addresses, job titles, skill assessment records,
          and usage logs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Processor obligations</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          <li>Process personal data only on documented instructions from the Controller.</li>
          <li>Ensure persons authorised to process personal data are bound by confidentiality.</li>
          <li>Implement appropriate technical and organisational security measures.</li>
          <li>Assist the Controller in responding to data subject rights requests.</li>
          <li>Delete or return all personal data upon termination of the service.</li>
          <li>Provide all information necessary to demonstrate compliance with UK GDPR Article 28.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Sub-processors</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Skillsmatrixapp Ltd uses the following sub-processors: Base44 (application hosting and infrastructure),
          Stripe (payment processing). A full list is available on request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Data transfers</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Personal data is processed within the UK and EEA. Any transfer outside these areas will be
          subject to appropriate safeguards (e.g., Standard Contractual Clauses).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To request a signed DPA or for data protection enquiries:{' '}
          <a href="mailto:privacy@skillsmatrixapp.com" className="text-primary hover:underline">privacy@skillsmatrixapp.com</a>
        </p>
      </section>
    </div>
  );
}
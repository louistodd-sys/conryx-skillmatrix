export default function CookiePolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: May 2026 · Skillsmatrixapp Ltd</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What are cookies?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cookies are small text files stored on your device when you visit a website. They help us keep you
          signed in and understand how you use Skills Matrix App.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cookies we use</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-foreground">Cookie</th>
                <th className="text-left px-4 py-2 font-medium text-foreground">Type</th>
                <th className="text-left px-4 py-2 font-medium text-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 text-muted-foreground font-mono text-xs">auth_token</td>
                <td className="px-4 py-2 text-muted-foreground">Essential</td>
                <td className="px-4 py-2 text-muted-foreground">Keeps you signed in to your account.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-muted-foreground font-mono text-xs">session</td>
                <td className="px-4 py-2 text-muted-foreground">Essential</td>
                <td className="px-4 py-2 text-muted-foreground">Maintains your active session.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-muted-foreground font-mono text-xs">analytics</td>
                <td className="px-4 py-2 text-muted-foreground">Analytics (optional)</td>
                <td className="px-4 py-2 text-muted-foreground">Helps us understand feature usage. Only set with your consent.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Essential cookies are necessary for the application to function and cannot be disabled.
          You can decline optional (analytics) cookies via the cookie consent banner shown on your first visit.
          You may also configure your browser to block all cookies, but this will prevent you from signing in.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Questions about our use of cookies?{' '}
          <a href="mailto:privacy@skillsmatrixapp.com" className="text-primary hover:underline">privacy@skillsmatrixapp.com</a>
        </p>
      </section>
    </div>
  );
}
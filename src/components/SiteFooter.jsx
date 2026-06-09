import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Company info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Skillsmatrixapp Ltd</p>
            <p>Company No: [PLACEHOLDER] · ICO Reg: [PLACEHOLDER]</p>
            <p>[Registered Office Address, England]</p>
            <p>© {new Date().getFullYear()} Skillsmatrixapp Ltd. All rights reserved.</p>
          </div>

          {/* Legal links */}
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { label: 'Privacy Policy', to: '/privacy' },
              { label: 'Terms of Service', to: '/terms' },
              { label: 'Cookie Policy', to: '/cookies' },
              { label: 'Data Processing Agreement', to: '/dpa' },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
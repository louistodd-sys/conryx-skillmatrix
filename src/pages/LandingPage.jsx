import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import {
  Grid3X3, BarChart3, Users2, ShieldCheck, FileText,
  CheckCircle2, ArrowRight, Zap, Lock, Download,
  TrendingUp, Building2, Eye, EyeOff,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Grid3X3,
    title: 'Visual Skills Matrix',
    desc: 'See every team member\'s skills at a glance. Colour-coded heat maps make gaps instantly obvious.',
  },
  {
    icon: BarChart3,
    title: 'Gap Analysis',
    desc: 'Compare required skill levels against actual — identify training priorities across every team.',
  },
  {
    icon: Users2,
    title: 'Team & People Management',
    desc: 'Organise your workforce into teams, assign managers, and track individual development over time.',
  },
  {
    icon: ShieldCheck,
    title: 'BRC Compliance Readiness',
    desc: 'Track BRCGS Packaging Issue 7 clause compliance with RAG status, evidence linking, and audit tools.',
  },
  {
    icon: FileText,
    title: 'Document Control',
    desc: 'Manage policies, procedures, and records with version control, review dates, and approval workflows.',
  },
  {
    icon: Download,
    title: 'Export & Reporting',
    desc: 'Export skills matrices and gap reports to CSV and PDF for audits, appraisals, and management reviews.',
  },
]

const BRC_MODULES = [
  'Clause status tracking (RAG)',
  'HACCP & food safety documentation',
  'Non-conformances & CAPAs',
  'Supplier approval register',
  'Calibration records',
  'Pest control visit logs',
  'Internal audit management',
  'Management review records',
  'Glass & brittle plastic register',
  'Complaints handling',
]

const PLANS = [
  {
    name: 'Free',
    price: '£0',
    period: '',
    features: ['Up to 10 members', '10 skills', '3 categories', '1 admin seat'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Essential',
    price: '£39',
    period: '/mo',
    features: ['Up to 50 members', '30 skills', 'Unlimited categories', 'Gap analysis & CSV export', '2 admins + managers'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '£79',
    period: '/mo',
    features: ['Up to 500 members', 'Unlimited skills', 'Unlimited admins', 'PDF reports', 'BRC Compliance module', 'Advanced analytics'],
    cta: 'Start free trial',
    highlight: true,
  },
]

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={8}
        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function SignInForm() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'verify'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset(newMode) {
    setMode(newMode)
    setPassword('')
    setConfirmPassword('')
    setCode('')
    setError('')
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (err) setError(err.message)
    // On success AuthContext fires and re-renders
    setLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (err) {
      setError(err.message)
    } else {
      setMode('verify')
    }
    setLoading(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'signup',
    })
    if (err) {
      setError(err.message)
      setCode('')
    }
    // On success AuthContext fires and re-renders
    setLoading(false)
  }

  // ── Verify email step ─────────────────────────────────────────
  if (mode === 'verify') {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <button
          type="button"
          onClick={() => reset('signup')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to sign up
        </button>
        <div className="text-center mb-2">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-base mb-1">Check your email</h3>
          <p className="text-sm text-slate-500">
            We sent a verification code to <strong>{email}</strong>.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            required
            autoFocus
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="12345678"
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <>Verify email &amp; continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    )
  }

  // ── Sign Up ───────────────────────────────────────────────────
  if (mode === 'signup') {
    return (
      <form onSubmit={handleSignUp} className="space-y-4">
        <button
          type="button"
          onClick={() => reset('signin')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to sign in
        </button>
        <h3 className="font-bold text-lg">Create your account</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email.trim() || !password || !confirmPassword}
          className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : 'Create account'}
        </button>
        <p className="text-xs text-center text-slate-400">Free plan available · Cancel anytime</p>
      </form>
    )
  }

  // ── Sign In ───────────────────────────────────────────────────
  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <PasswordInput
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <>Sign in <ArrowRight className="w-4 h-4" /></>}
      </button>
      <div className="text-center">
        <span className="text-sm text-slate-500">Don't have an account? </span>
        <button
          type="button"
          onClick={() => reset('signup')}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Create one free
        </button>
      </div>
    </form>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base">Skills Matrix App</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900">Features</a>
            <a href="#brc" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900">BRC Compliance</a>
            <a href="#pricing" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900">Pricing</a>
            <a href="#signin" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <Zap className="w-3.5 h-3.5" />
                Skills management made simple
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5">
                Know exactly who<br className="hidden sm:block" /> can do what,{' '}
                <span className="text-blue-600">right now.</span>
              </h1>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                Skills Matrix App gives manufacturers and food businesses a clear view of their workforce competencies, training gaps, and BRC compliance readiness — all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="#signin" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                  Get started free <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#features" className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-6 py-3 rounded-lg transition-colors">
                  See features
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                {['Free plan available', 'No credit card required', 'GDPR compliant'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Sign-in card */}
            <div id="signin" className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Welcome to Skills Matrix App</h2>
              </div>
              <SignInForm />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-slate-100 py-5 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-slate-500">
            {[
              'Built for food & packaging manufacturers',
              'BRCGS Packaging Issue 7 ready',
              'UK-hosted · GDPR compliant',
              'Works on desktop & mobile',
            ].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Everything you need to manage workforce skills</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              From visual skills matrices to BRC compliance tracking — one platform covers your entire workforce competency programme.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BRC Module */}
      <section id="brc" className="py-20 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                <ShieldCheck className="w-3.5 h-3.5" />
                BRC Compliance Module
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight">
                BRCGS Packaging Issue 7<br />compliance, simplified.
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Built specifically for packaging material manufacturers. Track every clause, attach evidence, manage non-conformances, and walk into your next audit with confidence.
              </p>
              <a href="#signin" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Try it free <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BRC_MODULES.map(item => (
                <div key={item} className="flex items-start gap-2.5 bg-white/5 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Up and running in minutes</h2>
            <p className="text-lg text-slate-500">No IT department required.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: Building2, title: 'Create your organisation', desc: 'Sign up with your work email, set a password, and choose from industry skill templates.' },
              { step: '2', icon: Users2, title: 'Add your team', desc: 'Invite team members via email. Assign them to teams and set their roles in seconds.' },
              { step: '3', icon: TrendingUp, title: 'Start tracking', desc: 'Assess skills, visualise gaps, manage BRC clauses — everything updates in real time.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 text-xl font-extrabold">
                  {step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-500">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name} className={`rounded-xl border p-6 flex flex-col ${plan.highlight ? 'border-blue-500 shadow-lg shadow-blue-100 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                {plan.highlight && (
                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full self-start mb-3">Most popular</div>
                )}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <div className="mb-5">
                  <span className="text-3xl font-extrabold">{plan.price}</span>
                  <span className="text-slate-500 text-sm">{plan.period}{plan.period ? ' + VAT' : ''}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#signin" className={`text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to get started?</h2>
          <p className="text-blue-100 text-lg mb-8">Join food and packaging businesses already using Skills Matrix App to manage workforce competency and BRC compliance.</p>
          <a href="#signin" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-3.5 rounded-lg transition-colors text-base">
            Create your free account <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                  <Grid3X3 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-bold text-sm">Skills Matrix App</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">Workforce skills management and BRC compliance for food and packaging manufacturers.</p>
            </div>
            <div className="flex gap-10 text-sm">
              <div className="space-y-2">
                <p className="text-white font-semibold mb-3">Product</p>
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#brc" className="block hover:text-white transition-colors">BRC Module</a>
                <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
              </div>
              <div className="space-y-2">
                <p className="text-white font-semibold mb-3">Legal</p>
                <Link to="/privacy" className="block hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="block hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/cookies" className="block hover:text-white transition-colors">Cookie Policy</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-10 pt-6 text-xs text-center">
            © {new Date().getFullYear()} Skills Matrix App. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

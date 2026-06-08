import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import {
  Grid3X3, BarChart3, Users2, ShieldCheck, FileText,
  CheckCircle2, ArrowRight, Zap, Lock, Eye, EyeOff, Download,
  TrendingUp, Building2, ClipboardList, AlertTriangle, Package,
  Wrench, Bug, Star, Layers,
} from 'lucide-react'

// ── Product definitions ─────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: 'skills',
    icon: Grid3X3,
    iconBg: 'bg-blue-600',
    label: 'Skills Matrix',
    tagline: 'Workforce competency & training management',
      desc: "See exactly who can do what. Map every employee's skills against what's required, spot training gaps instantly, and prove competence during audits — all without spreadsheets.",
    bullets: [
      'Visual colour-coded skills matrix (RAG status)',
      'Gap analysis ranked by urgency',
      'Expiry & renewal tracking',
      'Team compliance scores',
      'CSV & PDF export for audits',
    ],
    price: 'Free to start',
    priceSub: 'Paid plans from £39/mo',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    selectedBorder: 'border-blue-500 ring-blue-200',
    btnClass: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    id: 'brc',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-600',
    label: 'BRC Compliance App',
    tagline: 'BRCGS Packaging Issue 7 compliance toolkit',
    desc: 'Built specifically for packaging material manufacturers. Track every clause, attach evidence, manage non-conformances, and walk into your next BRC audit with total confidence.',
    bullets: [
      'Clause-by-clause RAG status tracking',
      'Non-conformances & CAPA management',
      'Supplier approval register',
      'Internal audit scheduling & records',
      'Glass & brittle plastic register',
    ],
    price: 'From £XX/mo',
    priceSub: 'Contact us for BRC-only pricing',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    selectedBorder: 'border-emerald-500 ring-emerald-200',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700',
  },
]

const SKILLS_FEATURES = [
  { icon: Grid3X3,    title: 'Visual Skills Matrix',        desc: 'Every person × every skill on one screen. Colour-coded cells show green, amber, or red at a glance.' },
  { icon: BarChart3,  title: 'Gap Analysis',                desc: 'Compare required vs. actual — see which training is most urgent across every team.' },
  { icon: Users2,     title: 'Team & People Management',    desc: 'Organise into teams, assign managers, and track individual development over time.' },
  { icon: Download,   title: 'Export & Reporting',          desc: 'Export to CSV and PDF for audits, appraisals, and management reviews.' },
]

const BRC_FEATURES = [
  { icon: ClipboardList, title: 'Clause Status Tracking',   desc: 'RAG status on every BRCGS clause. See your readiness score at a glance.' },
  { icon: AlertTriangle, title: 'Non-conformances & CAPAs', desc: 'Log issues, assign corrective actions, track closures, and link evidence.' },
  { icon: Package,       title: 'Supplier Register',        desc: 'Approval status, audit dates, and risk ratings for every supplier.' },
  { icon: Wrench,        title: 'Calibration Records',      desc: 'Equipment registers, calibration schedules, and certificates in one place.' },
  { icon: Bug,           title: 'Pest Control Logs',        desc: 'Visit records, contractor reports, and action tracking.' },
  { icon: FileText,      title: 'Internal Audits',          desc: 'Plan, schedule, and record internal audits with findings and evidence links.' },
]

const PLANS_SKILLS = [
  {
    name: 'Free',
    price: '£0',
    period: '',
    desc: 'Perfect for small teams getting started.',
    features: ['Up to 10 members', '10 skills', '3 categories', '1 admin seat'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Essential',
    price: '£39',
    period: '/mo',
    desc: 'For growing teams that need more capacity.',
    features: ['Up to 50 members', '30 skills', 'Unlimited categories', 'Gap analysis & CSV export', '2 admins + managers'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '£79',
    period: '/mo',
    desc: 'Unlimited scale with full BRC compliance tools.',
    features: ['Up to 500 members', 'Unlimited skills & admins', 'PDF reports', 'BRC Compliance module included', 'Advanced analytics'],
    cta: 'Start free trial',
    highlight: true,
  },
]

// ── Auth form ────────────────────────────────────────────────────────────────

function SignInForm({ selectedProduct }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) setError(err.message)
    setLoading(false)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    if (selectedProduct) localStorage.setItem('selected_product', selectedProduct)
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
    if (err) {
      setError(err.message)
    } else if (data.session) {
      // auto-confirmed — onAuthStateChange routes to onboarding
    } else if (!data.user?.identities?.length) {
      // Supabase returns a fake 200 for existing emails (no OTP sent).
      // Switch to sign-in and tell the user.
      setError('An account with this email already exists. Please sign in.')
      setMode('signin')
    } else {
      setCode('')
      setMode('verify')
    }
    setLoading(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' })
    if (err) { setError(err.message); setCode('') }
    setLoading(false)
  }

  async function handleResend() {
    setError('')
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    if (err) setError(err.message)
  }

  if (mode === 'verify') {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <button type="button" onClick={() => { setMode('signup'); setError('') }} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back
        </button>
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-base mb-1">Check your email</h3>
          <p className="text-sm text-slate-500">We sent a verification code to <strong>{email}</strong>. Enter it below to confirm your account.</p>
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
        <button type="submit" disabled={loading || code.length < 6} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Verify email <ArrowRight className="w-4 h-4" /></>}
        </button>
        <p className="text-xs text-center text-slate-400">
          Didn't receive it?{' '}
          <button type="button" onClick={handleResend} className="text-blue-600 hover:text-blue-700 font-medium">Resend code</button>
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
      <div className="flex rounded-lg border border-slate-200 p-1 gap-1">
        <button type="button" onClick={() => { setMode('signin'); setError('') }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'signin' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
          Sign in
        </button>
        <button type="button" onClick={() => { setMode('signup'); setError('') }} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
          Create account
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
        <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {mode === 'signup' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || !email.trim() || !password || (mode === 'signup' && !confirmPassword)} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>{mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [selectedProduct, setSelectedProduct] = useState(null) // 'skills' | 'brc' | 'both'

  function scrollToSignup() {
    document.getElementById('get-started')?.scrollIntoView({ behavior: 'smooth' })
  }

  function selectAndScroll(id) {
    setSelectedProduct(id)
    setTimeout(scrollToSignup, 50)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base">Conryx</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#products" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900">Products</a>
            <a href="#pricing" className="hidden sm:block text-sm text-slate-600 hover:text-slate-900">Pricing</a>
            <a href="#get-started" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <Zap className="w-3.5 h-3.5" />
            Built for food &amp; packaging manufacturers
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-5 max-w-3xl mx-auto">
            Two powerful tools.<br />
            <span className="text-blue-600">One platform.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
            Choose the Skills Matrix App, the BRC Compliance App, or use both together.
            Each product works independently — subscribe only to what you need.
          </p>

          {/* Product choice cards */}
          <div id="products" className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            {PRODUCTS.map(p => {
              const Icon = p.icon
              const isSelected = selectedProduct === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => selectAndScroll(p.id)}
                  className={`group text-left p-5 rounded-2xl border-2 transition-all ring-2 ring-transparent ${isSelected ? `${p.selectedBorder} bg-slate-50` : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${p.iconBg} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-sm mb-1">{p.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{p.tagline}</p>
                  <p className="text-xs font-semibold text-slate-700">{p.price}</p>
                  <p className="text-xs text-slate-400">{p.priceSub}</p>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                    </div>
                  )}
                </button>
              )
            })}

            {/* Both */}
            <button
              onClick={() => selectAndScroll('both')}
              className={`group text-left p-5 rounded-2xl border-2 transition-all ring-2 ring-transparent sm:col-span-1 col-span-full ${selectedProduct === 'both' ? 'border-violet-500 ring-violet-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center mb-3">
                <Star className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-sm mb-1">Both together</p>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">Skills management + BRC compliance in one unified platform</p>
              <p className="text-xs font-semibold text-violet-700">Best value · Professional plan</p>
              <p className="text-xs text-slate-400">From £79/mo + VAT</p>
              {selectedProduct === 'both' && (
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-violet-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                </div>
              )}
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {['Free plan available', 'No credit card required', 'GDPR compliant', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Skills Matrix deep-dive ──────────────────────────────── */}
      <section className="py-20 sm:py-24 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-14">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-blue-200">
                <Grid3X3 className="w-3.5 h-3.5" />
                Skills Matrix App
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                Know exactly who<br />can do what, <span className="text-blue-600">right now.</span>
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                Replace tangled spreadsheets with a live, colour-coded skills matrix. See every employee's competency status at a glance, track expiry dates, and prove compliance during audits — all in one place.
              </p>
              <button onClick={() => selectAndScroll('skills')} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Get started free <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mini matrix preview */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Skills Matrix — Production Team</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-slate-500 pb-2 pr-3">Employee</th>
                      {['H&S', 'Manual Handling', 'Fire Safety', 'Forklift'].map(h => (
                        <th key={h} className="text-center font-medium text-slate-500 pb-2 px-1 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { name: 'Alice B.', cells: ['green', 'green', 'amber', 'grey'] },
                      { name: 'James K.', cells: ['green', 'amber', 'green', 'green'] },
                      { name: 'Sarah M.', cells: ['red',   'green', 'green', 'grey'] },
                      { name: 'Tom P.',   cells: ['green', 'green', 'green', 'amber'] },
                    ].map(row => (
                      <tr key={row.name}>
                        <td className="py-1.5 pr-3 font-medium text-slate-700 whitespace-nowrap">{row.name}</td>
                        {row.cells.map((c, i) => (
                          <td key={i} className="py-1.5 px-1 text-center">
                            <span className={`inline-block w-6 h-6 rounded-md ${c === 'green' ? 'bg-green-500' : c === 'amber' ? 'bg-amber-400' : c === 'red' ? 'bg-red-500' : 'bg-slate-200'}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
                  {[['green','bg-green-500','Current'], ['amber','bg-amber-400','Expiring soon'], ['red','bg-red-500','Gap / expired'], ['grey','bg-slate-200','Not assessed']].map(([,cls,lbl]) => (
                    <span key={lbl} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded-sm ${cls}`} />
                      <span className="text-slate-500 text-xs">{lbl}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SKILLS_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRC Compliance deep-dive ─────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start mb-14">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                BRC Compliance App
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                BRCGS Packaging Issue 7<br /><span className="text-emerald-400">compliance, simplified.</span>
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-4">
                Built specifically for packaging material manufacturers. Stop managing BRC compliance in folders and shared drives. Track every clause, attach evidence, and walk into your next audit knowing exactly where you stand.
              </p>
              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                <p className="text-sm font-semibold text-slate-200 mb-1">Works standalone or alongside Skills Matrix</p>
                <p className="text-sm text-slate-400">Use the BRC App on its own, or combine it with the Skills Matrix to link workforce competency directly to your BRC clause evidence.</p>
              </div>
              <button onClick={() => selectAndScroll('brc')} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Get started <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {BRC_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 bg-emerald-600/30 rounded-lg flex items-center justify-center mb-2.5">
                    <Icon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-100 mb-1">{title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Up and running in minutes</h2>
            <p className="text-lg text-slate-500">No IT department required. No lengthy setup.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: Building2, title: 'Create your account',    desc: 'Sign up with your work email, choose which product(s) you need, and set up your organisation.' },
              { step: '2', icon: Users2,    title: 'Add your team or data',  desc: 'Add team members, import skills, or start entering your BRC clause evidence — you\'re guided every step.' },
              { step: '3', icon: TrendingUp, title: 'Track and act',         desc: 'View compliance dashboards, identify gaps, attach evidence, and export reports for your next audit.' },
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

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-500">Skills Matrix pricing shown below. Contact us for BRC-only or combined pricing.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS_SKILLS.map(plan => (
              <div key={plan.name} className={`rounded-xl border p-6 flex flex-col ${plan.highlight ? 'border-blue-500 shadow-lg shadow-blue-100 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                {plan.highlight && (
                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full self-start mb-3">Includes BRC App</div>
                )}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{plan.desc}</p>
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
                <button onClick={() => selectAndScroll(plan.highlight ? 'both' : 'skills')} className={`text-center py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Get started / sign-in ─────────────────────────────────── */}
      <section id="get-started" className="py-20 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Left: product recap */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                {selectedProduct === 'brc'
                  ? 'Get started with BRC Compliance'
                  : selectedProduct === 'both'
                    ? 'Get started with both products'
                    : 'Get started today'}
              </h2>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                {selectedProduct === 'brc'
                  ? 'Create your account and set up your BRC compliance workspace. You can always add the Skills Matrix later.'
                  : selectedProduct === 'both'
                    ? 'Create one account for both products. Skills Matrix + BRC Compliance together on the Professional plan.'
                    : 'Choose a product above or create an account now — you can select what you need during setup.'}
              </p>

              {/* Product selection reminder / switcher */}
              <div className="space-y-3 mb-8">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">What would you like to sign up for?</p>
                {[...PRODUCTS, { id: 'both', icon: Star, iconBg: 'bg-violet-600', label: 'Both together', tagline: 'Skills Matrix + BRC Compliance — best value' }].map(p => {
                  const Icon = p.icon
                  const isSelected = selectedProduct === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${p.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                        <p className="text-xs text-slate-500 truncate">{p.tagline}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {['Free plan available', 'No credit card required', 'GDPR compliant'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: auth card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-bold">
                  {selectedProduct === 'brc' ? 'BRC Compliance App' : selectedProduct === 'both' ? 'Conryx — Both Products' : 'Sign in to Conryx'}
                </h3>
              </div>
              <SignInForm selectedProduct={selectedProduct} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-bold text-sm">Conryx</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">Skills management and BRC compliance for food and packaging manufacturers.</p>
            </div>
            <div className="flex gap-10 text-sm">
              <div className="space-y-2">
                <p className="text-white font-semibold mb-3">Products</p>
                <a href="#products" className="block hover:text-white transition-colors">Skills Matrix App</a>
                <a href="#products" className="block hover:text-white transition-colors">BRC Compliance App</a>
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
            © {new Date().getFullYear()} Conryx. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

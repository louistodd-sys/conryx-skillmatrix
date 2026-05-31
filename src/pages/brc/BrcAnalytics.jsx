import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, ClipboardList, MessageSquare, Wrench } from 'lucide-react';

function MetricCard({ label, value, sub, color = 'text-foreground' }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold font-jakarta ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

function BrcAnalyticsContent() {
  const { org } = useOrganisation();
  const [ncs, setNcs] = useState([]);
  const [capas, setCapas] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [calibration, setCalibration] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      base44.entities.BRCNonConformance.filter({ organisation_id: org.id }),
      base44.entities.BRCCAPA.filter({ organisation_id: org.id }),
      base44.entities.BRCComplaint.filter({ organisation_id: org.id }),
      base44.entities.BRCCalibrationRecord.filter({ organisation_id: org.id }),
      base44.entities.BRCAudit.filter({ organisation_id: org.id }),
    ]).then(([n, c, comp, cal, aud]) => {
      setNcs(n); setCapas(c); setComplaints(comp); setCalibration(cal); setAudits(aud);
      setLoading(false);
    });
  }, [org?.id]);

  // NC by severity breakdown
  const ncBySeverity = useMemo(() => {
    const map = { observation: 0, minor: 0, major: 0, critical: 0 };
    ncs.forEach(n => { if (map[n.severity] !== undefined) map[n.severity]++; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).filter(d => d.value > 0);
  }, [ncs]);

  // NC by source
  const ncBySource = useMemo(() => {
    const map = {};
    ncs.forEach(n => { const k = (n.source || 'unknown').replace(/_/g, ' '); map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [ncs]);

  // CAPA closure rate
  const capaStats = useMemo(() => {
    const total = capas.length;
    const closed = capas.filter(c => c.status === 'completed' || c.status === 'verified').length;
    const overdue = capas.filter(c => c.status === 'overdue' || (c.due_date && new Date(c.due_date) < new Date() && c.status !== 'completed' && c.status !== 'verified')).length;

    // Avg closure days
    const closureDays = capas
      .filter(c => c.raised_date && c.completed_date)
      .map(c => Math.ceil((new Date(c.completed_date) - new Date(c.raised_date)) / 86400000));
    const avgDays = closureDays.length > 0 ? Math.round(closureDays.reduce((a, b) => a + b, 0) / closureDays.length) : null;

    return { total, closed, overdue, avgDays, closeRate: total ? Math.round((closed / total) * 100) : 0 };
  }, [capas]);

  // CAPA status breakdown for chart
  const capaByStatus = useMemo(() => {
    const map = { open: 0, in_progress: 0, completed: 0, verified: 0, overdue: 0 };
    capas.forEach(c => { if (map[c.status] !== undefined) map[c.status]++; });
    return [
      { name: 'Open', value: map.open, fill: '#ef4444' },
      { name: 'In Progress', value: map.in_progress, fill: '#f59e0b' },
      { name: 'Completed', value: map.completed, fill: '#3b82f6' },
      { name: 'Verified', value: map.verified, fill: '#22c55e' },
      { name: 'Overdue', value: map.overdue, fill: '#991b1b' },
    ].filter(d => d.value > 0);
  }, [capas]);

  // Complaint by category
  const complaintByCategory = useMemo(() => {
    const map = {};
    complaints.forEach(c => { map[c.category || 'other'] = (map[c.category || 'other'] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [complaints]);

  // Calibration status
  const calStats = useMemo(() => {
    const total = calibration.length;
    const compliant = calibration.filter(r => r.status === 'in_calibration').length;
    return { total, compliant, rate: total ? Math.round((compliant / total) * 100) : 100 };
  }, [calibration]);

  const SEV_COLORS = ['#6b7280', '#f59e0b', '#ef4444', '#991b1b'];
  const CAT_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#22c55e', '#a855f7', '#6b7280'];

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Compliance Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Performance metrics and trend analysis across all compliance areas.</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total NCs Raised"
          value={ncs.length}
          sub={`${ncs.filter(n => n.status === 'open' || n.status === 'under_investigation').length} currently open`}
          color={ncs.filter(n => n.severity === 'major' || n.severity === 'critical').length > 0 ? 'text-red-600' : 'text-foreground'}
        />
        <MetricCard
          label="CAPA Closure Rate"
          value={`${capaStats.closeRate}%`}
          sub={`${capaStats.closed}/${capaStats.total} closed · avg ${capaStats.avgDays ?? '—'}d`}
          color={capaStats.closeRate >= 80 ? 'text-green-700' : capaStats.closeRate >= 50 ? 'text-amber-700' : 'text-red-700'}
        />
        <MetricCard
          label="Calibration Compliance"
          value={`${calStats.rate}%`}
          sub={`${calStats.compliant}/${calStats.total} in calibration`}
          color={calStats.rate >= 90 ? 'text-green-700' : calStats.rate >= 70 ? 'text-amber-700' : 'text-red-700'}
        />
        <MetricCard
          label="Open Complaints"
          value={complaints.filter(c => c.status === 'new' || c.status === 'investigating').length}
          sub={`${complaints.length} total logged`}
          color={complaints.filter(c => c.status === 'new').length > 0 ? 'text-amber-700' : 'text-foreground'}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Non-Conformances by Severity">
          {ncBySeverity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No NCs recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ncBySeverity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {ncBySeverity.map((_, i) => <Cell key={i} fill={SEV_COLORS[i % SEV_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="CAPA Status Breakdown">
          {capaByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No CAPAs recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={capaByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {capaByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="NCs by Source">
          {ncBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No NCs recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ncBySource} layout="vertical" margin={{ top: 0, right: 10, left: 80, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Customer Complaints by Category">
          {complaintByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No complaints recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={complaintByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {complaintByCategory.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Audit summary table */}
      {audits.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Audit History</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Audit</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden md:table-cell">Rating</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-16">NCs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {audits.map(a => {
                const ratingColor = a.overall_rating === 'satisfactory' ? 'text-green-700 bg-green-100' :
                  a.overall_rating === 'minor_issues' ? 'text-amber-700 bg-amber-100' :
                  a.overall_rating === 'major_issues' ? 'text-red-700 bg-red-100' :
                  a.overall_rating === 'critical' ? 'text-red-900 bg-red-200' : '';
                return (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{a.title}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden sm:table-cell">{(a.audit_type || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.scheduled_date}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {a.overall_rating
                        ? <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ratingColor}`}>{a.overall_rating.replace('_', ' ')}</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{a.nc_count ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BrcAnalytics() {
  return <BrcModuleGuard><BrcAnalyticsContent /></BrcModuleGuard>;
}
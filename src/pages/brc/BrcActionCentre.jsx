import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { Link } from 'react-router-dom';
import {
  Bell, AlertTriangle, CheckCircle2, Clock, Wrench, Truck,
  ScrollText, ClipboardList, FileText, GraduationCap, ChevronRight
} from 'lucide-react';

const today = new Date();
const daysFrom = (dateStr) => dateStr ? Math.ceil((new Date(dateStr) - today) / 86400000) : null;

function ActionItem({ icon: Icon, iconBg, iconColor, title, subtitle, linkTo, urgency }) {
  const urgencyBorder = urgency === 'critical' ? 'border-l-red-500' : urgency === 'warning' ? 'border-l-amber-400' : 'border-l-blue-400';
  return (
    <Link to={linkTo} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors border-l-2 ${urgencyBorder}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </Link>
  );
}

function BrcActionCentreContent() {
  const { org } = useOrganisation();
  const [ncs, setNcs] = useState([]);
  const [capas, setCapas] = useState([]);
  const [calibration, setCalibration] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      base44.entities.BRCNonConformance.filter({ organisation_id: org.id }),
      base44.entities.BRCCAPA.filter({ organisation_id: org.id }),
      base44.entities.BRCCalibrationRecord.filter({ organisation_id: org.id }),
      base44.entities.BRCSupplier.filter({ organisation_id: org.id }),
      base44.entities.BRCDocument.filter({ organisation_id: org.id }),
      base44.entities.SkillAssessment.filter({ organisation_id: org.id }),
      base44.entities.BRCComplaint.filter({ organisation_id: org.id }),
      base44.entities.BRCClauseStatus.filter({ organisation_id: org.id }),
    ]).then(([n, c, cal, sup, doc, ass, comp, st]) => {
      setNcs(n); setCapas(c); setCalibration(cal); setSuppliers(sup);
      setDocuments(doc); setAssessments(ass); setComplaints(comp); setStatuses(st);
      setLoading(false);
    });
  }, [org?.id]);

  const actions = useMemo(() => {
    const items = [];

    // Overdue CAPAs
    capas.filter(c => c.status === 'overdue' || (c.due_date && daysFrom(c.due_date) < 0 && c.status !== 'completed' && c.status !== 'verified'))
      .forEach(c => items.push({
        icon: ClipboardList, iconBg: 'bg-red-100', iconColor: 'text-red-600',
        title: `Overdue CAPA: ${c.ref_number || c.title}`,
        subtitle: `Due ${c.due_date || 'unknown'} · ${c.responsible_name || 'Unassigned'}`,
        linkTo: '/brc/capas', urgency: 'critical', sort: 0,
      }));

    // Open NCs overdue
    ncs.filter(n => (n.status === 'open' || n.status === 'under_investigation') && n.due_date && daysFrom(n.due_date) < 0)
      .forEach(n => items.push({
        icon: AlertTriangle, iconBg: 'bg-red-100', iconColor: 'text-red-600',
        title: `Overdue NC: ${n.ref_number || n.title}`,
        subtitle: `${n.severity} · Due ${n.due_date}`,
        linkTo: '/brc/non-conformances', urgency: 'critical', sort: 0,
      }));

    // Calibration overdue
    calibration.filter(r => r.status === 'overdue')
      .forEach(r => items.push({
        icon: Wrench, iconBg: 'bg-red-100', iconColor: 'text-red-600',
        title: `Calibration overdue: ${r.equipment_name}`,
        subtitle: `${r.equipment_id} · Was due ${r.next_calibration_date}`,
        linkTo: '/brc/calibration', urgency: 'critical', sort: 1,
      }));

    // Calibration due soon (within 30 days)
    calibration.filter(r => r.status === 'due_soon' || (r.next_calibration_date && daysFrom(r.next_calibration_date) <= 30 && daysFrom(r.next_calibration_date) >= 0))
      .forEach(r => items.push({
        icon: Wrench, iconBg: 'bg-amber-100', iconColor: 'text-amber-700',
        title: `Calibration due soon: ${r.equipment_name}`,
        subtitle: `${r.equipment_id} · Due ${r.next_calibration_date} (${daysFrom(r.next_calibration_date)}d)`,
        linkTo: '/brc/calibration', urgency: 'warning', sort: 2,
      }));

    // Supplier reviews overdue
    suppliers.filter(s => s.next_review_date && daysFrom(s.next_review_date) < 0)
      .forEach(s => items.push({
        icon: Truck, iconBg: 'bg-red-100', iconColor: 'text-red-600',
        title: `Supplier review overdue: ${s.name}`,
        subtitle: `Was due ${s.next_review_date} · ${s.approval_status}`,
        linkTo: '/brc/suppliers', urgency: 'critical', sort: 1,
      }));

    // Supplier reviews due within 60 days
    suppliers.filter(s => s.next_review_date && daysFrom(s.next_review_date) >= 0 && daysFrom(s.next_review_date) <= 60)
      .forEach(s => items.push({
        icon: Truck, iconBg: 'bg-amber-100', iconColor: 'text-amber-700',
        title: `Supplier review due: ${s.name}`,
        subtitle: `Due ${s.next_review_date} (${daysFrom(s.next_review_date)}d) · ${s.approval_status}`,
        linkTo: '/brc/suppliers', urgency: 'warning', sort: 3,
      }));

    // Documents due for review
    documents.filter(d => d.next_review_date && daysFrom(d.next_review_date) < 0)
      .forEach(d => items.push({
        icon: FileText, iconBg: 'bg-red-100', iconColor: 'text-red-600',
        title: `Document review overdue: ${d.title}`,
        subtitle: `${d.doc_reference} · Was due ${d.next_review_date}`,
        linkTo: '/brc/documents', urgency: 'critical', sort: 1,
      }));
    documents.filter(d => d.next_review_date && daysFrom(d.next_review_date) >= 0 && daysFrom(d.next_review_date) <= 60)
      .forEach(d => items.push({
        icon: FileText, iconBg: 'bg-amber-100', iconColor: 'text-amber-700',
        title: `Document review due: ${d.title}`,
        subtitle: `${d.doc_reference} · Due ${d.next_review_date} (${daysFrom(d.next_review_date)}d)`,
        linkTo: '/brc/documents', urgency: 'warning', sort: 3,
      }));

    // Expiring training certs within 30 days
    assessments.filter(a => a.expiry_date && daysFrom(a.expiry_date) >= 0 && daysFrom(a.expiry_date) <= 30)
      .forEach(a => items.push({
        icon: GraduationCap, iconBg: 'bg-amber-100', iconColor: 'text-amber-700',
        title: `Expiring cert: ${a.user_name} — ${a.skill_name}`,
        subtitle: `Expires ${a.expiry_date} (${daysFrom(a.expiry_date)}d)`,
        linkTo: '/brc/training', urgency: 'warning', sort: 2,
      }));

    // Expired training certs
    assessments.filter(a => a.expiry_date && daysFrom(a.expiry_date) < 0)
      .forEach(a => items.push({
        icon: GraduationCap, iconBg: 'bg-red-100', iconColor: 'text-red-600',
        title: `Expired cert: ${a.user_name} — ${a.skill_name}`,
        subtitle: `Expired ${a.expiry_date}`,
        linkTo: '/brc/training', urgency: 'critical', sort: 1,
      }));

    // Unresolved complaints older than 30 days
    complaints.filter(c => (c.status === 'new' || c.status === 'investigating') && daysFrom(c.complaint_date) < -30)
      .forEach(c => items.push({
        icon: AlertTriangle, iconBg: 'bg-amber-100', iconColor: 'text-amber-700',
        title: `Stale complaint: ${c.ref_number || c.customer_name}`,
        subtitle: `Open since ${c.complaint_date} · ${c.status}`,
        linkTo: '/brc/complaints', urgency: 'warning', sort: 2,
      }));

    // Clauses not started (fundamental)
    statuses.filter(s => s.rag === 'red' || s.status === 'not_started').slice(0, 5)
      .forEach(s => items.push({
        icon: ScrollText, iconBg: 'bg-gray-100', iconColor: 'text-gray-600',
        title: `Clause not started`,
        subtitle: `Update clause status in Clause Mapping`,
        linkTo: '/brc/clauses', urgency: 'info', sort: 5,
      }));

    return items
      .slice(0, 50)
      .sort((a, b) => a.sort - b.sort);
  }, [ncs, capas, calibration, suppliers, documents, assessments, complaints, statuses]);

  const critical = actions.filter(a => a.urgency === 'critical');
  const warning  = actions.filter(a => a.urgency === 'warning');
  const info     = actions.filter(a => a.urgency === 'info');

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" /> Action Centre
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Proactive alerts for overdue tasks, expiring records, and compliance gaps.</p>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{critical.length}</p>
            <p className="text-xs text-red-600 font-medium mt-0.5">Critical</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{warning.length}</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Warnings</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{actions.length === 0 ? '✓' : info.length}</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">{actions.length === 0 ? 'All Clear' : 'Info'}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : actions.length === 0 ? (
        <div className="text-center py-20 space-y-3 bg-card border border-border rounded-xl">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <p className="text-lg font-semibold text-foreground">All clear!</p>
          <p className="text-sm text-muted-foreground">No overdue tasks or expiring records found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {critical.length > 0 && (
            <div className="bg-card border border-red-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="font-semibold text-red-800 text-sm">Critical — Immediate Action Required</h3>
                <span className="ml-auto text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{critical.length}</span>
              </div>
              <div className="divide-y divide-border">
                {critical.map((a, i) => <ActionItem key={i} {...a} />)}
              </div>
            </div>
          )}

          {warning.length > 0 && (
            <div className="bg-card border border-amber-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-200">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800 text-sm">Upcoming — Action Required Soon</h3>
                <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{warning.length}</span>
              </div>
              <div className="divide-y divide-border">
                {warning.map((a, i) => <ActionItem key={i} {...a} />)}
              </div>
            </div>
          )}

          {info.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-muted/50 border-b border-border">
                <ScrollText className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground text-sm">Compliance Gaps</h3>
                <span className="ml-auto text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{info.length}</span>
              </div>
              <div className="divide-y divide-border">
                {info.map((a, i) => <ActionItem key={i} {...a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BrcActionCentre() {
  return <BrcModuleGuard><BrcActionCentreContent /></BrcModuleGuard>;
}
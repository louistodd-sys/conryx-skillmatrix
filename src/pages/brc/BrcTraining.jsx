import BrcModuleGuard from '@/components/BrcModuleGuard';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useOrganisation from '@/lib/useOrganisation';
import { GraduationCap, Link2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

function BrcTrainingContent() {
  const { org } = useOrganisation();
  const [assessments, setAssessments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    Promise.all([
      base44.entities.SkillAssessment.filter({ organisation_id: org.id }, '-assessed_date', 100),
      base44.entities.Skill.filter({ organisation_id: org.id }),
      base44.entities.TeamMember.filter({ organisation_id: org.id }),
    ]).then(([a, s, m]) => {
      setAssessments(a);
      setSkills(s);
      setMembers(m);
      setLoading(false);
    });
  }, [org?.id]);

  const today = new Date();

  const getExpiryStatus = (expiry) => {
    if (!expiry) return null;
    const d = new Date(expiry);
    const diff = Math.ceil((d - today) / 86400000);
    if (diff < 0) return 'expired';
    if (diff <= 30) return 'expiring_soon';
    return 'valid';
  };

  // Group assessments by person
  const byPerson = {};
  assessments.forEach(a => {
    if (!byPerson[a.user_id]) byPerson[a.user_id] = { name: a.user_name, assessments: [] };
    byPerson[a.user_id].assessments.push(a);
  });

  const totalExpired = assessments.filter(a => getExpiryStatus(a.expiry_date) === 'expired').length;
  const totalExpiringSoon = assessments.filter(a => getExpiryStatus(a.expiry_date) === 'expiring_soon').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-jakarta text-foreground flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" /> Training Register
        </h1>
        <Link to="/matrix" className="text-xs text-primary hover:underline flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" /> Manage in Skills Matrix
        </Link>
      </div>

      <div className="p-4 bg-accent/30 border border-accent rounded-xl text-sm flex items-start gap-2">
        <Link2 className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
        <p className="text-accent-foreground">
          Training records are pulled directly from your <strong>Skills Matrix</strong> assessments. Manage training in the Skills Matrix module — all certified skills with expiry dates appear here automatically.
        </p>
      </div>

      {(totalExpired > 0 || totalExpiringSoon > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {totalExpired > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>{totalExpired}</strong> expired certification{totalExpired !== 1 ? 's' : ''}</span>
            </div>
          )}
          {totalExpiringSoon > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex-1">
              <Clock className="w-4 h-4 shrink-0" />
              <span><strong>{totalExpiringSoon}</strong> expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Records</p>
          <p className="text-2xl font-bold text-foreground">{assessments.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Staff Trained</p>
          <p className="text-2xl font-bold text-foreground">{Object.keys(byPerson).length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground mb-1">Unique Skills</p>
          <p className="text-2xl font-bold text-foreground">{[...new Set(assessments.map(a => a.skill_id))].length}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-card border border-border rounded-xl">
          <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No training records found. Add skill assessments in the Skills Matrix.</p>
          <Link to="/matrix" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <Link2 className="w-3.5 h-3.5" /> Go to Skills Matrix
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employee</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Skill / Training</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden sm:table-cell">Assessed</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28 hidden md:table-cell">Expires</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assessments.slice(0, 50).map(a => {
                const expStatus = getExpiryStatus(a.expiry_date);
                return (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{a.user_name}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{a.skill_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{a.assessed_date}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{a.expiry_date || '—'}</td>
                    <td className="px-4 py-3">
                      {!a.expiry_date ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> No Expiry
                        </span>
                      ) : expStatus === 'expired' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Expired
                        </span>
                      ) : expStatus === 'expiring_soon' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                          <Clock className="w-3 h-3" /> Expiring Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Valid
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assessments.length > 50 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              Showing 50 of {assessments.length} records. View all in Skills Matrix.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BrcTraining() {
  return <BrcModuleGuard><BrcTrainingContent /></BrcModuleGuard>;
}
/**
 * Generic stub for BRC pages not yet fully implemented.
 * Each page is a thin wrapper that passes its title and icon.
 */
import BrcModuleGuard from '@/components/BrcModuleGuard';
import { Construction } from 'lucide-react';

function StubContent({ title, description }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-4 text-center">
        <Construction className="w-10 h-10 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-foreground">Coming soon</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {description || `The ${title} module is part of the BRC Compliance extension and will be available shortly.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BrcAudits() {
  return <BrcModuleGuard><StubContent title="Internal Audits" description="Schedule, conduct, and record internal audits against BRC clauses." /></BrcModuleGuard>;
}
export function BrcAuditDetail() {
  return <BrcModuleGuard><StubContent title="Audit Detail" /></BrcModuleGuard>;
}
export function BrcNonConformances() {
  return <BrcModuleGuard><StubContent title="Non-Conformances" description="Log, track, and close out non-conformances raised during audits or inspections." /></BrcModuleGuard>;
}
export function BrcNonConformanceDetail() {
  return <BrcModuleGuard><StubContent title="Non-Conformance Detail" /></BrcModuleGuard>;
}
export function BrcCapas() {
  return <BrcModuleGuard><StubContent title="CAPA Register" description="Corrective and Preventive Actions across all non-conformances." /></BrcModuleGuard>;
}
export function BrcSuppliers() {
  return <BrcModuleGuard><StubContent title="Supplier Approval Register" description="Manage and evidence supplier approvals and reappraisals." /></BrcModuleGuard>;
}
export function BrcSupplierDetail() {
  return <BrcModuleGuard><StubContent title="Supplier Detail" /></BrcModuleGuard>;
}
export function BrcCalibration() {
  return <BrcModuleGuard><StubContent title="Calibration Register" description="Track equipment calibration records and upcoming due dates." /></BrcModuleGuard>;
}
export function BrcCalibrationDetail() {
  return <BrcModuleGuard><StubContent title="Calibration Record Detail" /></BrcModuleGuard>;
}
export function BrcComplaints() {
  return <BrcModuleGuard><StubContent title="Customer Complaint Register" description="Log and track customer complaints to resolution." /></BrcModuleGuard>;
}
export function BrcComplaintDetail() {
  return <BrcModuleGuard><StubContent title="Complaint Detail" /></BrcModuleGuard>;
}
export function BrcManagementReview() {
  return <BrcModuleGuard><StubContent title="Management Review" description="Record and evidence management review meetings and outcomes." /></BrcModuleGuard>;
}
export function BrcGlassRegister() {
  return <BrcModuleGuard><StubContent title="Glass & Hard Plastic Register" description="Maintain the glass and brittle plastic register as required by BRCGS Packaging." /></BrcModuleGuard>;
}
export function BrcPestControl() {
  return <BrcModuleGuard><StubContent title="Pest Control Log" description="Record pest control visits, findings, and corrective actions." /></BrcModuleGuard>;
}
export function BrcTraining() {
  return <BrcModuleGuard><StubContent title="Training Register" description="BRC-aligned training records. Links to Skills Matrix assessments when both modules are active." /></BrcModuleGuard>;
}
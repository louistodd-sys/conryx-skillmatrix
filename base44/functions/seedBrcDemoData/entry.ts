/**
 * seedBrcDemoData — seeds realistic BRC demo data for an organisation:
 *   - BRCDocuments (with clause refs)
 *   - BRCClauseStatus (with evidence counts linked to those docs)
 *   - BRCClauseEvidenceLink (links docs to clauses)
 * Admin-only. Uses force:true to re-seed.
 * Call with: { organisation_id: "xxx" }  (defaults to caller's org)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // Resolve org
  const orgs = await base44.asServiceRole.entities.Organisation.filter({ created_by: user.email }, '-created_date', 1);
  const org = orgs[0];
  if (!org) return Response.json({ error: 'Organisation not found' }, { status: 404 });
  const orgId = org.id;

  // Fetch existing clauses so we can get real IDs for linking
  const clauses = await base44.asServiceRole.entities.BRCClause.filter(
    { standard: org.brc_standard || 'brcgs_packaging' }, 'display_order', 200
  );
  const clauseByNumber = {};
  clauses.forEach(c => { clauseByNumber[c.clause_number] = c; });

  // ── 1. Clear existing org-scoped demo data if force ─────────────────────
  if (body.force) {
    const [existingDocs, existingStatuses, existingLinks] = await Promise.all([
      base44.asServiceRole.entities.BRCDocument.filter({ organisation_id: orgId }),
      base44.asServiceRole.entities.BRCClauseStatus.filter({ organisation_id: orgId }),
      base44.asServiceRole.entities.BRCClauseEvidenceLink.filter({ organisation_id: orgId }),
    ]);
    for (const d of existingDocs) await base44.asServiceRole.entities.BRCDocument.delete(d.id);
    for (const s of existingStatuses) await base44.asServiceRole.entities.BRCClauseStatus.delete(s.id);
    for (const l of existingLinks) await base44.asServiceRole.entities.BRCClauseEvidenceLink.delete(l.id);
  }

  // ── 2. Create documents ──────────────────────────────────────────────────
  const today = new Date();
  const addMonths = (d, m) => { const n = new Date(d); n.setMonth(n.getMonth() + m); return n.toISOString().split('T')[0]; };
  const subDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() - n); return r.toISOString().split('T')[0]; };

  const docDefs = [
    {
      title: 'Food Safety & Quality Policy',
      doc_type: 'policy',
      doc_reference: 'POL-001',
      current_version_number: '3.0',
      status: 'approved',
      next_review_date: addMonths(today, 12),
      review_interval_months: 12,
      brc_clause_refs: ['1.1', '1.1.1'],
      description: 'Senior management commitment to food safety, quality, and continual improvement. Signed by the Managing Director.',
    },
    {
      title: 'HACCP Plan — Packaging Line A',
      doc_type: 'procedure',
      doc_reference: 'HAC-001',
      current_version_number: '2.1',
      status: 'approved',
      next_review_date: addMonths(today, 6),
      review_interval_months: 12,
      brc_clause_refs: ['2.1', '2.1.1', '2.2', '2.3'],
      description: 'Full HACCP study for Packaging Line A including hazard analysis, CCPs, critical limits, and monitoring procedures.',
    },
    {
      title: 'Document Control Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-001',
      current_version_number: '2.0',
      status: 'approved',
      next_review_date: addMonths(today, 10),
      review_interval_months: 12,
      brc_clause_refs: ['3.1', '3.2'],
      description: 'Controls for creation, review, approval, distribution, and archiving of all quality system documents.',
    },
    {
      title: 'Internal Audit Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-002',
      current_version_number: '1.3',
      status: 'approved',
      next_review_date: addMonths(today, 8),
      review_interval_months: 12,
      brc_clause_refs: ['3.4'],
      description: 'Procedure for planning, conducting, and reporting internal audits against the BRC standard.',
    },
    {
      title: 'Supplier Approval Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-003',
      current_version_number: '2.2',
      status: 'approved',
      next_review_date: addMonths(today, 9),
      review_interval_months: 12,
      brc_clause_refs: ['3.5'],
      description: 'Criteria and process for approving, monitoring, and re-appraising suppliers of materials and services.',
    },
    {
      title: 'CAPA Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-004',
      current_version_number: '1.5',
      status: 'approved',
      next_review_date: addMonths(today, 11),
      review_interval_months: 12,
      brc_clause_refs: ['3.7'],
      description: 'Root cause investigation and corrective/preventive action process for all non-conformances.',
    },
    {
      title: 'Allergen Management Policy',
      doc_type: 'policy',
      doc_reference: 'POL-002',
      current_version_number: '2.0',
      status: 'approved',
      next_review_date: addMonths(today, 6),
      review_interval_months: 12,
      brc_clause_refs: ['5.3'],
      description: 'Site allergen policy covering declaration, segregation, cleaning, and labelling of allergen-containing materials.',
    },
    {
      title: 'Glass & Hard Plastic Register Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-005',
      current_version_number: '1.1',
      status: 'approved',
      next_review_date: addMonths(today, 7),
      review_interval_months: 12,
      brc_clause_refs: ['4.8'],
      description: 'Procedure for maintaining and checking the glass and hard plastic register in all production and storage areas.',
    },
    {
      title: 'Pest Control Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-006',
      current_version_number: '1.4',
      status: 'approved',
      next_review_date: addMonths(today, 4),
      review_interval_months: 12,
      brc_clause_refs: ['4.11'],
      description: 'Pest control programme management including contractor management, visit scheduling, and corrective actions.',
    },
    {
      title: 'Training & Competence Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-007',
      current_version_number: '2.0',
      status: 'approved',
      next_review_date: addMonths(today, 10),
      review_interval_months: 12,
      brc_clause_refs: ['7.1'],
      description: 'Procedure for identifying training needs, delivering training, and assessing competence of all personnel.',
    },
    {
      title: 'Personal Hygiene Policy',
      doc_type: 'policy',
      doc_reference: 'POL-003',
      current_version_number: '1.2',
      status: 'approved',
      next_review_date: addMonths(today, 14),
      review_interval_months: 12,
      brc_clause_refs: ['7.2'],
      description: 'Personal hygiene rules for all staff and visitors including hand washing, jewellery, and clothing rules.',
    },
    {
      title: 'Calibration Register & Schedule',
      doc_type: 'record_template',
      doc_reference: 'REC-001',
      current_version_number: '1.0',
      status: 'approved',
      next_review_date: addMonths(today, 12),
      review_interval_months: 12,
      brc_clause_refs: ['4.5', '6.3'],
      description: 'Register of all measuring and monitoring devices subject to calibration, with schedule and certificate references.',
    },
    {
      title: 'Complaint Handling Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-008',
      current_version_number: '1.3',
      status: 'approved',
      next_review_date: addMonths(today, 5),
      review_interval_months: 12,
      brc_clause_refs: ['3.9'],
      description: 'System for recording, investigating, and responding to customer complaints within defined timescales.',
    },
    {
      title: 'Management Review Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-009',
      current_version_number: '1.0',
      status: 'approved',
      next_review_date: addMonths(today, 11),
      review_interval_months: 12,
      brc_clause_refs: ['1.1.2'],
      description: 'Process for conducting and recording annual management reviews of the food safety and quality system.',
    },
    {
      title: 'Traceability Procedure',
      doc_type: 'procedure',
      doc_reference: 'PRO-010',
      current_version_number: '1.6',
      status: 'approved',
      next_review_date: addMonths(today, 8),
      review_interval_months: 12,
      brc_clause_refs: ['3.10'],
      description: 'Procedure for tracing raw materials from receipt through processing to finished product dispatch, including mass balance.',
    },
    {
      title: 'Site Security Policy',
      doc_type: 'policy',
      doc_reference: 'POL-004',
      current_version_number: '1.1',
      status: 'under_review',
      next_review_date: addMonths(today, -1), // overdue
      review_interval_months: 12,
      brc_clause_refs: ['4.2'],
      description: 'Site security arrangements including access control, CCTV, visitor management, and security assessment.',
    },
  ];

  const createdDocs = [];
  for (const def of docDefs) {
    const doc = await base44.asServiceRole.entities.BRCDocument.create({
      organisation_id: orgId,
      owner_user_id: user.id,
      approver_user_id: user.id,
      ...def,
    });
    createdDocs.push(doc);
  }

  // Build a map for easy lookup: doc_reference -> doc
  const docByRef = {};
  createdDocs.forEach(d => { docByRef[d.doc_reference] = d; });

  // ── 3. Create clause statuses and evidence links ─────────────────────────
  const clauseStatusDefs = [
    { clause_number: '1.1',   status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Management commitment statement signed and dated. Policy reviewed January 2025.', doc_refs: ['POL-001'] },
    { clause_number: '1.1.1', status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Quality policy v3.0 approved and displayed at site entrance.', doc_refs: ['POL-001'] },
    { clause_number: '1.1.2', status: 'evidence_attached',rag: 'amber', evidence_count: 1, notes: 'Last review March 2025. Next review due September 2025.', doc_refs: ['PRO-009'] },
    { clause_number: '1.2',   status: 'in_progress',      rag: 'amber', evidence_count: 0, notes: 'Organisation chart being updated following restructure in April 2025.' },
    { clause_number: '2.1',   status: 'ready',            rag: 'green', evidence_count: 4, notes: 'HACCP plan fully documented and validated. Last full review completed Q1 2025.', doc_refs: ['HAC-001'] },
    { clause_number: '2.1.1', status: 'evidence_attached',rag: 'amber', evidence_count: 2, notes: 'HACCP team established. Training records being updated for 2 new team members.', doc_refs: ['HAC-001'] },
    { clause_number: '2.2',   status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Hazard analysis worksheets complete for all 12 raw material inputs.', doc_refs: ['HAC-001'] },
    { clause_number: '2.3',   status: 'evidence_attached',rag: 'amber', evidence_count: 2, notes: 'CCP monitoring records in place. Critical limit validation scheduled for July 2025.', doc_refs: ['HAC-001'] },
    { clause_number: '3.1',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Quality manual version 4.0 approved and available to all staff on intranet.', doc_refs: ['PRO-001'] },
    { clause_number: '3.2',   status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Document control procedure in place. Master list current as of May 2025.', doc_refs: ['PRO-001'] },
    { clause_number: '3.3',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'Records retention schedule being updated. Most records compliant.' },
    { clause_number: '3.4',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Internal audit programme completed. Annual audit vs all BRC clauses done March 2025.', doc_refs: ['PRO-002'] },
    { clause_number: '3.5',   status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Approved supplier list current. 100% of raw material suppliers on ASL.', doc_refs: ['PRO-003'] },
    { clause_number: '3.6',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: '3 raw material specifications pending review and sign-off by technical manager.' },
    { clause_number: '3.7',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'CAPA procedure v1.5 in place. CAPA register maintained and reviewed monthly.', doc_refs: ['PRO-004'] },
    { clause_number: '3.8',   status: 'evidence_attached',rag: 'amber', evidence_count: 1, notes: 'Non-conforming product procedure in place. Segregation area clearly marked.' },
    { clause_number: '3.9',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Complaint register maintained. Average response time 5 days.', doc_refs: ['PRO-008'] },
    { clause_number: '3.10',  status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Traceability exercise completed Feb 2025 — 100% trace achieved in 2 hours.', doc_refs: ['PRO-010'] },
    { clause_number: '3.11',  status: 'not_started',      rag: 'red',   evidence_count: 0, notes: '' },
    { clause_number: '4.1',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'External building survey completed. Minor maintenance items raised on action tracker.' },
    { clause_number: '4.2',   status: 'needs_review',     rag: 'red',   evidence_count: 1, notes: 'Security policy overdue for review. CCTV coverage extended — documentation needed.', doc_refs: ['POL-004'] },
    { clause_number: '4.3',   status: 'evidence_attached',rag: 'amber', evidence_count: 1, notes: 'Site layout plan updated. Zoning maps being reviewed following line extension.' },
    { clause_number: '4.4',   status: 'in_progress',      rag: 'amber', evidence_count: 0, notes: 'Water testing programme in place. Compressed air testing records to be consolidated.' },
    { clause_number: '4.5',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Equipment register complete. All critical equipment on calibration schedule.', doc_refs: ['REC-001'] },
    { clause_number: '4.6',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'PPM schedule in place. 2 items overdue — maintenance team actioned.' },
    { clause_number: '4.7',   status: 'not_started',      rag: 'red',   evidence_count: 0, notes: '' },
    { clause_number: '4.8',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Glass register complete and checked monthly. Last check May 2025 — no damage found.', doc_refs: ['PRO-005'] },
    { clause_number: '4.9',   status: 'evidence_attached',rag: 'amber', evidence_count: 2, notes: 'Cleaning schedules in place. Deep clean records for May to be signed off.' },
    { clause_number: '4.10',  status: 'not_started',      rag: 'red',   evidence_count: 0, notes: '' },
    { clause_number: '4.11',  status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Pest control contract in place with PestAway Ltd. Monthly visits. No activity May 2025.', doc_refs: ['PRO-006'] },
    { clause_number: '5.1',   status: 'not_started',      rag: 'red',   evidence_count: 0, notes: '' },
    { clause_number: '5.2',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'Labelling procedure under development. Current labels checked against regulation.' },
    { clause_number: '5.3',   status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Allergen management policy reviewed April 2025. Cleaning validation completed.', doc_refs: ['POL-002'] },
    { clause_number: '5.4',   status: 'not_started',      rag: 'red',   evidence_count: 0, notes: '' },
    { clause_number: '5.5',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'Product inspection records in place. Laboratory testing schedule being reviewed.' },
    { clause_number: '5.6',   status: 'evidence_attached',rag: 'amber', evidence_count: 1, notes: 'Product release procedure drafted. Sign-off pending from QA manager.' },
    { clause_number: '6.1',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'Process control procedures in place for main lines. Line 3 procedure under review.' },
    { clause_number: '6.2',   status: 'not_started',      rag: 'red',   evidence_count: 0, notes: '' },
    { clause_number: '6.3',   status: 'ready',            rag: 'green', evidence_count: 3, notes: 'Calibration register complete. 100% of devices calibrated and in date.', doc_refs: ['REC-001'] },
    { clause_number: '7.1',   status: 'ready',            rag: 'green', evidence_count: 4, notes: 'Training matrix current. All staff induction complete. Refresher programme running.', doc_refs: ['PRO-007'] },
    { clause_number: '7.2',   status: 'ready',            rag: 'green', evidence_count: 2, notes: 'Personal hygiene policy signed by all employees. Hygiene audit May 2025 — satisfactory.', doc_refs: ['POL-003'] },
    { clause_number: '7.3',   status: 'evidence_attached',rag: 'amber', evidence_count: 1, notes: 'Medical screening policy in place. Health declarations completed by new starters.' },
    { clause_number: '7.4',   status: 'in_progress',      rag: 'amber', evidence_count: 1, notes: 'PPE policy in place. Laundry arrangements being reviewed following supplier change.' },
  ];

  const today2 = new Date().toISOString().split('T')[0];
  const createdStatuses = [];
  const createdLinks = [];

  for (const def of clauseStatusDefs) {
    const clause = clauseByNumber[def.clause_number];
    if (!clause) continue;

    const st = await base44.asServiceRole.entities.BRCClauseStatus.create({
      organisation_id: orgId,
      clause_id: clause.id,
      status: def.status,
      rag: def.rag,
      evidence_count: def.evidence_count,
      notes: def.notes,
      last_reviewed_date: today2,
      last_reviewed_by: user.id,
    });
    createdStatuses.push(st);

    // Create evidence links to documents
    if (def.doc_refs) {
      for (const ref of def.doc_refs) {
        const doc = docByRef[ref];
        if (!doc) continue;
        const link = await base44.asServiceRole.entities.BRCClauseEvidenceLink.create({
          organisation_id: orgId,
          clause_id: clause.id,
          linked_entity_type: 'document_version',
          linked_entity_id: doc.id,
          linked_by_user_id: user.id,
          notes: `Linked document: ${doc.title} (${ref})`,
        });
        createdLinks.push(link);
      }
    }
  }

  return Response.json({
    success: true,
    organisation_id: orgId,
    documents_created: createdDocs.length,
    statuses_created: createdStatuses.length,
    evidence_links_created: createdLinks.length,
    message: `Demo data seeded successfully.`,
  });
});
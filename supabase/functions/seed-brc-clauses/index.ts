/**
 * seed-brc-clauses
 * Seeds a representative set of BRCGS Packaging Material Issue 7 clauses.
 * Admin-only. Idempotent — will not duplicate if clauses for the standard already exist.
 * Call with: { standard: "brcgs_packaging" }
 */
import { corsHeaders } from '../_shared/cors.ts'
import { getUser, adminClient } from '../_shared/auth.ts'

// A representative subset of BRCGS Packaging Material Standard Issue 7 clauses
const BRCGS_PACKAGING_CLAUSES = [
  // Section 1 — Senior Management Commitment
  { clause_number: '1.1', parent_clause_number: null, title: 'Senior Management Commitment and Continual Improvement', description: "The site's senior management shall demonstrate they are committed to the development of a food safety culture and the implementation of the requirements of the Standard.", evidence_requirement: 'Management meeting minutes, signed commitment statement, policy documents', is_fundamental: true, display_order: 10 },
  { clause_number: '1.1.1', parent_clause_number: '1.1', title: 'Food Safety and Quality Policy', description: 'The site shall have a documented food safety and quality policy, signed by the current site general manager or equivalent.', evidence_requirement: 'Signed quality policy document with review dates', is_fundamental: false, display_order: 11 },
  { clause_number: '1.1.2', parent_clause_number: '1.1', title: 'Management Review', description: 'Senior management shall review the food safety plan and quality management system at least annually.', evidence_requirement: 'Management review meeting minutes, agenda, action tracker', is_fundamental: false, display_order: 12 },
  { clause_number: '1.2', parent_clause_number: null, title: 'Organisational Structure', description: 'The site shall have a clear organisational structure with defined responsibilities for food safety and quality.', evidence_requirement: 'Organisation chart, job descriptions', is_fundamental: false, display_order: 20 },

  // Section 2 — Hazard and Risk Management
  { clause_number: '2.1', parent_clause_number: null, title: 'HACCP Food Safety Plan', description: 'The site shall have a documented food safety plan based on Codex Alimentarius HACCP principles.', evidence_requirement: 'HACCP study documentation, hazard analysis worksheets, CCP records', is_fundamental: true, display_order: 30 },
  { clause_number: '2.1.1', parent_clause_number: '2.1', title: 'HACCP Team', description: 'A multidisciplinary HACCP team shall be established including a designated HACCP team leader.', evidence_requirement: 'HACCP team list, training records, team leader competence evidence', is_fundamental: false, display_order: 31 },
  { clause_number: '2.2', parent_clause_number: null, title: 'Hazard Analysis', description: 'A full hazard analysis shall be completed for all materials, processes, and products.', evidence_requirement: 'Hazard analysis worksheets, raw material hazard assessments', is_fundamental: false, display_order: 40 },
  { clause_number: '2.3', parent_clause_number: null, title: 'Critical Control Points', description: 'All critical control points shall be identified and documented with critical limits, monitoring procedures and corrective actions.', evidence_requirement: 'CCP monitoring records, critical limit validation evidence', is_fundamental: false, display_order: 50 },

  // Section 3 — Food Safety and Quality Management System
  { clause_number: '3.1', parent_clause_number: null, title: 'Food Safety and Quality Manual', description: 'The site shall maintain a food safety and quality manual covering all requirements of the Standard.', evidence_requirement: 'Quality manual, document control register', is_fundamental: false, display_order: 60 },
  { clause_number: '3.2', parent_clause_number: null, title: 'Document Control', description: 'The site shall have a documented procedure for the control of documents and records.', evidence_requirement: 'Document control procedure, master document list with version numbers', is_fundamental: false, display_order: 70 },
  { clause_number: '3.3', parent_clause_number: null, title: 'Record Completion and Maintenance', description: 'Records shall be legible, maintained in good condition, and retrievable.', evidence_requirement: 'Sample completed records, records retention schedule', is_fundamental: false, display_order: 80 },
  { clause_number: '3.4', parent_clause_number: null, title: 'Internal Audits', description: 'Internal audits shall be carried out at least annually against all clauses of the Standard.', evidence_requirement: 'Internal audit schedule, completed audit reports, close-out evidence', is_fundamental: false, display_order: 90 },
  { clause_number: '3.5', parent_clause_number: null, title: 'Supplier and Material Approval', description: 'The site shall have a documented procedure for the approval and monitoring of suppliers of materials and services.', evidence_requirement: 'Approved supplier list, supplier assessments, questionnaires or audit reports', is_fundamental: false, display_order: 100 },
  { clause_number: '3.6', parent_clause_number: null, title: 'Specifications', description: 'There shall be adequate specifications for all materials and products.', evidence_requirement: 'Raw material specifications, finished product specifications, packaging specifications', is_fundamental: false, display_order: 110 },
  { clause_number: '3.7', parent_clause_number: null, title: 'Corrective and Preventive Action', description: 'The site shall have a procedure to investigate and address the root cause of non-conformances.', evidence_requirement: 'CAPA register, investigation records, close-out verification', is_fundamental: false, display_order: 120 },
  { clause_number: '3.8', parent_clause_number: null, title: 'Control of Non-Conforming Product', description: 'The site shall have a documented procedure for the control of non-conforming materials and product.', evidence_requirement: 'Non-conforming product procedure, segregation records, disposition records', is_fundamental: false, display_order: 130 },
  { clause_number: '3.9', parent_clause_number: null, title: 'Complaints Handling', description: 'There shall be a system to record, investigate, and respond to customer complaints.', evidence_requirement: 'Complaints register, investigation records, response letters', is_fundamental: false, display_order: 140 },
  { clause_number: '3.10', parent_clause_number: null, title: 'Traceability', description: 'The site shall be able to trace all raw materials from approved suppliers through processing to finished product dispatch.', evidence_requirement: 'Traceability procedure, traceability test records, mass balance', is_fundamental: true, display_order: 150 },
  { clause_number: '3.11', parent_clause_number: null, title: 'Customer Focus and Communication', description: 'Where customer-specific requirements exist, these shall be reviewed, understood, and communicated.', evidence_requirement: 'Customer requirement register, review records, communication logs', is_fundamental: false, display_order: 160 },

  // Section 4 — Site Standards
  { clause_number: '4.1', parent_clause_number: null, title: 'External Standards', description: 'The site shall be of suitable construction and maintained.', evidence_requirement: 'Site survey records, maintenance schedule, external inspection photos', is_fundamental: false, display_order: 170 },
  { clause_number: '4.2', parent_clause_number: null, title: 'Security', description: 'The site shall be secure and have procedures to manage access.', evidence_requirement: 'Site security policy, access log, visitor procedure', is_fundamental: false, display_order: 180 },
  { clause_number: '4.3', parent_clause_number: null, title: 'Layout, Product Flow and Segregation', description: 'The site shall have an appropriate layout and flow to prevent contamination.', evidence_requirement: 'Site layout plan, zoning map, segregation procedures', is_fundamental: false, display_order: 190 },
  { clause_number: '4.4', parent_clause_number: null, title: 'Utilities — Water, Ice, Air, Other Gases', description: 'All utilities used in the production area shall be monitored and controlled.', evidence_requirement: 'Water testing records, compressed air testing records, utilities policy', is_fundamental: false, display_order: 200 },
  { clause_number: '4.5', parent_clause_number: null, title: 'Equipment', description: 'Equipment shall be suitable for its intended purpose and maintained.', evidence_requirement: 'Equipment register, calibration schedule and records, maintenance log', is_fundamental: false, display_order: 210 },
  { clause_number: '4.6', parent_clause_number: null, title: 'Maintenance', description: 'The site shall have a planned maintenance programme for all equipment.', evidence_requirement: 'Planned maintenance schedule, completed maintenance records, contractor approvals', is_fundamental: false, display_order: 220 },
  { clause_number: '4.7', parent_clause_number: null, title: 'Staff Facilities', description: 'Adequate staff facilities shall be provided and maintained.', evidence_requirement: 'Inspection records for staff facilities, locker room photos, welfare procedure', is_fundamental: false, display_order: 230 },
  { clause_number: '4.8', parent_clause_number: null, title: 'Chemical and Physical Contamination Control', description: 'The site shall have controls in place to manage the risk of chemical and physical contamination.', evidence_requirement: 'Glass and brittle plastic register, chemical control procedure, contamination risk assessments', is_fundamental: false, display_order: 240 },
  { clause_number: '4.9', parent_clause_number: null, title: 'Housekeeping and Hygiene', description: 'There shall be documented cleaning and hygiene procedures.', evidence_requirement: 'Cleaning schedule, completed cleaning records, hygiene inspection records', is_fundamental: false, display_order: 250 },
  { clause_number: '4.10', parent_clause_number: null, title: 'Waste and Waste Disposal', description: 'Waste shall be removed regularly to prevent accumulation.', evidence_requirement: 'Waste management procedure, waste contractor records, waste transfer notes', is_fundamental: false, display_order: 260 },
  { clause_number: '4.11', parent_clause_number: null, title: 'Pest Control', description: 'The site shall have a pest control programme in place.', evidence_requirement: 'Pest control contract, service visit reports, bait station map, corrective actions', is_fundamental: false, display_order: 270 },

  // Section 5 — Product and Process Control
  { clause_number: '5.1', parent_clause_number: null, title: 'Product Design/Development', description: 'Product design and development shall be carried out in accordance with the HACCP study.', evidence_requirement: 'New product development records, trial records, HACCP review sign-off', is_fundamental: false, display_order: 280 },
  { clause_number: '5.2', parent_clause_number: null, title: 'Product Labelling', description: 'All products shall be correctly labelled in accordance with legal requirements.', evidence_requirement: 'Label approval records, regulatory review evidence, artwork sign-off', is_fundamental: false, display_order: 290 },
  { clause_number: '5.3', parent_clause_number: null, title: 'Management of Allergens', description: 'The site shall have a documented allergen management policy and procedure.', evidence_requirement: 'Allergen register, segregation procedures, allergen risk assessment, cleaning validation', is_fundamental: true, display_order: 300 },
  { clause_number: '5.4', parent_clause_number: null, title: 'Authenticity, Claims and Chain of Custody', description: 'The site shall have processes in place to minimise the risk of purchasing fraudulent material.', evidence_requirement: 'Vulnerability assessment, testing records, chain of custody certificates', is_fundamental: false, display_order: 310 },
  { clause_number: '5.5', parent_clause_number: null, title: 'Product Inspection and Laboratory Testing', description: 'Product shall be inspected and tested against specification.', evidence_requirement: 'Inspection records, laboratory test results, calibration certificates', is_fundamental: false, display_order: 320 },
  { clause_number: '5.6', parent_clause_number: null, title: 'Product Release', description: 'A procedure shall be in place to ensure product is released only when all quality checks have been completed.', evidence_requirement: 'Product release procedure, signed release records, QC check sheets', is_fundamental: false, display_order: 330 },

  // Section 6 — Process Control
  { clause_number: '6.1', parent_clause_number: null, title: 'Control of Operations', description: 'The site shall demonstrate that process controls are in place and effective.', evidence_requirement: 'Process control procedures, monitoring records, in-process check records', is_fundamental: false, display_order: 340 },
  { clause_number: '6.2', parent_clause_number: null, title: 'Quantity — Weight, Volume and Number Control', description: 'The site shall have a procedure to control quantity of product.', evidence_requirement: 'Weight control procedure, checkweigher records, statistical data', is_fundamental: false, display_order: 350 },
  { clause_number: '6.3', parent_clause_number: null, title: 'Calibration and Control of Measuring and Monitoring Devices', description: 'The site shall identify and control all measuring and monitoring devices.', evidence_requirement: 'Calibration register, calibration certificates, out-of-calibration investigation records', is_fundamental: false, display_order: 360 },

  // Section 7 — Personnel
  { clause_number: '7.1', parent_clause_number: null, title: 'Training — Raw Material Handling, Preparation, Processing, Packing and Storage Areas', description: 'All employees shall receive induction training and appropriate ongoing training.', evidence_requirement: 'Training matrix, completed training records, induction records, competence assessments', is_fundamental: false, display_order: 370 },
  { clause_number: '7.2', parent_clause_number: null, title: 'Personal Hygiene — All Production and Storage Areas', description: 'There shall be clear personal hygiene rules for all personnel.', evidence_requirement: 'Personal hygiene policy, signed employee declarations, hygiene audit records', is_fundamental: false, display_order: 380 },
  { clause_number: '7.3', parent_clause_number: null, title: 'Medical Screening', description: 'The site shall have a policy for medical screening of staff before working with food.', evidence_requirement: 'Medical screening policy, health declaration forms, occupational health records', is_fundamental: false, display_order: 390 },
  { clause_number: '7.4', parent_clause_number: null, title: 'Protective Clothing', description: 'All personnel working in production areas shall wear appropriate protective clothing.', evidence_requirement: 'PPE policy, clothing inspection records, laundry arrangements', is_fundamental: false, display_order: 400 },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const user = await getUser(req)

    if (!user || user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const standard = body.standard || 'brcgs_packaging'
    const issue_number = body.issue_number || '7'

    const admin = adminClient()

    // Idempotency check — don't seed if clauses already exist for this standard
    const { data: existing } = await admin
      .from('brc_clauses')
      .select('id')
      .eq('standard', standard)
      .limit(1)

    if (existing && existing.length > 0 && !body.force) {
      return new Response(JSON.stringify({
        success: false,
        message: `Clauses for ${standard} already exist. Use force:true to re-seed.`,
        count: existing.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Force re-seed if requested
    if (body.force) {
      await admin.from('brc_clauses').delete().eq('standard', standard)
    }

    // Bulk create in batches of 10
    const records = BRCGS_PACKAGING_CLAUSES.map(c => ({ ...c, standard, issue_number }))
    const results = []

    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10)
      const { data: created, error } = await admin.from('brc_clauses').insert(batch).select()
      if (error) throw new Error(error.message)
      if (created) results.push(...created)
    }

    return new Response(JSON.stringify({
      success: true,
      standard,
      issue_number,
      seeded: results.length,
      message: `Successfully seeded ${results.length} clauses for ${standard} Issue ${issue_number}.`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

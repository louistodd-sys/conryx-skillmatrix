export const industryTemplates = [
  {
    id: 'manufacturing',
    name: 'Manufacturing / Engineering',
    icon: '🏭',
    categories: [
      {
        name: 'Safety & Compliance',
        colour: '#4F46E5',
        skills: [
          { name: 'Manual Handling', scale_type: 'binary', requires_expiry: true },
          { name: 'Fire Safety', scale_type: 'binary', requires_expiry: true },
          { name: 'Working at Height', scale_type: 'binary', requires_expiry: true },
          { name: 'PPE Compliance', scale_type: 'binary', requires_expiry: false },
          { name: 'COSHH Awareness', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Machinery',
        colour: '#3730A3',
        skills: [
          { name: 'Forklift Operation', scale_type: 'levelled', requires_expiry: true },
          { name: 'CNC Operation', scale_type: 'levelled', requires_expiry: false },
          { name: 'Lathe Operation', scale_type: 'levelled', requires_expiry: false },
          { name: 'Welding (MIG/TIG)', scale_type: 'levelled', requires_expiry: true },
        ],
      },
      {
        name: 'Quality',
        colour: '#0E7490',
        skills: [
          { name: 'ISO 9001 Awareness', scale_type: 'binary', requires_expiry: true },
          { name: 'Quality Inspection', scale_type: 'levelled', requires_expiry: false },
          { name: 'Calibration', scale_type: 'levelled', requires_expiry: true },
        ],
      },
    ],
  },
  {
    id: 'food',
    name: 'Food Production / FMCG',
    icon: '🍽️',
    categories: [
      {
        name: 'Food Safety',
        colour: '#4F46E5',
        skills: [
          { name: 'Food Hygiene Level 2', scale_type: 'binary', requires_expiry: true },
          { name: 'Food Hygiene Level 3', scale_type: 'binary', requires_expiry: true },
          { name: 'HACCP Awareness', scale_type: 'binary', requires_expiry: true },
          { name: 'Allergen Awareness', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Operations',
        colour: '#3730A3',
        skills: [
          { name: 'Packing Line Operation', scale_type: 'levelled', requires_expiry: false },
          { name: 'Labelling Compliance', scale_type: 'binary', requires_expiry: false },
          { name: 'Cold Chain Management', scale_type: 'levelled', requires_expiry: false },
        ],
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare / Care Services',
    icon: '🏥',
    categories: [
      {
        name: 'Clinical',
        colour: '#4F46E5',
        skills: [
          { name: 'First Aid at Work', scale_type: 'binary', requires_expiry: true },
          { name: 'Medication Administration', scale_type: 'levelled', requires_expiry: true },
          { name: 'Infection Control', scale_type: 'binary', requires_expiry: true },
          { name: 'Moving & Handling (People)', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Safeguarding',
        colour: '#B45309',
        skills: [
          { name: 'Safeguarding Adults', scale_type: 'binary', requires_expiry: true },
          { name: 'Safeguarding Children', scale_type: 'binary', requires_expiry: true },
          { name: 'Mental Capacity Act', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Mandatory Training',
        colour: '#3730A3',
        skills: [
          { name: 'Health & Safety', scale_type: 'binary', requires_expiry: true },
          { name: 'Fire Safety', scale_type: 'binary', requires_expiry: true },
          { name: 'Data Protection / GDPR', scale_type: 'binary', requires_expiry: true },
          { name: 'Equality & Diversity', scale_type: 'binary', requires_expiry: true },
        ],
      },
    ],
  },
  {
    id: 'construction',
    name: 'Construction & Trades',
    icon: '🔨',
    categories: [
      {
        name: 'Health & Safety',
        colour: '#4F46E5',
        skills: [
          { name: 'CSCS Card', scale_type: 'binary', requires_expiry: true },
          { name: 'Working at Height', scale_type: 'binary', requires_expiry: true },
          { name: 'Asbestos Awareness', scale_type: 'binary', requires_expiry: true },
          { name: 'Manual Handling', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Trade Skills',
        colour: '#3730A3',
        skills: [
          { name: 'Electrical Installation', scale_type: 'levelled', requires_expiry: true },
          { name: 'Plumbing', scale_type: 'levelled', requires_expiry: false },
          { name: 'Carpentry', scale_type: 'levelled', requires_expiry: false },
          { name: 'Scaffolding', scale_type: 'levelled', requires_expiry: true },
        ],
      },
    ],
  },
  {
    id: 'retail',
    name: 'Retail & Hospitality',
    icon: '🛒',
    categories: [
      {
        name: 'Compliance',
        colour: '#4F46E5',
        skills: [
          { name: 'Food Hygiene Level 2', scale_type: 'binary', requires_expiry: true },
          { name: 'Alcohol Licensing', scale_type: 'binary', requires_expiry: true },
          { name: 'Fire Safety', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Customer Service',
        colour: '#0E7490',
        skills: [
          { name: 'Till Operation', scale_type: 'levelled', requires_expiry: false },
          { name: 'Customer Service', scale_type: 'levelled', requires_expiry: false },
          { name: 'Conflict Resolution', scale_type: 'levelled', requires_expiry: false },
        ],
      },
    ],
  },
  {
    id: 'office',
    name: 'Office & Professional Services',
    icon: '💼',
    categories: [
      {
        name: 'Compliance',
        colour: '#4F46E5',
        skills: [
          { name: 'GDPR / Data Protection', scale_type: 'binary', requires_expiry: true },
          { name: 'Anti-Money Laundering', scale_type: 'binary', requires_expiry: true },
          { name: 'Health & Safety (Office)', scale_type: 'binary', requires_expiry: true },
        ],
      },
      {
        name: 'Professional Skills',
        colour: '#3730A3',
        skills: [
          { name: 'Project Management', scale_type: 'levelled', requires_expiry: false },
          { name: 'Excel / Spreadsheets', scale_type: 'levelled', requires_expiry: false },
          { name: 'Presentation Skills', scale_type: 'levelled', requires_expiry: false },
          { name: 'Leadership', scale_type: 'levelled', requires_expiry: false },
        ],
      },
    ],
  },
];
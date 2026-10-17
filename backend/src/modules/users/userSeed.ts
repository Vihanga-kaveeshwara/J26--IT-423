import bcrypt from 'bcryptjs';

export interface SeedUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'Admin' | 'Export Manager' | 'Logistics Coordinator' | 'Research Analyst';
  organization: string;
}

// Pre-hashed development passwords using bcrypt (cost 10)
// admin: CeylonAdmin2026!
// export manager: ExportMgr2026!
// logistics: Logistics2026!
// analyst: Analyst2026!
export const SEED_USERS: SeedUser[] = [
  {
    id: 'usr-admin-001',
    email: 'admin@ceylonintelligence.lk',
    passwordHash: bcrypt.hashSync('CeylonAdmin2026!', 10),
    name: 'Dr. Rohan Jayasinghe',
    role: 'Admin',
    organization: 'Sri Lanka Tea Board / Research Directorate',
  },
  {
    id: 'usr-expmgr-002',
    email: 'export.manager@ceylonintelligence.lk',
    passwordHash: bcrypt.hashSync('ExportMgr2026!', 10),
    name: 'Anoma Wickramasinghe',
    role: 'Export Manager',
    organization: 'Ceylon Tea Exporters Consortium',
  },
  {
    id: 'usr-logist-003',
    email: 'logistics@ceylonintelligence.lk',
    passwordHash: bcrypt.hashSync('Logistics2026!', 10),
    name: 'Kasun Bandara',
    role: 'Logistics Coordinator',
    organization: 'Colombo Maritime Freight Operations',
  },
  {
    id: 'usr-analyst-004',
    email: 'analyst@ceylonintelligence.lk',
    passwordHash: bcrypt.hashSync('Analyst2026!', 10),
    name: 'Nawodhi Perera',
    role: 'Research Analyst',
    organization: 'University Research Faculty',
  },
];

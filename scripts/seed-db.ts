/// <reference types="node" />

import bcrypt from 'bcryptjs';
import {
  connectDB,
  disconnectDB,
  User,
  SOSEvent,
  Grievance,
  SocialPost,
  GigListing,
  WorkerProfile,
  Donation,
  NGOProfile,
  EnvironmentalAlert,
  CrimePrediction,
  TownHallSession,
  ExpenditureEntry,
  BudgetAnomaly,
  RescueEvent,
  MeshNode,
  AIAuditLog,
  Counter,
} from '../packages/db/src';
import { Priority, Severity, UserRole } from '../packages/shared-types/src';

// Mongoose model exports use `mongoose.models.* || mongoose.model(...)`, which creates
// broad union types at compile-time; aliases below keep seed operations type-safe enough
// for scripting while preserving runtime behavior.
const UserModel = User as any;
const SOSEventModel = SOSEvent as any;
const GrievanceModel = Grievance as any;
const SocialPostModel = SocialPost as any;
const GigListingModel = GigListing as any;
const WorkerProfileModel = WorkerProfile as any;
const DonationModel = Donation as any;
const NGOProfileModel = NGOProfile as any;
const TownHallSessionModel = TownHallSession as any;
const ExpenditureEntryModel = ExpenditureEntry as any;
const AIAuditLogModel = AIAuditLog as any;

const JABALPUR_BOUNDS = {
  latMin: 23.15,
  latMax: 23.22,
  lngMin: 79.93,
  lngMax: 80.02,
};

const GRIEVANCE_CATEGORIES = [
  'Road Damage',
  'Water Supply',
  'Garbage Collection',
  'Street Lighting',
  'Drainage',
  'Public Health',
  'Traffic Signal',
  'Parks & Greenery',
  'Sewage',
  'Encroachment',
];

const DONATION_CATEGORIES = [
  'food',
  'clothing',
  'medical',
  'education',
  'hygiene',
  'shelter',
  'stationery',
  'elder-care',
  'baby-care',
  'assistive-devices',
];

const DEPARTMENTS = [
  'Public Works',
  'Water Department',
  'Sanitation',
  'Urban Planning',
  'Health Services',
  'Education Office',
  'Parks Department',
  'Transport Cell',
];

const TYPICAL_ALLOCATION: Record<string, number> = {
  'Public Works': 120000,
  'Water Department': 95000,
  Sanitation: 70000,
  'Urban Planning': 85000,
  'Health Services': 100000,
  'Education Office': 65000,
  'Parks Department': 55000,
  'Transport Cell': 90000,
};

const SKILL_RELATIONS: Record<string, string[]> = {
  plumbing: ['pipefitting', 'water-heater-repair', 'drain-cleaning'],
  electrical: ['wiring', 'circuit-breaker-repair', 'appliance-installation'],
  carpentry: ['furniture-assembly', 'woodworking', 'cabinet-making'],
  cooking: ['catering', 'baking', 'meal-prep'],
  driving: ['delivery', 'chauffeur', 'logistics'],
  cleaning: ['deep-cleaning', 'sanitization', 'waste-management'],
  tailoring: ['alterations', 'sewing', 'pattern-making'],
  masonry: ['bricklaying', 'concrete-pouring', 'stone-cutting'],
  painting: ['wall-painting', 'priming', 'surface-preparation'],
  gardening: ['landscaping', 'pruning', 'lawn-mowing'],
};

const SOS_TRIGGER_TYPES: Array<'hardware' | 'voice' | 'tap'> = ['hardware', 'voice', 'tap'];
const SOS_STATUS: Array<'ACTIVE' | 'RESOLVED'> = ['ACTIVE', 'RESOLVED'];
const GRIEVANCE_STATUS: Array<'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'> = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
];
const GIG_STATUS: Array<'ACTIVE' | 'PENDING_REVIEW' | 'REJECTED'> = ['ACTIVE', 'PENDING_REVIEW', 'REJECTED'];
const DONATION_STATUS: Array<'PENDING' | 'MATCHED' | 'DELIVERED'> = ['PENDING', 'MATCHED', 'DELIVERED'];
const BLOCK_REASONS = [
  'PII_EXFILTRATION_ATTEMPT',
  'UNAUTHORIZED_DATA_SCOPE',
  'PROMPT_INJECTION_PATTERN',
  'ROLE_BASED_POLICY_DENY',
  'SENSITIVE_OPERATION_BLOCKED',
  'TOOL_ACCESS_RESTRICTED',
];

const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  return new Date(rand(past, now));
}

function randomJabalpurLocation() {
  const lat = Number(rand(JABALPUR_BOUNDS.latMin, JABALPUR_BOUNDS.latMax).toFixed(6));
  const lng = Number(rand(JABALPUR_BOUNDS.lngMin, JABALPUR_BOUNDS.lngMax).toFixed(6));
  return {
    lat,
    lng,
    accuracy: randInt(5, 35),
    address: `Jabalpur Ward ${randInt(1, 70)}, Madhya Pradesh`,
    s2CellId: `s2-${randInt(1000000, 9999999)}`,
  };
}

function randomHex(length: number): string {
  const chars = 'abcdef0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[randInt(0, chars.length - 1)];
  }
  return out;
}

function mockSolanaSignature(): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 88; i += 1) {
    out += alphabet[randInt(0, alphabet.length - 1)];
  }
  return out;
}

async function clearCollections(): Promise<void> {
  await Promise.all([
    SOSEventModel.deleteMany({}),
    GrievanceModel.deleteMany({}),
    SocialPostModel.deleteMany({}),
    GigListingModel.deleteMany({}),
    WorkerProfileModel.deleteMany({}),
    NGOProfileModel.deleteMany({}),
    DonationModel.deleteMany({}),
    ExpenditureEntryModel.deleteMany({}),
    TownHallSessionModel.deleteMany({}),
    AIAuditLogModel.deleteMany({}),
    UserModel.deleteMany({ email: /@nexuscivic\.demo$/i }),
  ]);
}

async function dropBrokenGeoIndexes(): Promise<void> {
  const geoModels = [SOSEventModel, GrievanceModel, GigListingModel, WorkerProfileModel, NGOProfileModel, DonationModel];

  for (const model of geoModels) {
    const indexes = await model.collection.indexes();
    for (const index of indexes) {
      if (index.name === '_id_') {
        continue;
      }

      const has2dSphere = Object.values(index.key).some((value) => String(value).toLowerCase() === '2dsphere');
      if (!has2dSphere) {
        continue;
      }

      if (!index.name) {
        continue;
      }

      await model.collection.dropIndex(index.name).catch(() => undefined);
    }
  }
}

async function seedUsers(): Promise<Record<string, string>> {
  const passwordHash = await bcrypt.hash('demo123', 10);
  const userDocs = await UserModel.insertMany([
    {
      email: 'admin@nexuscivic.demo',
      passwordHash,
      name: 'Nexus Civic Admin',
      role: UserRole.ADMIN,
      location: randomJabalpurLocation(),
      isActive: true,
    },
    {
      email: 'officer@nexuscivic.demo',
      passwordHash,
      name: 'Municipal Officer',
      role: UserRole.OFFICER,
      location: randomJabalpurLocation(),
      isActive: true,
    },
    {
      email: 'citizen@nexuscivic.demo',
      passwordHash,
      name: 'Jabalpur Citizen',
      role: UserRole.CITIZEN,
      location: randomJabalpurLocation(),
      isActive: true,
    },
  ]);

  return {
    adminId: String(userDocs[0]._id),
    officerId: String(userDocs[1]._id),
    citizenId: String(userDocs[2]._id),
  };
}

async function seedSosEvents(userIds: Record<string, string>): Promise<void> {
  const records = Array.from({ length: 30 }, (_, index) => {
    const status = index < 5 ? SOS_STATUS[0] : SOS_STATUS[1];
    const createdAt = randomDateWithinDays(30);
    const resolvedAt = status === 'RESOLVED' ? new Date(createdAt.getTime() + randInt(20, 720) * 60000) : undefined;

    return {
      type: SOS_TRIGGER_TYPES[index % SOS_TRIGGER_TYPES.length],
      location: randomJabalpurLocation(),
      userId: pick([userIds.adminId, userIds.officerId, userIds.citizenId]),
      deviceId: `device-${randInt(1000, 9999)}`,
      severity: pick([1, 2, 3, 4, 5]),
      status,
      resolvedAt,
      resolvedBy: status === 'RESOLVED' ? userIds.officerId : undefined,
      superplaneRunId: `spr-sos-${randomHex(8)}`,
      createdAt,
      updatedAt: resolvedAt ?? createdAt,
    };
  });

  await SOSEventModel.collection.insertMany(records);
}

async function seedGrievances(userIds: Record<string, string>): Promise<void> {
  const statuses: Array<'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'> = [
    ...Array.from({ length: 24 }, () => GRIEVANCE_STATUS[0]),
    ...Array.from({ length: 16 }, () => GRIEVANCE_STATUS[1]),
    ...Array.from({ length: 24 }, () => GRIEVANCE_STATUS[2]),
    ...Array.from({ length: 16 }, () => GRIEVANCE_STATUS[3]),
  ];

  const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
  const records = [];

  for (let categoryIndex = 0; categoryIndex < GRIEVANCE_CATEGORIES.length; categoryIndex += 1) {
    for (let i = 0; i < 8; i += 1) {
      const status = statuses[categoryIndex * 8 + i];
      const createdAt = randomDateWithinDays(30);
      const priority = priorities[(categoryIndex + i) % priorities.length];
      const priorityScore =
        priority === Priority.CRITICAL
          ? randInt(86, 100)
          : priority === Priority.HIGH
            ? randInt(66, 85)
            : priority === Priority.MEDIUM
              ? randInt(36, 65)
              : randInt(10, 35);

      records.push({
        ticketId: `JBP-${String(categoryIndex * 8 + i + 1).padStart(4, '0')}`,
        title: `${GRIEVANCE_CATEGORIES[categoryIndex]} issue in Ward ${randInt(1, 70)}`,
        description: `Citizen reported ${GRIEVANCE_CATEGORIES[categoryIndex].toLowerCase()} concern requiring municipal response in Jabalpur.`,
        category: GRIEVANCE_CATEGORIES[categoryIndex],
        district: 'jabalpur',
        location: randomJabalpurLocation(),
        userId: pick([userIds.citizenId, userIds.officerId]),
        departmentId: `dept-${(categoryIndex % DEPARTMENTS.length) + 1}`,
        priority,
        priorityScore,
        status,
        statusHistory: [{ status, timestamp: createdAt, changedBy: userIds.officerId }],
        mediaUrls: [`https://demo.nexuscivic.local/grievance/${categoryIndex}-${i}.jpg`],
        superplaneRunId: `spr-grv-${randomHex(8)}`,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  await GrievanceModel.insertMany(records);
}

async function seedSocialPosts(userIds: Record<string, string>): Promise<void> {
  const records = [];

  for (let i = 0; i < 15; i += 1) {
    const createdAt = randomDateWithinDays(30);
    records.push({
      text: `Community update ${i + 1}: civic activity observed near market zone in Jabalpur.`,
      authorId: pick([userIds.citizenId, userIds.officerId]),
      location: randomJabalpurLocation(),
      category: pick(GRIEVANCE_CATEGORIES),
      sentimentScore: Number(rand(-0.4, 0.8).toFixed(2)),
      urgencyScore: randInt(10, 90),
      voteCount: randInt(0, 40),
      createdAt,
      updatedAt: createdAt,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const createdAt = randomDateWithinDays(30);
    records.push({
      text: `Fact-check request ${i + 1}: water supply disruption alert verification.`,
      authorId: userIds.citizenId,
      location: randomJabalpurLocation(),
      category: 'Water Supply',
      sentimentScore: Number(rand(-0.6, 0.4).toFixed(2)),
      urgencyScore: randInt(10, 90),
      voteCount: randInt(5, 30),
      factCheck: {
        verdict: 'TRUE',
        explanation: 'Municipal control room confirmed temporary interruption notice.',
        confidence: 0.92,
        sources: ['https://jabalpur.nic.in/notice/demo-water-supply'],
        checkedAt: createdAt,
      },
      createdAt,
      updatedAt: createdAt,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const createdAt = randomDateWithinDays(30);
    records.push({
      text: `Fact-check request ${i + 1}: claim about fake emergency donation camp.`,
      authorId: userIds.citizenId,
      location: randomJabalpurLocation(),
      category: 'Public Safety',
      sentimentScore: Number(rand(-0.8, 0.2).toFixed(2)),
      urgencyScore: randInt(10, 90),
      voteCount: randInt(5, 30),
      factCheck: {
        verdict: 'FALSE',
        explanation: 'No valid registration found for the claimed donation camp.',
        confidence: 0.88,
        sources: ['https://demo.nexuscivic.local/fact-check/fake-camp'],
        checkedAt: createdAt,
      },
      createdAt,
      updatedAt: createdAt,
    });
  }

  await SocialPostModel.insertMany(records);
}

async function seedGigListings(userIds: Record<string, string>): Promise<void> {
  const categories = ['plumbing', 'electrical', 'carpentry', 'cooking', 'driving'];
  const records = [];

  for (let i = 0; i < 10; i += 1) {
    const skill = categories[i % categories.length];
    const createdAt = randomDateWithinDays(30);
    records.push({
      title: `${skill} service needed in Jabalpur Zone ${randInt(1, 10)}`,
      description: `Verified household requirement for ${skill} assistance.`,
      requiredSkills: [skill, ...SKILL_RELATIONS[skill].slice(0, 2)],
      location: randomJabalpurLocation(),
      budget: randInt(1200, 9000),
      employerId: userIds.citizenId,
      fraudScore: randInt(5, 20),
      fraudFlags: [],
      status: GIG_STATUS[0],
      createdAt,
      updatedAt: createdAt,
    });
  }

  for (let i = 0; i < 3; i += 1) {
    const skill = categories[(i + 1) % categories.length];
    const createdAt = randomDateWithinDays(30);
    records.push({
      title: `Suspicious ${skill} listing under review`,
      description: `Automated fraud checks held this listing for moderation.`,
      requiredSkills: [skill],
      location: randomJabalpurLocation(),
      budget: randInt(3000, 11000),
      employerId: userIds.citizenId,
      fraudScore: randInt(65, 82),
      fraudFlags: ['payment-upfront', 'profile-mismatch'],
      status: GIG_STATUS[1],
      createdAt,
      updatedAt: createdAt,
    });
  }

  for (let i = 0; i < 2; i += 1) {
    const skill = categories[(i + 3) % categories.length];
    const createdAt = randomDateWithinDays(30);
    records.push({
      title: `Rejected ${skill} listing`,
      description: `Listing rejected after human review for fraud risk.`,
      requiredSkills: [skill],
      location: randomJabalpurLocation(),
      budget: randInt(5000, 15000),
      employerId: userIds.citizenId,
      fraudScore: randInt(86, 96),
      fraudFlags: ['identity-mismatch', 'fake-location'],
      status: GIG_STATUS[2],
      createdAt,
      updatedAt: createdAt,
    });
  }

  await GigListingModel.insertMany(records);
}

async function seedWorkerProfiles(userIds: Record<string, string>): Promise<void> {
  const workerNames = [
    'Ravi Tiwari',
    'Asha Verma',
    'Faizan Khan',
    'Meena Rajput',
    'Pankaj Soni',
    'Sadia Ali',
    'Deepak Patel',
    'Nisha Dubey',
  ];
  const baseSkills = Object.keys(SKILL_RELATIONS);

  const records = workerNames.map((name, index) => {
    const core = pick(baseSkills);
    const relation = SKILL_RELATIONS[core];
    const skillCount = randInt(2, 5);
    const pool = [core, ...relation, ...baseSkills.filter((skill) => skill !== core)];
    const selected = Array.from(new Set(pool)).slice(0, skillCount);
    const createdAt = randomDateWithinDays(30);

    return {
      userId: `worker-user-${index + 1}`,
      name,
      skills: selected,
      location: randomJabalpurLocation(),
      bio: `${name} is an experienced ${core} professional serving Jabalpur neighborhoods.`,
      rating: Number(rand(3.6, 4.9).toFixed(2)),
      completedGigs: randInt(12, 180),
      createdAt,
      updatedAt: createdAt,
    };
  });

  await WorkerProfileModel.insertMany(records);
}

async function seedNgos(): Promise<string[]> {
  const records = [
    {
      name: 'Narmada Relief Foundation',
      location: randomJabalpurLocation(),
      acceptedCategories: ['food', 'clothing', 'hygiene'],
      maxCapacity: 220,
      currentLoad: 85,
      rating: 4.7,
      verified: true,
      contactEmail: 'contact@narmadarelief.org',
      createdAt: randomDateWithinDays(30),
    },
    {
      name: 'Mahakoshal Community Trust',
      location: randomJabalpurLocation(),
      acceptedCategories: ['medical', 'education', 'stationery', 'assistive-devices'],
      maxCapacity: 180,
      currentLoad: 64,
      rating: 4.5,
      verified: true,
      contactEmail: 'help@mahakoshaltrust.org',
      createdAt: randomDateWithinDays(30),
    },
    {
      name: 'Jabal Seva Collective',
      location: randomJabalpurLocation(),
      acceptedCategories: ['shelter', 'baby-care', 'elder-care'],
      maxCapacity: 140,
      currentLoad: 39,
      rating: 4.4,
      verified: true,
      contactEmail: 'team@jabalseva.org',
      createdAt: randomDateWithinDays(30),
    },
    {
      name: 'Sankalp Civic Aid Society',
      location: randomJabalpurLocation(),
      acceptedCategories: ['food', 'medical', 'clothing', 'education'],
      maxCapacity: 260,
      currentLoad: 102,
      rating: 4.8,
      verified: true,
      contactEmail: 'desk@sankalpcivicaid.org',
      createdAt: randomDateWithinDays(30),
    },
  ].map((ngo) => ({ ...ngo, updatedAt: ngo.createdAt }));

  const ngoDocs = await NGOProfileModel.insertMany(records);
  return ngoDocs.map((ngo) => String(ngo._id));
}

async function seedDonations(userIds: Record<string, string>, ngoIds: string[]): Promise<void> {
  const statuses: Array<'PENDING' | 'MATCHED' | 'DELIVERED'> = [
    ...Array.from({ length: 4 }, () => DONATION_STATUS[0]),
    ...Array.from({ length: 4 }, () => DONATION_STATUS[1]),
    ...Array.from({ length: 4 }, () => DONATION_STATUS[2]),
  ];

  const ngoDocs = await NGOProfileModel.find({ _id: { $in: ngoIds } }).lean();
  const records = statuses.map((status, index) => {
    const ngo = ngoDocs[index % ngoDocs.length];
    const allowedCategory = ngo?.acceptedCategories?.[randInt(0, ngo.acceptedCategories.length - 1)] ?? pick(DONATION_CATEGORIES);
    const createdAt = randomDateWithinDays(30);

    return {
      donorId: pick([userIds.citizenId, userIds.adminId]),
      itemName: `${allowedCategory} support kit ${index + 1}`,
      category: allowedCategory,
      description: `Donation package prepared for ${allowedCategory} category beneficiaries in Jabalpur.`,
      location: randomJabalpurLocation(),
      photoUrls: [`https://demo.nexuscivic.local/donations/${index + 1}.jpg`],
      qualityScore: randInt(70, 98),
      qualityAccepted: true,
      matchedNgoId: status === 'PENDING' ? undefined : String(ngo?._id),
      status,
      createdAt,
      updatedAt: createdAt,
    };
  });

  await DonationModel.insertMany(records);
}

async function seedExpenditures(userIds: Record<string, string>): Promise<void> {
  const records = Array.from({ length: 25 }, (_, index) => {
    const department = DEPARTMENTS[index % DEPARTMENTS.length];
    const baseline = TYPICAL_ALLOCATION[department];
    const isAnomaly = index === 3 || index === 17;
    const amount = isAnomaly ? Math.round(baseline * rand(1.12, 1.28)) : Math.round(baseline * rand(0.35, 0.92));
    const createdAt = randomDateWithinDays(30);

    return {
      officerId: userIds.officerId,
      department,
      category: pick(['Operations', 'Procurement', 'Maintenance', 'Emergency']),
      amount,
      description: `${department} expenditure entry ${index + 1} for civic operations in Jabalpur.`,
      solanaSignature: mockSolanaSignature(),
      explorerUrl: `https://explorer.solana.com/tx/${mockSolanaSignature()}?cluster=devnet`,
      isMockSignature: true,
      createdAt,
      updatedAt: createdAt,
    };
  });

  await ExpenditureEntryModel.insertMany(records);
}

async function seedTownHall(userIds: Record<string, string>): Promise<void> {
  const createdAt = randomDateWithinDays(7);
  const session = {
    title: 'Community Budget Review',
    adminId: userIds.adminId,
    status: 'ACTIVE' as const,
    scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    spacetimeRoomId: `room-jbp-${randInt(1000, 9999)}`,
    participantCount: 128,
    issues: [
      { text: 'Increase ward-level streetlight maintenance fund', authorId: userIds.citizenId, voteCount: 45, status: 'OPEN' as const },
      { text: 'Prioritize drainage cleanup before monsoon', authorId: userIds.citizenId, voteCount: 39, status: 'OPEN' as const },
      { text: 'Publish monthly sanitation spending dashboard', authorId: userIds.officerId, voteCount: 27, status: 'OPEN' as const },
      { text: 'Pilot emergency health kiosk in dense settlements', authorId: userIds.officerId, voteCount: 18, status: 'OPEN' as const },
      { text: 'Expand park restoration micro-grants', authorId: userIds.citizenId, voteCount: 3, status: 'OPEN' as const },
    ],
    createdAt,
    updatedAt: createdAt,
  };

  await TownHallSessionModel.create(session);
}

async function seedAiAuditLogs(userIds: Record<string, string>): Promise<void> {
  const rolePool = [UserRole.ADMIN, UserRole.OFFICER, UserRole.CITIZEN, UserRole.NGO];
  const modulePool = ['aura-assist', 'sentinel-ai', 'ledger-civic', 'near-give'];
  const allowedActions = ['summarize_report', 'create_alert_brief', 'draft_response', 'fetch_policy'];
  const blockedActions = ['bulk_export_pii', 'override_budget_limits', 'disable_guardrails', 'elevate_role'];

  const allowed = Array.from({ length: 14 }, (_, index) => {
    const createdAt = new Date(Date.now() - randInt(5, 24 * 60) * 60000);
    return {
      userId: pick([userIds.adminId, userIds.officerId, userIds.citizenId]),
      query: `Allowed request ${index + 1}: generate civic assistance output`,
      action: pick(allowedActions),
      module: pick(modulePool),
      role: pick(rolePool),
      allowed: true,
      reason: 'Policy checks passed for requested operation scope.',
      createdAt,
      updatedAt: createdAt,
    };
  });

  const blocked = Array.from({ length: 6 }, (_, index) => {
    const createdAt = new Date(Date.now() - randInt(5, 24 * 60) * 60000);
    return {
      userId: pick([userIds.adminId, userIds.officerId, userIds.citizenId]),
      query: `Blocked request ${index + 1}: attempted restricted operation`,
      action: pick(blockedActions),
      module: pick(modulePool),
      role: pick(rolePool),
      allowed: false,
      blockReason: BLOCK_REASONS[index % BLOCK_REASONS.length],
      reason: 'Action denied due to role and policy guardrail mismatch.',
      createdAt,
      updatedAt: createdAt,
    };
  });

  await AIAuditLogModel.insertMany([...allowed, ...blocked]);
}

async function printSummary(): Promise<void> {
  const summary = {
    users: await UserModel.countDocuments({ email: /@nexuscivic\.demo$/i }),
    sosEvents: await SOSEventModel.countDocuments(),
    grievances: await GrievanceModel.countDocuments(),
    socialPosts: await SocialPostModel.countDocuments(),
    gigListings: await GigListingModel.countDocuments(),
    workerProfiles: await WorkerProfileModel.countDocuments(),
    ngoProfiles: await NGOProfileModel.countDocuments(),
    donations: await DonationModel.countDocuments(),
    expenditureEntries: await ExpenditureEntryModel.countDocuments(),
    townHallSessions: await TownHallSessionModel.countDocuments(),
    aiAuditLogs: await AIAuditLogModel.countDocuments(),
  };

  console.log('Seed completed. Collection counts:');
  console.table(summary);
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nexus_civic';

  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await connectDB(mongoUri);

  // Import and touch all models from @nexus-civic/db so collections are registered in this script.
  void [EnvironmentalAlert, CrimePrediction, BudgetAnomaly, RescueEvent, MeshNode, Counter];

  await dropBrokenGeoIndexes();
  await clearCollections();

  const userIds = await seedUsers();
  await seedSosEvents(userIds);
  await seedGrievances(userIds);
  await seedSocialPosts(userIds);
  await seedGigListings(userIds);
  await seedWorkerProfiles(userIds);
  const ngoIds = await seedNgos();
  await seedDonations(userIds, ngoIds);
  await seedExpenditures(userIds);
  await seedTownHall(userIds);
  await seedAiAuditLogs(userIds);

  await printSummary();
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await disconnectDB();
    process.exit(1);
  });

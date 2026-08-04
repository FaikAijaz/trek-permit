import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Fixed UUID so re-running this script updates the same row instead of
// creating a duplicate route each time. Must be a real RFC4122 v4 UUID --
// not an all-zeros placeholder -- since class-validator's @IsUUID() (added
// in Week 2) correctly rejects anything that isn't version/variant valid.
const PILOT_ROUTE_ID = 'e857e8f0-066b-42d3-aaf0-6b62232242ac';

async function main() {
  const route = await prisma.trekRoute.upsert({
    where: { id: PILOT_ROUTE_ID },
    update: {},
    create: {
      id: PILOT_ROUTE_ID,
      name: 'Tarsar Marsar',
      region: 'Kashmir',
      description: 'A high-altitude alpine lake trek in the Kashmir Himalayas.',
      difficulty: 'moderate',
      isOpen: true,
      requiredDocuments: ['aadhaar', 'fitness_certificate', 'photograph'],
      minLeadTimeDays: 3,
    },
  });

  const admin = await prisma.user.upsert({
    where: { mobile: '9999999999' },
    update: {},
    create: {
      mobile: '9999999999',
      fullName: 'Pilot Admin',
      role: 'admin',
    },
  });

  const officer = await prisma.user.upsert({
    where: { mobile: '9999999998' },
    update: {},
    create: {
      mobile: '9999999998',
      fullName: 'Pilot Field Officer',
      role: 'officer',
    },
  });

  console.log('Seeded:', {
    route: route.name,
    admin: admin.mobile,
    officer: officer.mobile,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

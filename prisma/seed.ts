import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create parent user
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'parent@example.com' },
    update: {},
    create: {
      email: 'parent@example.com',
      phone: '+1234567890',
      password: hashedPassword,
      role: 'PARENT',
      parentProfile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          timezone: 'America/New_York',
          language: 'en',
          enablePushNotifications: true,
        },
      },
    },
    include: {
      parentProfile: true,
    },
  });

  console.log('✅ Created user:', user.email);

  if (!user.parentProfile) {
    throw new Error('Parent profile not created');
  }

  // Create child
  const child = await prisma.child.upsert({
    where: { id: 'seed-child-1' },
    update: {},
    create: {
      id: 'seed-child-1',
      parentId: user.parentProfile.id,
      firstName: 'Emma',
      lastName: 'Doe',
      dateOfBirth: new Date('2015-05-15'),
      gender: 'female',
      homeLatitude: 40.7128,
      homeLongitude: -74.006,
      schoolLatitude: 40.7589,
      schoolLongitude: -73.9851,
      schoolGeofenceRadius: 100,
      homeGeofenceRadius: 50,
    },
  });

  console.log('✅ Created child:', child.firstName, child.lastName);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

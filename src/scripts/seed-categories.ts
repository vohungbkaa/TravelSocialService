import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const categories = [
    { code: 'food', name: 'Food & Dining', description: 'Restaurants, street food, and culinary experiences' },
    { code: 'cafe', name: 'Cafes', description: 'Coffee shops, tea houses, and dessert spots' },
    { code: 'homestay', name: 'Homestays & Lodging', description: 'Hotels, hostels, homestays, and local stays' },
    { code: 'attraction', name: 'Attractions', description: 'Famous landmarks, historical sites, and monuments' },
    { code: 'activity', name: 'Activities', description: 'Workshops, tours, outdoor adventures, and classes' },
    { code: 'local_market', name: 'Local Markets', description: 'Traditional markets, night markets, and local shops' },
    { code: 'viewpoint', name: 'Viewpoints', description: 'Scenic viewpoints, photogenic spots, and lookouts' },
    { code: 'culture', name: 'Culture & History', description: 'Museums, temples, pagodas, and heritage sites' },
    { code: 'nature', name: 'Nature & Parks', description: 'National parks, lakes, rivers, beaches, and waterfalls' },
    { code: 'nightlife', name: 'Nightlife', description: 'Bars, pubs, clubs, and late-night entertainment' },
  ];

  try {
    console.log('Seeding place categories...');
    for (const cat of categories) {
      await prisma.placeCategory.upsert({
        where: { code: cat.code },
        update: {
          name: cat.name,
          description: cat.description,
        },
        create: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
        },
      });
    }
    console.log('Seeding categories completed successfully.');
  } catch (error) {
    console.error('Failed to seed categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

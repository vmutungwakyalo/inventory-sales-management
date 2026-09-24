import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count();

  if (productCount > 0) {
    console.log(`Database already contains ${productCount} product(s). No default seed is applied.`);
    return;
  }

  console.log('No default products are seeded. Add products from the admin dashboard or create a separate test seed script when needed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const { categoryData } = require('../prisma/categoryData');

const prisma = new PrismaClient();

async function main() {
  for (const category of categoryData) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  const count = await prisma.category.count();
  console.log(`Kategori seed tamamlandi. Toplam kategori: ${count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


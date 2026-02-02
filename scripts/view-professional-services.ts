// Script para visualizar categorias e subcategorias dos profissionais com nomes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  
  const professionalCategories = await prisma.professionalCategory.findMany({
    include: {
      professional: {
        select: { name: true, email: true }
      },
      category: {
        select: { name: true, icon: true }
      }
    },
    orderBy: [
      { professional: { name: 'asc' } },
      { category: { name: 'asc' } }
    ]
  });

  for (const pc of professionalCategories) {
  }


  const professionalSubcategories = await prisma.professionalSubcategory.findMany({
    include: {
      professional: {
        select: { name: true, email: true }
      },
      subcategory: {
        select: { 
          name: true,
          category: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: [
      { professional: { name: 'asc' } },
      { subcategory: { name: 'asc' } }
    ]
  });

  let currentProfessional = '';
  for (const ps of professionalSubcategories) {
    if (currentProfessional !== ps.professional.email) {
      currentProfessional = ps.professional.email;
    }
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

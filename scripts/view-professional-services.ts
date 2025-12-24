// Script para visualizar categorias e subcategorias dos profissionais com nomes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 CATEGORIAS DOS PROFISSIONAIS:\n');
  console.log('='.repeat(80));
  
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
    console.log(`👤 ${pc.professional.name} (${pc.professional.email})`);
    console.log(`   📁 Categoria: ${pc.category.name} ${pc.category.icon}`);
    console.log('');
  }

  console.log('\n📋 SUBCATEGORIAS (SERVIÇOS) DOS PROFISSIONAIS:\n');
  console.log('='.repeat(80));

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
      console.log(`\n👤 ${ps.professional.name} (${ps.professional.email})`);
      console.log('-'.repeat(60));
    }
    console.log(`   📁 ${ps.subcategory.category.name} > ${ps.subcategory.name}`);
    console.log(`      💰 Preço: R$ ${ps.price.toFixed(2)} | Ativo: ${ps.isActive ? '✅' : '❌'}`);
  }

  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const blog = await prisma.blog.create({
      data: {
        title: 'Understanding Personal Loans: A Comprehensive Guide',
        slug: 'understanding-personal-loans',
        category: 'Finance',
        content: `Personal loans are a versatile financial tool that can help you bridge the gap between your current financial situation and your goals. Whether you are looking to consolidate debt, renovate your home, or fund a milestone event, a personal loan offers a lump sum of cash that you repay over a fixed period with interest.

### What is a Personal Loan?

A personal loan is an installment loan that provides funds for personal use. Unlike auto loans or mortgages, which are secured by the asset you are purchasing, personal loans are typically unsecured, meaning they do not require collateral. This makes them accessible to a wide range of borrowers, provided they have a good credit history.

### Key Benefits

1. **Flexibility:** You can use the funds for almost any purpose.
2. **Fixed Rates:** Most personal loans come with fixed interest rates, so your monthly payments remain the same.
3. **Quick Funding:** Approval and funding processes are often faster than other types of loans.

### How to Qualify

Lenders evaluate several factors including your credit score, income, and debt-to-income ratio. Maintaining a healthy credit profile is key to securing the best interest rates.`,
        imageUrl:
          'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1951&q=80',
        author: 'Sarah Johnson',
        isPopular: true,
        isActive: true,
        publishedAt: new Date(),
      },
    });
    console.log('Created blog:', blog.title);
  } catch (e) {
    console.error('Error creating blog:', e);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

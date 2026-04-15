import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const contact = await prisma.contactInfo.create({
    data: {
      phone: '+91 98XXX XXXXX',
      email: 'SUPPORT@SCAPITAL.COM',
      workingHours: 'MON-SAT: 9:30 AM - 6:30 PM',
      address: 'AHMEDABAD',
      mapUrl:
        'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.29793134676!2d72.53503145!3d23.03939625!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e84f67623a967%3A0xe5a305e750e33221!2sAhmedabad%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1707123456789!5m2!1sen!2sin',
      isActive: true,
    },
  });
  console.log('Created contact info:', contact);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

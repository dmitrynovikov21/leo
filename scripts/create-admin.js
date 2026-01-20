const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@admin.ru';
    const password = 'admin@admin.ru';
    const name = 'Admin';

    console.log(`Creating/Updating admin user: ${email}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            emailVerified: new Date(),
        },
        create: {
            email,
            name,
            password: hashedPassword,
            role: 'ADMIN',
            emailVerified: new Date(),
        },
    });

    console.log('Success! Admin user:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const items = await prisma.libraryItem.findMany()
        console.log('Total items:', items.length)
        console.log('Items:', JSON.stringify(items, null, 2))

        // Check types specifically
        const notes = items.filter(i => i.type === 'NOTE' || i.type === 'note')
        console.log('Notes count (by type):', notes.length)
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()

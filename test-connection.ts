// const { PrismaClient } = require('@prisma/client')

// const prisma = new PrismaClient({
//   log: ['query', 'info', 'warn', 'error'],
// })

// async function testConnection() {
//   try {
//     await prisma.$connect()
//     console.log('Connected to database')

//     // Try to create a test user
//     const testUser = await prisma.user.create({
//       data: {
//         username: 'test',
//         walletAddress: '0x123',
//         status: 'offline',
//         preferences: {
//           theme: 'light',
//           notifications: true,
//           soundEnabled: false
//         }
//       }
//     })
//     console.log('Successfully created test user:', testUser)

//     // List all users
//     const users = await prisma.user.findMany()
//     console.log('All users:', users)

//   } catch (error) {
//     console.error('Error:', error)
//   } finally {
//     await prisma.$disconnect()
//   }
// }

// testConnection()
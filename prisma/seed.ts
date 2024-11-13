// const { PrismaClient } = require('@prisma/client')

// const prisma = new PrismaClient()

// async function main() {
//   try {
//     // Create test users
//     const user1 = await prisma.user.create({
//       data: {
//         username: 'testuser1',
//         walletAddress: '0x123456789',
//         status: 'online',
//         preferences: {
//           theme: 'light',
//           notifications: true,
//           soundEnabled: true
//         }
//       }
//     })

//     const user2 = await prisma.user.create({
//       data: {
//         username: 'testuser2',
//         walletAddress: '0x987654321',
//         status: 'online',
//         preferences: {
//           theme: 'dark',
//           notifications: true,
//           soundEnabled: false
//         }
//       }
//     })

//     // Create a test PAO
//     const pao = await prisma.pAO.create({
//       data: {
//         name: 'Test PAO',
//         members: {
//           create: [
//             {
//               userId: user1.id,
//               role: 'admin'
//             },
//             {
//               userId: user2.id,
//               role: 'member'
//             }
//           ]
//         },
//         messages: {
//           create: [
//             {
//               content: 'Hello, world!',
//               type: 'text',
//               status: 'sent',
//               senderId: user1.id,
//               metadata: {}
//             },
//             {
//               content: '👋',
//               type: 'emoji',
//               status: 'sent',
//               senderId: user2.id,
//               metadata: {}
//             }
//           ]
//         }
//       }
//     })

//     console.log('Seed data created successfully:')
//     console.log({ user1, user2, pao })
//   } catch (error) {
//     console.error('Error seeding data:', error)
//     throw error
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })

// Plans for the week
// Send out our onboarding message for our info session on Friday
// Send out a compiled list of opportunities from being a dev in SuperteamNG
// Reach out to a dev to join our meeting next week Friday
// Plan out weekly activities - anchor, steel, native challenges, theoritical challenges
// const { PrismaClient } = require('@prisma/client')
// const { exit } = require('process')

// // Single PrismaClient instance
// const prisma = new PrismaClient()

// async function main() {
//   try {
//     // Basic connection test
//     await prisma.$connect()
//     console.log('Database connection successful')

//     // Check current tables
//     const result = await prisma.$executeRaw`
//       SELECT tablename FROM pg_tables WHERE schemaname = 'public';
//     `
//     console.log('Result:', result)

//     // If needed, create User table
//     await prisma.$executeRaw`
//       CREATE TABLE IF NOT EXISTS "User" (
//         "id" TEXT PRIMARY KEY,
//         "username" TEXT UNIQUE NOT NULL,
//         "walletAddress" TEXT UNIQUE NOT NULL,
//         "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//         "lastActive" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
//         "status" TEXT DEFAULT 'offline',
//         "preferences" JSONB DEFAULT '{"theme":"light","notifications":true,"soundEnabled":false}'
//       );
//     `

//     // Create PAO table
//     await prisma.$executeRaw`
//       CREATE TABLE IF NOT EXISTS "PAO" (
//         "id" TEXT PRIMARY KEY,
//         "name" TEXT NOT NULL,
//         "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
//       );
//     `

//     console.log('Tables created successfully')

//   } catch (error) {
//     console.error('Database error:', error)
//   } finally {
//     await prisma.$disconnect()
//     exit(0)
//   }
// }

// // Execute
// main().catch(console.error)
// app/api/paos/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { name, creatorId } = await req.json();
    
    const pao = await prisma.pao.create({
      data: {
        name,
        members: {
          create: {
            userId: creatorId,
            role: 'admin'
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return NextResponse.json(pao);
  } catch (error) {
    console.error('Error creating PAO:', error);
    return NextResponse.json(
      { error: 'Failed to create PAO' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  try {
    if (userId) {
      const paos = await prisma.pao.findMany({
        where: {
          members: {
            some: {
              userId
            }
          }
        },
        include: {
          members: {
            include: {
              user: true
            }
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      return NextResponse.json(paos);
    }

    return NextResponse.json(
      { error: 'Missing userId parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching PAOs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PAOs' },
      { status: 500 }
    );
  }
}
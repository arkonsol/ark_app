// app/api/paos/[id]/members/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, role = 'member' } = await req.json();
    
    const member = await prisma.pAOMember.create({
      data: {
        paoId: params.id,
        userId,
        role
      },
      include: {
        user: true
      }
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const members = await prisma.pAOMember.findMany({
      where: { paoId: params.id },
      include: {
        user: true
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
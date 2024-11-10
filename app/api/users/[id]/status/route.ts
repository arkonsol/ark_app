import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json();
    
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { status }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
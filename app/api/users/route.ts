// app/api/users/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, walletAddress } = await req.json();
    
    const user = await prisma.user.create({
      data: {
        username,
        walletAddress,
        status: 'online'
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get('walletAddress');
  const username = searchParams.get('username');

  try {
    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress }
      });
      return NextResponse.json(user);
    }

    if (username) {
      const user = await prisma.user.findUnique({
        where: { username }
      });
      return NextResponse.json(user);
    }

    return NextResponse.json(
      { error: 'Missing query parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
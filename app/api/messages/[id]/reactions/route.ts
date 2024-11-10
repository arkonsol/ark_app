import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { emoji, username } = await req.json();
    
    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: {
        reactions: true
      }
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Update reactions in metadata
    const reactions = message.metadata?.reactions || [];
    const existingReaction = reactions.find(r => r.emoji === emoji);

    if (existingReaction) {
      if (existingReaction.users.includes(username)) {
        existingReaction.users = existingReaction.users.filter(u => u !== username);
      } else {
        existingReaction.users.push(username);
      }
    } else {
      reactions.push({ emoji, users: [username] });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: params.id },
      data: {
        metadata: {
          ...message.metadata,
          reactions: reactions.filter(r => r.users.length > 0)
        }
      },
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true
          }
        }
      }
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}
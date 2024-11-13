// app/api/messages/route.ts
import { prisma } from '@/lib/prisma';
import { pusher } from '@/lib/pusher';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { type, payload, paoId } = await req.json();

    if (type === 'message') {
      const message = await prisma.message.create({
        data: {
          content: payload.content,
          type: payload.type,
          status: 'sent',
          paoId: paoId,
          senderId: payload.sender.id,
          replyToId: payload.replyTo?.id,
          metadata: payload.metadata || {}
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

      await pusher.trigger(`pao-${paoId}`, 'message', {
        type: 'message',
        payload: message,
        paoId
      });

      return NextResponse.json(message);
    }

    return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paoId = searchParams.get('paoId');
  const limit = parseInt(searchParams.get('limit') || '50');
  const cursor = searchParams.get('cursor');

  if (!paoId) {
    return NextResponse.json(
      { error: 'paoId is required' },
      { status: 400 }
    );
  }

  try {
    const messages = await prisma.message.findMany({
      where: { paoId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true,
        replyTo: {
          include: {
            sender: true
          }
        }
      }
    });

    return NextResponse.json({
      messages,
      nextCursor: messages.length === limit ? messages[messages.length - 1].id : null
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
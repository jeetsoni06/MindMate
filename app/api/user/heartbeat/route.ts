import { NextResponse } from 'next/server';
import { recordHeartbeat } from '@/lib/adminStore';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Valid userId required' }, { status: 400 });
    }

    const result = recordHeartbeat(userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Heartbeat error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { moderationState } from '@/lib/adminStore';
import crypto from 'crypto';

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { username, pin } = await request.json();

    const cleanUser = (username || '').trim();
    const cleanPin = (pin || '').trim();

    if (!cleanUser || !cleanPin) {
      return NextResponse.json({ success: false, error: 'Vault Name and PIN are required.' }, { status: 400 });
    }

    // Lookup user by username
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('id, username, hashed_pin')
      .ilike('username', cleanUser)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Invalid Vault Name or PIN.' }, { status: 401 });
    }

    // Check if user is blocked
    if (moderationState.blockedUsers.has(user.id)) {
      return NextResponse.json({ 
        success: false, 
        blocked: true, 
        error: 'This account has been suspended by an administrator.' 
      }, { status: 403 });
    }

    const hashedInputPin = sha256(cleanPin);

    // Check against override or original database hash
    const overrideHash = moderationState.userPinOverrides.get(user.id) || moderationState.userPinOverrides.get(user.username.toLowerCase());
    const validHash = overrideHash || user.hashed_pin;

    if (hashedInputPin !== validHash) {
      return NextResponse.json({ success: false, error: 'Invalid Vault Name or PIN.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (err) {
    console.error('Verify vault error:', err);
    return NextResponse.json({ success: false, error: 'Authentication service error' }, { status: 500 });
  }
}

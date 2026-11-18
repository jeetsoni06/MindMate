import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin, moderationState, savePersistedState } from '@/lib/adminStore';
import crypto from 'crypto';

function sha256(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// GET: Retrieve security question for a given username
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = (searchParams.get('username') || '').trim();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Vault Name is required.' }, { status: 400 });
    }

    const { data: user, error } = await supabase
      .from('auth_users')
      .select('id, username, security_question')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ success: false, error: 'No Sanctuary Vault found with this name.' }, { status: 404 });
    }

    if (!user.security_question || user.security_question.trim() === '') {
      return NextResponse.json({ 
        success: false, 
        error: 'No recovery question was set for this vault.' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      question: user.security_question
    });
  } catch (err) {
    console.error('GET reset-pin error:', err);
    return NextResponse.json({ success: false, error: 'Server error retrieving question.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, answer, newPin } = body;

    const cleanUser = (username || '').trim();
    const cleanAnswer = (answer || '').trim();
    const cleanPin = (newPin || '').trim();

    if (!cleanUser || !cleanAnswer || !cleanPin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Vault Name, recovery answer, and new 6-digit PIN are required.' 
      }, { status: 400 });
    }

    if (cleanPin.length !== 6 || isNaN(Number(cleanPin))) {
      return NextResponse.json({ 
        success: false, 
        error: 'New PIN must be exactly 6 digits.' 
      }, { status: 400 });
    }

    // Lookup user in auth_users
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('id, username, hashed_answer')
      .ilike('username', cleanUser)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Sanctuary Vault found with this name.' 
      }, { status: 404 });
    }

    // Verify recovery answer hash
    const inputHash = sha256(cleanAnswer);
    const inputHashLower = sha256(cleanAnswer.toLowerCase());
    const storedHash = user.hashed_answer;

    if (inputHash !== storedHash && inputHashLower !== storedHash) {
      return NextResponse.json({ 
        success: false, 
        error: 'Incorrect recovery answer. Please check and try again.' 
      }, { status: 400 });
    }

    // Compute new PIN hash
    const newHashedPin = sha256(cleanPin);

    // Save in userPinOverrides to guarantee immediate and permanent enforcement
    moderationState.userPinOverrides.set(user.id, newHashedPin);
    moderationState.userPinOverrides.set(user.username.toLowerCase(), newHashedPin);
    savePersistedState();

    // Also attempt update in Supabase
    try {
      await supabaseAdmin
        .from('auth_users')
        .update({ hashed_pin: newHashedPin })
        .eq('id', user.id);
    } catch (dbErr) {
      console.warn('Supabase auth_users pin update notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Sanctuary PIN has been reset successfully!',
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (err) {
    console.error('Reset PIN error:', err);
    return NextResponse.json({ success: false, error: 'Server error processing PIN reset.' }, { status: 500 });
  }
}

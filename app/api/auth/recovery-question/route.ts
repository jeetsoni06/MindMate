import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.trim();

    if (!username) {
      return NextResponse.json({ success: false, error: 'Vault Name is required' }, { status: 400 });
    }

    // Query auth_users case-insensitively
    const { data, error } = await supabase
      .from('auth_users')
      .select('id, username, security_question')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching recovery question:', error);
      return NextResponse.json({ success: false, error: 'Failed to look up Vault Name' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'No Sanctuary Vault found with this name.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      username: data.username,
      securityQuestion: data.security_question || 'What is your secret recovery answer?'
    });

  } catch (err) {
    console.error('Recovery question API error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

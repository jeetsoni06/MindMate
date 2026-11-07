import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('community_stories')
      .select('*')
      .eq('is_vetted', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Supabase community_stories error:", error.message);
      return NextResponse.json({ stories: [] });
    }

    const formattedStories = (data || []).map((s) => ({
      id: s.id,
      authorName: s.author_name || 'ANONYMOUS USER',
      authorIcon: s.author_icon || 'sparkles',
      timeAgo: s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
      title: s.title,
      content: s.content,
      category: s.category || 'general'
    }));

    return NextResponse.json({ stories: formattedStories });

  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ stories: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('community_stories')
      .insert([
        {
          title,
          content,
          is_vetted: true,
          author_name: 'ANONYMOUS USER',
          author_icon: 'sparkles',
          category: 'general'
        }
      ])
      .select();

    if (error) {
      console.error("Error inserting into community_stories:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Story submitted', data }, { status: 201 });

  } catch (error) {
    console.error("POST API error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

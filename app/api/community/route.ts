import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { moderationState } from '@/lib/adminStore';

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

    const { approvedIds, deletedIds, edits } = moderationState;

    const formattedStories = (data || [])
      .filter((s) => {
        // Exclude stories marked deleted by admin
        if (deletedIds.has(s.id)) return false;

        // Exclude stories that are pending review unless approved by admin
        if (s.category === 'pending_review' && !approvedIds.has(s.id)) {
          return false;
        }

        return true;
      })
      .map((s) => {
        // Apply any admin edits
        const edit = edits.get(s.id);
        const finalTitle = edit?.title ?? s.title;
        const finalContent = edit?.content ?? s.content;
        const finalCategory = edit?.category ?? (s.category === 'pending_review' ? 'general' : (s.category || 'general'));

        return {
          id: s.id,
          authorName: s.author_name || 'ANONYMOUS USER',
          authorIcon: s.author_icon || 'sparkles',
          timeAgo: s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
          title: finalTitle,
          content: finalContent,
          category: finalCategory
        };
      });

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

    // New user submissions are queued for admin review before appearing on the universal community page
    const { data, error } = await supabase
      .from('community_stories')
      .insert([
        {
          title: title.trim(),
          content: content.trim(),
          is_vetted: true,
          author_name: 'ANONYMOUS USER',
          author_icon: 'sparkles',
          category: 'pending_review'
        }
      ])
      .select();

    if (error) {
      console.error("Error inserting into community_stories:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'MindMate team will check it before uploading in 24 hours. Thank you for sharing your story.',
      data
    }, { status: 201 });

  } catch (error) {
    console.error("POST API error:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

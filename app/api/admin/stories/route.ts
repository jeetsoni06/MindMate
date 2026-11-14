import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin, moderationState, savePersistedState } from '@/lib/adminStore';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('community_stories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching stories for admin:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { approvedIds, deletedIds, edits } = moderationState;

    const allStories = (data || [])
      .filter((s) => !deletedIds.has(s.id))
      .map((s) => {
        const edit = edits.get(s.id);
        const title = edit?.title ?? s.title;
        const content = edit?.content ?? s.content;
        const category = edit?.category ?? (s.category || 'general');

        const isApproved = s.category !== 'pending_review' || approvedIds.has(s.id);

        return {
          id: s.id,
          title,
          content,
          authorName: s.author_name || 'ANONYMOUS USER',
          authorIcon: s.author_icon || 'sparkles',
          category,
          originalCategory: s.category,
          isApproved,
          createdAt: s.created_at,
          timeAgo: s.created_at ? new Date(s.created_at).toLocaleString() : ''
        };
      });

    const pending = allStories.filter((s) => !s.isApproved);
    const approved = allStories.filter((s) => s.isApproved);

    return NextResponse.json({
      pending,
      approved,
      counts: {
        pending: pending.length,
        approved: approved.length,
        total: allStories.length
      }
    });

  } catch (err) {
    console.error("Admin stories GET error:", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, title, content, category } = body;

    if (!id) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    if (action === 'approve') {
      moderationState.approvedIds.add(id);

      const currentEdit = moderationState.edits.get(id) || {};
      if (title !== undefined) currentEdit.title = title.trim();
      if (content !== undefined) currentEdit.content = content.trim();
      currentEdit.category = category ? category.trim() : (currentEdit.category === 'pending_review' || !currentEdit.category ? 'general' : currentEdit.category);
      moderationState.edits.set(id, currentEdit);

      savePersistedState();

      try {
        await supabaseAdmin
          .from('community_stories')
          .update({
            category: currentEdit.category,
            title: currentEdit.title || undefined,
            content: currentEdit.content || undefined,
            is_vetted: true
          })
          .eq('id', id);
      } catch (dbErr) {
        console.warn("Supabase admin update notice:", dbErr);
      }

      return NextResponse.json({ success: true, message: 'Story approved successfully' });
    }

    if (action === 'edit') {
      const currentEdit = moderationState.edits.get(id) || {};
      if (title !== undefined) currentEdit.title = title.trim();
      if (content !== undefined) currentEdit.content = content.trim();
      if (category !== undefined) currentEdit.category = category.trim();
      moderationState.edits.set(id, currentEdit);

      savePersistedState();

      try {
        await supabaseAdmin
          .from('community_stories')
          .update({
            title: currentEdit.title,
            content: currentEdit.content,
            category: currentEdit.category
          })
          .eq('id', id);
      } catch (dbErr) {
        console.warn("Supabase admin edit notice:", dbErr);
      }

      return NextResponse.json({ success: true, message: 'Story updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error("Admin stories PATCH error:", err);
    return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    moderationState.deletedIds.add(id);
    moderationState.approvedIds.delete(id);
    moderationState.edits.delete(id);

    savePersistedState();

    try {
      await supabaseAdmin
        .from('community_stories')
        .delete()
        .eq('id', id);
    } catch (dbErr) {
      console.warn("Supabase admin delete notice:", dbErr);
    }

    return NextResponse.json({ success: true, message: 'Story deleted successfully' });

  } catch (err) {
    console.error("Admin stories DELETE error:", err);
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
  }
}

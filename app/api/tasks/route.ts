import { NextResponse } from 'next/server';
import { getTasks, addTask, toggleTaskCompleted } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    console.log("Fetching tasks route hit...");
    const tasks = await getTasks();
    console.log("Tasks fetched successfully:", tasks);
    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error("Critical error in /api/tasks GET:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, subtitle, icon_name, userId } = await req.json();
    if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const newTask = await addTask({ title, subtitle, icon_name }, userId);
    return NextResponse.json({ task: newTask });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { taskId, currentStatus, userId } = await req.json();
    if (!taskId) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    
    const updatedTask = await toggleTaskCompleted(taskId, currentStatus, userId);
    return NextResponse.json({ task: updatedTask });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getTasks, addTask, toggleTaskCompleted } from '../../../lib/supabase';

export async function GET(req: Request) {
  try {
    // Note: To dynamically extract userId we would use URL search params or Auth headers.
    // Our Supabase helper uses the master demo user universally for now.
    const tasks = await getTasks();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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

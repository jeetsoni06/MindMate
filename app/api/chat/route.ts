import { NextResponse } from 'next/server';
import { getChatContext, saveChatMessage, getChatHistory } from '../../../lib/supabase';
import { CohereClient } from 'cohere-ai';

// The "Mini-Brain" smart template generator
function generateSmartFallback(message: string, context: string, lastAiMessage: string): string {
  const lowerMsg = message.toLowerCase();
  const lowerCtx = context.toLowerCase();

  // 0. Anti-Repetition Logic Apology
  if (lowerMsg.includes('repeat') || lowerMsg.includes('repeating')) {
    return "I apologize, I'm still learning. Let's start over—tell me more about your friend.";
  }

  // Cross-connection override
  if ((lowerCtx.includes('deadline') || lowerCtx.includes('hackathon')) && (lowerMsg.includes('birthday') || lowerMsg.includes('celebrate'))) {
    return "I know you've been stressed with the deadline, but let's put that aside—Happy Birthday! How are you feeling right now?";
  }

  // The 'Smart Shuffle' Array of generic fallbacks
  const GENERIC_RESPONSES = [
    "I hear what you're saying. Tell me more.",
    "That makes sense. I'm here for you.",
    "I'm listening. How are you processing that?",
    "That sounds important. Want to explore that further?",
    "I'm here to support you. What's on your mind?",
    "Thank you for sharing that with me. How are you feeling?",
    "I've got your back. What do you need right now?",
    "It's okay to feel whatever you're feeling.",
    "I'm right here with you. Take your time.",
    "I appreciate you telling me this. How can I help?"
  ];

  // 1. Acknowledge the Emotion
  let ack = "";
  if (lowerMsg.includes('happy') || lowerMsg.includes('excited') || lowerMsg.includes('glad')) {
    ack = "It sounds like you're feeling really joyful right now!";
  } else if (lowerMsg.includes('angry') || lowerMsg.includes('mad')) {
    ack = "It's completely valid to feel angry about that.";
  } else if (lowerMsg.includes('tired') || lowerMsg.includes('exhausted')) {
    ack = "You must be feeling incredibly exhausted.";
  } else if (lowerMsg.includes('sad') || lowerMsg.includes('down')) {
    ack = "I'm so sorry you're feeling down.";
  }

  // 2. Connect to History
  let ref = "";
  if (lowerCtx.includes('deadline') || lowerCtx.includes('hackathon') || lowerCtx.includes('stress')) {
    ref = "I know you've been super stressed lately.";
  } else if (lowerCtx.includes('friend') || lowerCtx.includes('relationship')) {
    ref = "I remember things have been complicated with your friend.";
  }

  // 3. Supportive Question
  let question = "";
  if (lowerMsg.includes('happy') || lowerMsg.includes('excited')) {
    question = "What was the highlight of your day?";
  } else if (lowerMsg.includes('angry')) {
    question = "Do you want to talk about how you might want to handle this?";
  }

  // If we found specific triggers, merge them
  if (ack || ref || question) {
    if (!ack) ack = "I hear you.";
    if (!question) question = "How can I support you best right now?";
    return `${ack} ${ref} ${question}`.replace(/\s+/g, ' ').trim();
  }

  // If no triggers hit, use Smart Shuffle ensuring NO immediate repetition
  let randomChoice = "";
  let attempts = 0;
  do {
    randomChoice = GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)];
    attempts++;
  } while (randomChoice === lastAiMessage && attempts < 15);

  return randomChoice;
}

export async function POST(req: Request) {
  try {
    // 1. Receiver: Take the message, context history, and secure user token
    const { message, history, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 2. Grab the live context scoped securely to the Vault 
    const recentContext = await getChatContext(userId);

    // 3. Save User Msg: INSERT it into chat_messages securely tracked
    try {
      await saveChatMessage(message, 'user', userId);
    } catch (insertUserError) {
      console.error("Error inserting user message:", insertUserError);
      // We explicitly bypass the return 500 here so the AI logic continues even if tracking fails!
    }

    // 4. AI Logic: Try to call the Anthropic API
    let aiResponseText = "";

    try {
      const cohere = new CohereClient({
        token: process.env.COHERE_API_KEY || "",
      });

      if (!process.env.COHERE_API_KEY) {
        throw new Error("Missing Cohere API Key");
      }

      const wordCount = message.trim().split(/\s+/).length;
      let contextAddition = "";
      if (wordCount > 5 && recentContext) {
        contextAddition = ` The user recently journaled: ${recentContext}`;
      }
      
      const systemPrompt = `You are MindMate. Be concise. If the user just says hi, just say hi back and ask how they are. Do not bring up past issues unless the user mentions them first. Never exceed 2 sentences for a greeting.${contextAddition}`;

      // Format previous history for Cohere's structure
      const previousMessages = (history || []).map((msg: any) => ({
        role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: msg.content
      }));

      const response = await cohere.chat({
        message: message,
        chatHistory: previousMessages,
        preamble: systemPrompt
      });

      if (response.text) {
        aiResponseText = response.text;
      } else {
        throw new Error("Unexpected Cohere response format");
      }
    } catch (err: any) {
      console.error("Cohere API Error:", err);

      // Repetition Check: Pull the last 2 messages from the DB
      const dbHistory = await getChatHistory(userId);

      // Because we just inserted the user's message above, the DB will have it. 
      // The assistant's last message should be in this history array too.
      const lastUserMsg = dbHistory.find((m: any) => m.role === 'user' && m.content.trim().toLowerCase() !== message.trim().toLowerCase());
      const lastAiMsg = dbHistory.find((m: any) => m.role === 'assistant');
      const lastAiContent = lastAiMsg ? lastAiMsg.content : "";

      // We determine repetition if the literal incoming message matches the user's previously recorded message (excluding the one we just inserted).
      const dbUserMessages = dbHistory.filter((m: any) => m.role === 'user');
      const isRepetition = dbUserMessages.length > 1 && dbUserMessages[0].content.trim().toLowerCase() === dbUserMessages[1].content.trim().toLowerCase();

      // Repetition check priority
      if (isRepetition) {
        aiResponseText = "I heard you, and I'm still processing that. It sounds really tough...";
      } else {
        // Execute the 'Mini-Brain' templating logic with anti-loop AI history
        aiResponseText = generateSmartFallback(message, recentContext, lastAiContent);
      }
    }

    // 5. Save AI Msg: INSERT the helper's fallback/generated response into DB
    try {
      await saveChatMessage(aiResponseText, 'assistant', userId);
    } catch (insertAiError) {
      console.error("Error inserting AI message into database:", insertAiError);
    }

    // 6. Return: Send the response back to the frontend as JSON: { "reply": "..." }
    return NextResponse.json({ reply: aiResponseText });
  } catch (error) {
    console.error("Chat API Unexpected Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

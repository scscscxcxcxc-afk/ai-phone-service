const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
function getSystemPrompt() {
  return `You are a friendly, professional receptionist for ${process.env.BUSINESS_NAME}, a ${process.env.BUSINESS_TYPE}.

Your job is to:
1. Greet callers warmly and find out what they need
2. Book appointments (get their name, address, and best time to visit)
3. Take messages if they just want to leave information
4. Handle urgent/emergency situations by letting them know a technician will call back ASAP

Rules:
- Keep responses SHORT — this is a phone call, not a chat. 1-3 sentences max per response.
- Sound natural and human, not robotic
- Always get the caller's name early in the conversation
- For appointments, always collect: full name, address, phone number, and preferred time
- For emergencies (no water, no AC in extreme heat, flooding), express urgency and promise immediate callback
- When you have all needed information, wrap up the call politely
- Never make up prices or promises you can't keep

When you're ready to end the call (you have all the info), include this exact phrase at the end of your response:
[CALL_COMPLETE]

When an appointment is successfully booked, include:
[APPOINTMENT_BOOKED]

Format any collected caller info like this (at the end of your response, after CALL_COMPLETE):
[CALLER_NAME: John Smith]
[CALLER_DETAILS: 123 Main St, Springfield | Best time: Tuesday afternoon | Phone: 555-1234 | Issue: Leaky pipe under kitchen sink]`;
}

// ─── HANDLE CONVERSATION ─────────────────────────────────────────────────────
async function handleConversation(history, latestMessage) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: getSystemPrompt(),
    messages: history,
  });

  const reply = response.content[0].text;

  // Parse flags from the response
  const isDone = reply.includes("[CALL_COMPLETE]");
  const appointmentBooked = reply.includes("[APPOINTMENT_BOOKED]");

  // Extract caller info if present
  let callerName = null;
  let callerDetails = null;

  const nameMatch = reply.match(/\[CALLER_NAME:\s*(.+?)\]/);
  const detailsMatch = reply.match(/\[CALLER_DETAILS:\s*(.+?)\]/);

  if (nameMatch) callerName = nameMatch[1].trim();
  if (detailsMatch) callerDetails = detailsMatch[1].trim();

  // Clean the reply — remove all the bracketed tags before speaking
  const cleanReply = reply
    .replace(/\[CALL_COMPLETE\]/g, "")
    .replace(/\[APPOINTMENT_BOOKED\]/g, "")
    .replace(/\[CALLER_NAME:.*?\]/g, "")
    .replace(/\[CALLER_DETAILS:.*?\]/g, "")
    .trim();

  return {
    reply: cleanReply,
    isDone,
    appointmentBooked,
    callerName,
    callerDetails,
  };
}

// ─── GET SUMMARY ─────────────────────────────────────────────────────────────
async function getSummary(session) {
  if (!session.history || session.history.length === 0) {
    return "No conversation recorded.";
  }

  const conversationText = session.history
    .map((m) => `${m.role === "user" ? "Caller" : "AI"}: ${m.content}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Summarize this phone call in 3-5 bullet points. Be concise and include the most important details (caller's issue, any info collected, next steps needed):\n\n${conversationText}`,
      },
    ],
  });

  return response.content[0].text;
}

module.exports = { handleConversation, getSummary };

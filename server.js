require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const { handleConversation, getSummary } = require("./conversation");
const { sendEmailNotification, sendSMSNotification } = require("./notify");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const VoiceResponse = twilio.twiml.VoiceResponse;

// In-memory session store (one session per call)
const sessions = {};

// ─── INCOMING CALL ────────────────────────────────────────────────────────────
app.post("/incoming-call", (req, res) => {
  const callSid = req.body.CallSid;
  const callerNumber = req.body.From;

  // Start a new session for this call
  sessions[callSid] = {
    callerNumber,
    history: [],
    startTime: new Date(),
  };

  const twiml = new VoiceResponse();

  // Greet the caller
  const greeting = `Thank you for calling ${process.env.BUSINESS_NAME}. We're available 24 hours a day, 7 days a week. How can I help you today?`;

  twiml.say({ voice: "Polly.Joanna" }, greeting);

  // Listen for their response
  twiml.gather({
    input: "speech",
    action: "/handle-speech",
    method: "POST",
    speechTimeout: "auto",
    language: "en-US",
  });

  res.type("text/xml");
  res.send(twiml.toString());
});

// ─── HANDLE SPEECH ────────────────────────────────────────────────────────────
app.post("/handle-speech", async (req, res) => {
  const callSid = req.body.CallSid;
  const userSpeech = req.body.SpeechResult || "";
  const session = sessions[callSid];

  if (!session) {
    // Session expired or unknown call — hang up gracefully
    const twiml = new VoiceResponse();
    twiml.say("I'm sorry, something went wrong. Please call back. Goodbye.");
    twiml.hangup();
    res.type("text/xml");
    return res.send(twiml.toString());
  }

  // Add user message to history
  session.history.push({ role: "user", content: userSpeech });

  try {
    // Get AI response
    const { reply, isDone, appointmentBooked, callerName, callerDetails } =
      await handleConversation(session.history, userSpeech);

    // Add AI response to history
    session.history.push({ role: "assistant", content: reply });

    const twiml = new VoiceResponse();

    if (isDone) {
      // Call is wrapping up — say goodbye and notify owner
      twiml.say({ voice: "Polly.Joanna" }, reply);
      twiml.hangup();

      // Save any gathered info
      session.callerName = callerName;
      session.callerDetails = callerDetails;
      session.appointmentBooked = appointmentBooked;
      session.endTime = new Date();

      // Send notifications to business owner
      await notifyOwner(session);

      // Clean up session
      delete sessions[callSid];
    } else {
      // Keep the conversation going
      twiml.say({ voice: "Polly.Joanna" }, reply);
      twiml.gather({
        input: "speech",
        action: "/handle-speech",
        method: "POST",
        speechTimeout: "auto",
        language: "en-US",
      });
    }

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("Error handling speech:", err);
    const twiml = new VoiceResponse();
    twiml.say(
      "I'm sorry, I had a technical issue. Please hold while I connect you, or call back shortly."
    );
    twiml.hangup();
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

// ─── CALL STATUS CALLBACK ─────────────────────────────────────────────────────
// Called by Twilio when a call ends unexpectedly (caller hangs up mid-conversation)
app.post("/call-status", async (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  if (
    (callStatus === "completed" || callStatus === "no-answer") &&
    sessions[callSid]
  ) {
    const session = sessions[callSid];
    session.endTime = new Date();
    session.droppedCall = true;

    // Still notify owner even if call dropped
    if (session.history.length > 0) {
      await notifyOwner(session);
    }

    delete sessions[callSid];
  }

  res.sendStatus(200);
});

// ─── NOTIFY OWNER ─────────────────────────────────────────────────────────────
async function notifyOwner(session) {
  try {
    const summary = await getSummary(session);

    const subject = session.appointmentBooked
      ? `📅 New Appointment Booked — ${process.env.BUSINESS_NAME}`
      : `📞 New Call Summary — ${process.env.BUSINESS_NAME}`;

    // Send email
    await sendEmailNotification({
      to: process.env.OWNER_EMAIL,
      subject,
      callerNumber: session.callerNumber,
      callerName: session.callerName || "Unknown",
      summary,
      appointmentBooked: session.appointmentBooked,
      callerDetails: session.callerDetails,
      callTime: session.startTime,
    });

    // Send SMS
    await sendSMSNotification({
      to: process.env.OWNER_PHONE,
      callerNumber: session.callerNumber,
      summary,
      appointmentBooked: session.appointmentBooked,
    });

    console.log(`✅ Owner notified for call from ${session.callerNumber}`);
  } catch (err) {
    console.error("Failed to notify owner:", err);
  }
}

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 AI Phone Service running on port ${PORT}`);
  console.log(`📞 Business: ${process.env.BUSINESS_NAME}`);
  console.log(`📧 Notifying: ${process.env.OWNER_EMAIL}`);
  console.log(`📱 SMS to: ${process.env.OWNER_PHONE}\n`);
});

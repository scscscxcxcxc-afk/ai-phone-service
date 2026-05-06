const { Resend } = require("resend");
const twilio = require("twilio");

const resend = new Resend(process.env.RESEND_API_KEY);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─── SEND EMAIL ───────────────────────────────────────────────────────────────
async function sendEmailNotification({
  to,
  subject,
  callerNumber,
  callerName,
  summary,
  appointmentBooked,
  callerDetails,
  callTime,
}) {
  const formattedTime = callTime
    ? callTime.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown time";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${appointmentBooked ? "📅 New Appointment Booked" : "📞 New Call Summary"}</h2>
        <p style="margin: 5px 0 0; opacity: 0.8;">${process.env.BUSINESS_NAME}</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555; width: 140px;">📅 Call Time:</td>
            <td style="padding: 8px 0;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">📞 Caller Number:</td>
            <td style="padding: 8px 0;">${callerNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">👤 Caller Name:</td>
            <td style="padding: 8px 0;">${callerName || "Not provided"}</td>
          </tr>
          ${
            callerDetails
              ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555; vertical-align: top;">📋 Details:</td>
            <td style="padding: 8px 0;">${callerDetails}</td>
          </tr>`
              : ""
          }
        </table>
      </div>

      <div style="background: white; padding: 20px; border: 1px solid #ddd; border-top: none;">
        <h3 style="margin-top: 0; color: #333;">Call Summary</h3>
        <div style="background: #f0f4ff; padding: 15px; border-radius: 6px; white-space: pre-line; color: #333;">
${summary}
        </div>
      </div>

      ${
        appointmentBooked
          ? `
      <div style="background: #e8f5e9; padding: 15px; border: 1px solid #c8e6c9; border-top: none; border-radius: 0 0 8px 8px;">
        <strong style="color: #2e7d32;">✅ Appointment was successfully booked during this call.</strong>
      </div>`
          : `
      <div style="background: #fff3e0; padding: 15px; border: 1px solid #ffe0b2; border-top: none; border-radius: 0 0 8px 8px;">
        <strong style="color: #e65100;">⚡ Action may be required — no appointment was booked.</strong>
      </div>`
      }
    </div>
  `;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to,
    subject,
    html: htmlBody,
  });
}

// ─── SEND SMS ─────────────────────────────────────────────────────────────────
async function sendSMSNotification({
  to,
  callerNumber,
  summary,
  appointmentBooked,
}) {
  const firstLine = summary.split("\n")[0].replace(/^[-•*]\s*/, "");
  const status = appointmentBooked ? "✅ Appt booked" : "⚡ Needs follow-up";

  const message =
    `📞 New call from ${callerNumber}\n` +
    `${status}\n\n` +
    `${firstLine}\n\n` +
    `Check email for full details.`;

  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}

module.exports = { sendEmailNotification, sendSMSNotification };

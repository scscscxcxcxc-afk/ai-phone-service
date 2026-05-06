# AI Phone Service Platform

A 24/7 AI-powered phone answering service for service businesses (plumbers, AC, electricians, etc.)

---

## What This Does
- Answers calls 24/7 with a natural AI voice
- Books appointments automatically
- Takes messages from callers
- Sends both **email + SMS** to the business owner after every call

---

## Stack
| Service | Purpose | Cost |
|---------|---------|------|
| Twilio | Phone calls (inbound/outbound) | ~$1/mo per number + per-minute fees |
| Claude API | AI brain (conversation logic) | Pay per use (~pennies per call) |
| ElevenLabs | Realistic AI voice | Free tier or ~$5/mo |
| SendGrid | Email notifications | Free tier (100 emails/day) |
| Twilio SMS | Text notifications | ~$0.01 per SMS |

---

## Files
```
ai-phone-service/
├── README.md              ← You are here
├── .env.example           ← Copy to .env and fill in your keys
├── server.js              ← Main server (handles incoming calls)
├── conversation.js        ← AI conversation logic
├── notify.js              ← Email + SMS notifications
├── package.json           ← Dependencies
└── deploy.md              ← How to go live
```

---

## Setup (Step by Step)

### 1. Get Your API Keys
- **Twilio**: Sign up at twilio.com → get Account SID, Auth Token, and buy a phone number
- **Claude API**: Sign up at console.anthropic.com → get API key
- **ElevenLabs**: Sign up at elevenlabs.io → get API key + Voice ID
- **SendGrid**: Sign up at sendgrid.com → get API key + verify your sender email

### 2. Install & Run
```bash
npm install
cp .env.example .env
# Fill in your .env with real API keys
node server.js
```

### 3. Connect Twilio to Your Server
- In Twilio dashboard, set your phone number's webhook to:
  `https://your-server-url.com/incoming-call`

---

## Customizing Per Client
Edit `.env` to change:
- `BUSINESS_NAME` — the company name the AI uses
- `BUSINESS_TYPE` — plumber, AC company, electrician, etc.
- `OWNER_EMAIL` — where call summaries are sent
- `OWNER_PHONE` — where SMS alerts are sent

That's it. One codebase, infinite clients.

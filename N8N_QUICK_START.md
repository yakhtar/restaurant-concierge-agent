# 🏃‍♂️ n8n Quick Start Checklist

## ✅ Before You Start
- [ ] Your restaurant agent is running: `npm run dev:enhanced`
- [ ] You can see restaurants at: http://localhost:3002/api/restaurants
- [ ] You have ngrok installed and ready

## 🎯 Quick Setup (30 minutes max!)

### 1️⃣ **Get Your Public URL** (5 minutes)
```bash
# Run this in Command Prompt:
C:\ngrok\ngrok.exe http 3002

# Copy the HTTPS URL (like: https://abc123.ngrok.io)
# This is your "public URL" - save it!
```

### 2️⃣ **Set Up n8n** (10 minutes)
1. Go to **n8n.io** → Sign up (free)
2. Click **"New workflow"**
3. Click **"..." → "Import from file"**
4. Import: `n8n-workflows/restaurant-whatsapp-workflow.json`
5. **DONE!** You'll see 6 connected boxes

### 3️⃣ **Configure 2 Key Settings** (5 minutes)

**Box 1 - "WhatsApp Webhook":**
- Path: `whatsapp`
- Copy the webhook URL shown (save this!)

**Box 4 - "Call Restaurant Agent":**
- URL: Change `localhost:3002` to your ngrok URL
- Example: `https://abc123.ngrok.io/webhook/whatsapp`

### 4️⃣ **Activate n8n** (1 minute)
- Click **"Save"** (top right)
- Click **"Activate"** (toggle should turn blue)
- **Your bot is live!** 🎉

### 5️⃣ **Set Up WhatsApp** (10 minutes)
1. Go to **business.whatsapp.com** → Set up business account
2. Go to **developers.facebook.com** → Find your WhatsApp app
3. WhatsApp → Configuration → Webhook:
   - **Callback URL:** Your n8n webhook URL
   - **Verify Token:** `mybot123` (or whatever you choose)
   - **Fields:** Check "messages"
4. Click **"Verify and Save"**

## 🧪 **Test It!**
Send a message to your WhatsApp business number:
- "Find Italian restaurants"
- "Show me Chinese food"
- "I need dinner recommendations"

**You should get restaurant recommendations back!** 🍽️

---

## 🆘 **If Something's Wrong**

**Not getting messages?**
```bash
# Check these URLs work:
https://your-ngrok-url.ngrok.io/health
localhost:3002/health

# Both should say "healthy"
```

**No restaurants found?**
```bash
# Generate some restaurants:
npm run generate:restaurant "Test Italian" "123 Main St"
npm run generate:restaurant "Test Chinese" "456 Oak Ave"

# Restart your agent:
# Stop with Ctrl+C, then run:
npm run dev:enhanced
```

**WhatsApp webhook fails?**
- Make sure ngrok is still running (the URL should still work)
- Double-check webhook URL in WhatsApp settings
- Verify token must match exactly

---

## 🎉 **Success Looks Like:**
```
Customer: "Find me Italian restaurants"
Bot: "🍽️ I found 1 restaurant for you:

1. **Mario's Italian Bistro**
   📍 123 Main Street, New York, NY
   🍴 italian • 💰💰
   ⭐ 3.6/5

To book a table, say: 'Book at Mario's for 4 on Friday at 7pm'"
```

**Congratulations! You built a real WhatsApp restaurant bot!** 🚀
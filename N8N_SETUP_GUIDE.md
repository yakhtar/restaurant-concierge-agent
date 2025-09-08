# 🤖 n8n Restaurant WhatsApp Agent Setup Guide
*Super Simple Instructions for Beginners!*

## 📋 What You'll Need

1. **n8n Cloud account** (free at n8n.io)
2. **WhatsApp Business account** (free from Meta)
3. **Your restaurant agent running** (on your computer at localhost:3002)
4. **A way to expose localhost to internet** (we'll show you how)

---

## 🚀 STEP 1: Get n8n Ready

### 1.1 Create n8n Account
1. Go to **https://n8n.io**
2. Click **"Get started for free"**
3. Sign up with your email
4. Verify your email and log in
5. You'll see the n8n dashboard - this is where the magic happens!

### 1.2 Create Your First Workflow
1. Click **"New workflow"** (big blue button)
2. You'll see a blank canvas - this is where we build our restaurant bot!

---

## 🔗 STEP 2: Make Your Computer Talk to the Internet

**Problem:** Your restaurant agent is on `localhost:3002` but WhatsApp needs a real internet URL.

**Solution:** Use ngrok (it's like a tunnel from internet to your computer)

### 2.1 Install ngrok
1. Go to **https://ngrok.com**
2. Sign up for free
3. Download ngrok for Windows
4. Unzip it to a folder (like `C:\ngrok\`)

### 2.2 Connect ngrok to your account
1. On ngrok website, go to **"Your Authtoken"**
2. Copy the token (long string of letters/numbers)
3. Open Command Prompt and type:
```bash
C:\ngrok\ngrok.exe authtoken YOUR_TOKEN_HERE
```

### 2.3 Create the tunnel
1. Keep your restaurant agent running on port 3002
2. Open a NEW Command Prompt and type:
```bash
C:\ngrok\ngrok.exe http 3002
```
3. You'll see something like: `https://abc123.ngrok.io -> localhost:3002`
4. **COPY THIS URL** - you'll need it! Let's call it your **"public URL"**

---

## 📱 STEP 3: Set Up WhatsApp Business

### 3.1 Get WhatsApp Business Account
1. Go to **https://business.whatsapp.com**
2. Click **"Get started"**
3. Follow the setup (you'll need a phone number)
4. Complete business verification

### 3.2 Get Your WhatsApp Keys
You need 4 important things from WhatsApp:
1. **Access Token** (like a password for your bot)
2. **Phone Number ID** (your bot's phone number)
3. **Business Account ID** (your business identifier)
4. **Webhook Verify Token** (you create this - make it something random like "mybot123")

To find these:
1. Go to **Meta for Developers** (developers.facebook.com)
2. Click **"My Apps"**
3. Find your WhatsApp Business app
4. Look for these values in the dashboard

---

## ⚙️ STEP 4: Import the n8n Workflow

### 4.1 Download the Workflow File
The workflow file is already created at:
`C:\Users\akhta\my_projects\restaurant-concierge-agent\n8n-workflows\restaurant-whatsapp-workflow.json`

### 4.2 Import into n8n
1. In your n8n workflow (the blank canvas)
2. Click **"..."** (three dots) in top right
3. Click **"Import from file"**
4. Select the `restaurant-whatsapp-workflow.json` file
5. Click **"Import"**
6. BOOM! Your workflow appears with connected boxes!

---

## 🔧 STEP 5: Configure the Workflow

You'll see 6 boxes connected by arrows. Let's set them up:

### 5.1 Configure "WhatsApp Webhook" (First Box)
1. **Click the first box** (says "WhatsApp Webhook")
2. In the **Path** field, change it to: `whatsapp`
3. **Copy the webhook URL** that appears (looks like: `https://your-n8n.app/webhook/whatsapp`)
4. **Save this URL** - WhatsApp needs it!

### 5.2 Configure "Call Restaurant Agent" (Big Box in Middle)
1. **Click the box** that says "Call Restaurant Agent"
2. Change the **URL** from `http://localhost:3002/webhook/whatsapp` to your **ngrok URL** + `/webhook/whatsapp`
3. Example: `https://abc123.ngrok.io/webhook/whatsapp`
4. Make sure **Method** is set to **POST**
5. Make sure **Content-Type** is **application/json**

### 5.3 Test the Workflow
1. Click **"Save"** (top right)
2. Click **"Activate"** (toggle switch in top right - should turn blue)
3. Your workflow is now LIVE! 🎉

---

## 📞 STEP 6: Connect WhatsApp to n8n

### 6.1 Set Up WhatsApp Webhook
1. Go back to **Meta for Developers**
2. Find your WhatsApp Business app
3. Go to **WhatsApp > Configuration**
4. In **Webhook** section:
   - **Callback URL:** Paste your n8n webhook URL (from Step 5.1)
   - **Verify Token:** Enter the token you created (like "mybot123")
   - **Webhook Fields:** Check "messages"
5. Click **"Verify and Save"**

### 6.2 Test Everything!
1. Send a WhatsApp message to your business number
2. Type: "Find me Italian restaurants"
3. You should get back restaurant recommendations! 🍝

---

## 🎯 How It All Works (The Magic Explained!)

```
WhatsApp Message → n8n Webhook → Your Restaurant Agent → n8n → WhatsApp Response
```

1. **Someone texts your WhatsApp business number**
2. **WhatsApp sends the message to n8n** (via webhook)
3. **n8n forwards it to your restaurant agent** (via ngrok tunnel)
4. **Your agent finds restaurants and creates a response**
5. **n8n sends the response back to WhatsApp**
6. **WhatsApp delivers the response to the customer**

---

## 🐛 Troubleshooting (When Things Don't Work)

### "Webhook not receiving messages"
- ✅ Check ngrok is still running (`https://abc123.ngrok.io` still works)
- ✅ Check your restaurant agent is running (localhost:3002/health shows "healthy")
- ✅ Check n8n workflow is activated (blue toggle switch)

### "Restaurant agent not responding"
- ✅ Make sure you ran: `npm run dev:enhanced` 
- ✅ Check it shows: "🎉 Restaurant cache ready with X restaurants"
- ✅ Test directly: visit `localhost:3002/api/restaurants`

### "WhatsApp verification failed"
- ✅ Double-check your webhook URL is correct
- ✅ Make sure verify token matches exactly
- ✅ Try using a fresh ngrok URL

### "No restaurants found"
- ✅ Generate some restaurants first: `npm run generate:restaurant "Test Restaurant" "123 Main St"`
- ✅ Restart your agent to load new restaurants

---

## 🎉 Success! What You Built

You now have a **real WhatsApp chatbot** that:
- ✅ Receives messages from customers
- ✅ Understands natural language ("find Italian food", "I need Chinese dinner")
- ✅ Searches your generated restaurant database
- ✅ Responds with formatted restaurant recommendations
- ✅ Handles booking requests
- ✅ Remembers customer preferences

**You built a professional restaurant concierge service!** 🚀

---

## 🔄 Next Steps (Optional Upgrades)

1. **Add more restaurants:** `npm run generate:restaurant "New Place" "Address"`
2. **Deploy your agent to cloud:** Use Heroku, Railway, or DigitalOcean
3. **Get real WhatsApp Business API access:** Apply for official WhatsApp Business API
4. **Add payment processing:** Integrate Stripe for table deposits
5. **Add AI responses:** Connect OpenAI for smarter conversations

**Your restaurant agent is ready for real customers!** 🎯
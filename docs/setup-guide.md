# Restaurant Concierge Agent - Setup Guide

This guide will walk you through setting up the complete Restaurant Concierge Agent system with WhatsApp integration via n8n Cloud.

## Prerequisites

- Node.js 18+ installed
- WhatsApp Business Account
- Google Cloud Platform account (for Google Places API)
- OpenTable Partner account (for reservations)
- n8n Cloud account
- Redis instance (optional, for production)

## Step 1: Environment Setup

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd restaurant-concierge-agent
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Configure environment variables:**
Edit `.env` file with your API keys and configuration.

## Step 2: WhatsApp Business Cloud Setup

### 2.1 Create WhatsApp Business Account
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app and select "Business" type
3. Add "WhatsApp" product to your app
4. Follow the setup wizard to create your WhatsApp Business Account

### 2.2 Get API Credentials
From your WhatsApp Business dashboard, collect:
- **Access Token** (`WHATSAPP_ACCESS_TOKEN`)
- **Phone Number ID** (`WHATSAPP_PHONE_NUMBER_ID`) 
- **Business Account ID** (`WHATSAPP_BUSINESS_ACCOUNT_ID`)
- **Webhook Verify Token** (create your own: `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)

### 2.3 Configure Webhook
1. In WhatsApp settings, set webhook URL to: `https://your-domain.com/webhook/whatsapp`
2. Set verify token to match your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Subscribe to `messages` webhook fields

## Step 3: Google Places API Setup

1. **Enable Google Places API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable Places API
   - Create API key with Places API access
   - Set `GOOGLE_PLACES_API_KEY` in `.env`

2. **Configure API restrictions (recommended):**
   - Restrict API key to your server IP addresses
   - Limit to Places API only

## Step 4: OpenTable Integration Setup

> **Note:** OpenTable Partner API access requires approval. For development, the system includes mock responses.

1. **Apply for OpenTable Partner API access:**
   - Visit [OpenTable for Restaurants](https://restaurant.opentable.com/api)
   - Submit partnership application
   - Wait for approval (can take several weeks)

2. **Once approved, configure credentials:**
   ```env
   OPENTABLE_API_KEY=your_api_key
   OPENTABLE_CLIENT_ID=your_client_id  
   OPENTABLE_CLIENT_SECRET=your_client_secret
   OPENTABLE_ENVIRONMENT=sandbox
   ```

## Step 5: Database Setup

### 5.1 SQLite (Development)
The system uses SQLite by default. No additional setup required.

### 5.2 Redis (Optional - Production)
1. **Install Redis locally or use cloud service:**
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt install redis-server

# Or use Redis Cloud, Heroku Redis, etc.
```

2. **Configure Redis URL:**
```env
REDIS_URL=redis://localhost:6379
```

## Step 6: Build and Run

1. **Build the TypeScript code:**
```bash
npm run build
```

2. **Start the application:**
```bash
# Development with hot reload
npm run dev

# Production
npm start
```

3. **Verify health check:**
```bash
curl http://localhost:3000/health
```

## Step 7: n8n Cloud Setup

### 7.1 Create n8n Cloud Account
1. Sign up at [n8n.cloud](https://n8n.cloud)
2. Create a new instance
3. Note your n8n instance URL

### 7.2 Import Workflows
1. In n8n, go to **Workflows** → **Import from file**
2. Import the workflows from `n8n-workflows/` directory:
   - `whatsapp-message-handler.json`
   - `restaurant-search-orchestrator.json`
   - `reservation-booking-flow.json`

### 7.3 Configure Credentials
Create the following credentials in n8n:

1. **Concierge API Auth** (HTTP Header Auth):
   - Header Name: `Authorization`
   - Header Value: `Bearer your-api-token`

2. **MCP API Auth** (HTTP Header Auth):
   - Header Name: `Authorization`  
   - Header Value: `Bearer your-mcp-token`

3. **WhatsApp API Auth** (HTTP Header Auth):
   - Header Name: `Authorization`
   - Header Value: `Bearer ${WHATSAPP_ACCESS_TOKEN}`

### 7.4 Update Webhook URLs
In each workflow, update the HTTP request URLs to point to your deployed application:
- Replace `http://localhost:3000` with your actual domain
- Ensure all endpoints are accessible from n8n Cloud

## Step 8: Testing

### 8.1 Test WhatsApp Integration
1. Send a message to your WhatsApp Business number
2. Check logs for webhook reception
3. Verify responses in WhatsApp

### 8.2 Test Restaurant Search
Send to WhatsApp:
- "Find Italian restaurants near me"
- Share your location
- "Vegetarian restaurants in New York"

### 8.3 Test Reservations
1. Search for restaurants first
2. Select a restaurant  
3. Follow reservation flow
4. Check OpenTable (or mock responses)

## Step 9: Deployment

### 9.1 Environment Setup
For production deployment:

1. **Environment variables:**
```env
NODE_ENV=production
DATABASE_TYPE=sqlite
LOG_LEVEL=info
```

2. **Security considerations:**
   - Use HTTPS for all webhooks
   - Implement rate limiting
   - Validate webhook signatures
   - Use environment-specific API keys

### 9.2 Deployment Options

**Option A: Heroku**
```bash
# Install Heroku CLI
heroku create restaurant-concierge-agent
heroku config:set NODE_ENV=production
# Set all other environment variables
git push heroku main
```

**Option B: Railway**
```bash
# Install Railway CLI
railway login
railway init
railway up
```

**Option C: DigitalOcean App Platform**
1. Connect your repository
2. Configure environment variables
3. Deploy from dashboard

### 9.3 Update Webhook URLs
After deployment, update:
1. WhatsApp webhook URL in Facebook Developers
2. n8n workflow URLs to use production domain
3. `WEBHOOK_BASE_URL` in environment variables

## Step 10: Monitoring and Maintenance

### 10.1 Logging
Monitor application logs:
```bash
# View logs (if using PM2)
pm2 logs restaurant-concierge

# Heroku logs
heroku logs --tail
```

### 10.2 Health Monitoring
Set up monitoring for:
- `/health` endpoint availability
- WhatsApp webhook response times
- API rate limits
- Database performance

### 10.3 Regular Maintenance
- Monitor API quota usage (Google Places)
- Update dependencies regularly
- Backup customer preference data
- Review and update dietary restriction mappings

## Troubleshooting

### Common Issues

1. **WhatsApp webhook not receiving messages:**
   - Verify webhook URL is accessible
   - Check verify token matches
   - Ensure HTTPS in production

2. **Restaurant search returns no results:**
   - Verify Google Places API key
   - Check API quotas and billing
   - Validate location parameters

3. **Reservations fail:**
   - Confirm OpenTable API access
   - Check restaurant availability in sandbox
   - Verify request parameters

4. **MCP servers not connecting:**
   - Check MCP server processes are running
   - Verify TypeScript compilation
   - Check file permissions

### Getting Help

- Check logs in `/logs/app.log`
- Review environment variable configuration
- Test individual API endpoints
- Validate n8n workflow connections

## Next Steps

Once your system is running:

1. **Customize dietary restrictions** in `src/utils/dietary-restrictions.ts`
2. **Add more cuisine types** to the Google Places mapping
3. **Implement additional features** like menu analysis
4. **Set up analytics** to track usage patterns
5. **Add more WhatsApp interactive features**

For advanced customization, refer to the source code documentation and API references.
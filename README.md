# Restaurant Concierge Agent

A comprehensive AI-powered restaurant concierge system that integrates with WhatsApp Business Cloud via n8n workflows, providing intelligent restaurant discovery, reservation management, and personalized dining recommendations.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Restaurant Data (No API Keys Required!)
```bash
# Generate sample restaurants using AI
npm run generate:restaurant "Mario's Italian Bistro" "123 Main St, New York, NY"
npm run generate:restaurant "Dragon Palace Chinese" "456 Broadway, New York, NY"

# List generated restaurants
npm run restaurants:list
```

### 3. Run the Enhanced Application
```bash
# Enhanced version with generated restaurant data
npm run dev:enhanced
# Will start on http://localhost:3000 with your generated restaurants loaded
```

### 4. Test Your Restaurant Concierge
```bash
# Health check with restaurant count
curl http://localhost:3000/health

# Search for restaurants
curl "http://localhost:3000/api/restaurants/search?q=italian"

# List all restaurants
curl http://localhost:3000/api/restaurants
```

### 5. Optional: Configure External APIs
```bash
cp .env.example .env
# Add WhatsApp, OpenAI, or other API keys for enhanced features
```

## 📋 Project Status

### ✅ Completed Components

1. **🤖 AI Restaurant Data Generator** ⭐ NEW!
   - Generate comprehensive restaurant data from just name + address
   - Intelligent cuisine detection and menu creation
   - Realistic pricing based on location analysis
   - Complete dietary restriction analysis
   - No API costs - uses Claude's intelligence locally
   - Interactive customization and editing
   - See: `RESTAURANT_GENERATOR.md` for full details

2. **Project Structure & Configuration**
   - Complete TypeScript setup with ESLint
   - Package configuration with all dependencies
   - Comprehensive environment variable template

2. **Core Architecture**
   - Type definitions for all components
   - WhatsApp Business Cloud API integration
   - MCP (Model Context Protocol) server framework
   - Express.js REST API server

3. **WhatsApp Integration**
   - Webhook verification and message handling
   - Rich interactive message support (buttons, lists, locations)
   - Message parsing and response formatting
   - Session management architecture

4. **Restaurant Discovery System**
   - Google Places API integration
   - Location-based search with radius filtering
   - Cuisine type detection and filtering
   - Price level and rating filters

5. **Dietary Restrictions Engine**
   - Support for 12+ dietary restriction types
   - Natural language parsing for dietary needs
   - Restaurant compatibility scoring
   - Cuisine-specific allergy warnings

6. **Reservation System**
   - OpenTable API integration framework
   - Availability checking and booking flow
   - Confirmation and history tracking

7. **Customer Preferences Management**
   - SQLite database for persistent storage
   - Favorite restaurants and preferences
   - Dietary restriction memory
   - Search history and recommendations

8. **n8n Workflows**
   - WhatsApp message processing workflow
   - Restaurant search orchestration
   - Reservation booking automation

### 🔧 Current Implementation Status

- **Simple Version**: ✅ Running and tested
  - Basic WhatsApp webhook handling
  - Health check endpoints
  - Message logging and processing framework

- **Full Version**: 🚧 Implementation complete, needs API configuration
  - All MCP servers implemented
  - Complete agent logic with conversation management
  - Advanced dietary restriction handling
  - Reservation booking flow

## 🔑 Required API Keys

To run the full version, you'll need:

1. **WhatsApp Business Cloud** (Meta)
   - Access Token
   - Phone Number ID
   - Business Account ID
   - Webhook Verify Token

2. **Google Places API** (Google Cloud)
   - Places API key with appropriate quotas

3. **OpenTable Partner API** (requires approval)
   - API key, Client ID, Client Secret
   - Note: This requires partner status with OpenTable

4. **Optional Services**
   - Redis (for production caching)
   - OpenAI/Anthropic (for enhanced AI responses)

## 📁 Key Files & Directories

```
restaurant-concierge-agent/
├── src/
│   ├── agents/
│   │   ├── restaurant-concierge.ts    # Full AI agent
│   │   └── simple-concierge.ts        # Simple test version
│   ├── mcp-servers/                   # MCP protocol servers
│   │   ├── google-places.ts
│   │   ├── opentable.ts
│   │   └── customer-preferences.ts
│   ├── integrations/
│   │   └── whatsapp.ts               # WhatsApp API wrapper
│   ├── utils/
│   │   └── dietary-restrictions.ts   # Dietary logic
│   ├── types/index.ts                # TypeScript definitions
│   ├── index.ts                      # Full application entry
│   └── simple-index.ts               # Simple version entry
├── n8n-workflows/                    # n8n automation workflows
├── docs/                             # Documentation
├── .env.example                      # Environment template
└── CLAUDE.md                         # Detailed project plan
```

## 🎯 Key Features

### Restaurant Discovery
- 📍 Location-based search with customizable radius
- 🍝 Cuisine type filtering and recommendations
- ⭐ Rating and price level filtering
- 📸 Photo integration from Google Places

### Dietary Accommodations
- 🥗 12+ dietary restriction types (vegetarian, vegan, gluten-free, halal, etc.)
- 🤖 Natural language parsing of dietary needs
- 🏪 Restaurant compatibility scoring
- ⚠️ Cuisine-specific allergy warnings

### WhatsApp Experience
- 💬 Natural language conversation interface
- 📱 Rich interactive messages (buttons, lists, maps)
- 📍 Location sharing support
- 💾 Conversation context preservation

### Reservation Management
- 📅 Real-time availability checking
- 🎫 Automated booking through OpenTable
- ✅ Confirmation codes and reminders
- 📚 Reservation history tracking

### Personalization
- ❤️ Favorite restaurants memory
- 🎯 Preference learning from interactions
- 📍 Default location settings
- 🔄 Cross-conversation context

## 🚦 Next Steps

1. **API Configuration**: Set up WhatsApp Business and Google Places accounts
2. **n8n Integration**: Import workflows to n8n Cloud
3. **OpenTable Partnership**: Apply for OpenTable Partner API access
4. **Production Deployment**: Deploy to Heroku/Railway/DigitalOcean
5. **Testing**: End-to-end testing with real WhatsApp numbers

## 📖 Documentation

- **Setup Guide**: `docs/setup-guide.md` - Complete setup instructions
- **Architecture**: `CLAUDE.md` - Detailed technical documentation
- **API Reference**: Environment variables in `.env.example`

## 🛟 Support

The project includes comprehensive error handling, logging, and a simple testing version to help debug issues. Check the logs and health endpoints for troubleshooting.

---

**Status**: Core implementation complete ✅ | Ready for API configuration and testing 🚀
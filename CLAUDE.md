# Restaurant Concierge Agent

A comprehensive AI-powered restaurant concierge system that integrates with WhatsApp Business Cloud via n8n workflows, providing intelligent restaurant discovery, reservation management, and personalized dining recommendations.

## Project Overview

This system acts as a sophisticated restaurant concierge that can:
- Find restaurants using Google Places API with intelligent filtering
- Make real reservations through OpenTable integration
- Handle complex dietary restrictions and preferences
- Remember customer preferences across conversations
- Operate via WhatsApp Business Cloud through n8n workflows

## Architecture

### Core Components

1. **MCP Servers** - Modular Context Protocol servers for external integrations
   - Google Places server for restaurant discovery
   - OpenTable server for reservation management
   - Customer preferences server for personalized experiences

2. **WhatsApp Integration** - Business Cloud API integration via n8n
   - Webhook handling for incoming messages
   - Rich message formatting and media support
   - Session management and context persistence

3. **AI Agent System** - Intelligent conversation management
   - Natural language understanding for restaurant queries
   - Dietary restriction parsing and matching
   - Reservation intent detection and processing

4. **Data Management** - Persistent storage and caching
   - SQLite for customer preferences and history
   - Redis for session management and caching
   - Encrypted storage for sensitive data

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production
npm start

# Type checking
npm run typecheck

# Linting
npm run lint

# Run MCP servers individually
npm run mcp:google-places
npm run mcp:opentable
npm run mcp:customer-prefs
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in required API keys:
   - WhatsApp Business Cloud credentials
   - Google Places API key
   - OpenTable API credentials
   - OpenAI/Anthropic API key
   - Redis connection details

## Key Features

### Restaurant Discovery
- Location-based search with radius filtering
- Cuisine type filtering
- Price range filtering
- Rating and review integration
- Real-time availability checking

### Dietary Restrictions Support
- Comprehensive allergy detection (nuts, shellfish, gluten, dairy, etc.)
- Dietary preference matching (vegan, vegetarian, keto, halal, kosher)
- Menu analysis for ingredient checking
- Restaurant filtering based on dietary accommodations

### Reservation Management
- Real-time availability checking
- Automated booking through OpenTable
- Confirmation and modification handling
- Reminder notifications
- Cancellation management

### Customer Personalization
- Preference learning from conversation history
- Favorite restaurant tracking
- Dietary restriction memory
- Location preference storage
- Custom recommendation algorithms

### WhatsApp Integration
- Rich message formatting with cards and buttons
- Location sharing support
- Image sharing for menu items
- Voice message handling
- Group chat support

## n8n Workflows

The system includes pre-built n8n workflows for:
1. WhatsApp message processing
2. Restaurant search orchestration
3. Reservation booking automation
4. Customer preference updates
5. Notification scheduling

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /webhook/whatsapp` - WhatsApp webhook handler
- `GET /api/restaurants/search` - Direct restaurant search API
- `POST /api/reservations/book` - Direct reservation booking API
- `GET /api/customers/:id/preferences` - Customer preferences API

## Security Features

- JWT-based authentication
- API key validation
- Webhook signature verification
- Data encryption for sensitive information
- Rate limiting and abuse prevention

## Monitoring and Logging

- Structured logging with Winston
- Request/response logging
- Error tracking and alerting
- Performance metrics
- API usage analytics

## Testing Strategy

- Unit tests for core business logic
- Integration tests for API endpoints
- Mock services for external dependencies
- End-to-end testing with n8n workflows

## Deployment

The system is designed to be deployed with:
- Docker containerization
- Environment-specific configurations
- Health checks and monitoring
- Horizontal scaling capabilities
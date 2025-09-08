import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RestaurantConciergeAgent } from './agents/restaurant-concierge.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize the restaurant concierge agent
const agent = new RestaurantConciergeAgent({
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!,
  },
  openai: process.env.OPENAI_API_KEY ? {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
  } : undefined,
  anthropic: process.env.ANTHROPIC_API_KEY ? {
    apiKey: process.env.ANTHROPIC_API_KEY,
  } : undefined,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'restaurant-concierge-agent' 
  });
});

// WhatsApp webhook verification
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  const verificationResult = agent.verifyWebhook(mode, token, challenge);
  
  if (verificationResult) {
    console.log('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  } else {
    console.log('WhatsApp webhook verification failed');
    return res.status(403).send('Verification failed');
  }
});

// WhatsApp webhook message handler
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const message = agent.parseIncomingMessage(req.body);
    
    if (message) {
      // Process message asynchronously to respond quickly to WhatsApp
      setImmediate(async () => {
        try {
          await agent.handleIncomingMessage(message);
        } catch (error) {
          console.error('Error processing WhatsApp message:', error);
        }
      });
      
      res.status(200).send('OK');
    } else {
      res.status(200).send('No message to process');
    }
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for direct message processing (for n8n workflows)
app.post('/api/concierge/message', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await agent.handleIncomingMessage(message);
    res.json({ success: true, message: 'Message processed successfully' });
  } catch (error) {
    console.error('Error processing message via API:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Restaurant Concierge Agent listening on port ${port}`);
  console.log(`📱 WhatsApp webhook URL: ${process.env.WEBHOOK_BASE_URL || `http://localhost:${port}`}/webhook/whatsapp`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
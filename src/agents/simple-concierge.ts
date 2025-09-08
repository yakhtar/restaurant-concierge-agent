import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

export class SimpleConciergeAgent {
  private app = express();

  constructor() {
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'restaurant-concierge-agent' 
      });
    });

    // WhatsApp webhook verification
    this.app.get('/webhook/whatsapp', (req, res) => {
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;

      if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        console.log('WhatsApp webhook verified successfully');
        return res.status(200).send(challenge);
      } else {
        console.log('WhatsApp webhook verification failed');
        return res.status(403).send('Verification failed');
      }
    });

    // WhatsApp message handler
    this.app.post('/webhook/whatsapp', async (req, res) => {
      try {
        console.log('Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));
        
        // Extract message from webhook
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];
        
        if (message) {
          console.log('Processing message:', message);
          
          // Simple response for now
          const responseMessage = `Hello! I received your message: "${message.text?.body || 'non-text message'}". The Restaurant Concierge Agent is running successfully!`;
          
          // In a real implementation, you would send this via WhatsApp API
          console.log('Would send response:', responseMessage);
        }
        
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoints
    this.app.get('/api/restaurants/search', (req, res) => {
      res.json({
        success: true,
        message: 'Restaurant search endpoint - implementation pending',
        query: req.query
      });
    });

    this.app.post('/api/reservations/book', (req, res) => {
      res.json({
        success: true,
        message: 'Reservation booking endpoint - implementation pending',
        data: req.body
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
      });
    });
  }

  start(port = 3000): void {
    this.app.listen(port, () => {
      console.log(`🚀 Simple Restaurant Concierge Agent listening on port ${port}`);
      console.log(`📱 WhatsApp webhook URL: ${process.env.WEBHOOK_BASE_URL || `http://localhost:${port}`}/webhook/whatsapp`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}
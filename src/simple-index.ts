import { SimpleConciergeAgent } from './agents/simple-concierge.js';

const agent = new SimpleConciergeAgent();
const port = parseInt(process.env.PORT || '3000');

agent.start(port);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
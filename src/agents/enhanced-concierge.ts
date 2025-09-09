import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { RestaurantDataGenerator, GeneratedRestaurantData } from '../generators/restaurant-generator.js';

dotenv.config();

export class EnhancedConciergeAgent {
  private app = express();
  private restaurantCache: Map<string, GeneratedRestaurantData> = new Map();

  constructor() {
    this.setupMiddleware();
    this.setupRoutes();
    this.loadRestaurantData();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private async loadRestaurantData(): Promise<void> {
    try {
      const restaurants = await RestaurantDataGenerator.listGeneratedRestaurants();
      console.log(`📋 Loading ${restaurants.length} generated restaurants...`);

      for (const filename of restaurants) {
        try {
          const dataDir = path.join(process.cwd(), 'data', 'restaurants');
          const filepath = path.join(dataDir, filename);
          const data = await RestaurantDataGenerator.loadRestaurantData(filepath);
          
          this.restaurantCache.set(data.restaurant.name.toLowerCase(), data);
          console.log(`   ✅ Loaded: ${data.restaurant.name}`);
        } catch (error) {
          console.log(`   ❌ Failed to load ${filename}:`, error);
        }
      }

      console.log(`🎉 Restaurant cache ready with ${this.restaurantCache.size} restaurants\n`);
    } catch (error) {
      console.log('📋 No restaurants found in cache, generate some with:');
      console.log('   npm run generate:restaurant "Restaurant Name" "Address"\n');
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'enhanced-restaurant-concierge-agent',
        restaurantsLoaded: this.restaurantCache.size,
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

    // Enhanced WhatsApp message handler
    this.app.post('/webhook/whatsapp', async (req, res) => {
      try {
        console.log('Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));
        
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const message = change?.value?.messages?.[0];
        
        if (message && message.text) {
          const messageText = message.text.body.toLowerCase();
          const response = await this.processMessage(messageText, message.from);
          
          console.log('Generated response:', response);
          
          // In a real implementation, you would send this via WhatsApp API
          // For now, just log it
        }
        
        res.status(200).send('OK');
      } catch (error) {
        console.error('Error processing WhatsApp message:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // API endpoint to search restaurants
    this.app.get('/api/restaurants/search', (req, res) => {
      const { q, cuisine, priceLevel } = req.query;
      const results = this.searchRestaurants(q as string, {
        cuisine: cuisine as string,
        priceLevel: priceLevel ? parseInt(priceLevel as string) : undefined,
      });

      res.json({
        success: true,
        query: q,
        results: results.length,
        restaurants: results,
      });
    });

    // API endpoint to get specific restaurant details
    this.app.get('/api/restaurants/:name', (req, res) => {
      const restaurantName = req.params.name.toLowerCase();
      const restaurant = this.restaurantCache.get(restaurantName);

      if (restaurant) {
        res.json({
          success: true,
          restaurant: restaurant,
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Restaurant not found',
          suggestion: `Generate it with: npm run generate:restaurant "${req.params.name}" "Address"`,
        });
      }
    });

    // API endpoint to list all available restaurants
    this.app.get('/api/restaurants', (req, res) => {
      const restaurants = Array.from(this.restaurantCache.values()).map(data => ({
        name: data.restaurant.name,
        cuisine: data.restaurant.cuisine,
        priceLevel: data.restaurant.priceLevel,
        rating: data.restaurant.rating,
        address: data.restaurant.address,
      }));

      res.json({
        success: true,
        count: restaurants.length,
        restaurants,
      });
    });

    // API endpoint for n8n chat integration
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message, phone } = req.body;
        
        if (!message) {
          return res.status(400).json({
            success: false,
            error: 'Message is required',
          });
        }

        const response = await this.processMessage(message.toLowerCase(), phone || 'n8n-test');
        
        res.json({
          success: true,
          message: response,
          originalMessage: message,
          phone: phone,
        });
      } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });

    // API endpoint for reservations (mock)
    this.app.post('/api/reservations/book', (req, res) => {
      const { restaurantName, date, time, partySize, customerName } = req.body;
      
      const restaurant = this.restaurantCache.get(restaurantName?.toLowerCase());
      if (!restaurant) {
        return res.status(404).json({
          success: false,
          error: 'Restaurant not found',
        });
      }

      // Generate mock reservation
      const reservation = {
        id: `res_${Date.now()}`,
        restaurantName: restaurant.restaurant.name,
        date,
        time,
        partySize,
        customerName,
        status: 'confirmed',
        confirmationCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        message: 'Reservation booked successfully!',
        reservation,
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

  private async processMessage(messageText: string, from: string): Promise<string> {
    console.log(`🤖 Processing message from ${from}: "${messageText}"`);

    // Simple intent detection
    if (messageText.includes('find') || messageText.includes('search') || messageText.includes('restaurant')) {
      return this.handleRestaurantSearch(messageText);
    } else if (messageText.includes('book') || messageText.includes('reservation') || messageText.includes('table')) {
      return this.handleReservationRequest(messageText);
    } else if (messageText.includes('help') || messageText === 'hi' || messageText === 'hello') {
      return this.getHelpMessage();
    } else if (messageText.includes('list') || messageText.includes('show')) {
      return this.listAvailableRestaurants();
    } else {
      return this.getDefaultResponse(messageText);
    }
  }

  private handleRestaurantSearch(messageText: string): string {
    // Enhanced search with filters
    const searchFilters = this.extractSearchFilters(messageText);
    const results = this.searchRestaurants(messageText, searchFilters);
    
    if (results.length === 0) {
      let suggestions = `I couldn't find any restaurants matching "${messageText}".`;
      
      if (searchFilters.dietary || searchFilters.priceLevel || searchFilters.amenity) {
        suggestions += ` Try:\n\n• Broadening your search: "Italian restaurants"\n• Different filters: "cheap Chinese food" or "vegetarian friendly"\n• "List all restaurants" to see all options`;
      } else {
        suggestions += ` Try:\n\n• "Find Italian restaurants"\n• "Search Chinese food near me"\n• "Show vegetarian restaurants"\n• "List restaurants" to see all available options`;
      }
      
      suggestions += `\n\nOr generate more restaurants with the CLI!`;
      return suggestions;
    }

    let response = `🍽️ I found ${results.length} restaurant${results.length > 1 ? 's' : ''} for you`;
    
    // Add filter context
    if (searchFilters.cuisine) response += ` serving ${searchFilters.cuisine}`;
    if (searchFilters.dietary) response += ` with ${searchFilters.dietary} options`;
    if (searchFilters.priceLevel) response += ` in your price range`;
    
    response += `:\n\n`;
    
    results.slice(0, 5).forEach((data, index) => {
      const restaurant = data.restaurant;
      const popular = (data as any).popularDishes?.slice(0, 2).join(', ') || 'Various dishes';
      const extendedData = data as any;
      
      response += `${index + 1}. **${restaurant.name}**\n`;
      response += `   📍 ${restaurant.address}\n`;
      response += `   🍴 ${restaurant.cuisine.join(', ')} • ${'💰'.repeat(restaurant.priceLevel)}\n`;
      response += `   ⭐ ${restaurant.rating}/5`;
      
      // Add wait time if available
      if (extendedData.averageWaitTime) {
        response += ` • ⏱️ ~${extendedData.averageWaitTime}min wait\n`;
      } else {
        response += `\n`;
      }
      
      response += `   🔥 Popular: ${popular}\n`;
      
      // Add dietary options if relevant
      if (searchFilters.dietary && restaurant.dietaryOptions) {
        const dietaryMatch = restaurant.dietaryOptions.find(opt => 
          opt.type === searchFilters.dietary && opt.available
        );
        if (dietaryMatch?.notes) {
          response += `   🌱 ${dietaryMatch.notes}\n`;
        }
      }
      
      // Add special features
      if (extendedData.specialFeatures?.length > 0) {
        const features = extendedData.specialFeatures.slice(0, 2).join(', ');
        response += `   ✨ ${features}\n`;
      }
      
      response += `\n`;
    });

    if (results.length > 5) {
      response += `... and ${results.length - 5} more restaurants available!\n\n`;
    }

    response += `💡 **Quick actions:**\n`;
    response += `• "Book at [Restaurant Name] for [party size] on [date]"\n`;
    response += `• "Tell me more about [Restaurant Name]"\n`;
    response += `• "Show me vegetarian options"\n`;
    response += `• "Find cheaper alternatives"`;
    
    return response;
  }

  private handleReservationRequest(messageText: string): string {
    // Simple reservation parsing (in a real system, this would be more sophisticated)
    const restaurantNames = Array.from(this.restaurantCache.keys());
    const mentionedRestaurant = restaurantNames.find(name => 
      messageText.includes(name) || messageText.includes(name.split(' ')[0])
    );

    if (!mentionedRestaurant) {
      return `To book a reservation, please specify a restaurant name. Available restaurants:\n\n${this.listAvailableRestaurants()}`;
    }

    const restaurant = this.restaurantCache.get(mentionedRestaurant)!.restaurant;
    
    return `🎉 I'd be happy to help you book at **${restaurant.name}**!\n\n` +
           `📍 ${restaurant.address}\n` +
           `⏰ ${restaurant.openingHours?.weekdayText[0] || 'Hours vary'}\n\n` +
           `To complete your reservation, I'll need:\n` +
           `• Date and time\n` +
           `• Party size\n` +
           `• Your name and phone\n\n` +
           `Example: "Book at ${restaurant.name} for 4 people tomorrow at 7 PM, name John Smith, phone 555-1234"\n\n` +
           `📞 You can also call directly: ${restaurant.phone || 'Contact info not available'}`;
  }

  private extractSearchFilters(messageText: string): { 
    cuisine?: string; 
    priceLevel?: number; 
    dietary?: string; 
    amenity?: string;
  } {
    const queryLower = messageText.toLowerCase();
    const filters: any = {};

    // Cuisine detection
    const cuisines = ['italian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'french', 'american', 'mediterranean', 'korean'];
    for (const cuisine of cuisines) {
      if (queryLower.includes(cuisine)) {
        filters.cuisine = cuisine;
        break;
      }
    }

    // Price level detection
    if (queryLower.includes('cheap') || queryLower.includes('budget') || queryLower.includes('affordable')) {
      filters.priceLevel = 1;
    } else if (queryLower.includes('expensive') || queryLower.includes('upscale') || queryLower.includes('fine dining')) {
      filters.priceLevel = 4;
    } else if (queryLower.includes('mid-range') || queryLower.includes('moderate')) {
      filters.priceLevel = 2;
    }

    // Dietary options detection
    const dietaryOptions = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'nut-free'];
    for (const dietary of dietaryOptions) {
      if (queryLower.includes(dietary)) {
        filters.dietary = dietary;
        break;
      }
    }

    // Amenity detection
    if (queryLower.includes('outdoor') || queryLower.includes('patio')) {
      filters.amenity = 'outdoor_seating';
    } else if (queryLower.includes('delivery')) {
      filters.amenity = 'delivery';
    } else if (queryLower.includes('takeout')) {
      filters.amenity = 'takeout';
    } else if (queryLower.includes('parking')) {
      filters.amenity = 'parking';
    }

    return filters;
  }

  private searchRestaurants(query: string, filters: { 
    cuisine?: string; 
    priceLevel?: number; 
    dietary?: string; 
    amenity?: string;
  }): GeneratedRestaurantData[] {
    const queryLower = query.toLowerCase();
    const results: GeneratedRestaurantData[] = [];

    for (const [name, data] of this.restaurantCache.entries()) {
      const restaurant = data.restaurant;
      const extendedData = data as any;
      let matches = false;
      let score = 0;

      // Name match (highest priority)
      if (name.includes(queryLower) || queryLower.includes(name)) {
        matches = true;
        score += 10;
      }

      // Cuisine match
      if (restaurant.cuisine.some(cuisine => 
        queryLower.includes(cuisine) || cuisine.includes(queryLower.split(' ')[0])
      )) {
        matches = true;
        score += 8;
      }

      // Popular dishes match
      const popularDishes = extendedData.popularDishes || [];
      if (popularDishes.some((dish: string) => queryLower.includes(dish.toLowerCase()))) {
        matches = true;
        score += 6;
      }

      // Special features match
      const specialFeatures = extendedData.specialFeatures || [];
      if (specialFeatures.some((feature: string) => queryLower.includes(feature.toLowerCase()))) {
        matches = true;
        score += 4;
      }

      // Apply filters
      if (matches) {
        // Cuisine filter
        if (filters.cuisine && !restaurant.cuisine.includes(filters.cuisine.toLowerCase())) {
          matches = false;
        }
        
        // Price level filter
        if (filters.priceLevel && restaurant.priceLevel !== filters.priceLevel) {
          matches = false;
        }
        
        // Dietary filter
        if (filters.dietary && restaurant.dietaryOptions) {
          const hasDietary = restaurant.dietaryOptions.some(opt => 
            opt.type === filters.dietary && opt.available
          );
          if (!hasDietary) {
            matches = false;
          } else {
            score += 5; // Bonus for matching dietary requirements
          }
        }
        
        // Amenity filter
        if (filters.amenity && extendedData.specialFeatures) {
          const hasAmenity = extendedData.specialFeatures.some((feature: string) => 
            feature.toLowerCase().includes(filters.amenity?.replace('_', ' ') || '')
          );
          if (!hasAmenity) {
            matches = false;
          } else {
            score += 3; // Bonus for matching amenity
          }
        }
      }

      if (matches) {
        results.push({...data, searchScore: score});
      }
    }

    // Sort by search score first, then by rating
    return results.sort((a: any, b: any) => {
      if (a.searchScore !== b.searchScore) {
        return b.searchScore - a.searchScore;
      }
      return b.restaurant.rating - a.restaurant.rating;
    });
  }

  private listAvailableRestaurants(): string {
    if (this.restaurantCache.size === 0) {
      return `No restaurants available yet! Generate some with:\n\nnpm run generate:restaurant "Restaurant Name" "Address"`;
    }

    let response = `🍽️ Available Restaurants (${this.restaurantCache.size}):\n\n`;
    
    Array.from(this.restaurantCache.values())
      .sort((a, b) => b.restaurant.rating - a.restaurant.rating)
      .slice(0, 10)
      .forEach((data, index) => {
        const restaurant = data.restaurant;
        response += `${index + 1}. **${restaurant.name}** (${restaurant.cuisine.join(', ')})\n`;
        response += `   ⭐ ${restaurant.rating}/5 • ${'💰'.repeat(restaurant.priceLevel)}\n`;
      });

    if (this.restaurantCache.size > 10) {
      response += `\n... and ${this.restaurantCache.size - 10} more restaurants!`;
    }

    return response;
  }

  private getHelpMessage(): string {
    return `👋 Welcome to your AI Restaurant Concierge!\n\n` +
           `I can help you:\n` +
           `🔍 **Find Restaurants**: "Find Italian restaurants" or "Search sushi"\n` +
           `📅 **Make Reservations**: "Book at [Restaurant] for 4 people tonight at 7 PM"\n` +
           `📋 **List Options**: "Show me restaurants" or "List all restaurants"\n` +
           `ℹ️ **Get Details**: Just mention a restaurant name\n\n` +
           `**Available Commands:**\n` +
           `• "List restaurants" - Show all available restaurants\n` +
           `• "Find [cuisine]" - Search by cuisine type\n` +
           `• "Book at [name]" - Start reservation process\n` +
           `• "Help" - Show this message\n\n` +
           `Currently serving ${this.restaurantCache.size} restaurants! 🍽️`;
  }

  private getDefaultResponse(messageText: string): string {
    // Try to find restaurant mentions in the message
    const restaurantNames = Array.from(this.restaurantCache.keys());
    const mentionedRestaurant = restaurantNames.find(name => 
      messageText.includes(name) || messageText.includes(name.split(' ')[0])
    );

    if (mentionedRestaurant) {
      const data = this.restaurantCache.get(mentionedRestaurant)!;
      const restaurant = data.restaurant;
      const popular = (data as any).popularDishes?.join(', ') || 'Various delicious dishes';
      
      return `🏪 **${restaurant.name}**\n` +
             `📍 ${restaurant.address}\n` +
             `🍴 ${restaurant.cuisine.join(', ')} • ${'💰'.repeat(restaurant.priceLevel)}\n` +
             `⭐ ${restaurant.rating}/5 stars\n` +
             `🔥 Popular: ${popular}\n\n` +
             `Want to book a table? Just say: "Book at ${restaurant.name} for [party size] on [date]"`;
    }

    return `I'm your AI restaurant concierge! I can help you find restaurants and make reservations.\n\n` +
           `Try saying:\n` +
           `• "Find Italian restaurants"\n` +
           `• "List restaurants"\n` +
           `• "Book a table at [restaurant name]"\n` +
           `• "Help" for more options\n\n` +
           `Currently serving ${this.restaurantCache.size} restaurants! 🍽️`;
  }

  async start(port = 3000): Promise<void> {
    this.app.listen(port, () => {
      console.log(`🚀 Enhanced Restaurant Concierge Agent listening on port ${port}`);
      console.log(`📱 WhatsApp webhook URL: ${process.env.WEBHOOK_BASE_URL || `http://localhost:${port}`}/webhook/whatsapp`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🍽️  Loaded restaurants: ${this.restaurantCache.size}`);
      console.log(`\n🎯 API Endpoints:`);
      console.log(`   GET  /api/restaurants - List all restaurants`);
      console.log(`   GET  /api/restaurants/search?q=... - Search restaurants`);
      console.log(`   GET  /api/restaurants/:name - Get restaurant details`);
      console.log(`   POST /api/reservations/book - Book a reservation\n`);
    });
  }
}
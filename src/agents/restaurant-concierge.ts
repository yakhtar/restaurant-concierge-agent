import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import type { 
  WhatsAppMessage, 
  ConversationContext, 
  Restaurant, 
  CustomerPreferences,
  DietaryRestrictionType
} from '../types/index.js';
import { WhatsAppBusinessAPI } from '../integrations/whatsapp.js';
import { DietaryRestrictionsHandler } from '../utils/dietary-restrictions.js';

export interface AgentConfig {
  whatsapp: {
    accessToken: string;
    phoneNumberId: string;
    businessAccountId: string;
    webhookVerifyToken: string;
  };
  openai?: {
    apiKey: string;
    model: string;
  };
  anthropic?: {
    apiKey: string;
  };
}

export class RestaurantConciergeAgent {
  private whatsapp: WhatsAppBusinessAPI;
  private googlePlacesClient?: Client;
  private openTableClient?: Client;
  private customerPrefsClient?: Client;
  private conversations: Map<string, ConversationContext> = new Map();

  constructor(config: AgentConfig) {
    this.whatsapp = new WhatsAppBusinessAPI(config.whatsapp);
    this.initializeMCPClients();
  }

  private async initializeMCPClients(): Promise<void> {
    try {
      // Initialize Google Places MCP client
      const googlePlacesProcess = spawn('node', ['dist/mcp-servers/google-places.js'], {
        env: { ...process.env },
      });
      const googlePlacesTransport = new StdioClientTransport({
        reader: googlePlacesProcess.stdout,
        writer: googlePlacesProcess.stdin,
      });
      this.googlePlacesClient = new Client({ name: 'restaurant-concierge', version: '1.0.0' }, { capabilities: {} });
      await this.googlePlacesClient.connect(googlePlacesTransport);

      // Initialize OpenTable MCP client
      const openTableProcess = spawn('node', ['dist/mcp-servers/opentable.js'], {
        env: { ...process.env },
      });
      const openTableTransport = new StdioClientTransport({
        reader: openTableProcess.stdout,
        writer: openTableProcess.stdin,
      });
      this.openTableClient = new Client({ name: 'restaurant-concierge', version: '1.0.0' }, { capabilities: {} });
      await this.openTableClient.connect(openTableTransport);

      // Initialize Customer Preferences MCP client
      const customerPrefsProcess = spawn('node', ['dist/mcp-servers/customer-preferences.js'], {
        env: { ...process.env },
      });
      const customerPrefsTransport = new StdioClientTransport({
        reader: customerPrefsProcess.stdout,
        writer: customerPrefsProcess.stdin,
      });
      this.customerPrefsClient = new Client({ name: 'restaurant-concierge', version: '1.0.0' }, { capabilities: {} });
      await this.customerPrefsClient.connect(customerPrefsTransport);

      console.log('MCP clients initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP clients:', error);
    }
  }

  async handleIncomingMessage(message: WhatsAppMessage): Promise<void> {
    try {
      // Mark message as read
      await this.whatsapp.markMessageAsRead(message.id);

      // Get or create conversation context
      const context = this.getOrCreateContext(message.from);
      context.messageHistory.push(message);
      context.updatedAt = new Date();

      // Process the message based on type and content
      await this.processMessage(message, context);

    } catch (error) {
      console.error('Error handling incoming message:', error);
      await this.whatsapp.sendTextMessage(
        message.from,
        "I'm sorry, I encountered an error processing your message. Please try again or type 'help' for assistance."
      );
    }
  }

  private getOrCreateContext(userId: string): ConversationContext {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, {
        userId,
        sessionId: this.generateSessionId(),
        messageHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return this.conversations.get(userId)!;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async processMessage(message: WhatsAppMessage, context: ConversationContext): Promise<void> {
    if (message.type === 'text' && message.text) {
      await this.processTextMessage(message.text.body, context);
    } else if (message.type === 'location' && message.location) {
      await this.processLocationMessage(message.location, context);
    } else {
      await this.whatsapp.sendTextMessage(
        context.userId,
        "I can help you with text messages and location sharing. Please send me a text message or your location to get started!"
      );
    }
  }

  private async processTextMessage(text: string, context: ConversationContext): Promise<void> {
    const normalizedText = text.toLowerCase().trim();

    // Handle button/interactive responses
    if (normalizedText.startsWith('restaurant_')) {
      const restaurantId = normalizedText.replace('restaurant_', '');
      await this.showRestaurantDetails(restaurantId, context);
      return;
    }

    if (normalizedText.startsWith('book_')) {
      const restaurantId = normalizedText.replace('book_', '');
      await this.startReservationProcess(restaurantId, context);
      return;
    }

    if (normalizedText.startsWith('favorite_')) {
      const restaurantId = normalizedText.replace('favorite_', '');
      await this.addToFavorites(restaurantId, context);
      return;
    }

    // Handle menu commands
    switch (normalizedText) {
      case 'search_restaurants':
      case 'find restaurants':
      case 'search':
        await this.startRestaurantSearch(context);
        break;
      
      case 'my_preferences':
      case 'preferences':
      case 'settings':
        await this.showPreferences(context);
        break;
      
      case 'help':
        await this.showHelp(context);
        break;
      
      case 'search_more':
        await this.startRestaurantSearch(context);
        break;

      case 'use_default_location':
        await this.useDefaultLocation(context);
        break;

      case 'type_address':
        await this.whatsapp.sendTextMessage(
          context.userId,
          "Please type your address or location (e.g., '123 Main St, New York' or 'Times Square, NYC'):"
        );
        context.currentIntent = 'search';
        break;

      default:
        await this.handleNaturalLanguageInput(text, context);
    }
  }

  private async processLocationMessage(
    location: { latitude: number; longitude: number; name?: string; address?: string },
    context: ConversationContext
  ): Promise<void> {
    context.searchCriteria = {
      ...context.searchCriteria,
      location: { lat: location.latitude, lng: location.longitude },
    };

    await this.whatsapp.sendTextMessage(
      context.userId,
      `📍 Got your location${location.name ? ` (${location.name})` : ''}! Now searching for restaurants nearby...`
    );

    await this.searchRestaurants(context);
  }

  private async handleNaturalLanguageInput(text: string, context: ConversationContext): Promise<void> {
    // If this is the first message, show main menu
    if (context.messageHistory.length === 1) {
      const customerPrefs = await this.getCustomerPreferences(context.userId);
      await this.whatsapp.sendMainMenu(context.userId, customerPrefs?.name);
      return;
    }

    // Parse dietary restrictions and preferences
    const dietaryInfo = DietaryRestrictionsHandler.parseDietaryInformation(text);
    
    if (dietaryInfo.restrictions.length > 0 || dietaryInfo.allergies.length > 0) {
      await this.updateDietaryPreferences(dietaryInfo.restrictions, dietaryInfo.allergies, context);
      return;
    }

    // Check if it looks like a location
    if (this.isLocationQuery(text)) {
      context.searchCriteria = {
        ...context.searchCriteria,
      };
      delete context.searchCriteria?.location; // Will be geocoded in search
      
      await this.searchRestaurantsWithQuery(text, context);
      return;
    }

    // Check if it looks like a reservation request
    if (this.isReservationQuery(text)) {
      await this.parseReservationRequest(text, context);
      return;
    }

    // General search query
    if (this.isRestaurantSearchQuery(text)) {
      await this.searchRestaurantsWithQuery(text, context);
      return;
    }

    // Default: show help or search suggestions
    await this.whatsapp.sendTextMessage(
      context.userId,
      `I'm here to help you find restaurants and make reservations! Try:\n\n• "Find Italian restaurants near me"\n• Share your location 📍\n• "Vegetarian restaurants in Manhattan"\n• "Book a table for 4 tonight"\n• Type 'help' for more options`
    );
  }

  private isLocationQuery(text: string): boolean {
    const locationKeywords = ['near', 'in', 'at', 'around', 'close to', 'by'];
    return locationKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isReservationQuery(text: string): boolean {
    const reservationKeywords = ['book', 'reserve', 'reservation', 'table', 'tonight', 'tomorrow', 'for 2', 'for 4', 'pm', 'am'];
    return reservationKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isRestaurantSearchQuery(text: string): boolean {
    const searchKeywords = ['restaurant', 'food', 'eat', 'dining', 'cuisine', 'italian', 'chinese', 'mexican', 'find', 'looking for'];
    return searchKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private async startRestaurantSearch(context: ConversationContext): Promise<void> {
    context.currentIntent = 'search';
    
    // Check if user has default location
    const customerPrefs = await this.getCustomerPreferences(context.userId);
    if (customerPrefs?.defaultLocation) {
      await this.whatsapp.sendTextMessage(
        context.userId,
        `I can search near your default location (${customerPrefs.defaultLocation.address}) or you can:\n\n• Share your current location 📍\n• Type a different address\n• Tell me what kind of food you're looking for`
      );
      
      context.searchCriteria = {
        location: customerPrefs.defaultLocation,
      };
    } else {
      await this.whatsapp.sendLocationRequest(context.userId);
    }
  }

  private async searchRestaurantsWithQuery(query: string, context: ConversationContext): Promise<void> {
    if (!this.googlePlacesClient) {
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, restaurant search is currently unavailable. Please try again later.");
      return;
    }

    try {
      const customerPrefs = await this.getCustomerPreferences(context.userId);
      
      // Extract location from query or use default
      let location = query;
      if (customerPrefs?.defaultLocation && !this.isLocationQuery(query)) {
        location = customerPrefs.defaultLocation.address;
      }

      // Parse cuisine from query
      const cuisine = this.extractCuisineFromQuery(query);

      const searchParams = {
        location,
        radius: customerPrefs?.searchRadius || 5000,
        cuisine,
        minRating: 3.5,
        openNow: false,
      };

      const result = await this.googlePlacesClient.callTool({
        name: 'search_restaurants',
        arguments: searchParams,
      });

      const searchResults = JSON.parse((result.content[0] as any).text as string);
      let restaurants: Restaurant[] = searchResults.restaurants || [];

      // Filter by dietary restrictions if available
      if (customerPrefs?.dietaryRestrictions && customerPrefs.dietaryRestrictions.length > 0) {
        const filtered = DietaryRestrictionsHandler.filterRestaurantsByDietary(
          restaurants,
          customerPrefs.dietaryRestrictions,
          customerPrefs.allergies || []
        );
        restaurants = filtered.map(f => f.restaurant);
      }

      context.lastSearchResults = restaurants;
      
      if (restaurants.length > 0) {
        await this.whatsapp.sendRestaurantList(context.userId, restaurants.map(r => ({
          id: r.id,
          name: r.name,
          address: r.address,
          rating: r.rating,
          priceLevel: r.priceLevel,
        })));
      } else {
        await this.whatsapp.sendTextMessage(
          context.userId,
          "I couldn't find any restaurants matching your criteria. Try:\n• Expanding your search area\n• Different cuisine types\n• Adjusting dietary restrictions"
        );
      }

    } catch (error) {
      console.error('Error searching restaurants:', error);
      await this.whatsapp.sendTextMessage(
        context.userId,
        "Sorry, I had trouble searching for restaurants. Please try again with a different query."
      );
    }
  }

  private extractCuisineFromQuery(query: string): string | undefined {
    const cuisineKeywords = {
      'italian': ['italian', 'pizza', 'pasta', 'italian food'],
      'chinese': ['chinese', 'chinese food', 'asian'],
      'mexican': ['mexican', 'tacos', 'burritos', 'mexican food'],
      'japanese': ['japanese', 'sushi', 'ramen', 'japanese food'],
      'indian': ['indian', 'curry', 'indian food'],
      'thai': ['thai', 'pad thai', 'thai food'],
      'french': ['french', 'french food'],
      'american': ['american', 'burger', 'bbq', 'american food'],
      'mediterranean': ['mediterranean', 'greek', 'mediterranean food'],
    };

    const lowerQuery = query.toLowerCase();
    for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return cuisine;
      }
    }
    return undefined;
  }

  private async searchRestaurants(context: ConversationContext): Promise<void> {
    if (!context.searchCriteria?.location || !this.googlePlacesClient) {
      await this.whatsapp.sendLocationRequest(context.userId);
      return;
    }

    await this.searchRestaurantsWithQuery(
      `${context.searchCriteria.location.lat},${context.searchCriteria.location.lng}`,
      context
    );
  }

  private async showRestaurantDetails(restaurantId: string, context: ConversationContext): Promise<void> {
    if (!this.googlePlacesClient) {
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, restaurant details are currently unavailable.");
      return;
    }

    try {
      const result = await this.googlePlacesClient.callTool({
        name: 'get_restaurant_details',
        arguments: { placeId: restaurantId },
      });

      const restaurant: Restaurant = JSON.parse((result.content[0] as any).text as string);
      
      await this.whatsapp.sendRestaurantDetails(context.userId, {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone || undefined,
        rating: restaurant.rating,
        priceLevel: restaurant.priceLevel,
        cuisine: restaurant.cuisine,
        openingHours: restaurant.openingHours ? {
          weekdayText: restaurant.openingHours.weekdayText,
        } : undefined,
      });

      // Store current restaurant for potential booking
      context.currentIntent = 'reservation';
      context.pendingReservation = {
        restaurantId: restaurant.id,
        customerId: context.userId,
        contactInfo: {
          name: '', // Will be filled during booking process
          phone: context.userId, // WhatsApp number
        },
      };

    } catch (error) {
      console.error('Error getting restaurant details:', error);
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I couldn't get the restaurant details. Please try again.");
    }
  }

  private async startReservationProcess(restaurantId: string, context: ConversationContext): Promise<void> {
    const restaurant = context.lastSearchResults?.find(r => r.id === restaurantId);
    if (!restaurant) {
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I couldn't find that restaurant. Please search again.");
      return;
    }

    context.currentIntent = 'reservation';
    context.pendingReservation = {
      restaurantId,
      customerId: context.userId,
      contactInfo: {
        name: '',
        phone: context.userId,
      },
    };

    await this.whatsapp.sendReservationForm(context.userId, restaurant.name);
  }

  private async parseReservationRequest(text: string, context: ConversationContext): Promise<void> {
    if (!context.pendingReservation) {
      await this.whatsapp.sendTextMessage(context.userId, "Please select a restaurant first before making a reservation.");
      return;
    }

    // Parse reservation details from text
    const partySize = this.extractPartySize(text);
    const date = this.extractDate(text);
    const time = this.extractTime(text);
    const specialRequests = this.extractSpecialRequests(text);

    if (!partySize || !date || !time) {
      await this.whatsapp.sendTextMessage(
        context.userId,
        "I need more information. Please provide:\n• Date (e.g., 'tomorrow', 'Friday')\n• Time (e.g., '7 PM', '19:00')\n• Number of people\n\nExample: 'Tomorrow 7PM for 4 people'"
      );
      return;
    }

    // Get customer name
    const customerPrefs = await this.getCustomerPreferences(context.userId);
    const customerName = customerPrefs?.name || 'Guest';

    context.pendingReservation = {
      ...context.pendingReservation,
      partySize,
      date,
      time,
      specialRequests: specialRequests || undefined,
      contactInfo: {
        name: customerName,
        phone: context.userId,
      },
    };

    await this.bookReservation(context);
  }

  private extractPartySize(text: string): number | null {
    const matches = text.match(/(\d+)\s*(people|person|ppl|guests?)/i);
    if (matches) {
      return parseInt(matches[1]);
    }

    const forMatches = text.match(/for\s+(\d+)/i);
    if (forMatches) {
      return parseInt(forMatches[1]);
    }

    return null;
  }

  private extractDate(text: string): string | null {
    const today = new Date();
    const lowerText = text.toLowerCase();

    if (lowerText.includes('today')) {
      return today.toISOString().split('T')[0];
    }

    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Try to match date formats
    const dateMatches = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatches) {
      const month = parseInt(dateMatches[1]);
      const day = parseInt(dateMatches[2]);
      const year = dateMatches[3].length === 2 ? 2000 + parseInt(dateMatches[3]) : parseInt(dateMatches[3]);
      return new Date(year, month - 1, day).toISOString().split('T')[0];
    }

    return null;
  }

  private extractTime(text: string): string | null {
    const timeMatches = text.match(/(\d{1,2}):?(\d{2})?\s*(pm|am)/i);
    if (timeMatches) {
      let hour = parseInt(timeMatches[1]);
      const minute = timeMatches[2] ? parseInt(timeMatches[2]) : 0;
      const period = timeMatches[3].toLowerCase();

      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }

      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    const militaryTime = text.match(/(\d{1,2}):(\d{2})/);
    if (militaryTime) {
      return `${militaryTime[1].padStart(2, '0')}:${militaryTime[2]}`;
    }

    return null;
  }

  private extractSpecialRequests(text: string): string | null {
    const specialKeywords = ['vegetarian', 'vegan', 'gluten', 'allergy', 'birthday', 'anniversary', 'celebration'];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (specialKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        return sentence.trim();
      }
    }

    return null;
  }

  private async bookReservation(context: ConversationContext): Promise<void> {
    if (!context.pendingReservation || !this.openTableClient) {
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I can't complete the reservation right now. Please try again later.");
      return;
    }

    try {
      const result = await this.openTableClient.callTool({
        name: 'book_reservation',
        arguments: {
          restaurantId: context.pendingReservation.restaurantId,
          partySize: context.pendingReservation.partySize,
          date: context.pendingReservation.date,
          time: context.pendingReservation.time,
          customerName: context.pendingReservation.contactInfo.name,
          customerPhone: context.pendingReservation.contactInfo.phone,
          customerEmail: context.pendingReservation.contactInfo.email,
          specialRequests: context.pendingReservation.specialRequests,
        },
      });

      const reservationResult = JSON.parse(result.content[0].text as string);

      if (reservationResult.success) {
        const restaurant = context.lastSearchResults?.find(r => r.id === context.pendingReservation!.restaurantId);
        
        await this.whatsapp.sendReservationConfirmation(context.userId, {
          restaurantName: restaurant?.name || 'Restaurant',
          date: context.pendingReservation.date!,
          time: context.pendingReservation.time!,
          partySize: context.pendingReservation.partySize!,
          confirmationCode: reservationResult.reservation.confirmationCode,
          status: reservationResult.reservation.status,
        });

        // Add to reservation history
        if (this.customerPrefsClient && restaurant) {
          await this.customerPrefsClient.callTool({
            name: 'add_reservation_history',
            arguments: {
              userId: context.userId,
              restaurantId: context.pendingReservation.restaurantId,
              restaurantName: restaurant.name,
              reservationDate: context.pendingReservation.date,
              partySize: context.pendingReservation.partySize,
              status: reservationResult.reservation.status,
            },
          });
        }

        // Clear pending reservation
        context.pendingReservation = undefined;
        context.currentIntent = undefined;

      } else {
        await this.whatsapp.sendTextMessage(
          context.userId,
          `Sorry, I couldn't complete your reservation: ${reservationResult.error}\n\nPlease try a different time or contact the restaurant directly.`
        );
      }

    } catch (error) {
      console.error('Error booking reservation:', error);
      await this.whatsapp.sendTextMessage(
        context.userId,
        "Sorry, I had trouble booking your reservation. Please try again or contact the restaurant directly."
      );
    }
  }

  private async addToFavorites(restaurantId: string, context: ConversationContext): Promise<void> {
    if (!this.customerPrefsClient) {
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I can't save favorites right now.");
      return;
    }

    try {
      await this.customerPrefsClient.callTool({
        name: 'add_favorite_restaurant',
        arguments: {
          userId: context.userId,
          restaurantId,
        },
      });

      const restaurant = context.lastSearchResults?.find(r => r.id === restaurantId);
      await this.whatsapp.sendTextMessage(
        context.userId,
        `❤️ Added ${restaurant?.name || 'restaurant'} to your favorites!`
      );

    } catch (error) {
      console.error('Error adding to favorites:', error);
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I couldn't add that to your favorites. Please try again.");
    }
  }

  private async updateDietaryPreferences(
    restrictions: DietaryRestrictionType[],
    allergies: string[],
    context: ConversationContext
  ): Promise<void> {
    if (!this.customerPrefsClient) {
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I can't save your preferences right now.");
      return;
    }

    try {
      const currentPrefs = await this.getCustomerPreferences(context.userId);
      
      await this.customerPrefsClient.callTool({
        name: 'update_customer_preferences',
        arguments: {
          userId: context.userId,
          whatsappNumber: context.userId,
          name: currentPrefs?.name,
          dietaryRestrictions: restrictions,
          allergies,
          favoriteRestaurants: currentPrefs?.favoriteRestaurants || [],
          cuisinePreferences: currentPrefs?.cuisinePreferences || [],
          priceRange: currentPrefs?.priceRange,
          defaultLocation: currentPrefs?.defaultLocation,
          searchRadius: currentPrefs?.searchRadius,
        },
      });

      const restrictionNames = restrictions.map(r => DietaryRestrictionsHandler.getRestrictionDisplayName(r));
      let message = `✅ Updated your dietary preferences!\n\n`;
      
      if (restrictionNames.length > 0) {
        message += `🥗 Dietary restrictions: ${restrictionNames.join(', ')}\n`;
      }
      
      if (allergies.length > 0) {
        message += `⚠️ Allergies: ${allergies.join(', ')}\n`;
      }
      
      message += `\nI'll use these preferences when searching for restaurants.`;

      await this.whatsapp.sendTextMessage(context.userId, message);

    } catch (error) {
      console.error('Error updating dietary preferences:', error);
      await this.whatsapp.sendTextMessage(context.userId, "Sorry, I couldn't save your preferences. Please try again.");
    }
  }

  private async getCustomerPreferences(userId: string): Promise<CustomerPreferences | null> {
    if (!this.customerPrefsClient) {
      return null;
    }

    try {
      const result = await this.customerPrefsClient.callTool({
        name: 'get_customer_preferences',
        arguments: { userId },
      });

      const data = JSON.parse(result.content[0].text as string);
      return data.found ? data.preferences : null;

    } catch (error) {
      console.error('Error getting customer preferences:', error);
      return null;
    }
  }

  private async showPreferences(context: ConversationContext): Promise<void> {
    const prefs = await this.getCustomerPreferences(context.userId);
    
    if (!prefs) {
      await this.whatsapp.sendDietaryRestrictionsMenu(context.userId);
      return;
    }

    let message = `⚙️ **Your Preferences**\n\n`;
    
    if (prefs.name) {
      message += `👤 Name: ${prefs.name}\n`;
    }
    
    if (prefs.dietaryRestrictions.length > 0) {
      const restrictions = prefs.dietaryRestrictions.map(r => DietaryRestrictionsHandler.getRestrictionDisplayName(r));
      message += `🥗 Dietary: ${restrictions.join(', ')}\n`;
    }
    
    if (prefs.allergies.length > 0) {
      message += `⚠️ Allergies: ${prefs.allergies.join(', ')}\n`;
    }
    
    if (prefs.cuisinePreferences.length > 0) {
      message += `🍴 Cuisines: ${prefs.cuisinePreferences.join(', ')}\n`;
    }
    
    if (prefs.defaultLocation) {
      message += `📍 Default location: ${prefs.defaultLocation.address}\n`;
    }
    
    message += `🔍 Search radius: ${(prefs.searchRadius / 1000).toFixed(1)}km\n`;
    message += `❤️ Favorite restaurants: ${prefs.favoriteRestaurants.length}\n\n`;
    message += `To update, just tell me your preferences in natural language!`;

    await this.whatsapp.sendTextMessage(context.userId, message);
  }

  private async useDefaultLocation(context: ConversationContext): Promise<void> {
    const prefs = await this.getCustomerPreferences(context.userId);
    
    if (!prefs?.defaultLocation) {
      await this.whatsapp.sendTextMessage(
        context.userId,
        "You don't have a default location set. Please share your location or type an address."
      );
      return;
    }

    context.searchCriteria = {
      location: prefs.defaultLocation,
    };

    await this.whatsapp.sendTextMessage(
      context.userId,
      `📍 Using your default location: ${prefs.defaultLocation.address}\n\nSearching for restaurants...`
    );

    await this.searchRestaurants(context);
  }

  private async showHelp(context: ConversationContext): Promise<void> {
    const helpText = `🤖 **Restaurant Concierge Help**\n\n**What I can do:**\n• Find restaurants near you\n• Make real reservations\n• Remember your dietary restrictions\n• Save your favorite places\n• Handle complex food allergies\n\n**How to use me:**\n• Share your location 📍 or type an address\n• Tell me what you want: "Italian food near Times Square"\n• Set dietary needs: "I'm vegetarian and gluten-free"\n• Make reservations: "Book a table for 4 tonight at 7PM"\n\n**Quick commands:**\n• 'Find restaurants' - Start searching\n• 'My preferences' - View/update settings\n• Send location - Find nearby restaurants\n\n**Tips:**\n• I understand natural language - just talk to me!\n• I'll remember your preferences across conversations\n• Always double-check reservation details with the restaurant`;

    await this.whatsapp.sendTextMessage(context.userId, helpText);
  }

  // Webhook verification for WhatsApp
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    return this.whatsapp.verifyWebhook(mode, token, challenge);
  }

  // Parse incoming webhook messages
  parseIncomingMessage(webhookBody: any): WhatsAppMessage | null {
    return this.whatsapp.parseIncomingMessage(webhookBody);
  }
}
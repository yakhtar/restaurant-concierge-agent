import axios from 'axios';
import type { WhatsAppMessage } from '../types/index.js';

export interface WhatsAppBusinessConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
}

export interface WhatsAppTextMessage {
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

export interface WhatsAppInteractiveMessage {
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
      button?: string;
    };
  };
}

export interface WhatsAppLocationMessage {
  to: string;
  type: 'location';
  location: {
    longitude: number;
    latitude: number;
    name?: string;
    address?: string;
  };
}

export interface WhatsAppTemplateMessage {
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
        image?: {
          link: string;
        };
      }>;
    }>;
  };
}

export type WhatsAppOutgoingMessage = 
  | WhatsAppTextMessage 
  | WhatsAppInteractiveMessage 
  | WhatsAppLocationMessage 
  | WhatsAppTemplateMessage;

export class WhatsAppBusinessAPI {
  private config: WhatsAppBusinessConfig;
  private baseURL: string;

  constructor(config: WhatsAppBusinessConfig) {
    this.config = config;
    this.baseURL = `https://graph.facebook.com/v18.0/${config.phoneNumberId}`;
  }

  async sendMessage(message: WhatsAppOutgoingMessage): Promise<{ messageId: string }> {
    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`WhatsApp API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async sendTextMessage(to: string, text: string): Promise<{ messageId: string }> {
    const message: WhatsAppTextMessage = {
      to,
      type: 'text',
      text: { body: text },
    };

    return this.sendMessage(message);
  }

  async sendRestaurantList(
    to: string, 
    restaurants: Array<{
      id: string;
      name: string;
      address: string;
      rating: number;
      priceLevel: number;
    }>
  ): Promise<{ messageId: string }> {
    if (restaurants.length === 0) {
      return this.sendTextMessage(to, "I couldn't find any restaurants matching your criteria. Please try adjusting your search parameters.");
    }

    const sections = [{
      title: "Found Restaurants",
      rows: restaurants.slice(0, 10).map(restaurant => ({
        id: `restaurant_${restaurant.id}`,
        title: `${restaurant.name}`,
        description: `⭐ ${restaurant.rating}/5 • ${'💰'.repeat(restaurant.priceLevel)} • ${restaurant.address.substring(0, 50)}...`,
      })),
    }];

    const message: WhatsAppInteractiveMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: '🍽️ Restaurant Options',
        },
        body: {
          text: `I found ${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'} for you. Select one to see details and make a reservation:`,
        },
        footer: {
          text: 'Powered by Restaurant Concierge',
        },
        action: {
          button: 'View Restaurants',
          sections,
        },
      },
    };

    return this.sendMessage(message);
  }

  async sendRestaurantDetails(
    to: string,
    restaurant: {
      id: string;
      name: string;
      address: string;
      phone?: string;
      rating: number;
      priceLevel: number;
      cuisine: string[];
      openingHours?: { weekdayText: string[] };
    }
  ): Promise<{ messageId: string }> {
    const priceSymbols = '💰'.repeat(restaurant.priceLevel);
    const cuisineText = restaurant.cuisine.join(', ');
    const hoursText = restaurant.openingHours?.weekdayText?.slice(0, 3).join('\n') || 'Hours not available';

    let details = `🍽️ **${restaurant.name}**\n\n`;
    details += `📍 ${restaurant.address}\n`;
    details += `⭐ ${restaurant.rating}/5 • ${priceSymbols}\n`;
    details += `🍴 ${cuisineText}\n\n`;
    details += `⏰ **Hours:**\n${hoursText}\n\n`;
    
    if (restaurant.phone) {
      details += `📞 ${restaurant.phone}\n\n`;
    }

    details += `Would you like to make a reservation?`;

    const message: WhatsAppInteractiveMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: details,
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: `book_${restaurant.id}`,
                title: '📅 Make Reservation',
              },
            },
            {
              type: 'reply',
              reply: {
                id: `favorite_${restaurant.id}`,
                title: '❤️ Add to Favorites',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'search_more',
                title: '🔍 Search More',
              },
            },
          ],
        },
      },
    };

    return this.sendMessage(message);
  }

  async sendReservationForm(
    to: string,
    restaurantName: string
  ): Promise<{ messageId: string }> {
    const text = `📅 **Make a Reservation at ${restaurantName}**\n\nPlease provide the following details:\n\n1. **Date** (e.g., "Tomorrow", "Friday", "Dec 25")\n2. **Time** (e.g., "7:00 PM", "19:00")\n3. **Party size** (number of people)\n4. **Special requests** (dietary restrictions, occasion, etc.) - optional\n\nExample: "Tomorrow 7PM for 4 people, one person is vegetarian"`;

    return this.sendTextMessage(to, text);
  }

  async sendReservationConfirmation(
    to: string,
    reservation: {
      restaurantName: string;
      date: string;
      time: string;
      partySize: number;
      confirmationCode?: string;
      status: string;
    }
  ): Promise<{ messageId: string }> {
    let message = `✅ **Reservation ${reservation.status.toUpperCase()}**\n\n`;
    message += `🍽️ **Restaurant:** ${reservation.restaurantName}\n`;
    message += `📅 **Date:** ${reservation.date}\n`;
    message += `⏰ **Time:** ${reservation.time}\n`;
    message += `👥 **Party Size:** ${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}\n`;
    
    if (reservation.confirmationCode) {
      message += `🎫 **Confirmation Code:** ${reservation.confirmationCode}\n`;
    }

    message += `\n📝 Please arrive 15 minutes early and bring a valid ID.`;

    return this.sendTextMessage(to, message);
  }

  async sendLocationRequest(to: string): Promise<{ messageId: string }> {
    const message: WhatsAppInteractiveMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '📍 To find restaurants near you, I need your location. You can:\n\n1. Share your current location using the 📎 attachment button\n2. Type an address or city name\n3. Use your default location from preferences',
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'use_default_location',
                title: '📍 Use Default Location',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'type_address',
                title: '✏️ Type Address',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'help_location',
                title: '❓ Help',
              },
            },
          ],
        },
      },
    };

    return this.sendMessage(message);
  }

  async sendDietaryRestrictionsMenu(to: string): Promise<{ messageId: string }> {
    const message: WhatsAppInteractiveMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: '🥗 Dietary Preferences',
        },
        body: {
          text: 'Please select your dietary restrictions and preferences. I\'ll help you find suitable restaurants:',
        },
        action: {
          button: 'Select Preferences',
          sections: [
            {
              title: 'Dietary Restrictions',
              rows: [
                { id: 'vegetarian', title: '🥬 Vegetarian', description: 'No meat or fish' },
                { id: 'vegan', title: '🌱 Vegan', description: 'No animal products' },
                { id: 'gluten_free', title: '🌾 Gluten-Free', description: 'No wheat, barley, rye' },
                { id: 'dairy_free', title: '🥛 Dairy-Free', description: 'No milk products' },
              ],
            },
            {
              title: 'Allergies',
              rows: [
                { id: 'nut_free', title: '🥜 Nut-Free', description: 'No nuts or nut oils' },
                { id: 'shellfish_free', title: '🦐 Shellfish-Free', description: 'No shellfish or crustaceans' },
              ],
            },
            {
              title: 'Religious/Cultural',
              rows: [
                { id: 'halal', title: '☪️ Halal', description: 'Islamic dietary laws' },
                { id: 'kosher', title: '✡️ Kosher', description: 'Jewish dietary laws' },
              ],
            },
          ],
        },
      },
    };

    return this.sendMessage(message);
  }

  async sendMainMenu(to: string, userName?: string): Promise<{ messageId: string }> {
    const greeting = userName ? `Hello ${userName}! 👋` : 'Hello! 👋';
    
    const message: WhatsAppInteractiveMessage = {
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'text',
          text: '🍽️ Restaurant Concierge',
        },
        body: {
          text: `${greeting}\n\nI'm your personal restaurant concierge! I can help you:\n\n• Find restaurants based on your preferences\n• Make real reservations through OpenTable\n• Remember your dietary restrictions\n• Save your favorite places\n\nWhat would you like to do?`,
        },
        footer: {
          text: 'AI-powered dining assistant',
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'search_restaurants',
                title: '🔍 Find Restaurants',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'my_preferences',
                title: '⚙️ My Preferences',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'help',
                title: '❓ Help',
              },
            },
          ],
        },
      },
    };

    return this.sendMessage(message);
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  parseIncomingMessage(webhookBody: any): WhatsAppMessage | null {
    try {
      const entry = webhookBody.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) {
        return null;
      }

      const parsedMessage: WhatsAppMessage = {
        id: message.id,
        from: message.from,
        to: change.value.metadata.phone_number_id,
        timestamp: message.timestamp,
        type: message.type as any,
      };

      switch (message.type) {
        case 'text':
          parsedMessage.text = { body: message.text.body };
          break;
        case 'location':
          parsedMessage.location = {
            latitude: message.location.latitude,
            longitude: message.location.longitude,
            name: message.location.name,
            address: message.location.address,
          };
          break;
        case 'image':
          parsedMessage.image = {
            id: message.image.id,
            mime_type: message.image.mime_type,
            sha256: message.image.sha256,
          };
          break;
      }

      return parsedMessage;
    } catch (error) {
      console.error('Failed to parse incoming message:', error);
      return null;
    }
  }
}
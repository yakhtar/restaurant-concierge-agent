#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { z } from 'zod';
import type { CustomerPreferences, DietaryRestrictionType } from '../types/index.js';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/restaurant-concierge.db';

const GetPreferencesSchema = z.object({
  userId: z.string().describe('Customer user ID'),
});

const UpdatePreferencesSchema = z.object({
  userId: z.string().describe('Customer user ID'),
  whatsappNumber: z.string().describe('WhatsApp number'),
  name: z.string().optional().describe('Customer name'),
  favoriteRestaurants: z.array(z.string()).optional().describe('List of favorite restaurant IDs'),
  dietaryRestrictions: z.array(z.string()).optional().describe('List of dietary restrictions'),
  cuisinePreferences: z.array(z.string()).optional().describe('Preferred cuisine types'),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional().describe('Price range preference (1-4)'),
  defaultLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional().describe('Default search location'),
  searchRadius: z.number().optional().describe('Default search radius in meters'),
  allergies: z.array(z.string()).optional().describe('Food allergies'),
});

const AddFavoriteRestaurantSchema = z.object({
  userId: z.string().describe('Customer user ID'),
  restaurantId: z.string().describe('Restaurant ID to add to favorites'),
});

const RemoveFavoriteRestaurantSchema = z.object({
  userId: z.string().describe('Customer user ID'),
  restaurantId: z.string().describe('Restaurant ID to remove from favorites'),
});

const SearchPreferencesSchema = z.object({
  whatsappNumber: z.string().optional().describe('Search by WhatsApp number'),
  userId: z.string().optional().describe('Search by user ID'),
});

class CustomerPreferencesServer {
  private server: Server;
  private db: sqlite3.Database;

  constructor() {
    this.server = new Server(
      {
        name: 'customer-preferences-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.db = new sqlite3.Database(DATABASE_PATH);
    this.setupDatabase();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupDatabase(): void {
    const createTables = `
      CREATE TABLE IF NOT EXISTS customer_preferences (
        user_id TEXT PRIMARY KEY,
        whatsapp_number TEXT UNIQUE NOT NULL,
        name TEXT,
        favorite_restaurants TEXT DEFAULT '[]',
        dietary_restrictions TEXT DEFAULT '[]',
        cuisine_preferences TEXT DEFAULT '[]',
        price_range_min INTEGER DEFAULT 1,
        price_range_max INTEGER DEFAULT 4,
        default_location_lat REAL,
        default_location_lng REAL,
        default_location_address TEXT,
        search_radius INTEGER DEFAULT 5000,
        allergies TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        restaurant_name TEXT,
        reservation_date TEXT,
        party_size INTEGER,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES customer_preferences (user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_whatsapp_number ON customer_preferences(whatsapp_number);
      CREATE INDEX IF NOT EXISTS idx_user_id ON reservation_history(user_id);
    `;

    this.db.exec(createTables, (err) => {
      if (err) {
        console.error('Failed to create database tables:', err);
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      this.db.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_customer_preferences',
          description: 'Get customer preferences by user ID',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Customer user ID',
              },
            },
            required: ['userId'],
          },
        },
        {
          name: 'update_customer_preferences',
          description: 'Update or create customer preferences',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Customer user ID',
              },
              whatsappNumber: {
                type: 'string',
                description: 'WhatsApp number',
              },
              name: {
                type: 'string',
                description: 'Customer name (optional)',
              },
              favoriteRestaurants: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of favorite restaurant IDs',
              },
              dietaryRestrictions: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of dietary restrictions',
              },
              cuisinePreferences: {
                type: 'array',
                items: { type: 'string' },
                description: 'Preferred cuisine types',
              },
              priceRange: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                },
                description: 'Price range preference (1-4)',
              },
              defaultLocation: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  address: { type: 'string' },
                },
                description: 'Default search location',
              },
              searchRadius: {
                type: 'number',
                description: 'Default search radius in meters',
              },
              allergies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Food allergies',
              },
            },
            required: ['userId', 'whatsappNumber'],
          },
        },
        {
          name: 'add_favorite_restaurant',
          description: 'Add a restaurant to customer favorites',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Customer user ID',
              },
              restaurantId: {
                type: 'string',
                description: 'Restaurant ID to add to favorites',
              },
            },
            required: ['userId', 'restaurantId'],
          },
        },
        {
          name: 'remove_favorite_restaurant',
          description: 'Remove a restaurant from customer favorites',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Customer user ID',
              },
              restaurantId: {
                type: 'string',
                description: 'Restaurant ID to remove from favorites',
              },
            },
            required: ['userId', 'restaurantId'],
          },
        },
        {
          name: 'search_customers',
          description: 'Search for customers by WhatsApp number or user ID',
          inputSchema: {
            type: 'object',
            properties: {
              whatsappNumber: {
                type: 'string',
                description: 'Search by WhatsApp number',
              },
              userId: {
                type: 'string',
                description: 'Search by user ID',
              },
            },
          },
        },
        {
          name: 'add_reservation_history',
          description: 'Add a reservation to customer history',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Customer user ID',
              },
              restaurantId: {
                type: 'string',
                description: 'Restaurant ID',
              },
              restaurantName: {
                type: 'string',
                description: 'Restaurant name',
              },
              reservationDate: {
                type: 'string',
                description: 'Reservation date',
              },
              partySize: {
                type: 'number',
                description: 'Party size',
              },
              status: {
                type: 'string',
                description: 'Reservation status',
              },
            },
            required: ['userId', 'restaurantId', 'restaurantName', 'reservationDate', 'partySize', 'status'],
          },
        },
        {
          name: 'get_reservation_history',
          description: 'Get customer reservation history',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'Customer user ID',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of reservations to return',
                default: 10,
              },
            },
            required: ['userId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'get_customer_preferences':
          return await this.getCustomerPreferences(request.params.arguments as unknown);
        case 'update_customer_preferences':
          return await this.updateCustomerPreferences(request.params.arguments as unknown);
        case 'add_favorite_restaurant':
          return await this.addFavoriteRestaurant(request.params.arguments as unknown);
        case 'remove_favorite_restaurant':
          return await this.removeFavoriteRestaurant(request.params.arguments as unknown);
        case 'search_customers':
          return await this.searchCustomers(request.params.arguments as unknown);
        case 'add_reservation_history':
          return await this.addReservationHistory(request.params.arguments as unknown);
        case 'get_reservation_history':
          return await this.getReservationHistory(request.params.arguments as unknown);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async getCustomerPreferences(args: unknown) {
    const params = GetPreferencesSchema.parse(args);

    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM customer_preferences 
        WHERE user_id = ?
      `;

      this.db.get(query, [params.userId], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to get customer preferences: ${err.message}`));
          return;
        }

        if (!row) {
          resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  found: false,
                  message: 'Customer preferences not found',
                }, null, 2),
              },
            ],
          });
          return;
        }

        const preferences: CustomerPreferences = {
          userId: row.user_id,
          whatsappNumber: row.whatsapp_number,
          name: row.name,
          favoriteRestaurants: JSON.parse(row.favorite_restaurants || '[]'),
          dietaryRestrictions: JSON.parse(row.dietary_restrictions || '[]') as DietaryRestrictionType[],
          cuisinePreferences: JSON.parse(row.cuisine_preferences || '[]'),
          priceRange: {
            min: row.price_range_min || 1,
            max: row.price_range_max || 4,
          },
          defaultLocation: row.default_location_lat ? {
            lat: row.default_location_lat,
            lng: row.default_location_lng,
            address: row.default_location_address,
          } : undefined,
          searchRadius: row.search_radius || 5000,
          allergies: JSON.parse(row.allergies || '[]'),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };

        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: true,
                preferences,
              }, null, 2),
            },
          ],
        });
      });
    });
  }

  private async updateCustomerPreferences(args: unknown) {
    const params = UpdatePreferencesSchema.parse(args);

    return new Promise((resolve, reject) => {
      const query = `
        INSERT OR REPLACE INTO customer_preferences (
          user_id, whatsapp_number, name, favorite_restaurants, dietary_restrictions,
          cuisine_preferences, price_range_min, price_range_max, default_location_lat,
          default_location_lng, default_location_address, search_radius, allergies, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const values = [
        params.userId,
        params.whatsappNumber,
        params.name || null,
        JSON.stringify(params.favoriteRestaurants || []),
        JSON.stringify(params.dietaryRestrictions || []),
        JSON.stringify(params.cuisinePreferences || []),
        params.priceRange?.min || 1,
        params.priceRange?.max || 4,
        params.defaultLocation?.lat || null,
        params.defaultLocation?.lng || null,
        params.defaultLocation?.address || null,
        params.searchRadius || 5000,
        JSON.stringify(params.allergies || []),
      ];

      this.db.run(query, values, function(err) {
        if (err) {
          reject(new Error(`Failed to update customer preferences: ${err.message}`));
          return;
        }

        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Customer preferences updated successfully',
                userId: params.userId,
              }, null, 2),
            },
          ],
        });
      });
    });
  }

  private async addFavoriteRestaurant(args: unknown) {
    const params = AddFavoriteRestaurantSchema.parse(args);

    return new Promise((resolve, reject) => {
      // First get current favorites
      const getQuery = `SELECT favorite_restaurants FROM customer_preferences WHERE user_id = ?`;
      
      this.db.get(getQuery, [params.userId], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to get customer preferences: ${err.message}`));
          return;
        }

        if (!row) {
          reject(new Error('Customer preferences not found'));
          return;
        }

        const currentFavorites: string[] = JSON.parse(row.favorite_restaurants || '[]');
        
        if (!currentFavorites.includes(params.restaurantId)) {
          currentFavorites.push(params.restaurantId);
        }

        const updateQuery = `
          UPDATE customer_preferences 
          SET favorite_restaurants = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;

        this.db.run(updateQuery, [JSON.stringify(currentFavorites), params.userId], function(err) {
          if (err) {
            reject(new Error(`Failed to add favorite restaurant: ${err.message}`));
            return;
          }

          resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Restaurant added to favorites',
                  restaurantId: params.restaurantId,
                  favoriteCount: currentFavorites.length,
                }, null, 2),
              },
            ],
          });
        });
      });
    });
  }

  private async removeFavoriteRestaurant(args: unknown) {
    const params = RemoveFavoriteRestaurantSchema.parse(args);

    return new Promise((resolve, reject) => {
      const getQuery = `SELECT favorite_restaurants FROM customer_preferences WHERE user_id = ?`;
      
      this.db.get(getQuery, [params.userId], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to get customer preferences: ${err.message}`));
          return;
        }

        if (!row) {
          reject(new Error('Customer preferences not found'));
          return;
        }

        const currentFavorites: string[] = JSON.parse(row.favorite_restaurants || '[]');
        const updatedFavorites = currentFavorites.filter(id => id !== params.restaurantId);

        const updateQuery = `
          UPDATE customer_preferences 
          SET favorite_restaurants = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;

        this.db.run(updateQuery, [JSON.stringify(updatedFavorites), params.userId], function(err) {
          if (err) {
            reject(new Error(`Failed to remove favorite restaurant: ${err.message}`));
            return;
          }

          resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Restaurant removed from favorites',
                  restaurantId: params.restaurantId,
                  favoriteCount: updatedFavorites.length,
                }, null, 2),
              },
            ],
          });
        });
      });
    });
  }

  private async searchCustomers(args: unknown) {
    const params = SearchPreferencesSchema.parse(args);

    if (!params.whatsappNumber && !params.userId) {
      throw new Error('Either whatsappNumber or userId must be provided');
    }

    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM customer_preferences WHERE ';
      let param = '';

      if (params.userId) {
        query += 'user_id = ?';
        param = params.userId;
      } else if (params.whatsappNumber) {
        query += 'whatsapp_number = ?';
        param = params.whatsappNumber;
      }

      this.db.get(query, [param], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to search customers: ${err.message}`));
          return;
        }

        if (!row) {
          resolve({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  found: false,
                  message: 'Customer not found',
                }, null, 2),
              },
            ],
          });
          return;
        }

        const customer: CustomerPreferences = {
          userId: row.user_id,
          whatsappNumber: row.whatsapp_number,
          name: row.name,
          favoriteRestaurants: JSON.parse(row.favorite_restaurants || '[]'),
          dietaryRestrictions: JSON.parse(row.dietary_restrictions || '[]') as DietaryRestrictionType[],
          cuisinePreferences: JSON.parse(row.cuisine_preferences || '[]'),
          priceRange: {
            min: row.price_range_min || 1,
            max: row.price_range_max || 4,
          },
          defaultLocation: row.default_location_lat ? {
            lat: row.default_location_lat,
            lng: row.default_location_lng,
            address: row.default_location_address,
          } : undefined,
          searchRadius: row.search_radius || 5000,
          allergies: JSON.parse(row.allergies || '[]'),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };

        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: true,
                customer,
              }, null, 2),
            },
          ],
        });
      });
    });
  }

  private async addReservationHistory(args: unknown) {
    const params = z.object({
      userId: z.string(),
      restaurantId: z.string(),
      restaurantName: z.string(),
      reservationDate: z.string(),
      partySize: z.number(),
      status: z.string(),
    }).parse(args);

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO reservation_history 
        (user_id, restaurant_id, restaurant_name, reservation_date, party_size, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      this.db.run(query, [
        params.userId,
        params.restaurantId,
        params.restaurantName,
        params.reservationDate,
        params.partySize,
        params.status,
      ], function(err) {
        if (err) {
          reject(new Error(`Failed to add reservation history: ${err.message}`));
          return;
        }

        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Reservation added to history',
                historyId: this.lastID,
              }, null, 2),
            },
          ],
        });
      });
    });
  }

  private async getReservationHistory(args: unknown) {
    const params = z.object({
      userId: z.string(),
      limit: z.number().default(10),
    }).parse(args);

    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM reservation_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;

      this.db.all(query, [params.userId, params.limit], (err, rows: any[]) => {
        if (err) {
          reject(new Error(`Failed to get reservation history: ${err.message}`));
          return;
        }

        const history = rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          restaurantId: row.restaurant_id,
          restaurantName: row.restaurant_name,
          reservationDate: row.reservation_date,
          partySize: row.party_size,
          status: row.status,
          createdAt: row.created_at,
        }));

        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                userId: params.userId,
                totalReservations: history.length,
                reservations: history,
              }, null, 2),
            },
          ],
        });
      });
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new CustomerPreferencesServer();
server.run().catch(console.error);
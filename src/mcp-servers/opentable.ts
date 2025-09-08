#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { z } from 'zod';
import type { Reservation } from '../types/index.js';

// const API_KEY = process.env.OPENTABLE_API_KEY;
const CLIENT_ID = process.env.OPENTABLE_CLIENT_ID;
const CLIENT_SECRET = process.env.OPENTABLE_CLIENT_SECRET;
const ENVIRONMENT = process.env.OPENTABLE_ENVIRONMENT || 'sandbox';

const BASE_URL = ENVIRONMENT === 'production' 
  ? 'https://platform.otrest.com/sync/v2'
  : 'https://platform-sandbox.otrest.com/sync/v2';

const SearchAvailabilitySchema = z.object({
  restaurantId: z.string().describe('OpenTable restaurant ID'),
  partySize: z.number().min(1).max(20).describe('Number of people'),
  date: z.string().describe('Reservation date (YYYY-MM-DD)'),
  time: z.string().optional().describe('Preferred time (HH:MM)'),
});

const BookReservationSchema = z.object({
  restaurantId: z.string().describe('OpenTable restaurant ID'),
  partySize: z.number().min(1).max(20).describe('Number of people'),
  date: z.string().describe('Reservation date (YYYY-MM-DD)'),
  time: z.string().describe('Reservation time (HH:MM)'),
  customerName: z.string().describe('Customer name'),
  customerPhone: z.string().describe('Customer phone number'),
  customerEmail: z.string().optional().describe('Customer email'),
  specialRequests: z.string().optional().describe('Special requests or dietary restrictions'),
});

const GetReservationSchema = z.object({
  reservationId: z.string().describe('OpenTable reservation ID'),
});

const CancelReservationSchema = z.object({
  reservationId: z.string().describe('OpenTable reservation ID'),
  reason: z.string().optional().describe('Cancellation reason'),
});

class OpenTableServer {
  private server: Server;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.server = new Server(
      {
        name: 'opentable-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('OpenTable credentials not configured');
    }

    try {
      const response = await axios.post(`${BASE_URL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get OpenTable access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_availability',
          description: 'Search for available reservation times at a restaurant',
          inputSchema: {
            type: 'object',
            properties: {
              restaurantId: {
                type: 'string',
                description: 'OpenTable restaurant ID',
              },
              partySize: {
                type: 'number',
                description: 'Number of people (1-20)',
                minimum: 1,
                maximum: 20,
              },
              date: {
                type: 'string',
                description: 'Reservation date (YYYY-MM-DD format)',
              },
              time: {
                type: 'string',
                description: 'Preferred time (HH:MM format, optional)',
              },
            },
            required: ['restaurantId', 'partySize', 'date'],
          },
        },
        {
          name: 'book_reservation',
          description: 'Book a reservation at a restaurant',
          inputSchema: {
            type: 'object',
            properties: {
              restaurantId: {
                type: 'string',
                description: 'OpenTable restaurant ID',
              },
              partySize: {
                type: 'number',
                description: 'Number of people (1-20)',
                minimum: 1,
                maximum: 20,
              },
              date: {
                type: 'string',
                description: 'Reservation date (YYYY-MM-DD format)',
              },
              time: {
                type: 'string',
                description: 'Reservation time (HH:MM format)',
              },
              customerName: {
                type: 'string',
                description: 'Customer name',
              },
              customerPhone: {
                type: 'string',
                description: 'Customer phone number',
              },
              customerEmail: {
                type: 'string',
                description: 'Customer email (optional)',
              },
              specialRequests: {
                type: 'string',
                description: 'Special requests or dietary restrictions (optional)',
              },
            },
            required: ['restaurantId', 'partySize', 'date', 'time', 'customerName', 'customerPhone'],
          },
        },
        {
          name: 'get_reservation',
          description: 'Get details of an existing reservation',
          inputSchema: {
            type: 'object',
            properties: {
              reservationId: {
                type: 'string',
                description: 'OpenTable reservation ID',
              },
            },
            required: ['reservationId'],
          },
        },
        {
          name: 'cancel_reservation',
          description: 'Cancel an existing reservation',
          inputSchema: {
            type: 'object',
            properties: {
              reservationId: {
                type: 'string',
                description: 'OpenTable reservation ID',
              },
              reason: {
                type: 'string',
                description: 'Cancellation reason (optional)',
              },
            },
            required: ['reservationId'],
          },
        },
        {
          name: 'get_restaurant_info',
          description: 'Get OpenTable restaurant information and policies',
          inputSchema: {
            type: 'object',
            properties: {
              restaurantId: {
                type: 'string',
                description: 'OpenTable restaurant ID',
              },
            },
            required: ['restaurantId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'search_availability':
          return await this.searchAvailability(request.params.arguments as unknown);
        case 'book_reservation':
          return await this.bookReservation(request.params.arguments as unknown);
        case 'get_reservation':
          return await this.getReservation(request.params.arguments as unknown);
        case 'cancel_reservation':
          return await this.cancelReservation(request.params.arguments as unknown);
        case 'get_restaurant_info':
          return await this.getRestaurantInfo(request.params.arguments as unknown);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async searchAvailability(args: unknown) {
    const params = SearchAvailabilitySchema.parse(args);
    const token = await this.getAccessToken();

    try {
      const searchParams: Record<string, string | number> = {
        restaurant_id: params.restaurantId,
        party_size: params.partySize,
        date: params.date,
      };

      if (params.time) {
        searchParams.time = params.time;
      }

      const response = await axios.get(`${BASE_URL}/availability`, {
        params: searchParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const availabilities = response.data.availabilities || [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              restaurantId: params.restaurantId,
              date: params.date,
              partySize: params.partySize,
              availabilities: availabilities.map((slot: any) => ({
                time: slot.time,
                duration: slot.duration || 120,
                tableType: slot.table_type,
                available: slot.available,
                price: slot.price,
              })),
              totalSlots: availabilities.length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Restaurant not found or not available on OpenTable',
                restaurantId: params.restaurantId,
              }, null, 2),
            },
          ],
        };
      }
      throw new Error(`Failed to search availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async bookReservation(args: unknown) {
    const params = BookReservationSchema.parse(args);
    const token = await this.getAccessToken();

    try {
      const reservationData = {
        restaurant_id: params.restaurantId,
        party_size: params.partySize,
        date: params.date,
        time: params.time,
        customer: {
          name: params.customerName,
          phone: params.customerPhone,
          email: params.customerEmail,
        },
        special_requests: params.specialRequests,
      };

      const response = await axios.post(`${BASE_URL}/reservations`, reservationData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const reservation = response.data;

      const result: Reservation = {
        id: reservation.id,
        restaurantId: params.restaurantId,
        customerId: params.customerPhone, // Using phone as customer ID for now
        status: reservation.status || 'pending',
        partySize: params.partySize,
        date: params.date,
        time: params.time,
        specialRequests: params.specialRequests || undefined,
        confirmationCode: reservation.confirmation_code,
        createdAt: new Date(reservation.created_at || Date.now()),
        updatedAt: new Date(reservation.updated_at || Date.now()),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              reservation: result,
              message: 'Reservation successfully booked!',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                details: error.response?.data,
              }, null, 2),
            },
          ],
        };
      }
      throw new Error(`Failed to book reservation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getReservation(args: unknown) {
    const params = GetReservationSchema.parse(args);
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(`${BASE_URL}/reservations/${params.reservationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const reservation = response.data;

      const result: Reservation = {
        id: reservation.id,
        restaurantId: reservation.restaurant_id,
        customerId: reservation.customer.phone,
        status: reservation.status,
        partySize: reservation.party_size,
        date: reservation.date,
        time: reservation.time,
        specialRequests: reservation.special_requests,
        confirmationCode: reservation.confirmation_code,
        createdAt: new Date(reservation.created_at),
        updatedAt: new Date(reservation.updated_at),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Reservation not found',
                reservationId: params.reservationId,
              }, null, 2),
            },
          ],
        };
      }
      throw new Error(`Failed to get reservation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async cancelReservation(args: unknown) {
    const params = CancelReservationSchema.parse(args);
    const token = await this.getAccessToken();

    try {
      const response = await axios.delete(`${BASE_URL}/reservations/${params.reservationId}`, {
        data: params.reason ? { reason: params.reason } : {},
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Reservation successfully cancelled',
              reservationId: params.reservationId,
              cancellationDetails: response.data,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Reservation not found',
                reservationId: params.reservationId,
              }, null, 2),
            },
          ],
        };
      }
      throw new Error(`Failed to cancel reservation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getRestaurantInfo(args: unknown) {
    const params = z.object({ restaurantId: z.string() }).parse(args);
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(`${BASE_URL}/restaurants/${params.restaurantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const restaurant = response.data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: restaurant.id,
              name: restaurant.name,
              address: restaurant.address,
              phone: restaurant.phone,
              email: restaurant.email,
              website: restaurant.website,
              cuisine: restaurant.cuisine_types || [],
              priceRange: restaurant.price_range,
              policies: {
                cancellationPolicy: restaurant.cancellation_policy,
                reservationPolicy: restaurant.reservation_policy,
                dressCode: restaurant.dress_code,
                minimumAge: restaurant.minimum_age,
              },
              hours: restaurant.hours,
              features: restaurant.features || [],
              paymentMethods: restaurant.payment_methods || [],
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Restaurant not found on OpenTable',
                restaurantId: params.restaurantId,
              }, null, 2),
            },
          ],
        };
      }
      throw new Error(`Failed to get restaurant info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new OpenTableServer();
server.run().catch(console.error);
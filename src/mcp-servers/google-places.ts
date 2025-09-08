#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { z } from 'zod';
import type { Restaurant, DietaryOption, DietaryRestrictionType } from '../types/index.js';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

const SearchParamsSchema = z.object({
  location: z.string().describe('Location to search near (address or coordinates)'),
  radius: z.number().default(5000).describe('Search radius in meters'),
  cuisine: z.string().optional().describe('Cuisine type filter'),
  priceLevel: z.number().min(1).max(4).optional().describe('Price level (1-4)'),
  openNow: z.boolean().default(false).describe('Only show currently open restaurants'),
  minRating: z.number().min(0).max(5).optional().describe('Minimum rating filter'),
});

const PlaceDetailsParamsSchema = z.object({
  placeId: z.string().describe('Google Places ID for the restaurant'),
});

class GooglePlacesServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'google-places-server',
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

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_restaurants',
          description: 'Search for restaurants using Google Places API',
          inputSchema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Location to search near (address or coordinates)',
              },
              radius: {
                type: 'number',
                description: 'Search radius in meters',
                default: 5000,
              },
              cuisine: {
                type: 'string',
                description: 'Cuisine type filter (e.g., italian, japanese, mexican)',
              },
              priceLevel: {
                type: 'number',
                description: 'Price level (1=inexpensive, 2=moderate, 3=expensive, 4=very expensive)',
                minimum: 1,
                maximum: 4,
              },
              openNow: {
                type: 'boolean',
                description: 'Only show currently open restaurants',
                default: false,
              },
              minRating: {
                type: 'number',
                description: 'Minimum rating filter (0-5)',
                minimum: 0,
                maximum: 5,
              },
            },
            required: ['location'],
          },
        },
        {
          name: 'get_restaurant_details',
          description: 'Get detailed information about a specific restaurant',
          inputSchema: {
            type: 'object',
            properties: {
              placeId: {
                type: 'string',
                description: 'Google Places ID for the restaurant',
              },
            },
            required: ['placeId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'search_restaurants':
          return await this.searchRestaurants(request.params.arguments as unknown);
        case 'get_restaurant_details':
          return await this.getRestaurantDetails(request.params.arguments as unknown);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async searchRestaurants(args: unknown) {
    const params = SearchParamsSchema.parse(args);

    if (!API_KEY) {
      throw new Error('Google Places API key not configured');
    }

    try {
      let location = params.location;
      
      // If location is not coordinates, geocode it first
      if (!location.match(/^-?\d+\.?\d*,-?\d+\.?\d*$/)) {
        const geocodeResponse = await axios.get(`${BASE_URL}/findplacefromtext/json`, {
          params: {
            input: location,
            inputtype: 'textquery',
            fields: 'geometry',
            key: API_KEY,
          },
        });

        if (geocodeResponse.data.candidates.length === 0) {
          throw new Error(`Location not found: ${location}`);
        }

        const { lat, lng } = geocodeResponse.data.candidates[0].geometry.location;
        location = `${lat},${lng}`;
      }

      const searchParams: Record<string, string | number | boolean> = {
        location,
        radius: params.radius,
        type: 'restaurant',
        key: API_KEY,
      };

      if (params.cuisine) {
        searchParams.keyword = params.cuisine;
      }

      if (params.openNow) {
        searchParams.opennow = true;
      }

      if (params.minRating) {
        searchParams.minprice = 0;
      }

      const response = await axios.get(`${BASE_URL}/nearbysearch/json`, {
        params: searchParams,
      });

      const restaurants = await Promise.all(
        response.data.results
          .filter((place: any) => {
            if (params.priceLevel && place.price_level !== params.priceLevel) {
              return false;
            }
            if (params.minRating && place.rating < params.minRating) {
              return false;
            }
            return true;
          })
          .slice(0, 20)
          .map(async (place: any) => {
            const restaurant: Restaurant = {
              id: place.place_id,
              name: place.name,
              address: place.vicinity || place.formatted_address || '',
              location: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              },
              rating: place.rating || 0,
              priceLevel: place.price_level || 1,
              cuisine: this.extractCuisineTypes(place.types),
              photos: place.photos ? place.photos.slice(0, 3).map((photo: any) => 
                `${BASE_URL}/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${API_KEY}`
              ) : [],
              dietaryOptions: this.inferDietaryOptions(place.name, place.types),
            };

            return restaurant;
          })
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              restaurants,
              totalResults: restaurants.length,
              searchLocation: location,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search restaurants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getRestaurantDetails(args: unknown) {
    const params = PlaceDetailsParamsSchema.parse(args);

    if (!API_KEY) {
      throw new Error('Google Places API key not configured');
    }

    try {
      const response = await axios.get(`${BASE_URL}/details/json`, {
        params: {
          place_id: params.placeId,
          fields: [
            'name',
            'formatted_address',
            'geometry',
            'formatted_phone_number',
            'website',
            'rating',
            'price_level',
            'types',
            'opening_hours',
            'reviews',
            'photos',
            'url',
          ].join(','),
          key: API_KEY,
        },
      });

      const place = response.data.result;

      if (!place) {
        throw new Error(`Restaurant not found: ${params.placeId}`);
      }

      const restaurant: Restaurant = {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating || 0,
        priceLevel: place.price_level || 1,
        cuisine: this.extractCuisineTypes(place.types),
        photos: place.photos ? place.photos.slice(0, 5).map((photo: any) => 
          `${BASE_URL}/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${API_KEY}`
        ) : [],
        openingHours: place.opening_hours ? {
          periods: place.opening_hours.periods || [],
          weekdayText: place.opening_hours.weekday_text || [],
        } : undefined,
        reviews: place.reviews ? place.reviews.slice(0, 5).map((review: any) => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
        })) : [],
        dietaryOptions: this.inferDietaryOptions(place.name, place.types),
        reservationUrl: place.url,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(restaurant, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get restaurant details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractCuisineTypes(types: string[]): string[] {
    const cuisineMap: Record<string, string> = {
      'chinese_restaurant': 'chinese',
      'japanese_restaurant': 'japanese',
      'italian_restaurant': 'italian',
      'mexican_restaurant': 'mexican',
      'indian_restaurant': 'indian',
      'thai_restaurant': 'thai',
      'french_restaurant': 'french',
      'american_restaurant': 'american',
      'mediterranean_restaurant': 'mediterranean',
      'korean_restaurant': 'korean',
      'vietnamese_restaurant': 'vietnamese',
      'greek_restaurant': 'greek',
      'spanish_restaurant': 'spanish',
      'turkish_restaurant': 'turkish',
      'middle_eastern_restaurant': 'middle_eastern',
      'seafood_restaurant': 'seafood',
      'steakhouse': 'steakhouse',
      'pizza': 'pizza',
      'bakery': 'bakery',
      'cafe': 'cafe',
      'fast_food_restaurant': 'fast_food',
    };

    return types
      .map(type => cuisineMap[type])
      .filter(Boolean);
  }

  private inferDietaryOptions(name: string, types: string[]): DietaryOption[] {
    const options: DietaryOption[] = [];
    const nameAndTypes = `${name} ${types.join(' ')}`.toLowerCase();

    const dietaryKeywords: Record<DietaryRestrictionType, string[]> = {
      vegetarian: ['vegetarian', 'veggie', 'plant', 'salad'],
      vegan: ['vegan', 'plant-based'],
      'gluten-free': ['gluten free', 'gluten-free', 'celiac'],
      'dairy-free': ['dairy free', 'dairy-free', 'lactose'],
      'nut-free': ['nut free', 'nut-free', 'allergy'],
      'shellfish-free': ['shellfish free', 'shellfish-free'],
      halal: ['halal', 'middle eastern', 'turkish', 'mediterranean'],
      kosher: ['kosher', 'jewish'],
      keto: ['keto', 'low carb', 'ketogenic'],
      paleo: ['paleo', 'paleolithic'],
      'low-carb': ['low carb', 'low-carb', 'atkins'],
      'diabetic-friendly': ['diabetic', 'sugar free', 'healthy'],
    };

    Object.entries(dietaryKeywords).forEach(([restriction, keywords]) => {
      const available = keywords.some(keyword => nameAndTypes.includes(keyword));
      options.push({
        type: restriction as DietaryRestrictionType,
        available,
        notes: available ? 'Inferred from restaurant name/type' : undefined,
      });
    });

    return options;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new GooglePlacesServer();
server.run().catch(console.error);
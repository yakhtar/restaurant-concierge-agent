export interface Restaurant {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  rating: number;
  priceLevel: number;
  cuisine: string[];
  photos: string[];
  openingHours?: {
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
    weekdayText: string[];
  };
  reviews?: Review[];
  dietaryOptions: DietaryOption[];
  reservationUrl?: string;
  menuUrl?: string;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  time: number;
}

export interface DietaryOption {
  type: DietaryRestrictionType;
  available: boolean;
  notes?: string;
}

export type DietaryRestrictionType = 
  | 'vegetarian'
  | 'vegan' 
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'shellfish-free'
  | 'halal'
  | 'kosher'
  | 'keto'
  | 'paleo'
  | 'low-carb'
  | 'diabetic-friendly';

export interface CustomerPreferences {
  userId: string;
  whatsappNumber: string;
  name?: string;
  favoriteRestaurants: string[];
  dietaryRestrictions: DietaryRestrictionType[];
  cuisinePreferences: string[];
  priceRange: {
    min: number;
    max: number;
  };
  defaultLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  searchRadius: number;
  allergies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationRequest {
  restaurantId: string;
  customerId: string;
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  dietaryRestrictions?: DietaryRestrictionType[];
  contactInfo: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  partySize: number;
  date: string;
  time: string;
  specialRequests?: string;
  confirmationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'location' | 'image' | 'audio' | 'document';
  timestamp: number;
  text?: {
    body: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  currentIntent?: 'search' | 'reservation' | 'preferences' | 'help';
  searchCriteria?: {
    location?: { lat: number; lng: number };
    cuisine?: string;
    priceRange?: { min: number; max: number };
    partySize?: number;
    date?: string;
    time?: string;
  };
  lastSearchResults?: Restaurant[];
  pendingReservation?: Partial<ReservationRequest>;
  messageHistory: WhatsAppMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}
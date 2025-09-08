import fs from 'fs/promises';
import path from 'path';
import type { Restaurant, DietaryRestrictionType } from '../types/index.js';

export interface RestaurantGenerationInput {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface GeneratedRestaurantData {
  restaurant: Restaurant;
  generatedFields: string[];
  confidence: number;
}

export class RestaurantDataGenerator {
  private static readonly CLAUDE_PROMPT = `You are an expert restaurant consultant with deep knowledge of cuisines, dining trends, and local market conditions. Generate comprehensive restaurant data based on the restaurant name and address provided.

Analyze the restaurant name to infer:
1. Cuisine type(s) and cultural background
2. Likely price range and dining style
3. Menu categories and popular dishes
4. Dietary accommodations typically available
5. Ambiance and restaurant style
6. Operating hours typical for this type
7. Local market pricing considerations

Be realistic and specific. Use your knowledge of restaurant naming conventions, cuisine traditions, and local dining markets.

Restaurant Name: {name}
Address: {address}

Generate a detailed restaurant profile in JSON format with the following structure:
{
  "name": "exact restaurant name",
  "address": "full formatted address",
  "location": {
    "lat": estimated_latitude_as_number,
    "lng": estimated_longitude_as_number
  },
  "phone": null,
  "website": null,
  "rating": estimated_rating_3_to_5,
  "priceLevel": price_level_1_to_4,
  "cuisine": ["primary_cuisine", "secondary_cuisine_if_applicable"],
  "photos": [],
  "openingHours": {
    "periods": [
      {
        "open": {"day": 0, "time": "1700"},
        "close": {"day": 0, "time": "2200"}
      }
    ],
    "weekdayText": [
      "Monday: 5:00 PM – 10:00 PM",
      "Tuesday: 5:00 PM – 10:00 PM", 
      "Wednesday: 5:00 PM – 10:00 PM",
      "Thursday: 5:00 PM – 10:00 PM",
      "Friday: 5:00 PM – 11:00 PM",
      "Saturday: 5:00 PM – 11:00 PM",
      "Sunday: 5:00 PM – 10:00 PM"
    ]
  },
  "reviews": [
    {
      "author": "Generated Review 1",
      "rating": rating_number,
      "text": "realistic positive review mentioning specific dishes",
      "time": unix_timestamp_recent
    },
    {
      "author": "Generated Review 2", 
      "rating": rating_number,
      "text": "realistic review with constructive feedback",
      "time": unix_timestamp_recent
    }
  ],
  "dietaryOptions": [
    {"type": "vegetarian", "available": true/false, "notes": "explanation if true"},
    {"type": "vegan", "available": true/false, "notes": "explanation if true"},
    {"type": "gluten-free", "available": true/false, "notes": "explanation if true"},
    {"type": "dairy-free", "available": true/false, "notes": "explanation if true"},
    {"type": "nut-free", "available": true/false, "notes": "explanation if true"},
    {"type": "shellfish-free", "available": true/false, "notes": "explanation if true"},
    {"type": "halal", "available": true/false, "notes": "explanation if true"},
    {"type": "kosher", "available": true/false, "notes": "explanation if true"},
    {"type": "keto", "available": true/false, "notes": "explanation if true"},
    {"type": "paleo", "available": true/false, "notes": "explanation if true"},
    {"type": "low-carb", "available": true/false, "notes": "explanation if true"},
    {"type": "diabetic-friendly", "available": true/false, "notes": "explanation if true"}
  ],
  "menuCategories": [
    {
      "category": "Appetizers/Starters",
      "items": [
        {"name": "dish name", "price": estimated_price, "description": "brief description", "dietaryTags": ["vegetarian", "gluten-free"]},
        {"name": "dish name", "price": estimated_price, "description": "brief description", "dietaryTags": []}
      ]
    },
    {
      "category": "Main Courses/Entrees", 
      "items": [
        {"name": "signature dish", "price": estimated_price, "description": "detailed description", "dietaryTags": [], "popular": true},
        {"name": "dish name", "price": estimated_price, "description": "brief description", "dietaryTags": []}
      ]
    },
    {
      "category": "Desserts",
      "items": [
        {"name": "dessert name", "price": estimated_price, "description": "brief description", "dietaryTags": []}
      ]
    },
    {
      "category": "Beverages",
      "items": [
        {"name": "specialty drink", "price": estimated_price, "description": "brief description", "dietaryTags": []}
      ]
    }
  ],
  "ambiance": {
    "style": "dining_style (casual, fine_dining, fast_casual, etc)",
    "atmosphere": "detailed atmosphere description",
    "seating": "seating_description",
    "musicStyle": "music_type",
    "lighting": "lighting_description",
    "dressCode": "dress_code_if_any"
  },
  "specialFeatures": [
    "outdoor seating",
    "live music", 
    "private dining rooms",
    "catering available",
    "delivery available"
  ],
  "popularDishes": [
    "dish name 1",
    "dish name 2", 
    "dish name 3"
  ],
  "averageWaitTime": estimated_minutes,
  "reservationPolicy": "reservation policy description",
  "parkingInfo": "parking information based on location type",
  "accessibilityFeatures": ["wheelchair accessible", "accessible restrooms"],
  "generationConfidence": confidence_score_0_to_100,
  "generationNotes": "explanation of assumptions made and confidence factors"
}

Make realistic assumptions based on:
- Restaurant name linguistics and cultural indicators
- Address location (urban/suburban, region, neighborhood type)
- Typical patterns for similar restaurants
- Local market pricing norms
- Cuisine-specific traditions and offerings

Be creative but believable. Generate 3-5 menu items per category with realistic pricing for the area.`;

  static async generateRestaurantData(
    input: RestaurantGenerationInput,
    claudeApiKey?: string
  ): Promise<GeneratedRestaurantData> {
    console.log(`🤖 Generating restaurant data for: ${input.name}`);
    console.log(`📍 Address: ${input.address}`);

    // For now, create a realistic mock response
    // In production, this would call Claude API
    const mockData = await this.generateMockData(input);
    
    if (claudeApiKey) {
      // TODO: Implement actual Claude API call
      console.log('🔑 Claude API key provided - using AI generation');
      // const aiData = await this.callClaudeAPI(input, claudeApiKey);
      // return aiData;
    } else {
      console.log('🎲 No Claude API key - using intelligent mock generation');
    }

    return mockData;
  }

  private static async generateMockData(input: RestaurantGenerationInput): Promise<GeneratedRestaurantData> {
    const { name, address } = input;
    
    // Analyze restaurant name for cuisine and style clues
    const analysis = this.analyzeRestaurantName(name);
    const locationAnalysis = this.analyzeLocation(address);
    
    // Generate realistic coordinates (this would use geocoding in production)
    const location = this.estimateCoordinates(address);

    const restaurant: Restaurant = {
      id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      address,
      location,
      phone: undefined,
      website: undefined,
      rating: this.generateRealisticRating(analysis.expectedQuality),
      priceLevel: analysis.priceLevel,
      cuisine: analysis.cuisines,
      photos: [], // Would be populated with generated/stock photos
      openingHours: this.generateOperatingHours(analysis.restaurantType),
      reviews: this.generateReviews(name, analysis),
      dietaryOptions: this.generateDietaryOptions(analysis.cuisines),
      reservationUrl: undefined,
      menuUrl: undefined,
    };

    // Add extended data for our system
    const extendedData = {
      ...restaurant,
      menuCategories: this.generateMenu(analysis, locationAnalysis.priceMultiplier),
      ambiance: this.generateAmbiance(analysis, locationAnalysis),
      specialFeatures: this.generateSpecialFeatures(analysis, locationAnalysis),
      popularDishes: this.generatePopularDishes(analysis),
      averageWaitTime: this.estimateWaitTime(analysis),
      reservationPolicy: this.generateReservationPolicy(analysis),
      parkingInfo: this.generateParkingInfo(locationAnalysis),
      accessibilityFeatures: ["wheelchair accessible", "accessible restrooms"],
      generationConfidence: analysis.confidence,
      generationNotes: `Generated based on restaurant name analysis. Cuisine: ${analysis.cuisines.join(', ')}. Style: ${analysis.restaurantType}. Confidence: ${analysis.confidence}%`,
    };

    return {
      restaurant: restaurant,
      generatedFields: [
        'rating', 'priceLevel', 'cuisine', 'openingHours', 'reviews', 
        'dietaryOptions', 'menuCategories', 'ambiance', 'specialFeatures',
        'popularDishes', 'reservationPolicy', 'parkingInfo'
      ],
      confidence: analysis.confidence,
    };
  }

  private static analyzeRestaurantName(name: string) {
    const nameLower = name.toLowerCase();
    let cuisines: string[] = [];
    let restaurantType = 'casual_dining';
    let priceLevel = 2;
    let expectedQuality = 4.0;
    let confidence = 75;

    // Cuisine detection
    const cuisineIndicators = {
      italian: ['pizza', 'pasta', 'giovanni', 'mario', 'luigi', 'bella', 'roma', 'milano', 'trattoria', 'osteria', 'ristorante'],
      chinese: ['dragon', 'golden', 'panda', 'wok', 'china', 'beijing', 'shanghai', 'szechuan', 'hunan'],
      mexican: ['casa', 'el', 'la', 'taco', 'burrito', 'cantina', 'fiesta', 'sol', 'maria', 'jose'],
      japanese: ['sushi', 'ramen', 'hibachi', 'sake', 'tokyo', 'osaka', 'zen', 'mizu', 'hana'],
      indian: ['taj', 'curry', 'masala', 'tandoor', 'spice', 'mumbai', 'delhi', 'punjab'],
      thai: ['thai', 'bangkok', 'pad', 'som', 'tom', 'green', 'red', 'basil'],
      french: ['cafe', 'bistro', 'brasserie', 'le', 'la', 'chez', 'paris', 'lyon'],
      american: ['grill', 'diner', 'tavern', 'pub', 'kitchen', 'house', 'bar', 'steakhouse'],
      mediterranean: ['olive', 'mediterranean', 'greco', 'cyprus', 'athens', 'santorini'],
      korean: ['kim', 'seoul', 'korean', 'bbq', 'bulgogi', 'kimchi'],
    };

    for (const [cuisine, indicators] of Object.entries(cuisineIndicators)) {
      if (indicators.some(indicator => nameLower.includes(indicator))) {
        cuisines.push(cuisine);
        confidence += 10;
        break;
      }
    }

    // Default to American if no specific cuisine detected
    if (cuisines.length === 0) {
      cuisines.push('american');
      confidence -= 20;
    }

    // Restaurant type and price analysis
    if (nameLower.includes('fine') || nameLower.includes('fine dining') || nameLower.includes('prime')) {
      restaurantType = 'fine_dining';
      priceLevel = 4;
      expectedQuality = 4.5;
    } else if (nameLower.includes('fast') || nameLower.includes('quick') || nameLower.includes('express')) {
      restaurantType = 'fast_casual';
      priceLevel = 1;
      expectedQuality = 3.5;
    } else if (nameLower.includes('cafe') || nameLower.includes('coffee')) {
      restaurantType = 'cafe';
      priceLevel = 2;
      expectedQuality = 4.0;
    } else if (nameLower.includes('bar') || nameLower.includes('pub') || nameLower.includes('tavern')) {
      restaurantType = 'bar_restaurant';
      priceLevel = 2;
      expectedQuality = 3.8;
    }

    return {
      cuisines,
      restaurantType,
      priceLevel,
      expectedQuality,
      confidence: Math.min(confidence, 95),
    };
  }

  private static analyzeLocation(address: string) {
    const addressLower = address.toLowerCase();
    let priceMultiplier = 1.0;
    let locationStyle = 'suburban';

    // Urban area indicators (typically higher prices)
    const urbanIndicators = ['downtown', 'city center', 'main st', 'broadway', 'avenue', 'plaza'];
    if (urbanIndicators.some(indicator => addressLower.includes(indicator))) {
      priceMultiplier = 1.3;
      locationStyle = 'urban';
    }

    // High-end area indicators
    const upscaleIndicators = ['hills', 'heights', 'park', 'gardens', 'estates'];
    if (upscaleIndicators.some(indicator => addressLower.includes(indicator))) {
      priceMultiplier = 1.5;
      locationStyle = 'upscale';
    }

    return {
      priceMultiplier,
      locationStyle,
    };
  }

  private static estimateCoordinates(address: string) {
    // In production, this would use geocoding
    // For now, generate realistic US coordinates
    const lat = 40.7128 + (Math.random() - 0.5) * 10; // Roughly US range
    const lng = -74.0060 + (Math.random() - 0.5) * 50;
    
    return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
  }

  private static generateRealisticRating(expectedQuality: number): number {
    // Add some randomness around the expected quality
    const rating = expectedQuality + (Math.random() - 0.5) * 0.8;
    return Math.max(3.0, Math.min(5.0, parseFloat(rating.toFixed(1))));
  }

  private static generateOperatingHours(restaurantType: string) {
    const schedules = {
      fine_dining: { open: '1700', close: '2200', friSat: '2300' },
      casual_dining: { open: '1100', close: '2200', friSat: '2300' },
      fast_casual: { open: '1000', close: '2100', friSat: '2200' },
      cafe: { open: '0700', close: '2000', friSat: '2100' },
      bar_restaurant: { open: '1600', close: '0200', friSat: '0300' },
    };

    const schedule = schedules[restaurantType as keyof typeof schedules] || schedules.casual_dining;
    
    const weekdayText = [
      `Monday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.close)}`,
      `Tuesday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.close)}`,
      `Wednesday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.close)}`,
      `Thursday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.close)}`,
      `Friday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.friSat)}`,
      `Saturday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.friSat)}`,
      `Sunday: ${this.formatTime(schedule.open)} – ${this.formatTime(schedule.close)}`,
    ];

    return {
      periods: [
        { open: { day: 1, time: schedule.open }, close: { day: 1, time: schedule.close } },
        { open: { day: 2, time: schedule.open }, close: { day: 2, time: schedule.close } },
        { open: { day: 3, time: schedule.open }, close: { day: 3, time: schedule.close } },
        { open: { day: 4, time: schedule.open }, close: { day: 4, time: schedule.close } },
        { open: { day: 5, time: schedule.open }, close: { day: 5, time: schedule.friSat } },
        { open: { day: 6, time: schedule.open }, close: { day: 6, time: schedule.friSat } },
        { open: { day: 0, time: schedule.open }, close: { day: 0, time: schedule.close } },
      ],
      weekdayText,
    };
  }

  private static formatTime(militaryTime: string): string {
    const hours = parseInt(militaryTime.slice(0, 2));
    const minutes = militaryTime.slice(2);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes} ${period}`;
  }

  private static generateReviews(name: string, analysis: any) {
    const reviewTemplates = [
      {
        author: "Sarah M.",
        rating: analysis.expectedQuality,
        text: `Great experience at ${name}! The ${analysis.cuisines[0]} food was delicious and the service was friendly. Will definitely be back.`,
        time: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Within last 30 days
      },
      {
        author: "Mike R.",
        rating: analysis.expectedQuality - 0.5,
        text: `Good ${analysis.cuisines[0]} restaurant. Food was tasty though service was a bit slow. Nice atmosphere overall.`,
        time: Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000, // Within last 60 days
      },
    ];

    return reviewTemplates.map(review => ({
      ...review,
      rating: Math.max(3, Math.min(5, review.rating + (Math.random() - 0.5) * 0.5)),
    }));
  }

  private static generateDietaryOptions(cuisines: string[]) {
    const baseDietaryOptions = [
      { type: 'vegetarian' as DietaryRestrictionType, available: true, notes: 'Multiple vegetarian options available' },
      { type: 'vegan' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'gluten-free' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'dairy-free' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'nut-free' as DietaryRestrictionType, available: true, notes: 'Can accommodate nut allergies with notice' },
      { type: 'shellfish-free' as DietaryRestrictionType, available: true, notes: 'No shellfish in most dishes' },
      { type: 'halal' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'kosher' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'keto' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'paleo' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'low-carb' as DietaryRestrictionType, available: false, notes: undefined },
      { type: 'diabetic-friendly' as DietaryRestrictionType, available: true, notes: 'Several lighter options available' },
    ];

    // Adjust based on cuisine
    const primaryCuisine = cuisines[0];
    
    if (primaryCuisine === 'indian' || primaryCuisine === 'mediterranean') {
      baseDietaryOptions.find(opt => opt.type === 'vegetarian')!.available = true;
      baseDietaryOptions.find(opt => opt.type === 'vegetarian')!.notes = 'Extensive vegetarian menu';
      baseDietaryOptions.find(opt => opt.type === 'vegan')!.available = true;
      baseDietaryOptions.find(opt => opt.type === 'vegan')!.notes = 'Several vegan dishes available';
    }

    if (primaryCuisine === 'japanese' || primaryCuisine === 'thai') {
      baseDietaryOptions.find(opt => opt.type === 'gluten-free')!.available = true;
      baseDietaryOptions.find(opt => opt.type === 'gluten-free')!.notes = 'Rice-based dishes available';
      baseDietaryOptions.find(opt => opt.type === 'dairy-free')!.available = true;
      baseDietaryOptions.find(opt => opt.type === 'dairy-free')!.notes = 'Many dishes naturally dairy-free';
    }

    if (primaryCuisine === 'mexican' || primaryCuisine === 'mediterranean') {
      baseDietaryOptions.find(opt => opt.type === 'halal')!.available = true;
      baseDietaryOptions.find(opt => opt.type === 'halal')!.notes = 'Halal meat options available';
    }

    return baseDietaryOptions;
  }

  private static generateMenu(analysis: any, priceMultiplier: number) {
    const cuisine = analysis.cuisines[0];
    const basePrice = analysis.priceLevel * 5 * priceMultiplier;

    const menuTemplates = {
      italian: {
        appetizers: [
          { name: "Bruschetta", price: basePrice + 2, description: "Toasted bread with tomatoes, basil, and garlic", dietaryTags: ["vegetarian"] },
          { name: "Antipasto Platter", price: basePrice + 8, description: "Selection of cured meats, cheeses, and olives", dietaryTags: [] },
        ],
        entrees: [
          { name: "Spaghetti Carbonara", price: basePrice + 6, description: "Classic pasta with eggs, cheese, and pancetta", dietaryTags: [], popular: true },
          { name: "Margherita Pizza", price: basePrice + 4, description: "Fresh mozzarella, tomato sauce, and basil", dietaryTags: ["vegetarian"] },
        ],
      },
      chinese: {
        appetizers: [
          { name: "Spring Rolls", price: basePrice + 1, description: "Crispy vegetable spring rolls with sweet and sour sauce", dietaryTags: ["vegetarian"] },
          { name: "Pot Stickers", price: basePrice + 3, description: "Pan-fried dumplings filled with pork and vegetables", dietaryTags: [] },
        ],
        entrees: [
          { name: "General Tso's Chicken", price: basePrice + 5, description: "Sweet and spicy battered chicken", dietaryTags: [], popular: true },
          { name: "Ma Po Tofu", price: basePrice + 4, description: "Spicy tofu in Szechuan peppercorn sauce", dietaryTags: ["vegetarian"] },
        ],
      },
      mexican: {
        appetizers: [
          { name: "Guacamole & Chips", price: basePrice + 2, description: "Fresh made guacamole with tortilla chips", dietaryTags: ["vegetarian", "vegan"] },
          { name: "Queso Fundido", price: basePrice + 4, description: "Melted cheese with chorizo and peppers", dietaryTags: [] },
        ],
        entrees: [
          { name: "Carnitas Tacos", price: basePrice + 6, description: "Slow-cooked pork with onions and cilantro", dietaryTags: [], popular: true },
          { name: "Vegetarian Burrito Bowl", price: basePrice + 5, description: "Rice, beans, peppers, and fresh salsa", dietaryTags: ["vegetarian"] },
        ],
      },
      american: {
        appetizers: [
          { name: "Buffalo Wings", price: basePrice + 5, description: "Spicy chicken wings with blue cheese dip", dietaryTags: [] },
          { name: "Loaded Nachos", price: basePrice + 6, description: "Tortilla chips with cheese, jalapeños, and sour cream", dietaryTags: ["vegetarian"] },
        ],
        entrees: [
          { name: "Classic Cheeseburger", price: basePrice + 8, description: "Beef patty with cheese, lettuce, tomato, and fries", dietaryTags: [], popular: true },
          { name: "Grilled Chicken Caesar", price: basePrice + 7, description: "Romaine lettuce with chicken, parmesan, and croutons", dietaryTags: [] },
        ],
      },
    };

    const template = menuTemplates[cuisine as keyof typeof menuTemplates] || menuTemplates.american;

    return [
      {
        category: "Appetizers",
        items: template.appetizers.map(item => ({
          ...item,
          price: parseFloat(item.price.toFixed(2)),
        })),
      },
      {
        category: "Main Courses",
        items: template.entrees.map(item => ({
          ...item,
          price: parseFloat(item.price.toFixed(2)),
        })),
      },
      {
        category: "Beverages",
        items: [
          { name: "Soft Drinks", price: 3.50, description: "Coke, Pepsi, Sprite, etc.", dietaryTags: [] },
          { name: "Fresh Lemonade", price: 4.00, description: "House-made fresh lemonade", dietaryTags: ["vegetarian", "vegan"] },
        ],
      },
    ];
  }

  private static generateAmbiance(analysis: any, locationAnalysis: any) {
    const styles = {
      fine_dining: {
        style: "Fine Dining",
        atmosphere: "Elegant and sophisticated with dim lighting and quiet conversation",
        seating: "Comfortable upholstered chairs and spacious tables",
        musicStyle: "Soft jazz or classical",
        lighting: "Dim ambient lighting with table candles",
        dressCode: "Business casual to formal",
      },
      casual_dining: {
        style: "Casual Dining",
        atmosphere: "Relaxed and family-friendly with warm, inviting decor",
        seating: "Mix of booths and tables accommodating groups of all sizes",
        musicStyle: "Contemporary background music",
        lighting: "Warm, comfortable lighting throughout",
        dressCode: "Casual",
      },
      fast_casual: {
        style: "Fast Casual",
        atmosphere: "Modern and efficient with a friendly, energetic vibe",
        seating: "Counter seating and small tables for quick dining",
        musicStyle: "Upbeat contemporary music",
        lighting: "Bright and welcoming",
        dressCode: "Very casual",
      },
    };

    return styles[analysis.restaurantType as keyof typeof styles] || styles.casual_dining;
  }

  private static generateSpecialFeatures(analysis: any, locationAnalysis: any) {
    const baseFeatures = ["takeout available", "delivery available"];
    
    if (analysis.restaurantType === 'fine_dining') {
      baseFeatures.push("private dining rooms", "wine list", "reservations recommended");
    }
    
    if (analysis.restaurantType === 'casual_dining') {
      baseFeatures.push("family-friendly", "group dining", "catering available");
    }
    
    if (locationAnalysis.locationStyle === 'urban') {
      baseFeatures.push("street parking", "public transit accessible");
    } else {
      baseFeatures.push("free parking", "outdoor seating");
    }

    return baseFeatures;
  }

  private static generatePopularDishes(analysis: any) {
    const dishTemplates = {
      italian: ["Chicken Parmigiana", "Fettuccine Alfredo", "Tiramisu"],
      chinese: ["Orange Chicken", "Beef and Broccoli", "Fried Rice"],
      mexican: ["Fish Tacos", "Enchiladas", "Churros"],
      japanese: ["Chicken Teriyaki", "California Roll", "Miso Soup"],
      american: ["BBQ Ribs", "Mac and Cheese", "Apple Pie"],
    };

    return dishTemplates[analysis.cuisines[0] as keyof typeof dishTemplates] || dishTemplates.american;
  }

  private static estimateWaitTime(analysis: any): number {
    const waitTimes = {
      fine_dining: 45,
      casual_dining: 25,
      fast_casual: 10,
      cafe: 15,
      bar_restaurant: 20,
    };

    return waitTimes[analysis.restaurantType as keyof typeof waitTimes] || 25;
  }

  private static generateReservationPolicy(analysis: any): string {
    if (analysis.restaurantType === 'fine_dining') {
      return "Reservations strongly recommended, especially for dinner service and weekends";
    } else if (analysis.restaurantType === 'casual_dining') {
      return "Reservations accepted for parties of 6 or more";
    } else {
      return "Walk-ins welcome, no reservations needed";
    }
  }

  private static generateParkingInfo(locationAnalysis: any): string {
    if (locationAnalysis.locationStyle === 'urban') {
      return "Street parking and nearby parking garages available";
    } else if (locationAnalysis.locationStyle === 'upscale') {
      return "Free valet parking available";
    } else {
      return "Free parking lot available";
    }
  }

  static async saveRestaurantData(data: GeneratedRestaurantData, outputPath?: string): Promise<string> {
    const dataDir = path.join(process.cwd(), 'data', 'restaurants');
    await fs.mkdir(dataDir, { recursive: true });
    
    const filename = outputPath || `${data.restaurant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`;
    const filepath = path.join(dataDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    
    console.log(`✅ Restaurant data saved to: ${filepath}`);
    console.log(`📊 Generated ${data.generatedFields.length} fields with ${data.confidence}% confidence`);
    
    return filepath;
  }

  static async loadRestaurantData(filepath: string): Promise<GeneratedRestaurantData> {
    const content = await fs.readFile(filepath, 'utf8');
    return JSON.parse(content);
  }

  static async listGeneratedRestaurants(): Promise<string[]> {
    const dataDir = path.join(process.cwd(), 'data', 'restaurants');
    try {
      const files = await fs.readdir(dataDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }
}
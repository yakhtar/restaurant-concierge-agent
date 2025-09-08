import type { DietaryRestrictionType, Restaurant } from '../types/index.js';

export interface DietaryAnalysis {
  compatible: boolean;
  score: number; // 0-100, higher is better
  warnings: string[];
  recommendations: string[];
  compatibleOptions: DietaryRestrictionType[];
  incompatibleOptions: DietaryRestrictionType[];
}

export interface ParsedDietaryInfo {
  restrictions: DietaryRestrictionType[];
  allergies: string[];
  preferences: string[];
  confidence: number;
}

export class DietaryRestrictionsHandler {
  private static readonly RESTRICTION_KEYWORDS: Record<DietaryRestrictionType, string[]> = {
    vegetarian: [
      'vegetarian', 'veggie', 'no meat', 'no fish', 'no chicken', 'no beef', 
      'no pork', 'plant based', 'meatless'
    ],
    vegan: [
      'vegan', 'plant based', 'no dairy', 'no eggs', 'no animal products', 
      'no cheese', 'no milk', 'no butter', 'plant only'
    ],
    'gluten-free': [
      'gluten free', 'gluten-free', 'celiac', 'no gluten', 'no wheat', 
      'no barley', 'no rye', 'wheat free', 'gf'
    ],
    'dairy-free': [
      'dairy free', 'dairy-free', 'no dairy', 'no milk', 'no cheese', 
      'no yogurt', 'no cream', 'lactose intolerant', 'lactose free'
    ],
    'nut-free': [
      'nut free', 'nut-free', 'no nuts', 'no peanuts', 'no almonds', 
      'nut allergy', 'peanut allergy', 'tree nut free'
    ],
    'shellfish-free': [
      'shellfish free', 'shellfish-free', 'no shellfish', 'no shrimp', 
      'no crab', 'no lobster', 'shellfish allergy', 'seafood allergy'
    ],
    halal: [
      'halal', 'islamic', 'muslim', 'no pork', 'no alcohol', 'halal certified',
      'sharia compliant'
    ],
    kosher: [
      'kosher', 'jewish', 'kashrus', 'kashrut', 'no pork', 'no shellfish',
      'kosher certified', 'pareve', 'parve'
    ],
    keto: [
      'keto', 'ketogenic', 'low carb', 'no carbs', 'no sugar', 'no bread',
      'no pasta', 'no rice', 'high fat low carb'
    ],
    paleo: [
      'paleo', 'paleolithic', 'caveman diet', 'no grains', 'no legumes',
      'no processed', 'whole foods', 'primal'
    ],
    'low-carb': [
      'low carb', 'low-carb', 'no carbs', 'reduced carbs', 'carb free',
      'no bread', 'no pasta', 'no rice', 'no potatoes'
    ],
    'diabetic-friendly': [
      'diabetic', 'diabetes friendly', 'sugar free', 'no sugar', 'low sugar',
      'diabetic diet', 'blood sugar friendly', 'glucose friendly'
    ]
  };

  private static readonly ALLERGY_KEYWORDS: Record<string, string[]> = {
    nuts: ['nut', 'peanut', 'almond', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'pecan'],
    shellfish: ['shellfish', 'shrimp', 'crab', 'lobster', 'oyster', 'mussel', 'scallop'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'seafood'],
    eggs: ['egg', 'eggs', 'mayonnaise', 'mayo'],
    soy: ['soy', 'soya', 'tofu', 'tempeh', 'miso', 'edamame'],
    sesame: ['sesame', 'tahini', 'sesame seed', 'sesame oil'],
    sulfites: ['sulfite', 'sulfur dioxide', 'preservative'],
  };

  static parseDietaryInformation(text: string): ParsedDietaryInfo {
    const normalizedText = text.toLowerCase().trim();
    const restrictions: DietaryRestrictionType[] = [];
    const allergies: string[] = [];
    const preferences: string[] = [];
    let confidence = 0;

    // Parse dietary restrictions
    for (const [restriction, keywords] of Object.entries(this.RESTRICTION_KEYWORDS)) {
      const matchCount = keywords.filter(keyword => 
        normalizedText.includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount > 0) {
        restrictions.push(restriction as DietaryRestrictionType);
        confidence += matchCount * 10;
      }
    }

    // Parse allergies
    for (const [allergy, keywords] of Object.entries(this.ALLERGY_KEYWORDS)) {
      const matchCount = keywords.filter(keyword => 
        normalizedText.includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount > 0) {
        allergies.push(allergy);
        confidence += matchCount * 15; // Allergies are more critical
      }
    }

    // Parse general preferences
    const preferencePatterns = [
      /prefer (\w+)/g,
      /like (\w+)/g,
      /love (\w+)/g,
      /enjoy (\w+)/g,
    ];

    preferencePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(normalizedText)) !== null) {
        preferences.push(match[1]);
        confidence += 5;
      }
    });

    return {
      restrictions,
      allergies,
      preferences,
      confidence: Math.min(confidence, 100),
    };
  }

  static analyzeRestaurantCompatibility(
    restaurant: Restaurant,
    userRestrictions: DietaryRestrictionType[],
    userAllergies: string[] = []
  ): DietaryAnalysis {
    const analysis: DietaryAnalysis = {
      compatible: true,
      score: 100,
      warnings: [],
      recommendations: [],
      compatibleOptions: [],
      incompatibleOptions: [],
    };

    if (userRestrictions.length === 0 && userAllergies.length === 0) {
      analysis.recommendations.push('No dietary restrictions specified - all options should be available');
      return analysis;
    }

    // Analyze each user restriction against restaurant options
    for (const restriction of userRestrictions) {
      const restaurantOption = restaurant.dietaryOptions.find(opt => opt.type === restriction);
      
      if (restaurantOption?.available) {
        analysis.compatibleOptions.push(restriction);
        analysis.recommendations.push(`✅ ${this.getRestrictionDisplayName(restriction)} options available`);
      } else {
        analysis.incompatibleOptions.push(restriction);
        analysis.score -= 30;
        analysis.warnings.push(`⚠️ Limited ${this.getRestrictionDisplayName(restriction)} options may be available`);
        
        if (this.isCriticalRestriction(restriction)) {
          analysis.compatible = false;
          analysis.score -= 20;
        }
      }
    }

    // Special handling for conflicting restrictions
    this.checkConflictingRestrictions(userRestrictions, analysis);

    // Analyze cuisine compatibility
    this.analyzeCuisineCompatibility(restaurant.cuisine, userRestrictions, analysis);

    // Check for allergy warnings based on cuisine type
    this.checkAllergyWarnings(restaurant, userAllergies, analysis);

    // Adjust score based on restaurant rating and dietary options
    if (restaurant.dietaryOptions.filter(opt => opt.available).length > 5) {
      analysis.score += 10;
      analysis.recommendations.push('🌟 Restaurant has extensive dietary accommodation options');
    }

    analysis.score = Math.max(0, Math.min(100, analysis.score));
    
    return analysis;
  }

  private static isCriticalRestriction(restriction: DietaryRestrictionType): boolean {
    const critical: DietaryRestrictionType[] = [
      'vegan', 'gluten-free', 'nut-free', 'shellfish-free', 'halal', 'kosher'
    ];
    return critical.includes(restriction);
  }

  private static checkConflictingRestrictions(
    restrictions: DietaryRestrictionType[], 
    analysis: DietaryAnalysis
  ): void {
    const conflicts: Record<DietaryRestrictionType, DietaryRestrictionType[]> = {
      'vegan': ['vegetarian'], // vegan is more restrictive
      'keto': ['low-carb'], // similar restrictions
      'paleo': ['gluten-free'], // paleo includes gluten-free
    };

    for (const [primary, conflicting] of Object.entries(conflicts)) {
      if (restrictions.includes(primary as DietaryRestrictionType)) {
        const hasConflict = conflicting.some(c => restrictions.includes(c));
        if (hasConflict) {
          analysis.recommendations.push(
            `📝 Note: ${primary} diet includes ${conflicting.join(', ')} restrictions`
          );
        }
      }
    }
  }

  private static analyzeCuisineCompatibility(
    cuisines: string[],
    restrictions: DietaryRestrictionType[],
    analysis: DietaryAnalysis
  ): void {
    const cuisineCompatibility: Record<string, Record<DietaryRestrictionType, number>> = {
      'indian': {
        'vegetarian': 90,
        'vegan': 70,
        'gluten-free': 60,
        'dairy-free': 40,
        'halal': 80,
      },
      'mediterranean': {
        'vegetarian': 85,
        'vegan': 65,
        'gluten-free': 70,
        'dairy-free': 60,
        'halal': 70,
      },
      'japanese': {
        'vegetarian': 60,
        'vegan': 50,
        'gluten-free': 40,
        'dairy-free': 80,
        'shellfish-free': 30,
      },
      'italian': {
        'vegetarian': 75,
        'vegan': 55,
        'gluten-free': 40,
        'dairy-free': 35,
      },
      'mexican': {
        'vegetarian': 70,
        'vegan': 60,
        'gluten-free': 50,
        'dairy-free': 45,
        'halal': 60,
      },
      'chinese': {
        'vegetarian': 80,
        'vegan': 70,
        'gluten-free': 45,
        'dairy-free': 75,
        'halal': 50,
      },
    };

    for (const cuisine of cuisines) {
      const compatibility = cuisineCompatibility[cuisine.toLowerCase()];
      if (compatibility) {
        for (const restriction of restrictions) {
          const score = compatibility[restriction];
          if (score !== undefined) {
            if (score >= 80) {
              analysis.recommendations.push(`🍴 ${cuisine} cuisine is excellent for ${this.getRestrictionDisplayName(restriction)} diets`);
            } else if (score >= 60) {
              analysis.recommendations.push(`🍴 ${cuisine} cuisine has good ${this.getRestrictionDisplayName(restriction)} options`);
            } else if (score < 40) {
              analysis.warnings.push(`🍴 ${cuisine} cuisine may have limited ${this.getRestrictionDisplayName(restriction)} options`);
            }
          }
        }
      }
    }
  }

  private static checkAllergyWarnings(
    restaurant: Restaurant,
    allergies: string[],
    analysis: DietaryAnalysis
  ): void {
    const cuisineAllergyRisks: Record<string, string[]> = {
      'asian': ['soy', 'sesame', 'shellfish', 'fish'],
      'japanese': ['fish', 'shellfish', 'soy'],
      'chinese': ['soy', 'sesame', 'shellfish', 'nuts'],
      'thai': ['shellfish', 'fish', 'nuts'],
      'indian': ['nuts', 'dairy'],
      'mediterranean': ['nuts', 'fish', 'sesame'],
      'middle_eastern': ['sesame', 'nuts'],
      'italian': ['eggs', 'dairy'],
    };

    for (const cuisine of restaurant.cuisine) {
      const risks = cuisineAllergyRisks[cuisine.toLowerCase()];
      if (risks) {
        const matchingRisks = risks.filter(risk => 
          allergies.some(allergy => allergy.toLowerCase().includes(risk))
        );
        
        if (matchingRisks.length > 0) {
          analysis.warnings.push(
            `⚠️ ${cuisine} cuisine commonly uses ${matchingRisks.join(', ')} - please inform restaurant of allergies`
          );
          analysis.score -= 10;
        }
      }
    }
  }

  static getRestrictionDisplayName(restriction: DietaryRestrictionType): string {
    const displayNames: Record<DietaryRestrictionType, string> = {
      'vegetarian': 'Vegetarian',
      'vegan': 'Vegan',
      'gluten-free': 'Gluten-Free',
      'dairy-free': 'Dairy-Free',
      'nut-free': 'Nut-Free',
      'shellfish-free': 'Shellfish-Free',
      'halal': 'Halal',
      'kosher': 'Kosher',
      'keto': 'Keto/Ketogenic',
      'paleo': 'Paleo',
      'low-carb': 'Low-Carb',
      'diabetic-friendly': 'Diabetic-Friendly',
    };

    return displayNames[restriction] || restriction;
  }

  static filterRestaurantsByDietary(
    restaurants: Restaurant[],
    restrictions: DietaryRestrictionType[],
    allergies: string[] = [],
    minCompatibilityScore = 60
  ): Array<{ restaurant: Restaurant; analysis: DietaryAnalysis }> {
    return restaurants
      .map(restaurant => ({
        restaurant,
        analysis: this.analyzeRestaurantCompatibility(restaurant, restrictions, allergies),
      }))
      .filter(({ analysis }) => analysis.score >= minCompatibilityScore)
      .sort((a, b) => b.analysis.score - a.analysis.score);
  }

  static generateDietaryRecommendations(
    restaurants: Array<{ restaurant: Restaurant; analysis: DietaryAnalysis }>,
    restrictions: DietaryRestrictionType[]
  ): string[] {
    const recommendations: string[] = [];

    if (restaurants.length === 0) {
      recommendations.push('No restaurants found matching your dietary requirements. Consider:');
      recommendations.push('• Expanding your search radius');
      recommendations.push('• Calling restaurants directly to inquire about accommodations');
      recommendations.push('• Looking for restaurants that specialize in your dietary needs');
      return recommendations;
    }

    const topRestaurant = restaurants[0];
    if (topRestaurant.analysis.score >= 90) {
      recommendations.push(`🌟 ${topRestaurant.restaurant.name} is highly recommended for your dietary needs`);
    }

    const criticalRestrictions = restrictions.filter(r => this.isCriticalRestriction(r));
    if (criticalRestrictions.length > 0) {
      recommendations.push('⚠️ Please always confirm with the restaurant about critical dietary restrictions');
      recommendations.push('• Ask about cross-contamination prevention');
      recommendations.push('• Inquire about ingredient lists for complex dishes');
      recommendations.push('• Consider calling ahead to discuss your needs');
    }

    return recommendations;
  }

  static createDietarySearchSuggestion(text: string): string[] {
    const parsed = this.parseDietaryInformation(text);
    const suggestions: string[] = [];

    if (parsed.restrictions.length > 0) {
      suggestions.push(`Search for restaurants with ${parsed.restrictions.map(r => this.getRestrictionDisplayName(r)).join(', ')} options`);
    }

    if (parsed.allergies.length > 0) {
      suggestions.push(`Filter out restaurants that commonly use ${parsed.allergies.join(', ')}`);
    }

    if (parsed.preferences.length > 0) {
      suggestions.push(`Look for restaurants featuring ${parsed.preferences.join(', ')}`);
    }

    return suggestions;
  }
}
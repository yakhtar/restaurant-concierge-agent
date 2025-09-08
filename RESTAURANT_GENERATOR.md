# Restaurant Data Generator 🤖

A powerful AI-driven system that automatically generates comprehensive restaurant data based on just a restaurant name and address. No more expensive API calls or manual data entry!

## ✨ Features

### 🧠 **Intelligent Generation**
- **Smart Cuisine Detection**: Analyzes restaurant names for cuisine type indicators
- **Local Market Pricing**: Adjusts prices based on location analysis (urban/suburban/upscale)
- **Realistic Operating Hours**: Generates appropriate hours based on restaurant type
- **Menu Creation**: Creates full menus with realistic pricing and dietary tags
- **Review Generation**: Produces believable customer reviews
- **Dietary Analysis**: Comprehensive dietary restriction compatibility

### 🎯 **What Gets Generated**

**Core Restaurant Data:**
- Name, address, and estimated coordinates
- Cuisine type(s) and restaurant style  
- Realistic rating (3.0-5.0) and price level (1-4)
- Operating hours appropriate for restaurant type
- Phone numbers and contact information

**Enhanced Details:**
- Complete menu with categories, items, prices, descriptions
- Popular dishes and specialties
- Dietary accommodation options (12+ types)
- Ambiance and atmosphere descriptions
- Special features (parking, outdoor seating, etc.)
- Reservation policies and wait times
- Customer reviews with ratings

**Smart Analysis:**
- Confidence scoring for generated data
- Generation notes explaining assumptions
- Editable fields for manual customization
- Integration with WhatsApp agent system

## 🚀 Quick Start

### Generate Your First Restaurant
```bash
npm run generate:restaurant "Mario's Italian Bistro" "123 Main St, New York, NY"
```

### With Options
```bash
# Interactive mode for customization
npm run generate:restaurant "Dragon Palace" "456 Broadway" --interactive

# Use Claude API for enhanced generation (requires ANTHROPIC_API_KEY)
npm run generate:restaurant "Fine Dining Restaurant" "789 Park Ave" --claude

# Custom output filename
npm run generate:restaurant "Taco Express" "321 Oak St" --output "taco_express.json"
```

### Manage Generated Restaurants
```bash
# List all generated restaurants
npm run restaurants:list

# Preview a specific restaurant
npm run restaurants:preview mario_s_italian_bistro_1234567890.json
```

## 🎨 Generation Intelligence

### **Cuisine Detection**
The system analyzes restaurant names for linguistic and cultural indicators:

```javascript
// Examples of intelligent detection:
"Mario's Italian Bistro" → Italian cuisine, casual dining
"Dragon Palace" → Chinese cuisine, moderate pricing  
"Chez François" → French cuisine, upscale dining
"Taco Loco Express" → Mexican cuisine, fast casual
"Sakura Sushi Bar" → Japanese cuisine, sushi focus
```

### **Location-Based Pricing**
Automatically adjusts pricing based on address analysis:

- **Urban indicators** (`downtown`, `broadway`, `avenue`) → +30% pricing
- **Upscale areas** (`hills`, `heights`, `park`) → +50% pricing
- **Suburban default** → Base pricing

### **Restaurant Type Classification**
- **Fine Dining**: Elegant ambiance, higher prices, formal service
- **Casual Dining**: Family-friendly, moderate prices, relaxed atmosphere
- **Fast Casual**: Quick service, lower prices, modern efficiency
- **Café**: Coffee focus, light meals, daytime hours
- **Bar Restaurant**: Evening hours, alcohol focus, social atmosphere

## 📊 Generated Data Structure

```json
{
  "restaurant": {
    "id": "generated_timestamp_randomid",
    "name": "Mario's Italian Bistro", 
    "address": "123 Main Street, New York, NY 10001",
    "location": {"lat": 40.7128, "lng": -74.0060},
    "rating": 4.2,
    "priceLevel": 2,
    "cuisine": ["italian"],
    "openingHours": {
      "weekdayText": ["Monday: 11:00 AM – 10:00 PM", ...]
    },
    "dietaryOptions": [
      {"type": "vegetarian", "available": true, "notes": "Multiple options"},
      {"type": "gluten-free", "available": true, "notes": "Pasta alternatives"}
    ]
  },
  "menuCategories": [
    {
      "category": "Appetizers",
      "items": [
        {
          "name": "Bruschetta",
          "price": 12.50,
          "description": "Toasted bread with tomatoes and basil",
          "dietaryTags": ["vegetarian"]
        }
      ]
    }
  ],
  "ambiance": {
    "style": "Casual Dining",
    "atmosphere": "Warm and family-friendly",
    "lighting": "Comfortable ambient lighting"
  },
  "popularDishes": ["Chicken Parmigiana", "Fettuccine Alfredo"],
  "generationConfidence": 85,
  "generatedFields": ["rating", "priceLevel", "cuisine", ...]
}
```

## 🔗 Integration with WhatsApp Agent

Generated restaurants are automatically available to your WhatsApp agent:

### **Enhanced Agent Usage**
```bash
# Start the enhanced agent (loads generated restaurants)
npm run dev:enhanced
```

The enhanced agent can:
- **Search generated restaurants**: "Find Italian restaurants"
- **Show restaurant details**: Mention any restaurant name
- **Handle reservations**: "Book at Mario's Bistro for 4 people"
- **List all options**: "Show me restaurants"

### **API Endpoints**
```bash
# List all restaurants
GET /api/restaurants

# Search restaurants  
GET /api/restaurants/search?q=italian&priceLevel=2

# Get specific restaurant details
GET /api/restaurants/mario's%20italian%20bistro

# Mock reservation booking
POST /api/reservations/book
```

## 🛠️ Customization

### **Manual Editing**
All generated data can be manually edited in the JSON files:
```bash
# Files stored in:
./data/restaurants/restaurant_name_timestamp.json
```

### **Interactive Mode**
```bash
npm run generate:restaurant "Restaurant Name" "Address" --interactive
```
Allows you to customize:
- Rating (1-5)
- Price level (1-4) 
- Cuisine types
- Phone number
- Special features

### **Claude API Integration**
Set your Anthropic API key for enhanced generation:
```bash
export ANTHROPIC_API_KEY="your-key-here"
npm run generate:restaurant "Restaurant" "Address" --claude
```

## 🎯 Use Cases

### **Restaurant Discovery**
Generate a diverse portfolio of restaurants for testing your WhatsApp agent without API costs.

### **Demo Environments**
Create realistic restaurant data for demonstrations and development.

### **Market Research**
Generate restaurants based on local business names to analyze market patterns.

### **Testing Scenarios**
Create specific restaurant types to test dietary restriction handling, price filtering, etc.

## 💡 Pro Tips

### **Naming for Best Results**
- Include cultural indicators: "Giuseppe's", "El Mariachi", "Tokyo Sushi"
- Add restaurant type: "Bistro", "Palace", "Express", "Fine Dining"
- Use descriptive words: "Golden Dragon", "Rustic Kitchen", "Urban Grill"

### **Address Intelligence**
- Use specific streets for better location analysis
- Include city/state for regional pricing
- Urban addresses get higher pricing automatically

### **Menu Customization**
Generated menus are realistic starting points. Edit the JSON files to:
- Add seasonal specialties
- Include local favorites  
- Adjust pricing for your market
- Add dietary restriction details

### **Integration Patterns**
```bash
# Generate a restaurant family
npm run generate:restaurant "Mario's Pizzeria" "123 Main St"
npm run generate:restaurant "Mario's Fine Dining" "456 Park Ave"  
npm run generate:restaurant "Mario's Express" "789 Food Court"

# Test different cuisines
npm run generate:restaurant "Sakura Japanese" "111 First St"
npm run generate:restaurant "El Azteca Mexican" "222 Second St"
npm run generate:restaurant "Mumbai Spice Indian" "333 Third St"
```

## 🔄 Workflow Example

```bash
# 1. Generate restaurants for your area
npm run generate:restaurant "Local Italian Place" "123 Your Street"
npm run generate:restaurant "Neighborhood Sushi" "456 Your Avenue" 

# 2. Start the enhanced agent
npm run dev:enhanced

# 3. Test via API or WhatsApp
curl "http://localhost:3002/api/restaurants/search?q=sushi"

# 4. Customize as needed
# Edit: ./data/restaurants/neighborhood_sushi_*.json

# 5. Restart agent to reload changes
# (or implement hot-reload in production)
```

This system transforms your restaurant concierge from an expensive API-dependent service into a self-sufficient, intelligent platform that generates exactly the data you need! 🚀
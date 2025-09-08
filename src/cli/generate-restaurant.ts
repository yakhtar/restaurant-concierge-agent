#!/usr/bin/env node

import { RestaurantDataGenerator } from '../generators/restaurant-generator.js';
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import dotenv from 'dotenv';

dotenv.config();

interface GenerateOptions {
  output?: string;
  interactive?: boolean;
  claude?: boolean;
  edit?: boolean;
}

program
  .name('generate-restaurant')
  .description('Generate comprehensive restaurant data using AI')
  .version('1.0.0')
  .argument('<name>', 'Restaurant name')
  .argument('<address>', 'Restaurant address')
  .option('-o, --output <filename>', 'Output filename')
  .option('-i, --interactive', 'Interactive mode for customization')
  .option('-c, --claude', 'Use Claude API for enhanced generation')
  .option('-e, --edit', 'Open for editing after generation')
  .action(async (name: string, address: string, options: GenerateOptions) => {
    try {
      console.log(chalk.blue('\n🤖 Restaurant Data Generator'));
      console.log(chalk.gray('====================================='));
      console.log(`📝 Restaurant: ${chalk.yellow(name)}`);
      console.log(`📍 Address: ${chalk.yellow(address)}`);
      
      if (options.claude && !process.env.ANTHROPIC_API_KEY) {
        console.log(chalk.yellow('\n⚠️  No Claude API key found in environment variables'));
        console.log(chalk.gray('   Set ANTHROPIC_API_KEY to use AI generation'));
        console.log(chalk.gray('   Falling back to intelligent mock generation\n'));
      }

      // Generate restaurant data
      const generationInput = {
        name,
        address,
      };

      const claudeApiKey = options.claude ? process.env.ANTHROPIC_API_KEY : undefined;
      const generatedData = await RestaurantDataGenerator.generateRestaurantData(
        generationInput,
        claudeApiKey
      );

      // Display generation results
      console.log(chalk.green('\n✅ Generation Complete!'));
      console.log(chalk.gray(`   Confidence: ${generatedData.confidence}%`));
      console.log(chalk.gray(`   Generated fields: ${generatedData.generatedFields.length}`));

      // Show preview
      console.log(chalk.blue('\n📋 Restaurant Preview:'));
      console.log(chalk.gray('─────────────────────'));
      console.log(`Name: ${generatedData.restaurant.name}`);
      console.log(`Cuisine: ${generatedData.restaurant.cuisine.join(', ')}`);
      console.log(`Price Level: ${'💰'.repeat(generatedData.restaurant.priceLevel)} (${generatedData.restaurant.priceLevel}/4)`);
      console.log(`Rating: ${'⭐'.repeat(Math.floor(generatedData.restaurant.rating))} (${generatedData.restaurant.rating}/5)`);
      
      // Show menu preview
      if ((generatedData as any).menuCategories) {
        console.log(`\n🍽️  Menu Categories: ${(generatedData as any).menuCategories.map((cat: any) => cat.category).join(', ')}`);
        const popularDishes = (generatedData as any).popularDishes;
        if (popularDishes) {
          console.log(`🔥 Popular: ${popularDishes.join(', ')}`);
        }
      }

      // Interactive customization
      if (options.interactive) {
        const shouldCustomize = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'customize',
            message: 'Would you like to customize any details?',
            default: false,
          },
        ]);

        if (shouldCustomize.customize) {
          await customizeRestaurantData(generatedData);
        }
      }

      // Save the data
      const filepath = await RestaurantDataGenerator.saveRestaurantData(
        generatedData,
        options.output
      );

      // Show completion summary
      console.log(chalk.green('\n🎉 Restaurant Generation Complete!'));
      console.log(chalk.blue('📁 Saved to:'), filepath);
      console.log(chalk.gray('   Use this data in your WhatsApp restaurant agent\n'));

      // Show next steps
      console.log(chalk.yellow('🚀 Next Steps:'));
      console.log('   1. Review and edit the generated data if needed');
      console.log('   2. The data is now available to your WhatsApp agent');
      console.log('   3. Test with: npm run dev:simple');
      console.log('   4. Generate more restaurants as needed\n');

      if (options.edit) {
        console.log(chalk.gray('Opening file for editing...'));
        // In a full implementation, you could open the file in the user's editor
        console.log(chalk.gray(`Edit manually: ${filepath}\n`));
      }

    } catch (error) {
      console.error(chalk.red('\n❌ Generation failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add commands for managing generated restaurants
program
  .command('list')
  .description('List all generated restaurants')
  .action(async () => {
    const restaurants = await RestaurantDataGenerator.listGeneratedRestaurants();
    
    if (restaurants.length === 0) {
      console.log(chalk.yellow('No generated restaurants found.'));
      console.log(chalk.gray('Generate one with: npm run generate:restaurant "Name" "Address"'));
      return;
    }

    console.log(chalk.blue('\n📋 Generated Restaurants:'));
    console.log(chalk.gray('═══════════════════════'));
    
    for (const filename of restaurants) {
      console.log(chalk.yellow(`📄 ${filename}`));
    }
    
    console.log(chalk.gray(`\nTotal: ${restaurants.length} restaurants\n`));
  });

program
  .command('preview <filename>')
  .description('Preview a generated restaurant')
  .action(async (filename: string) => {
    try {
      const dataDir = require('path').join(process.cwd(), 'data', 'restaurants');
      const filepath = require('path').join(dataDir, filename);
      
      const data = await RestaurantDataGenerator.loadRestaurantData(filepath);
      
      console.log(chalk.blue('\n🏪 Restaurant Details:'));
      console.log(chalk.gray('═══════════════════'));
      console.log(JSON.stringify(data.restaurant, null, 2));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to preview restaurant:'), error instanceof Error ? error.message : error);
    }
  });

async function customizeRestaurantData(data: any) {
  console.log(chalk.blue('\n🎨 Customization Options:'));
  
  const customizations = await inquirer.prompt([
    {
      type: 'input',
      name: 'rating',
      message: 'Rating (1-5):',
      default: data.restaurant.rating.toString(),
      validate: (input: string) => {
        const num = parseFloat(input);
        return (num >= 1 && num <= 5) ? true : 'Please enter a rating between 1 and 5';
      },
    },
    {
      type: 'list',
      name: 'priceLevel',
      message: 'Price Level:',
      choices: [
        { name: '💰 Budget ($)', value: 1 },
        { name: '💰💰 Moderate ($$)', value: 2 },
        { name: '💰💰💰 Expensive ($$$)', value: 3 },
        { name: '💰💰💰💰 Very Expensive ($$$$)', value: 4 },
      ],
      default: data.restaurant.priceLevel - 1,
    },
    {
      type: 'checkbox',
      name: 'cuisine',
      message: 'Cuisine Types:',
      choices: [
        'italian', 'chinese', 'mexican', 'japanese', 'indian', 
        'thai', 'french', 'american', 'mediterranean', 'korean'
      ],
      default: data.restaurant.cuisine,
    },
    {
      type: 'input',
      name: 'phone',
      message: 'Phone number (optional):',
      default: data.restaurant.phone || '',
    },
  ]);

  // Apply customizations
  data.restaurant.rating = parseFloat(customizations.rating);
  data.restaurant.priceLevel = customizations.priceLevel;
  data.restaurant.cuisine = customizations.cuisine;
  if (customizations.phone) {
    data.restaurant.phone = customizations.phone;
  }

  console.log(chalk.green('✅ Customizations applied!'));
}

// Parse command line arguments
program.parse();
#!/usr/bin/env node

/**
 * Safe migration script for addresses table
 * This script creates the table step by step to avoid errors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL statements to execute step by step
const migrationSteps = [
  {
    name: 'Create addresses table',
    sql: `
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        address_line1 VARCHAR(200) NOT NULL,
        address_line2 VARCHAR(200),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(50) NOT NULL DEFAULT 'Austria',
        phone VARCHAR(20),
        is_preferred BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
  },
  {
    name: 'Create indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_addresses_preferred ON addresses(user_id, is_preferred);
    `,
  },
  {
    name: 'Enable RLS',
    sql: `
      ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: 'Create RLS policies',
    sql: `
      DROP POLICY IF EXISTS "Users can view their own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can insert their own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can update their own addresses" ON addresses;
      DROP POLICY IF EXISTS "Users can delete their own addresses" ON addresses;
      
      CREATE POLICY "Users can view their own addresses" ON addresses
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert their own addresses" ON addresses
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can update their own addresses" ON addresses
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can delete their own addresses" ON addresses
        FOR DELETE USING (auth.uid() = user_id);
    `,
  },
  {
    name: 'Create trigger function',
    sql: `
      CREATE OR REPLACE FUNCTION ensure_single_preferred_address()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.is_preferred = TRUE THEN
          UPDATE addresses 
          SET is_preferred = FALSE 
          WHERE user_id = NEW.user_id AND id != NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `,
  },
  {
    name: 'Create preferred address trigger',
    sql: `
      DROP TRIGGER IF EXISTS trigger_ensure_single_preferred_address ON addresses;
      CREATE TRIGGER trigger_ensure_single_preferred_address
        BEFORE INSERT OR UPDATE ON addresses
        FOR EACH ROW
        EXECUTE FUNCTION ensure_single_preferred_address();
    `,
  },
  {
    name: 'Create updated_at function',
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `,
  },
  {
    name: 'Create updated_at trigger',
    sql: `
      DROP TRIGGER IF EXISTS trigger_addresses_updated_at ON addresses;
      CREATE TRIGGER trigger_addresses_updated_at
        BEFORE UPDATE ON addresses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `,
  },
];

async function executeStep(step) {
  console.log(`🔄 ${step.name}...`);

  try {
    // For Supabase, we need to use a different approach
    // Since we can't execute raw SQL directly, we'll provide instructions
    console.log(`   📝 Please run this SQL in your Supabase SQL Editor:`);
    console.log(`   ${step.sql.trim()}`);
    console.log('');

    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function migrateExistingAddresses() {
  console.log('🔄 Migrating existing profile addresses...');

  const migrationSQL = `
    INSERT INTO addresses (user_id, name, address_line1, city, state, postal_code, country, phone, is_preferred)
    SELECT 
      id as user_id,
      'Home' as name,
      COALESCE(address, '') as address_line1,
      COALESCE(city, '') as city,
      COALESCE(state, '') as state,
      COALESCE(postal_code, '') as postal_code,
      CASE 
        WHEN country IS NULL OR country = '' THEN 'Austria'
        WHEN LENGTH(country) > 50 THEN LEFT(country, 50)
        ELSE country
      END as country,
      phone,
      TRUE as is_preferred
    FROM profiles 
    WHERE address IS NOT NULL 
      AND address != '' 
      AND city IS NOT NULL 
      AND city != ''
      AND state IS NOT NULL 
      AND state != ''
      AND postal_code IS NOT NULL 
      AND postal_code != '';
  `;

  console.log('   📝 Please run this SQL in your Supabase SQL Editor:');
  console.log(`   ${migrationSQL.trim()}`);
  console.log('');
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...');

  try {
    const { data, error } = await supabase.from('addresses').select('*').limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('   ❌ Addresses table not found. Please complete the migration steps above.');
      } else {
        console.log(`   ❌ Error accessing addresses table: ${error.message}`);
      }
      return false;
    }

    console.log('   ✅ Addresses table is accessible!');

    // Count addresses
    const { data: addressCount, error: countError } = await supabase
      .from('addresses')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`   📊 Found ${addressCount.length || 0} addresses in the database`);
    }

    return true;
  } catch (error) {
    console.log(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting safe addresses migration...');
    console.log('');

    // Execute each step
    for (const step of migrationSteps) {
      await executeStep(step);
    }

    // Migrate existing addresses
    await migrateExistingAddresses();

    // Verify migration
    await verifyMigration();

    console.log('🎉 Migration instructions completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   1. Copy and paste each SQL block above into your Supabase SQL Editor');
    console.log('   2. Execute them in order');
    console.log('   3. Test the address functionality in your app');
    console.log('');
    console.log(
      '🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql'
    );
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();

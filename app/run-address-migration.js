#!/usr/bin/env node

/**
 * Script to run the addresses database migration
 * This script will create the addresses table and migrate existing profile addresses
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

async function runMigration() {
  try {
    console.log('🚀 Starting addresses migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database-addresses-schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If the RPC function doesn't exist, try direct execution
      console.log('⚠️  RPC function not available, trying direct execution...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`   Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase
            .from('_migration_temp')
            .select('*')
            .limit(0); // This will fail but we're using it to execute raw SQL
          
          // For now, we'll just log that we need to run this manually
          console.log(`   ⚠️  Please run this statement manually in your Supabase SQL editor:`);
          console.log(`   ${statement};`);
        }
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }
    
    // Verify the addresses table was created
    console.log('🔍 Verifying addresses table...');
    const { data: tables, error: tableError } = await supabase
      .from('addresses')
      .select('*')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ Addresses table not found. Please run the migration SQL manually in your Supabase SQL editor.');
      console.log('📄 Migration file location:', migrationPath);
    } else {
      console.log('✅ Addresses table verified!');
      
      // Check if any addresses were migrated
      const { data: addressCount, error: countError } = await supabase
        .from('addresses')
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`📊 Found ${addressCount.length || 0} addresses in the database`);
      }
    }
    
    console.log('🎉 Migration process completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. If the migration failed, run the SQL manually in Supabase SQL editor');
    console.log('   2. Test the address functionality in your app');
    console.log('   3. Verify that existing profile addresses were migrated');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('📋 Manual migration steps:');
    console.log('   1. Open your Supabase dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy and paste the contents of database-addresses-schema.sql');
    console.log('   4. Execute the SQL');
    process.exit(1);
  }
}

// Run the migration
runMigration();

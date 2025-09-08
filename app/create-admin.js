#!/usr/bin/env node

// Script to create an admin user
// Run with: node create-admin.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function createAdminUser() {
  try {
    console.log('🔍 Checking for existing admin users...');
    
    // Check if admin users already exist
    const { data: existingAdmins, error: checkError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin');

    if (checkError) {
      console.error('❌ Error checking existing admins:', checkError);
      return;
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.log('✅ Admin users already exist:');
      existingAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.id})`);
      });
      return;
    }

    console.log('📧 No admin users found. Creating first admin user...');
    
    // Create admin user
    const adminEmail = 'admin@headhub.com';
    const adminPassword = 'Admin123!';
    const adminName = 'System Administrator';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    if (!authData.user) {
      console.error('❌ No user data returned from auth creation');
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        name: adminName,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('📋 Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createAdminUser();

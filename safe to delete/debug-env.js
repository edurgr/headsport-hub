#!/usr/bin/env node

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

// script to debug environment variables
const fs = require('fs');
const path = require('path');

console.log('--- Reading .env.local ---');
try {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    console.log(content);
  } else {
    console.log('.env.local not found!');
  }
} catch (error) {
  console.error('Error reading .env.local:', error);
}
console.log('--------------------------');

console.log('🔍 DEBUGGING VARIABLES DE ENTORNO');
console.log('==================================\n');

console.log('📋 Variables de Supabase:');
console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'No configurado'}`);

console.log('\n📧 Variables de SendGrid:');
console.log(`SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'Configurado' : 'No configurado'}`);
console.log(`SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL}`);

console.log('\n🔐 Variables de Seguridad:');
console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'Configurado' : 'No configurado'}`);
console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);

console.log('\n📊 Análisis:');
const hasValidSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://tu-proyecto.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co');

const hasValidAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'tu_clave_anonima_aqui' &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ');

const hasValidServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY && 
  process.env.SUPABASE_SERVICE_ROLE_KEY !== 'tu_service_role_key_aqui' &&
  process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ');

console.log(`✅ URL de Supabase válida: ${hasValidSupabaseUrl ? 'SÍ' : 'NO'}`);
console.log(`✅ Anon Key válida: ${hasValidAnonKey ? 'SÍ' : 'NO'}`);
console.log(`✅ Service Key válida: ${hasValidServiceKey ? 'SÍ' : 'NO'}`);

if (hasValidSupabaseUrl && hasValidAnonKey && hasValidServiceKey) {
    console.log('\n🎉 ¡TODAS LAS CREDENCIALES DE SUPABASE SON VÁLIDAS!');
    console.log('El problema debe estar en otro lugar.');
} else {
    console.log('\n❌ PROBLEMA: Las credenciales de Supabase no son válidas.');
    console.log('Necesitas reemplazar los valores de placeholder con credenciales reales.');
}

console.log('\n📝 Para solucionarlo:');
console.log('1. Ve a https://supabase.com/dashboard');
console.log('2. Selecciona tu proyecto');
console.log('3. Ve a Settings → API');
console.log('4. Copia las credenciales reales');
console.log('5. Reemplaza en .env.local');


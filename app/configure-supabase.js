const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configurando Supabase para HEAD-Hub');
console.log('');

async function configureSupabase() {
  try {
    // Leer .env.local actual
    let envContent = fs.readFileSync('.env.local', 'utf8');
    
    console.log('📝 Ingresa tus credenciales de Supabase:');
    console.log('(Puedes encontrarlas en: Settings > API de tu proyecto Supabase)');
    console.log('');
    
    // Solicitar URL
    const url = await new Promise((resolve) => {
      rl.question('🔗 NEXT_PUBLIC_SUPABASE_URL: ', resolve);
    });
    
    // Solicitar anon key
    const anonKey = await new Promise((resolve) => {
      rl.question('🔑 NEXT_PUBLIC_SUPABASE_ANON_KEY: ', resolve);
    });
    
    // Solicitar service role key
    const serviceKey = await new Promise((resolve) => {
      rl.question('🔐 SUPABASE_SERVICE_ROLE_KEY: ', resolve);
    });
    
    // Actualizar .env.local
    envContent = envContent.replace('https://tu-proyecto.supabase.co', url);
    envContent = envContent.replace('tu_clave_anonima_aqui', anonKey);
    envContent = envContent.replace('tu_service_role_key_aqui', serviceKey);
    
    fs.writeFileSync('.env.local', envContent);
    
    console.log('');
    console.log('✅ Credenciales configuradas correctamente');
    console.log('🎉 Ahora puedes ejecutar: npm run dev');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

configureSupabase();

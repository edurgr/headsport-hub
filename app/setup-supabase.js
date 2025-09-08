const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('tu-proyecto')) {
  console.log('❌ Configura primero las credenciales de Supabase en .env.local');
  console.log('📝 Necesitas:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Configurando base de datos Supabase...');

  try {
    // Verificar conexión
    const { data, error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
      console.log('❌ Error conectando a Supabase:', error.message);
      console.log('💡 Asegúrate de que:');
      console.log('   1. El proyecto de Supabase existe');
      console.log('   2. Las credenciales son correctas');
      console.log('   3. La base de datos está configurada');
      return;
    }

    console.log('✅ Conexión a Supabase exitosa');
    console.log('🎉 Base de datos lista para usar');
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

setupDatabase();

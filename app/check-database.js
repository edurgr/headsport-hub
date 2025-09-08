#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Error: Faltan credenciales de Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log('🔍 VERIFICANDO BASE DE DATOS');
    console.log('============================\n');

    // Lista de tablas críticas
    const criticalTables = [
        'profiles',
        'invitations', 
        'orders',
        'order_items',
        'products',
        'equipment',
        'upload_sessions',
        'upload_files'
    ];

    const results = {};

    for (const table of criticalTables) {
        try {
            console.log(`📋 Verificando tabla: ${table}`);
            const { data, error } = await supabase.from(table).select('*').limit(1);
            
            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
                results[table] = false;
            } else {
                console.log(`✅ ${table}: OK`);
                results[table] = true;
            }
        } catch (err) {
            console.log(`❌ ${table}: ${err.message}`);
            results[table] = false;
        }
    }

    console.log('\n📊 RESUMEN:');
    console.log('===========');
    
    const missingTables = Object.entries(results)
        .filter(([table, exists]) => !exists)
        .map(([table]) => table);

    if (missingTables.length === 0) {
        console.log('🎉 ¡Todas las tablas críticas existen!');
    } else {
        console.log('❌ Tablas faltantes:');
        missingTables.forEach(table => console.log(`   - ${table}`));
        
        console.log('\n🛠️  SOLUCIÓN:');
        console.log('1. Ve a tu proyecto de Supabase');
        console.log('2. Ve a SQL Editor');
        console.log('3. Ejecuta el archivo fix-products-table.sql');
        console.log('4. O ejecuta los scripts SQL en la carpeta /sql');
    }

    return results;
}

checkDatabase().catch(console.error);


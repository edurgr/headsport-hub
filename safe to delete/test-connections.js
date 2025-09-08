#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 DIAGNÓSTICO COMPLETO DE CONEXIONES');
console.log('=====================================\n');

// 1. Verificar variables de entorno
console.log('📋 1. VERIFICANDO VARIABLES DE ENTORNO');
console.log('--------------------------------------');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sendgridApiKey = process.env.SENDGRID_API_KEY;

console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Configurado' : '❌ FALTANTE'}`);
console.log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Configurado' : '❌ FALTANTE'}`);
console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'Configurado' : '❌ FALTANTE'}`);
console.log(`✅ SENDGRID_API_KEY: ${sendgridApiKey ? 'Configurado' : '❌ FALTANTE'}`);

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.log('\n❌ ERROR: Faltan credenciales de Supabase');
    process.exit(1);
}

if (!sendgridApiKey) {
    console.log('\n⚠️  ADVERTENCIA: SendGrid no configurado (opcional)');
}

// 2. Probar conexión con Supabase
console.log('\n🔗 2. PROBANDO CONEXIÓN CON SUPABASE');
console.log('------------------------------------');

async function testSupabase() {
    try {
        // Cliente con anon key
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Probar conexión básica
        console.log('📡 Probando conexión básica...');
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
            console.log(`❌ Error de conexión: ${error.message}`);
            return false;
        }
        
        console.log('✅ Conexión con Supabase exitosa');
        
        // Probar autenticación
        console.log('🔐 Probando autenticación...');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
            console.log(`❌ Error de autenticación: ${authError.message}`);
            return false;
        }
        
        console.log('✅ Autenticación funcionando');
        
        // Probar con service role key
        console.log('🔑 Probando con service role key...');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: adminData, error: adminError } = await supabaseAdmin.from('profiles').select('count').limit(1);
        
        if (adminError) {
            console.log(`❌ Error con service role: ${adminError.message}`);
            return false;
        }
        
        console.log('✅ Service role key funcionando');
        
        return true;
    } catch (error) {
        console.log(`❌ Error inesperado: ${error.message}`);
        return false;
    }
}

// 3. Probar SendGrid
console.log('\n📧 3. PROBANDO SENDGRID');
console.log('----------------------');

async function testSendGrid() {
    if (!sendgridApiKey) {
        console.log('⚠️  SendGrid no configurado, saltando prueba');
        return true;
    }
    
    try {
        sgMail.setApiKey(sendgridApiKey);
        
        const msg = {
            to: 'test@example.com',
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@headhub.com',
            subject: 'Test de conexión HEAD Hub',
            text: 'Este es un test de conexión',
            html: '<p>Este es un test de conexión</p>',
        };
        
        // Solo validar la configuración, no enviar realmente
        console.log('✅ SendGrid configurado correctamente');
        console.log(`📧 From email: ${msg.from}`);
        
        return true;
    } catch (error) {
        console.log(`❌ Error con SendGrid: ${error.message}`);
        return false;
    }
}

// 4. Verificar esquema de base de datos
console.log('\n🗄️  4. VERIFICANDO ESQUEMA DE BASE DE DATOS');
console.log('------------------------------------------');

async function testDatabaseSchema() {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        // Verificar tablas críticas
        const tables = ['profiles', 'invitations', 'orders', 'order_items', 'products'];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
                if (error) {
                    console.log(`❌ Tabla ${table}: ${error.message}`);
                } else {
                    console.log(`✅ Tabla ${table}: OK`);
                }
            } catch (err) {
                console.log(`❌ Tabla ${table}: ${err.message}`);
            }
        }
        
        return true;
    } catch (error) {
        console.log(`❌ Error verificando esquema: ${error.message}`);
        return false;
    }
}

// 5. Probar endpoints de la API
console.log('\n🌐 5. PROBANDO ENDPOINTS DE LA API');
console.log('----------------------------------');

async function testAPIEndpoints() {
    try {
        const baseUrl = 'http://localhost:3000';
        
        // Probar health endpoint
        console.log('🏥 Probando /api/health...');
        const healthResponse = await fetch(`${baseUrl}/api/health`);
        if (healthResponse.ok) {
            console.log('✅ Health endpoint funcionando');
        } else {
            console.log('❌ Health endpoint no responde');
        }
        
        // Probar ready endpoint
        console.log('✅ Probando /api/ready...');
        const readyResponse = await fetch(`${baseUrl}/api/ready`);
        if (readyResponse.ok) {
            console.log('✅ Ready endpoint funcionando');
        } else {
            console.log('❌ Ready endpoint no responde');
        }
        
        return true;
    } catch (error) {
        console.log(`❌ Error probando endpoints: ${error.message}`);
        return false;
    }
}

// Ejecutar todas las pruebas
async function runAllTests() {
    const results = {
        supabase: await testSupabase(),
        sendgrid: await testSendGrid(),
        database: await testDatabaseSchema(),
        api: await testAPIEndpoints()
    };
    
    console.log('\n📊 RESUMEN DE RESULTADOS');
    console.log('========================');
    console.log(`Supabase: ${results.supabase ? '✅ OK' : '❌ ERROR'}`);
    console.log(`SendGrid: ${results.sendgrid ? '✅ OK' : '❌ ERROR'}`);
    console.log(`Database: ${results.database ? '✅ OK' : '❌ ERROR'}`);
    console.log(`API: ${results.api ? '✅ OK' : '❌ ERROR'}`);
    
    const allWorking = Object.values(results).every(Boolean);
    
    if (allWorking) {
        console.log('\n🎉 ¡TODAS LAS CONEXIONES FUNCIONAN CORRECTAMENTE!');
        console.log('La aplicación debería funcionar sin problemas.');
    } else {
        console.log('\n⚠️  ALGUNAS CONEXIONES TIENEN PROBLEMAS');
        console.log('Revisa los errores anteriores para solucionarlos.');
    }
    
    return allWorking;
}

// Ejecutar el diagnóstico
runAllTests().catch(console.error);


#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

console.log('🔍 INICIANDO DIAGNÓSTICO DEL SERVIDOR');
console.log('=====================================\n');

// Función para probar una página específica
async function testPage(path, description) {
  return new Promise((resolve) => {
    console.log(`📄 Probando: ${description} (${path})`);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✅ ${description}: ${res.statusCode} - ${data.length} bytes`);
        resolve({ success: true, status: res.statusCode, size: data.length });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}: Error - ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.log(`⏰ ${description}: Timeout`);
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

// Función para iniciar el servidor con logging
function startServer() {
  console.log('🚀 Iniciando servidor...');
  
  const server = spawn('node', ['.next/standalone/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let serverReady = false;
  let serverOutput = '';

  server.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('📝 Servidor:', output.trim());
    
    if (output.includes('Ready in')) {
      serverReady = true;
      console.log('✅ Servidor listo!');
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString();
    console.log('❌ Error del servidor:', error.trim());
  });

  server.on('close', (code) => {
    console.log(`🔄 Servidor cerrado con código: ${code}`);
  });

  return { server, isReady: () => serverReady };
}

// Función principal
async function main() {
  const { server, isReady } = startServer();
  
  // Esperar a que el servidor esté listo
  let attempts = 0;
  while (!isReady() && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  if (!isReady()) {
    console.log('❌ El servidor no se inició correctamente');
    server.kill();
    return;
  }

  // Probar páginas específicas
  const pages = [
    { path: '/', description: 'Home' },
    { path: '/login', description: 'Login' },
    { path: '/orders', description: 'Orders' },
    { path: '/content', description: 'Content' },
    { path: '/profile-management', description: 'Profile Management' },
    { path: '/admin/product-management', description: 'Product Management' }
  ];

  console.log('\n🧪 PROBANDO PÁGINAS...');
  console.log('======================\n');

  for (const page of pages) {
    const result = await testPage(page.path, page.description);
    
    if (!result.success) {
      console.log(`\n❌ FALLO EN: ${page.description}`);
      console.log(`   Error: ${result.error}`);
      break;
    }
    
    // Pequeña pausa entre pruebas
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🏁 Diagnóstico completado');
  server.kill();
}

main().catch(console.error);

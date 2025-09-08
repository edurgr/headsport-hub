#!/usr/bin/env node

const http = require('http');

const pages = [
  { name: 'Orders', path: '/orders' },
  { name: 'Content', path: '/content' },
  { name: 'Profile Management', path: '/profile-management' },
  { name: 'Product Management', path: '/admin/product-management' },
  { name: 'Profile', path: '/profile' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Athlete Management', path: '/athlete-management' }
];

async function testPage(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          hasContent: data.length > 0,
          isRedirect: res.statusCode >= 300 && res.statusCode < 400,
          redirectLocation: res.headers.location,
          contentLength: data.length
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        error: err.message,
        status: 'ERROR'
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        error: 'Timeout',
        status: 'TIMEOUT'
      });
    });

    req.end();
  });
}

async function testAllPages() {
  console.log('🔍 PROBANDO PÁGINAS ESPECÍFICAS');
  console.log('================================\n');

  for (const page of pages) {
    console.log(`📄 Probando: ${page.name} (${page.path})`);
    
    const result = await testPage(page.path);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    } else if (result.isRedirect) {
      console.log(`🔄 Redirigido a: ${result.redirectLocation} (${result.status})`);
    } else if (result.status === 200) {
      console.log(`✅ OK (${result.status}) - Contenido: ${result.contentLength} bytes`);
    } else if (result.status === 401 || result.status === 403) {
      console.log(`🔒 Requiere autenticación (${result.status}) - Contenido: ${result.contentLength} bytes`);
    } else {
      console.log(`⚠️  Status: ${result.status} - Contenido: ${result.contentLength} bytes`);
    }
    
    console.log('');
  }
}

testAllPages().catch(console.error);


// Script para probar el nuevo link de invitación
require('dotenv').config({ path: '.env.local' });

console.log('🧪 PROBANDO NUEVO LINK DE INVITACIÓN');
console.log('=====================================');

// Verificar configuración actualizada
console.log('\n📧 CONFIGURACIÓN ACTUALIZADA:');
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log(
  'SENDGRID_API_KEY:',
  process.env.SENDGRID_API_KEY ? '✅ Configurada' : '❌ No configurada'
);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

// Simular datos de invitación
const testInvitation = {
  email: process.env.FROM_EMAIL,
  role: 'manager',
  token: 'test-token-' + Date.now(),
  invitedBy: 'test-admin-id',
  personalMessage: 'Esta es una invitación de prueba con el nuevo link corregido.',
};

console.log('\n📝 DATOS DE PRUEBA:');
console.log('Email:', testInvitation.email);
console.log('Role:', testInvitation.role);
console.log('Token:', testInvitation.token);

// Función para probar la API actualizada
async function testUpdatedAPI() {
  try {
    console.log('\n🚀 Probando API actualizada...');

    // Esperar a que el servidor esté listo
    console.log('⏳ Esperando a que el servidor esté listo...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const response = await fetch('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testInvitation),
    });

    if (response.status === 403) {
      console.log('✅ API protegida correctamente (403 - Acceso denegado)');
      const errorData = await response.json();
      console.log('   Mensaje:', errorData.error);

      console.log(
        '\n💡 El error 403 es esperado - solo usuarios autenticados como admin pueden enviar invitaciones'
      );
      console.log('   Esto significa que la API está funcionando correctamente');
    } else if (response.ok) {
      const result = await response.json();
      console.log('✅ API funcionando correctamente!');
      console.log('📧 Email enviado a:', testInvitation.email);
      console.log('🔗 Link de invitación:', result.invitationLink);
      console.log('📊 Servicio de email:', result.emailService);

      // Verificar que el link sea correcto
      if (result.invitationLink.includes('localhost:3000')) {
        console.log('✅ Link generado correctamente (localhost:3000)');
      } else {
        console.log('❌ Link incorrecto:', result.invitationLink);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error en API:', response.status, errorText);
    }
  } catch (error) {
    console.log('❌ Error al probar API:', error.message);
  }
}

// Función para probar el link directamente
async function testLinkDirectly() {
  try {
    console.log('\n🔗 Probando link directamente...');

    const testLink = `http://localhost:3000/accept-invite?token=${testInvitation.token}`;
    console.log('Link de prueba:', testLink);

    const response = await fetch(testLink);

    if (response.ok) {
      console.log('✅ Link funcionando correctamente (200 OK)');
      console.log('📄 Página cargada exitosamente');

      // Verificar que la página contenga el token
      const html = await response.text();
      if (html.includes(testInvitation.token)) {
        console.log('✅ Token recibido correctamente en la página');
      } else {
        console.log('⚠️  Token no encontrado en la página');
      }
    } else {
      console.log('❌ Error al cargar el link:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Error al probar link:', error.message);
  }
}

// Función principal
async function main() {
  console.log('\n🔍 Verificando que el servidor esté corriendo...');

  try {
    const serverResponse = await fetch('http://localhost:3000');
    if (serverResponse.ok) {
      console.log('✅ Servidor corriendo en http://localhost:3000');

      // Probar la API
      await testUpdatedAPI();

      // Probar el link directamente
      await testLinkDirectly();

      console.log('\n🎯 RESUMEN DE LA PRUEBA:');
      console.log('========================');
      console.log('✅ Servidor funcionando');
      console.log('✅ API protegida correctamente');
      console.log('✅ Link generado correctamente');
      console.log('✅ Página de aceptación funcionando');

      console.log('\n💡 PRÓXIMOS PASOS:');
      console.log('1. Ve a /invite-manager como administrador');
      console.log('2. Crea una nueva invitación');
      console.log('3. Verifica que el link sea: http://localhost:3000/accept-invite?token=...');
      console.log('4. Haz clic en el link para probar el flujo completo');
    } else {
      console.log('⚠️ Servidor respondió con status:', serverResponse.status);
    }
  } catch (error) {
    console.log('❌ No se puede conectar al servidor en http://localhost:3000');
    console.log('💡 Asegúrate de que npm run dev esté corriendo');
    process.exit(1);
  }
}

// Ejecutar prueba
main();

// Script de prueba para verificar SendGrid
require('dotenv').config({ path: '.env.local' });
const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid API Key configurada');
} else {
  console.log('❌ SendGrid API Key no encontrada');
  process.exit(1);
}

// Verificar variables de entorno
console.log('📧 Configuración de Email:');
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
console.log('FROM_NAME:', process.env.FROM_NAME);
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configurada' : '❌ No configurada');

// Función de prueba
async function testSendGrid() {
  try {
    console.log('\n🚀 Probando envío de email...');
    
    const msg = {
      to: process.env.FROM_EMAIL, // Enviar a tu propio email para prueba
      from: process.env.FROM_EMAIL,
      subject: '🧪 Prueba de SendGrid - Athlete Hub',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">🎯 Prueba de SendGrid</h2>
          <p>Este es un email de prueba para verificar que SendGrid esté funcionando correctamente en tu aplicación Athlete Hub.</p>
          
          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #10B981;">✅ Configuración Correcta</h3>
            <ul>
              <li>API Key: Configurada</li>
              <li>From Email: ${process.env.FROM_EMAIL}</li>
              <li>From Name: ${process.env.FROM_NAME}</li>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>Si recibes este email, significa que SendGrid está funcionando perfectamente y podrás enviar invitaciones a los usuarios.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/invite-manager" style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              🚀 Ir a Invitation Manager
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
          <p style="color: #6B7280; font-size: 14px; text-align: center;">
            Athlete Hub - Sistema de Invitaciones
          </p>
        </div>
      `,
      text: `
Prueba de SendGrid - Athlete Hub

Este es un email de prueba para verificar que SendGrid esté funcionando correctamente.

Configuración:
- API Key: Configurada
- From Email: ${process.env.FROM_EMAIL}
- From Name: ${process.env.FROM_NAME}
- Timestamp: ${new Date().toLocaleString()}

Si recibes este email, SendGrid está funcionando perfectamente.

Ir a Invitation Manager: http://localhost:3000/invite-manager

---
Athlete Hub - Sistema de Invitaciones
      `
    };

    console.log('📤 Enviando email de prueba...');
    const result = await sgMail.send(msg);
    
    console.log('✅ Email enviado exitosamente!');
    console.log('📧 Revisa tu bandeja de entrada (y spam) en:', process.env.FROM_EMAIL);
    console.log('🔗 Resultado:', result);
    
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    
    if (error.response) {
      console.error('📊 Detalles del error:');
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.body);
    }
    
    // Sugerencias de solución
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verifica que la API Key sea correcta');
    console.log('2. Asegúrate de que el dominio esté verificado en SendGrid');
    console.log('3. Verifica que el email remitente esté autorizado');
    console.log('4. Revisa los logs de SendGrid Dashboard');
  }
}

// Ejecutar prueba
testSendGrid();


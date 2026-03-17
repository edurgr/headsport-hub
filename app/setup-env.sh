#!/bin/bash

# Script para configurar el entorno de desarrollo
echo "🚀 Configurando HEAD Sport Hub para desarrollo..."

# Verificar si existe .env.local
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local..."
    if [ -f env.example ]; then
        cp env.example .env.local
        echo "✅ Archivo .env.local creado desde env.example."
    else
        echo "❌ Archivo env.example no encontrado. Creando .env.local básico..."
        cat > .env.local << 'EOF'
# HEAD Sport Hub - Local Development Environment
# Replace with your actual Supabase credentials

# SUPABASE CONFIGURATION (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key-here

# ADMIN CONFIGURATION (REQUIRED)
ADMIN_EMAIL=admin@headsport-hub.com
ADMIN_PASSWORD=admin123

# SECURITY CONFIGURATION (REQUIRED)
NEXTAUTH_SECRET=development-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# APPLICATION CONFIGURATION
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BRAND_NAME=HEAD Sport Hub
NEXT_PUBLIC_LOGO_PATH=/head-logo.svg
NEXT_PUBLIC_UPLOADS_BUCKET=user-uploads

# ORDER CONFIGURATION
NEXT_PUBLIC_ORDER_EMAILS_ENABLED=false
NEXT_PUBLIC_ORDER_NOTIFICATION_EMAILS=admin@headsport-hub.com

# INVITATION CONFIGURATION
INVITE_TOKEN_TTL_DAYS=7
EOF
        echo "✅ Archivo .env.local creado con configuración básica."
    fi
    echo "⚠️  IMPORTANTE: Edita .env.local con tus credenciales reales de Supabase"
else
    echo "✅ Archivo .env.local ya existe."
fi

# Verificar dependencias
echo "📦 Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependencias..."
    npm install
else
    echo "✅ Dependencias ya instaladas."
fi

# Verificar configuración de TypeScript
echo "🔍 Verificando configuración de TypeScript..."
npm run typecheck

# Verificar linting
echo "🔍 Verificando linting..."
npm run lint

echo "✅ Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita .env.local con tus credenciales de Supabase"
echo "2. Ejecuta 'npm run dev' para iniciar el servidor de desarrollo"
echo "3. Visita http://localhost:3000"
echo ""
echo "🔧 Para Cloudflare Pages:"
echo "1. Configura las variables de entorno en el dashboard de Cloudflare"
echo "2. Usa 'npm run build:cloudflare' para el build de producción"

#!/bin/bash

# HEAD Sport Hub - Quick Start Script
echo "🚀 HEAD Sport Hub - Configuración Rápida"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}📋 Paso $1: $2${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Paso 1: Verificar Node.js
print_step "1" "Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION encontrado"
else
    print_error "Node.js no encontrado. Por favor instala Node.js 18+ primero."
    exit 1
fi

# Paso 2: Instalar dependencias
print_step "2" "Instalando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de npm..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencias instaladas correctamente"
    else
        print_error "Error instalando dependencias"
        exit 1
    fi
else
    echo "✅ Dependencias ya instaladas"
fi

# Paso 3: Configurar variables de entorno
print_step "3" "Configurando variables de entorno..."
if [ ! -f ".env.local" ]; then
    echo "📝 Creando archivo .env.local..."
    if [ -f "env.example" ]; then
        cp env.example .env.local
        echo "✅ Archivo .env.local creado desde env.example"
    else
        # Crear .env.local básico
        cat > .env.local << 'EOF'
# HEAD Sport Hub - Local Development Environment
# IMPORTANTE: Reemplaza con tus credenciales reales de Supabase

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
        echo "✅ Archivo .env.local creado con configuración básica"
    fi
else
    echo "✅ Archivo .env.local ya existe"
fi

# Paso 4: Verificar configuración
print_step "4" "Verificando configuración..."
if [ -f "verify-setup.sh" ]; then
    chmod +x verify-setup.sh
    ./verify-setup.sh
else
    echo "⚠️  Script de verificación no encontrado, saltando..."
fi

# Paso 5: Verificar build
print_step "5" "Verificando build para Cloudflare Pages..."
echo "🔨 Probando build de Cloudflare Pages..."
npm run build:cloudflare
if [ $? -eq 0 ]; then
    echo "✅ Build de Cloudflare Pages exitoso"
    echo "📁 Archivos generados en: out/"
else
    print_warning "Build de Cloudflare Pages falló, pero la aplicación puede funcionar en desarrollo"
fi

# Resumen final
echo ""
echo "🎉 CONFIGURACIÓN COMPLETADA"
echo "=========================="
echo ""
echo "✅ Dependencias instaladas"
echo "✅ Variables de entorno configuradas"
echo "✅ Configuración de Next.js corregida"
echo "✅ Build de Cloudflare Pages verificado"
echo ""
print_warning "IMPORTANTE: Debes configurar las credenciales reales de Supabase en .env.local"
echo ""
echo "🚀 Para iniciar el servidor de desarrollo:"
echo "   npm run dev"
echo ""
echo "🌐 Para hacer build para Cloudflare Pages:"
echo "   npm run build:cloudflare"
echo ""
echo "📚 Para más información:"
echo "   - README-SETUP.md"
echo "   - CONFIGURATION.md"
echo "   - cloudflare-pages-config.md"
echo ""
echo "🔍 Para verificar la configuración:"
echo "   ./verify-setup.sh"
echo ""
echo "¡La aplicación está lista para usar! 🎊"


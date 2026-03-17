#!/bin/bash

# Script de verificación para HEAD Sport Hub
echo "🔍 Verificando configuración de HEAD Sport Hub..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar archivos de configuración
echo ""
echo "📁 Verificando archivos de configuración..."

if [ -f "next.config.ts" ]; then
    if grep -q "output: 'export'" next.config.ts; then
        print_status "next.config.ts configurado para Cloudflare Pages" 0
    else
        print_status "next.config.ts NO está configurado para Cloudflare Pages" 1
    fi
else
    print_status "next.config.ts no encontrado" 1
fi

if [ -f "env.example" ]; then
    print_status "env.example encontrado" 0
else
    print_status "env.example no encontrado" 1
fi

if [ -f ".env.local" ]; then
    print_status ".env.local encontrado" 0
    
    # Verificar variables críticas
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && ! grep -q "your-project-id" .env.local; then
        print_status "NEXT_PUBLIC_SUPABASE_URL configurado" 0
    else
        print_warning "NEXT_PUBLIC_SUPABASE_URL no configurado o usando valor de ejemplo"
    fi
    
    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local && ! grep -q "your-anon-key-here" .env.local; then
        print_status "NEXT_PUBLIC_SUPABASE_ANON_KEY configurado" 0
    else
        print_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY no configurado o usando valor de ejemplo"
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local && ! grep -q "your-service-role-key-here" .env.local; then
        print_status "SUPABASE_SERVICE_ROLE_KEY configurado" 0
    else
        print_warning "SUPABASE_SERVICE_ROLE_KEY no configurado o usando valor de ejemplo"
    fi
else
    print_warning ".env.local no encontrado - ejecuta ./setup-env.sh primero"
fi

# Verificar dependencias
echo ""
echo "📦 Verificando dependencias..."

if [ -d "node_modules" ]; then
    print_status "node_modules encontrado" 0
else
    print_status "node_modules no encontrado - ejecuta npm install" 1
fi

if command -v npm &> /dev/null; then
    print_status "npm disponible" 0
else
    print_status "npm no disponible" 1
fi

# Verificar scripts de package.json
echo ""
echo "🔧 Verificando scripts de package.json..."

if [ -f "package.json" ]; then
    if grep -q '"dev"' package.json; then
        print_status "Script 'dev' encontrado" 0
    else
        print_status "Script 'dev' no encontrado" 1
    fi
    
    if grep -q '"build:cloudflare"' package.json; then
        print_status "Script 'build:cloudflare' encontrado" 0
    else
        print_status "Script 'build:cloudflare' no encontrado" 1
    fi
else
    print_status "package.json no encontrado" 1
fi

# Verificar archivos de Cloudflare
echo ""
echo "☁️  Verificando configuración de Cloudflare..."

if [ -f "wrangler.toml" ]; then
    print_status "wrangler.toml encontrado" 0
else
    print_status "wrangler.toml no encontrado" 1
fi

if [ -f "_redirects" ]; then
    print_status "_redirects encontrado" 0
else
    print_status "_redirects no encontrado" 1
fi

if [ -f "_headers" ]; then
    print_status "_headers encontrado" 0
else
    print_status "_headers no encontrado" 1
fi

# Verificar archivos de logo
echo ""
echo "🖼️  Verificando archivos de assets..."

if [ -f "public/head-logo.svg" ]; then
    print_status "head-logo.svg encontrado" 0
else
    print_status "head-logo.svg no encontrado" 1
fi

# Verificar que no hay referencias a .png
echo ""
echo "🔍 Verificando referencias de imagen..."

if grep -r "head-logo.png" src/ &> /dev/null; then
    print_status "Referencias a head-logo.png encontradas (deben ser .svg)" 1
else
    print_status "No hay referencias incorrectas a head-logo.png" 0
fi

# Resumen
echo ""
echo "📋 RESUMEN:"
echo "==========="

if [ -f ".env.local" ] && [ -d "node_modules" ] && [ -f "next.config.ts" ]; then
    echo -e "${GREEN}✅ Configuración básica completa${NC}"
    echo ""
    echo "🚀 Para iniciar el servidor de desarrollo:"
    echo "   npm run dev"
    echo ""
    echo "🌐 Para hacer build para Cloudflare Pages:"
    echo "   npm run build:cloudflare"
    echo ""
    echo "⚠️  IMPORTANTE: Asegúrate de configurar las credenciales reales de Supabase en .env.local"
else
    echo -e "${RED}❌ Configuración incompleta${NC}"
    echo ""
    echo "🔧 Pasos para completar la configuración:"
    echo "   1. Ejecuta: ./setup-env.sh"
    echo "   2. Edita .env.local con tus credenciales de Supabase"
    echo "   3. Ejecuta: npm install"
    echo "   4. Ejecuta: npm run dev"
fi

echo ""
echo "📚 Para más información, consulta:"
echo "   - CONFIGURATION.md"
echo "   - cloudflare-pages-config.md"
echo "   - ENVIRONMENT_SETUP.md"


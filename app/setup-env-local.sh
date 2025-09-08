#!/bin/bash

# Script para configurar el entorno local
echo "🚀 Configurando variables de entorno para desarrollo local..."

# Crear archivo .env.local si no existe
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local..."
    cp env.example .env.local
    echo "✅ Archivo .env.local creado."
else
    echo "✅ Archivo .env.local ya existe."
fi

echo ""
echo "⚠️  IMPORTANTE: Debes configurar las siguientes variables en .env.local:"
echo ""
echo "1. NEXT_PUBLIC_SUPABASE_URL - URL de tu proyecto Supabase"
echo "2. NEXT_PUBLIC_SUPABASE_ANON_KEY - Clave anónima de Supabase"
echo "3. SUPABASE_SERVICE_ROLE_KEY - Clave de servicio de Supabase"
echo ""
echo "Ejemplo:"
echo "NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "📋 Una vez configuradas las variables, ejecuta:"
echo "npm run dev"

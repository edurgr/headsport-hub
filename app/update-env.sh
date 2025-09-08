#!/bin/bash

echo "🔧 Actualizando credenciales de Supabase en .env.local"
echo "=================================================="
echo ""

# Verificar que el archivo .env.local existe
if [ ! -f ".env.local" ]; then
    echo "❌ Error: No se encontró el archivo .env.local"
    exit 1
fi

echo "📝 Archivo .env.local encontrado"
echo ""

# Solicitar las credenciales
echo "Por favor, ingresa tus credenciales de Supabase:"
echo ""

read -p "🌐 Project URL (https://tu-proyecto.supabase.co): " SUPABASE_URL
read -p "🔑 Anon Key (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...): " SUPABASE_ANON_KEY
read -p "🔐 Service Role Key (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...): " SUPABASE_SERVICE_KEY

# Validar que se ingresaron valores
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: Debes ingresar todas las credenciales"
    exit 1
fi

# Crear backup del archivo original
cp .env.local .env.local.backup
echo "✅ Backup creado: .env.local.backup"

# Actualizar las credenciales
sed -i.tmp "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|" .env.local
sed -i.tmp "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" .env.local
sed -i.tmp "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY|" .env.local

# Limpiar archivo temporal
rm .env.local.tmp

echo ""
echo "✅ Credenciales actualizadas correctamente"
echo ""
echo "🔍 Verificando configuración:"
echo "URL: $SUPABASE_URL"
echo "Anon Key: ${SUPABASE_ANON_KEY:0:20}..."
echo "Service Key: ${SUPABASE_SERVICE_KEY:0:20}..."
echo ""
echo "🚀 Ahora puedes ejecutar: npm run dev"


# 🚀 Configuración de Supabase para HEAD-Hub

## 📋 Pasos para configurar Supabase real:

### 1. Crear cuenta en Supabase
- Ve a https://supabase.com
- Crea una cuenta gratuita
- Verifica tu email

### 2. Crear nuevo proyecto
- Haz clic en "New Project"
- Elige tu organización
- Nombre del proyecto: `head-hub`
- Contraseña de base de datos: (guárdala bien)
- Región: Elige la más cercana a ti

### 3. Obtener credenciales
- Ve a Settings > API
- Copia la "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
- Copia la "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copia la "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Configurar .env.local
Reemplaza en tu archivo `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Configurar base de datos
- Ve a SQL Editor en Supabase
- Ejecuta el script de la base de datos (database-schema.sql)
- O usa el script automático: `node setup-supabase.js`

### 6. Probar la aplicación
```bash
npm run dev
```

## ✅ Verificación
- La aplicación debe cargar sin errores
- No debe haber errores de "ERR_NAME_NOT_RESOLVED"
- Las funciones de autenticación deben funcionar

## 🔧 Troubleshooting
- Si hay errores de conexión, verifica las credenciales
- Si hay errores de permisos, verifica las políticas RLS
- Si hay errores de tablas, ejecuta el script de base de datos

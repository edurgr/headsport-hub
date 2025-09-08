# 🔧 Configuración del Entorno - HEAD Hub

## 🚨 **PROBLEMA IDENTIFICADO Y SOLUCIONADO**

El problema principal era que las APIs de analytics estaban devolviendo HTML en lugar de JSON debido a:

1. **Variables de entorno no configuradas** - `supabaseAdmin` era `null`
2. **Middleware interceptando rutas de API** - Causaba redirecciones incorrectas
3. **Configuración incorrecta de Next.js** - `output: 'export'` no compatible con API routes

## ✅ **SOLUCIONES IMPLEMENTADAS**

### **1. Configuración de Variables de Entorno**

**Archivo:** `.env.local`

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Admin Configuration
ADMIN_EMAIL=admin@headhub.com
ADMIN_PASSWORD=tu_password_admin

# Security
NEXTAUTH_SECRET=tu_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Development
NODE_ENV=development
```

### **2. Middleware Corregido**

- Excluidas las rutas de analytics del middleware
- Configuración correcta para no interceptar APIs

### **3. Configuración de Next.js Arreglada**

- Cambiado de `output: 'export'` a `output: 'standalone'`
- Compatible con API routes

### **4. Fallback para Desarrollo**

- Función `getSupabaseAdmin()` que usa claves anónimas como fallback
- Permite desarrollo local sin configurar service role key

## 🚀 **INSTRUCCIONES DE CONFIGURACIÓN**

### **Paso 1: Configurar Variables de Entorno**

```bash
# Ejecutar script de configuración
./setup-env-local.sh

# Editar archivo .env.local con tus credenciales de Supabase
nano .env.local
```

### **Paso 2: Obtener Credenciales de Supabase**

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings** > **API**
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### **Paso 3: Ejecutar la Aplicación**

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

## 🔍 **VERIFICACIÓN**

### **1. Verificar APIs de Analytics**

```bash
# Probar API de órdenes
curl http://localhost:3000/api/analytics/orders-simple?group_by=global

# Probar API de contenido
curl http://localhost:3000/api/analytics/content-simple?group_by=global

# Probar API de productos de atletas
curl http://localhost:3000/api/analytics/athlete-products
```

### **2. Verificar en el Navegador**

1. Abre `http://localhost:3000/analytics`
2. Verifica que no hay errores 500 en la consola
3. Los datos deben cargar correctamente

## 🛠️ **TROUBLESHOOTING**

### **Error: "Database connection required for analytics"**

**Causa:** Variables de entorno no configuradas

**Solución:**
```bash
# Verificar que .env.local existe
ls -la .env.local

# Verificar variables
cat .env.local | grep SUPABASE
```

### **Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"**

**Causa:** Middleware interceptando APIs

**Solución:** Ya corregido en el middleware

### **Error: "Admin access required for analytics"**

**Causa:** Service role key no configurada

**Solución:** Configurar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`

## 📋 **PRÓXIMOS PASOS**

1. **Configurar variables de entorno** con tus credenciales de Supabase
2. **Ejecutar la aplicación** en modo desarrollo
3. **Verificar que las APIs funcionan** correctamente
4. **Probar todas las funcionalidades** de analytics

## 🎯 **ESTADO ACTUAL**

- ✅ Middleware corregido
- ✅ Configuración de Next.js arreglada
- ✅ Fallback para desarrollo implementado
- ✅ APIs de analytics actualizadas
- ⚠️ **Pendiente:** Configurar variables de entorno reales

---

**Nota:** Una vez configuradas las variables de entorno, la aplicación debería funcionar correctamente sin errores 500 en las APIs de analytics.

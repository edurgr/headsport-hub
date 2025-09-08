# 🚀 HEAD Hub - Guía de Configuración Rápida

## ✅ **PROBLEMAS SOLUCIONADOS**

### **1. Configuración de Next.js Corregida**

- ✅ Cambiado `output: 'standalone'` → `output: 'export'` para Cloudflare Pages
- ✅ Añadido `images: { unoptimized: true }` para static export
- ✅ Añadido `trailingSlash: true` para compatibilidad

### **2. Archivos de Configuración Creados**

- ✅ `env.example` - Template de variables de entorno
- ✅ `verify-setup.sh` - Script de verificación
- ✅ `setup-env.sh` - Script de configuración mejorado

### **3. Error del Logo Corregido**

- ✅ Cambiado `head-logo.png` → `head-logo.svg` en `page.tsx`

## 🚀 **CONFIGURACIÓN RÁPIDA (3 pasos)**

### **Paso 1: Configurar Variables de Entorno**

```bash
# Ejecutar script de configuración
chmod +x setup-env.sh
./setup-env.sh

# Editar .env.local con tus credenciales reales de Supabase
nano .env.local
```

### **Paso 2: Instalar Dependencias**

```bash
npm install
```

### **Paso 3: Iniciar Servidor**

```bash
npm run dev
```

## 🔧 **VERIFICACIÓN**

### **Verificar Configuración**

```bash
chmod +x verify-setup.sh
./verify-setup.sh
```

### **Verificar APIs**

```bash
# Health check
curl http://localhost:3000/api/health

# Ready check
curl http://localhost:3000/api/ready
```

## 📋 **VARIABLES DE ENTORNO REQUERIDAS**

### **Obligatorias para Funcionamiento Básico**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=admin@headhub.com
ADMIN_PASSWORD=tu_password_admin
NEXTAUTH_SECRET=tu_secreto_nextauth
NEXTAUTH_URL=http://localhost:3000
```

### **Opcionales para Funcionalidad Completa**

```bash
# Email (para invitaciones)
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=noreply@athletehub.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BRAND_NAME=HEAD Hub
NEXT_PUBLIC_LOGO_PATH=/head-logo.svg
NEXT_PUBLIC_UPLOADS_BUCKET=user-uploads
```

## 🌐 **DEPLOY A CLOUDFLARE PAGES**

### **1. Build para Producción**

```bash
npm run build:cloudflare
```

### **2. Configuración en Cloudflare Dashboard**

- **Framework preset**: Next.js
- **Build command**: `npm run build:cloudflare`
- **Build output directory**: `out`
- **Root directory**: `/app`

### **3. Variables de Entorno en Cloudflare**

Configurar las mismas variables que en `.env.local` pero con:

- `NEXTAUTH_URL=https://tu-dominio.com`
- `NODE_ENV=production`

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Missing Supabase environment variables"**

```bash
# Verificar que .env.local existe y tiene las variables correctas
cat .env.local | grep SUPABASE

# Si no existe, ejecutar:
./setup-env.sh
```

### **Error: "The requested resource isn't a valid image"**

- ✅ **SOLUCIONADO** - Cambiado de `.png` a `.svg`

### **Error: "Database connection required"**

- Verificar que `SUPABASE_SERVICE_ROLE_KEY` está configurado
- Verificar que las credenciales de Supabase son correctas

### **Error de Build en Cloudflare**

- ✅ **SOLUCIONADO** - Configuración corregida para `output: 'export'`

## 📊 **ESTADO ACTUAL**

### **✅ Funcionando**

- Servidor Next.js se ejecuta correctamente
- Configuración compatible con Cloudflare Pages
- Middleware configurado correctamente
- APIs estructuradas correctamente
- Error del logo corregido

### **⚠️ Requiere Configuración**

- Variables de entorno de Supabase
- Credenciales de administrador
- Configuración de email (opcional)

### **🔧 Scripts Disponibles**

- `./setup-env.sh` - Configuración automática
- `./verify-setup.sh` - Verificación de configuración
- `npm run dev` - Servidor de desarrollo
- `npm run build:cloudflare` - Build para producción

## 🎯 **PRÓXIMOS PASOS**

1. **Configurar credenciales de Supabase** en `.env.local`
2. **Probar la aplicación** con `npm run dev`
3. **Verificar todas las funcionalidades** (login, APIs, etc.)
4. **Hacer deploy a Cloudflare Pages** cuando esté listo

## 📞 **SOPORTE**

Si encuentras problemas:

1. Ejecuta `./verify-setup.sh` para diagnóstico
2. Verifica los logs del servidor
3. Consulta `CONFIGURATION.md` para detalles técnicos
4. Revisa `cloudflare-pages-config.md` para deploy

---

**La aplicación está lista para funcionar una vez configuradas las credenciales de Supabase.**

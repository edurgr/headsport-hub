# 🔧 HEAD Hub - Guía de Configuración

## 📋 **PROBLEMAS SOLUCIONADOS**

### ✅ **1. Tipos TypeScript Corregidos**
- Sincronizados con el esquema actual de base de datos
- Eliminadas referencias a tablas inexistentes
- Mantenida compatibilidad con el esquema actual

### ✅ **2. Configuración de Cloudflare Pages Arreglada**
- Cambiado `output: 'standalone'` a `output: 'export'`
- Actualizado comando de build a `npm run build:cloudflare`
- Corregidas redirecciones para Next.js 15
- Configurado directorio de salida como `out`

### ✅ **3. APIs Corregidas**
- Actualizadas para usar el esquema actual de base de datos
- Eliminadas referencias a tablas separadas de snowboard
- Mantenida compatibilidad con la tabla `snowboard` única

### ✅ **4. Middleware de Autenticación Arreglado**
- Implementada verificación real de tokens
- Redirección automática a login cuando no hay autenticación
- Eliminado el modo demo que causaba problemas

### ✅ **5. Configuración de Entorno Mejorada**
- Creado script de configuración automática
- Documentación clara de variables de entorno
- Guía paso a paso para setup

## 🚀 **CONFIGURACIÓN RÁPIDA**

### **1. Configurar Variables de Entorno**
```bash
# Ejecutar script de configuración
./setup-env.sh

# Editar .env.local con tus credenciales
nano .env.local
```

### **2. Variables Requeridas**
```bash
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio
ADMIN_EMAIL=admin@headhub.com
ADMIN_PASSWORD=tu_contraseña_admin
NEXTAUTH_SECRET=tu_secreto_nextauth
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### **3. Desarrollo Local**
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Verificar tipos
npm run typecheck

# Verificar linting
npm run lint
```

### **4. Build para Producción**
```bash
# Build para Cloudflare Pages
npm run build:cloudflare

# Build estándar
npm run build
```

## 🌐 **CONFIGURACIÓN DE CLOUDFLARE PAGES**

### **1. Configuración del Proyecto**
- **Framework preset**: Next.js
- **Build command**: `npm run build:cloudflare`
- **Build output directory**: `out`
- **Root directory**: `/app`
- **Node.js version**: 18.x

### **2. Variables de Entorno en Cloudflare**
Configurar las mismas variables que en `.env.local` pero con:
- `NEXTAUTH_URL=https://tu-dominio.com`
- `NODE_ENV=production`

### **3. Redirecciones**
Las redirecciones están configuradas en `_redirects` para Next.js 15.

## 🗄️ **ESQUEMA DE BASE DE DATOS**

### **Tablas Principales**
- `profiles` - Perfiles de usuarios
- `invites` - Invitaciones
- `orders` - Pedidos
- `order_items` - Items de pedidos
- `equipment` - Equipamiento de usuarios

### **Tablas de Productos**
- `accessories` - Accesorios
- `bindings` - Fijaciones
- `boots` - Botas
- `goggles` - Gafas
- `helmet` - Cascos
- `ski` - Esquís
- `snowboard` - Tablas de snowboard

## 🔍 **VERIFICACIÓN**

### **1. Health Check**
```bash
curl http://localhost:3000/api/health
```

### **2. Ready Check**
```bash
curl http://localhost:3000/api/ready
```

### **3. Verificar Build**
```bash
npm run build:cloudflare
ls -la out/
```

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Missing Supabase environment variables"**
- Verificar que `.env.local` existe y tiene las variables correctas
- Reiniciar el servidor de desarrollo

### **Error: "Invalid product category"**
- Verificar que estás usando las categorías correctas del esquema actual
- Categorías válidas: `accessories`, `bindings`, `boots`, `goggles`, `helmet`, `ski`, `snowboard`

### **Error: "Authentication required"**
- Verificar que el usuario está logueado
- Verificar que las cookies de autenticación están presentes
- Verificar la configuración de Supabase

### **Error de Build en Cloudflare**
- Verificar que `output: 'export'` está en `next.config.ts`
- Verificar que el directorio de salida es `out`
- Verificar que todas las variables de entorno están configuradas

## 📞 **SOPORTE**

Si encuentras problemas:
1. Verificar los logs del servidor
2. Verificar la consola del navegador
3. Verificar la configuración de Supabase
4. Verificar las variables de entorno

## ✅ **ESTADO ACTUAL**

- ✅ Tipos TypeScript corregidos
- ✅ Configuración de Cloudflare arreglada
- ✅ APIs actualizadas
- ✅ Middleware de autenticación arreglado
- ✅ Scripts de configuración creados
- ✅ Documentación actualizada

La aplicación debería funcionar correctamente ahora con el esquema actual de base de datos.

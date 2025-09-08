# 🚀 HEAD Hub - Deploy a Cloudflare Pages

## 📋 **PASOS PARA DESPLEGAR**

### **1. Preparar el repositorio**

```bash
# Asegúrate de que todos los archivos estén en GitHub
git add .
git commit -m "Preparar para deploy en Cloudflare Pages"
git push origin main
```

### **2. Configurar Cloudflare Pages**

#### **A. Crear proyecto en Cloudflare Pages**

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecciona **Pages** en el menú lateral
3. Haz clic en **Create a project**
4. Selecciona **Connect to Git**
5. Conecta tu repositorio de GitHub

#### **B. Configurar el build**

- **Framework preset**: `Next.js`
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Root directory**: `/app`

#### **C. Variables de entorno**

Configura estas variables en Cloudflare Pages:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_de_supabase
ADMIN_EMAIL=admin@headhub.com
ADMIN_PASSWORD=tu_contraseña_de_admin
NEXTAUTH_SECRET=tu_secreto_de_nextauth
NEXTAUTH_URL=https://headhub.com
NODE_ENV=production
```

### **3. Configurar el dominio personalizado**

1. En Cloudflare Pages, ve a **Custom domains**
2. Añade `headhub.com`
3. Configura el DNS en Cloudflare

### **4. Configurar correos (opcional)**

1. Ve a **Email Routing** en Cloudflare
2. Configura `admin@headhub.com`
3. Configura `support@headhub.com`

## 🔧 **CONFIGURACIÓN ADICIONAL**

### **Headers de seguridad**

El archivo `_headers` ya está configurado con:

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

### **Redirecciones**

El archivo `_redirects` ya está configurado para:

- SPA routing
- API routes
- Páginas de autenticación

### **Funciones serverless**

- Las API routes de Next.js se convertirán automáticamente en Cloudflare Functions
- No se requiere configuración adicional

## 🚀 **DEPLOY AUTOMÁTICO**

Una vez configurado:

1. **Push a main** → Deploy automático
2. **Pull requests** → Preview deployments
3. **Rollback** → Disponible en el dashboard

## 📊 **MONITOREO**

- **Analytics**: Disponible en Cloudflare Pages
- **Logs**: Disponible en Cloudflare Functions
- **Performance**: Monitoreo automático

## 🔒 **SEGURIDAD**

- **SSL**: Automático y renovación automática
- **DDoS Protection**: Incluido
- **WAF**: Disponible en Cloudflare
- **Rate Limiting**: Configurado en la aplicación

## 💰 **COSTOS**

- **Cloudflare Pages**: 100% GRATIS
- **Ancho de banda**: Ilimitado
- **Funciones**: 100,000 requests/día gratis
- **Correos**: 5 cuentas gratis

## 🆘 **SOPORTE**

- **Documentación**: [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- **Comunidad**: [Cloudflare Community](https://community.cloudflare.com/)
- **Soporte**: Disponible en el dashboard

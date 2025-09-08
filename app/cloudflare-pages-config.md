# 🚀 HEAD Hub - Configuración Cloudflare Pages

## 📋 **CONFIGURACIÓN COMPLETA**

### **1. Configuración del Proyecto**

#### **A. Crear proyecto en Cloudflare Pages**
1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecciona **Pages** en el menú lateral
3. Haz clic en **Create a project**
4. Selecciona **Connect to Git**
5. Conecta tu repositorio de GitHub

#### **B. Configuración del Build**
```
Framework preset: Next.js
Build command: npm run build:cloudflare
Build output directory: .next
Root directory: /app
Node.js version: 18.x
```

#### **C. Variables de Entorno**
Configura estas variables en Cloudflare Pages:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_de_supabase

# Admin Configuration
ADMIN_EMAIL=admin@headhub.com
ADMIN_PASSWORD=tu_contraseña_de_admin

# Security
NEXTAUTH_SECRET=tu_secreto_de_nextauth
NEXTAUTH_URL=https://headhub.com

# Environment
NODE_ENV=production
```

### **2. Configuración del Dominio**

#### **A. Dominio Personalizado**
1. En Cloudflare Pages, ve a **Custom domains**
2. Añade `headhub.com`
3. Configura el DNS en Cloudflare

#### **B. SSL/TLS**
- **SSL/TLS encryption mode**: Full (strict)
- **Always Use HTTPS**: Enabled
- **HTTP Strict Transport Security (HSTS)**: Enabled

### **3. Configuración de Correos**

#### **A. Email Routing**
1. Ve a **Email Routing** en Cloudflare
2. Configura `admin@headhub.com`
3. Configura `support@headhub.com`
4. Configura `noreply@headhub.com`

#### **B. Configuración de DNS**
```
Type: MX
Name: @
Content: route1.mx.cloudflare.net
Priority: 10

Type: MX
Name: @
Content: route2.mx.cloudflare.net
Priority: 20
```

### **4. Configuración de Seguridad**

#### **A. WAF (Web Application Firewall)**
1. Ve a **Security** → **WAF**
2. Habilita **Managed Rules**
3. Configura **Rate Limiting**

#### **B. Rate Limiting**
```
Rule: API Rate Limit
Expression: (http.request.uri.path contains "/api/")
Rate: 100 requests per minute
Action: Block
```

#### **C. Bot Fight Mode**
1. Ve a **Security** → **Bots**
2. Habilita **Bot Fight Mode**
3. Configura **Super Bot Fight Mode**

### **5. Configuración de Performance**

#### **A. Caching**
```
Cache Level: Standard
Browser Cache TTL: 4 hours
Edge Cache TTL: 1 month
```

#### **B. Minification**
- **JavaScript**: Enabled
- **CSS**: Enabled
- **HTML**: Enabled

#### **C. Brotli Compression**
- **Brotli**: Enabled

### **6. Configuración de Analytics**

#### **A. Web Analytics**
1. Ve a **Analytics** → **Web Analytics**
2. Habilita **Web Analytics**
3. Configura **Custom Events**

#### **B. Performance Monitoring**
1. Ve a **Analytics** → **Performance**
2. Habilita **Performance Monitoring**
3. Configura **Core Web Vitals**

### **7. Configuración de Funciones**

#### **A. Cloudflare Functions**
- Las API routes de Next.js se convertirán automáticamente
- No se requiere configuración adicional

#### **B. Environment Variables**
- Se configurarán automáticamente desde Cloudflare Pages
- Disponibles en todas las funciones

### **8. Configuración de Deploy**

#### **A. Deploy Automático**
- **Push a main**: Deploy automático
- **Pull requests**: Preview deployments
- **Rollback**: Disponible en el dashboard

#### **B. Preview Deployments**
- **Branch**: main
- **Environment**: Production
- **Preview**: Automático en PRs

### **9. Configuración de Monitoreo**

#### **A. Logs**
1. Ve a **Analytics** → **Logs**
2. Habilita **Logpush**
3. Configura **Log destinations**

#### **B. Alerts**
1. Ve a **Notifications** → **Alerts**
2. Configura **Deploy alerts**
3. Configura **Error alerts**

### **10. Configuración de Backup**

#### **A. Database Backup**
- Configurado en Supabase
- Backup automático diario

#### **B. Code Backup**
- Configurado en GitHub
- Backup automático en cada push

## 🔧 **ARCHIVOS DE CONFIGURACIÓN**

### **wrangler.toml**
```toml
name = "head-hub"
compatibility_date = "2024-01-01"

[env.production]
name = "head-hub"

[env.preview]
name = "head-hub-preview"
```

### **_headers**
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### **_redirects**
```
# Redirecciones para SPA
/admin/* /admin/index.html 200
/analytics/* /analytics/index.html 200
/content/* /content/index.html 200
/orders/* /orders/index.html 200
/profile/* /profile/index.html 200
/my-stats/* /my-stats/index.html 200
/athlete-management/* /athlete-management/index.html 200
/profile-management/* /profile-management/index.html 200
/invite-manager/* /invite-manager/index.html 200
/content/upload/* /content/upload/index.html 200
/orders/pending/* /orders/pending/index.html 200

# Redirecciones de autenticación
/login /login/index.html 200
/signup /signup/index.html 200
/auth/callback /auth/callback/index.html 200
/accept-invite /accept-invite/index.html 200
/onboarding /onboarding/index.html 200

# Redirecciones de API
/api/* /api/:splat 200

# Página principal
/ /index.html 200
```

## 🚀 **DEPLOY**

### **Comando de Deploy**
```bash
npm run build:cloudflare
```

### **Verificación**
1. **Build exitoso**: ✅
2. **API routes funcionando**: ✅
3. **Páginas estáticas**: ✅
4. **Funciones serverless**: ✅

## 💰 **COSTOS**

- **Cloudflare Pages**: 100% GRATIS
- **Ancho de banda**: Ilimitado
- **Funciones**: 100,000 requests/día gratis
- **Correos**: 5 cuentas gratis
- **SSL**: Incluido
- **CDN**: Incluido

## 🆘 **SOPORTE**

- **Documentación**: [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- **Comunidad**: [Cloudflare Community](https://community.cloudflare.com/)
- **Soporte**: Disponible en el dashboard

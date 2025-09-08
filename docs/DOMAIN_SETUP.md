# Configuración de Dominio y HTTPS

Esta guía detalla los pasos exactos para configurar tu dominio personalizado con certificados SSL automáticos.

## Configuración DNS

### Registros DNS Requeridos

Configura los siguientes registros en tu proveedor de DNS:

```
Tipo    Nombre    Valor                    TTL     Prioridad
A       @         [IP_DEL_SERVIDOR]        300     -
A       www       [IP_DEL_SERVIDOR]        300     -
AAAA    @         [IPv6_DEL_SERVIDOR]      300     - (opcional)
AAAA    www       [IPv6_DEL_SERVIDOR]      300     - (opcional)
```

### Ejemplo con Proveedores Populares

#### Cloudflare
1. Login → Seleccionar dominio → DNS → Records
2. Agregar registro A: `@` → `IP_DEL_SERVIDOR`
3. Agregar registro A: `www` → `IP_DEL_SERVIDOR`
4. **Importante**: Desactivar proxy (nube gris) inicialmente para Let's Encrypt

#### Namecheap
1. Dashboard → Manage → Advanced DNS
2. Host Records → Add New Record
3. Tipo: `A Record`, Host: `@`, Value: `IP_DEL_SERVIDOR`
4. Tipo: `A Record`, Host: `www`, Value: `IP_DEL_SERVIDOR`

#### GoDaddy
1. My Products → DNS → Manage Zones
2. Agregar registro A: `@` → `IP_DEL_SERVIDOR`
3. Agregar registro A: `www` → `IP_DEL_SERVIDOR`

## Verificación de Propagación DNS

### Comandos de Verificación

```bash
# Verificar propagación DNS
dig tudominio.com
dig www.tudominio.com

# Verificar desde diferentes ubicaciones
nslookup tudominio.com 8.8.8.8
nslookup tudominio.com 1.1.1.1

# Herramienta online recomendada
# https://www.whatsmydns.net/
```

### Tiempos de Propagación

- **Típico**: 5-30 minutos
- **Máximo**: 24-48 horas
- **TTL bajo (300)**: Acelera cambios futuros

## Configuración HTTPS Automática

### Let's Encrypt con Traefik

El `docker-compose.prod.yml` incluye configuración automática:

```yaml
traefik:
  command:
    - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
    - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
```

### Variables de Entorno Requeridas

```env
# En tu archivo .env.prod
DOMAIN_NAME=tudominio.com
ACME_EMAIL=admin@tudominio.com
```

### Proceso Automático

1. **Despliegue inicial**: Traefik detecta el dominio
2. **Solicitud de certificado**: Automática via HTTP Challenge
3. **Instalación**: Certificado se instala automáticamente
4. **Renovación**: Automática cada 90 días

## Redirecciones HTTP → HTTPS

### Configuración Automática

El `docker-compose.prod.yml` incluye redirección automática:

```yaml
labels:
  # Redirect HTTP to HTTPS
  - "traefik.http.routers.app-http.rule=Host(`${DOMAIN_NAME}`)"
  - "traefik.http.routers.app-http.entrypoints=web"
  - "traefik.http.routers.app-http.middlewares=redirect-to-https"
  - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
```

### Configuración HSTS

La aplicación Next.js incluye headers HSTS automáticos:

```typescript
// next.config.ts
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }
]
```

## Configuración www vs non-www

### Opción 1: Redirigir www → non-www (Recomendado)

```yaml
# En docker-compose.prod.yml, agregar labels adicionales:
- "traefik.http.routers.app-www.rule=Host(`www.${DOMAIN_NAME}`)"
- "traefik.http.routers.app-www.entrypoints=websecure"
- "traefik.http.routers.app-www.tls.certresolver=letsencrypt"
- "traefik.http.routers.app-www.middlewares=www-redirect"
- "traefik.http.middlewares.www-redirect.redirectregex.regex=^https://www\\.(.+)"
- "traefik.http.middlewares.www-redirect.redirectregex.replacement=https://$${1}"
```

### Opción 2: Redirigir non-www → www

```yaml
# Cambiar la regla principal a:
- "traefik.http.routers.app.rule=Host(`www.${DOMAIN_NAME}`)"
# Y agregar redirección de non-www:
- "traefik.http.routers.app-nonwww.rule=Host(`${DOMAIN_NAME}`)"
- "traefik.http.routers.app-nonwww.entrypoints=websecure"
- "traefik.http.routers.app-nonwww.tls.certresolver=letsencrypt"
- "traefik.http.routers.app-nonwww.middlewares=nonwww-redirect"
- "traefik.http.middlewares.nonwww-redirect.redirectregex.regex=^https://(.+)"
- "traefik.http.middlewares.nonwww-redirect.redirectregex.replacement=https://www.$${1}"
```

## Verificación de Configuración

### Comandos de Verificación

```bash
# Verificar certificado SSL
curl -I https://tudominio.com
openssl s_client -connect tudominio.com:443 -servername tudominio.com

# Verificar redirección HTTP → HTTPS
curl -I http://tudominio.com

# Verificar headers de seguridad
curl -I https://tudominio.com | grep -i "strict-transport-security"

# Verificar redirección www
curl -I https://www.tudominio.com
```

### Herramientas Online

1. **SSL Labs**: https://www.ssllabs.com/ssltest/
2. **Security Headers**: https://securityheaders.com/
3. **HTTP Observatory**: https://observatory.mozilla.org/

## Troubleshooting

### Problema: Certificado no se genera

```bash
# Verificar logs de Traefik
docker-compose -f docker-compose.prod.yml logs traefik

# Verificar que el dominio apunta al servidor
dig tudominio.com

# Verificar que los puertos 80 y 443 están abiertos
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

**Causas comunes:**
- DNS no propagado
- Firewall bloqueando puertos 80/443
- Otro servicio usando el puerto 80
- Email en ACME_EMAIL inválido

### Problema: Redirección no funciona

```bash
# Verificar configuración de Traefik
docker exec $(docker-compose -f docker-compose.prod.yml ps -q traefik) cat /etc/traefik/traefik.yml
```

### Problema: Certificado expirado

```bash
# Forzar renovación
docker exec $(docker-compose -f docker-compose.prod.yml ps -q traefik) traefik refresh
```

## Configuración Avanzada

### Múltiples Dominios

Para múltiples dominios (ej: tudominio.com, tuapp.com):

```yaml
labels:
  - "traefik.http.routers.app.rule=Host(`tudominio.com`) || Host(`tuapp.com`)"
```

### Subdominios

Para subdominios (ej: api.tudominio.com):

```yaml
labels:
  - "traefik.http.routers.api.rule=Host(`api.tudominio.com`)"
  - "traefik.http.routers.api.service=api-service"
  - "traefik.http.services.api-service.loadbalancer.server.port=3001"
```

### Certificado Wildcard

Para certificado wildcard (*.tudominio.com):

```yaml
command:
  - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
  - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=cloudflare"
environment:
  - CF_API_EMAIL=tu-email@cloudflare.com
  - CF_API_KEY=tu-api-key
```

## Checklist de Configuración

### Pre-despliegue
- [ ] Dominio registrado y accesible
- [ ] DNS configurado correctamente
- [ ] Propagación DNS verificada
- [ ] Variables DOMAIN_NAME y ACME_EMAIL configuradas

### Post-despliegue
- [ ] Certificado SSL generado automáticamente
- [ ] HTTPS accesible sin errores
- [ ] Redirección HTTP → HTTPS funciona
- [ ] Redirección www configurada según preferencia
- [ ] Headers de seguridad activos
- [ ] Pruebas SSL Labs aprobadas (A+ rating)

### Monitoreo Continuo
- [ ] Alertas de expiración de certificado
- [ ] Monitoreo de uptime del dominio
- [ ] Verificación periódica de headers de seguridad

## Mantenimiento

### Renovación Automática

Los certificados se renuevan automáticamente, pero puedes verificar:

```bash
# Ver estado de certificados
docker exec $(docker-compose -f docker-compose.prod.yml ps -q traefik) ls -la /letsencrypt/

# Ver logs de renovación
docker-compose -f docker-compose.prod.yml logs traefik | grep -i "certificate"
```

### Backup de Certificados

```bash
# Backup del volumen de certificados
docker run --rm -v head-hub-prod_letsencrypt:/source -v $(pwd):/backup alpine tar -czf /backup/letsencrypt-backup-$(date +%Y%m%d).tar.gz -C /source .
```

### Cambio de Dominio

Si necesitas cambiar el dominio:

1. Actualizar variables de entorno
2. Regenerar certificados
3. Actualizar DNS
4. Verificar funcionamiento

```bash
# Limpiar certificados antiguos
docker-compose -f docker-compose.prod.yml down
docker volume rm head-hub-prod_letsencrypt
docker-compose -f docker-compose.prod.yml up -d
```

---

¿Necesitas ayuda con la configuración de tu dominio específico? Proporciona el nombre del dominio y el proveedor DNS para instrucciones más detalladas.

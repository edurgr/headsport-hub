# Guía de Despliegue - HEAD Hub

Esta guía proporciona instrucciones paso a paso para desplegar HEAD Hub en producción.

## Opciones de Despliegue

### 🎯 Opción Recomendada: VPS con Docker

**Por qué esta opción:**
- Control completo sobre el entorno
- Costo predecible y escalable
- Flexibilidad para configuraciones personalizadas
- Fácil mantenimiento y actualizaciones

### Alternativas Evaluadas:

1. **Vercel/Netlify**: Limitaciones con APIs complejas y base de datos
2. **Heroku**: Costo elevado para aplicaciones de producción
3. **AWS/GCP**: Complejidad innecesaria para este tamaño de aplicación
4. **Kubernetes**: Sobrecarga para una aplicación monolítica

## Preparación del Servidor

### Requisitos del Servidor

- **SO**: Ubuntu 20.04 LTS o superior
- **RAM**: Mínimo 2GB, recomendado 4GB
- **CPU**: Mínimo 1 vCPU, recomendado 2 vCPU
- **Almacenamiento**: Mínimo 20GB SSD
- **Red**: Conexión estable a Internet

### Proveedores Recomendados

1. **DigitalOcean** - $20-40/mes (2-4GB RAM)
2. **Linode** - $20-40/mes (2-4GB RAM)
3. **Vultr** - $20-40/mes (2-4GB RAM)
4. **Hetzner** - €15-30/mes (excelente relación precio/rendimiento)

## Configuración del Servidor

### 1. Configuración Inicial

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y curl wget git ufw fail2ban

# Configurar firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Instalar Docker y Docker Compose

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sesión para aplicar cambios de grupo
exit
# Reconectarse por SSH
```

### 3. Configurar Directorio de la Aplicación

```bash
# Crear directorio de la aplicación
sudo mkdir -p /opt/head-hub
sudo chown $USER:$USER /opt/head-hub
cd /opt/head-hub

# Clonar el repositorio
git clone https://github.com/tu-usuario/HEAD-Hub.git .
```

## Configuración de Variables de Entorno

### 1. Crear archivo de entorno de producción

```bash
# Crear archivo .env.prod
cp .env.example .env.prod
```

### 2. Configurar variables requeridas

```bash
# Editar variables de entorno
nano .env.prod
```

**Variables requeridas:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NEXT_PUBLIC_UPLOADS_BUCKET=user-uploads

# Branding
NEXT_PUBLIC_BRAND_NAME=HEAD Hub
NEXT_PUBLIC_LOGO_PATH=/head-logo.svg

# S3 Configuration (opcional)
S3_ACCESS_KEY_ID=tu_access_key_id
S3_SECRET_ACCESS_KEY=tu_secret_access_key
S3_BUCKET=tu_bucket_name
S3_REGION=us-east-1
S3_ENDPOINT=tu_s3_endpoint

# SendGrid (opcional)
SENDGRID_API_KEY=tu_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@tu-dominio.com

# Deployment
DOMAIN_NAME=tu-dominio.com
ACME_EMAIL=admin@tu-dominio.com
```

## Despliegue

### Opción 1: Despliegue Manual

```bash
# Construir y ejecutar con Docker Compose
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verificar que los contenedores están ejecutándose
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Opción 2: Despliegue Automatizado con GitHub Actions

1. **Configurar secretos en GitHub:**

   Ve a tu repositorio → Settings → Secrets and variables → Actions

   ```
   SERVER_HOST=tu-servidor-ip
   SERVER_USER=tu-usuario
   SERVER_SSH_KEY=tu-clave-ssh-privada
   SERVER_PORT=22
   ```

2. **Crear un tag para desplegar:**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   Esto activará automáticamente el workflow de despliegue.

## Configuración del Dominio

### 1. Configuración DNS

Agregar los siguientes registros DNS:

```
Tipo    Nombre    Valor              TTL
A       @         IP_DEL_SERVIDOR    300
A       www       IP_DEL_SERVIDOR    300
```

### 2. Verificar Propagación DNS

```bash
# Verificar que el dominio apunta al servidor
dig tu-dominio.com
nslookup tu-dominio.com
```

### 3. Certificados SSL

Los certificados se configuran automáticamente con Let's Encrypt a través de Traefik.

**Verificar SSL:**
```bash
# Verificar certificado SSL
curl -I https://tu-dominio.com
```

## Monitoreo y Mantenimiento

### Health Checks

La aplicación incluye endpoints de monitoreo:

- **Health**: `https://tu-dominio.com/api/health`
- **Ready**: `https://tu-dominio.com/api/ready`
- **Metrics**: `https://tu-dominio.com/api/metrics`

### Logs

```bash
# Ver logs de la aplicación
docker-compose -f docker-compose.prod.yml logs app

# Ver logs de Traefik
docker-compose -f docker-compose.prod.yml logs traefik

# Seguir logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f
```

### Backups

```bash
# Script de backup (crear como /opt/head-hub/backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/head-hub"

mkdir -p $BACKUP_DIR

# Backup de configuración
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env.prod docker-compose.prod.yml

# Backup de certificados SSL
sudo tar -czf $BACKUP_DIR/letsencrypt_$DATE.tar.gz /var/lib/docker/volumes/head-hub-prod_letsencrypt

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completado: $DATE"
```

### Actualizaciones

```bash
# Actualizar aplicación
cd /opt/head-hub
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Limpiar imágenes antiguas
docker image prune -f
```

## Solución de Problemas

### Verificar Estado de Servicios

```bash
# Estado de contenedores
docker-compose -f docker-compose.prod.yml ps

# Health check manual
curl http://localhost:3000/api/health

# Verificar conectividad externa
curl https://tu-dominio.com/api/health
```

### Problemas Comunes

1. **Puerto 80/443 ocupado:**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo systemctl stop apache2 nginx
   ```

2. **Certificado SSL no se genera:**
   ```bash
   # Verificar logs de Traefik
   docker-compose -f docker-compose.prod.yml logs traefik
   
   # Verificar que el dominio apunta al servidor
   dig tu-dominio.com
   ```

3. **Aplicación no responde:**
   ```bash
   # Reiniciar contenedores
   docker-compose -f docker-compose.prod.yml restart
   
   # Verificar recursos del sistema
   free -h
   df -h
   ```

## Seguridad

### Configuraciones Adicionales

```bash
# Configurar fail2ban para SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configurar actualizaciones automáticas de seguridad
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Monitoreo de Seguridad

```bash
# Revisar intentos de login fallidos
sudo journalctl -u ssh -f

# Verificar puertos abiertos
sudo nmap -sS -O localhost
```

## Rollback

En caso de problemas con una nueva versión:

```bash
# Ver versiones disponibles
docker images tu-registro/head-hub

# Hacer rollback a versión anterior
docker-compose -f docker-compose.prod.yml down
export IMAGE_TAG=version-anterior
docker-compose -f docker-compose.prod.yml up -d
```

## Escalamiento

Para manejar más tráfico:

1. **Vertical**: Aumentar recursos del servidor (RAM, CPU)
2. **Horizontal**: Usar múltiples réplicas con load balancer
3. **CDN**: Implementar CloudFlare o similar para assets estáticos

---

## Checklist de Go-Live

- [ ] Servidor configurado y accesible
- [ ] Docker y Docker Compose instalados
- [ ] Variables de entorno configuradas
- [ ] DNS configurado y propagado
- [ ] SSL funcionando correctamente
- [ ] Health checks respondiendo
- [ ] Backups configurados
- [ ] Monitoreo activo
- [ ] Documentación actualizada

¿Necesitas ayuda con algún paso específico? Consulta los logs o contacta al equipo de desarrollo.
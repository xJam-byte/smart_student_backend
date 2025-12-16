# Deployment Guide

This guide covers deploying the Smart Watch Backend to various environments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Development](#docker-development)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start infrastructure with Docker:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. Set up environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Generate Prisma Client:
```bash
npm run prisma:generate
```

5. Run database migrations:
```bash
npm run prisma:migrate
```

6. Start development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`

Swagger docs: `http://localhost:3000/api/docs`

## Docker Development

### Full Stack with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Individual Services

```bash
# Start only database
docker-compose up -d postgres

# Start only Redis
docker-compose up -d redis

# Restart API
docker-compose restart api
```

## Production Deployment

### Preparation

1. **Update environment variables**:
```bash
cp .env.example .env.production
# Edit .env.production with production values
```

2. **Security checklist**:
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure Firebase credentials
- [ ] Set up CORS origins
- [ ] Enable HTTPS
- [ ] Configure firewall rules

### Docker Compose Production

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start services
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Using Caddy for HTTPS

1. Update `Caddyfile`:
```
api.yourdomain.com {
    reverse_proxy api:3000
}
```

2. Uncomment Caddy service in `docker-compose.yml`

3. Start services:
```bash
docker-compose up -d
```

Caddy will automatically obtain and renew SSL certificates from Let's Encrypt.

### Cloud Platforms

#### AWS EC2

1. Launch EC2 instance (t3.medium or larger)
2. Install Docker and Docker Compose
3. Clone repository
4. Configure environment
5. Run Docker Compose

```bash
# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Deploy
git clone <repository>
cd smart-watch-backend
cp .env.example .env
# Edit .env
docker-compose up -d
```

#### Google Cloud Run

1. Build container:
```bash
docker build -t gcr.io/PROJECT_ID/smartwatch-api .
```

2. Push to registry:
```bash
docker push gcr.io/PROJECT_ID/smartwatch-api
```

3. Deploy:
```bash
gcloud run deploy smartwatch-api \
  --image gcr.io/PROJECT_ID/smartwatch-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `node dist/main`
3. Add environment variables
4. Add PostgreSQL and Redis databases
5. Deploy

### Kubernetes

For Kubernetes deployment, you'll need to create:
- Deployment manifests
- Service manifests
- ConfigMap for environment variables
- Secrets for sensitive data
- Ingress for routing

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartwatch-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smartwatch-api
  template:
    metadata:
      labels:
        app: smartwatch-api
    spec:
      containers:
      - name: api
        image: smartwatch-api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: api-config
        - secretRef:
            name: api-secrets
```

## Environment Variables

### Required

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
```

### Optional

```env
# Application
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# JWT Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Alert Thresholds
SCHOOL_GEOFENCE_RADIUS_METERS=100
HIGH_HEART_RATE_THRESHOLD=120
NO_MOVEMENT_TIMEOUT_MINUTES=30
```

## Database Migrations

### Development

```bash
# Create a new migration
npm run prisma:migrate

# Apply pending migrations
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Production

Always use `migrate deploy` in production:

```bash
# Apply migrations
npx prisma migrate deploy
```

This command:
- Applies pending migrations
- Does not create new migrations
- Safe for production use

### Migration Strategy

1. Test migrations in development
2. Review migration SQL
3. Backup production database
4. Apply migrations during maintenance window
5. Verify application functionality

## Database Backup

### PostgreSQL

```bash
# Backup
docker exec smartwatch-postgres pg_dump -U postgres smartwatch > backup.sql

# Restore
docker exec -i smartwatch-postgres psql -U postgres smartwatch < backup.sql
```

### Automated Backups

Set up cron job:

```bash
# Daily backup at 2 AM
0 2 * * * docker exec smartwatch-postgres pg_dump -U postgres smartwatch > /backups/smartwatch-$(date +\%Y\%m\%d).sql
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-06T10:00:00.000Z",
  "services": {
    "database": "up",
    "api": "up"
  }
}
```

### Docker Health Checks

```bash
# Check container health
docker ps
docker inspect --format='{{.State.Health.Status}}' smartwatch-api
```

### Logs

```bash
# View API logs
docker-compose logs -f api

# View last 100 lines
docker-compose logs --tail=100 api

# View specific service
docker-compose logs postgres
docker-compose logs redis
```

### Performance Monitoring

Recommended tools:
- **Application**: PM2, New Relic, DataDog
- **Database**: pg_stat_statements, pgAdmin
- **Queues**: BullMQ Dashboard, Redis Commander
- **Infrastructure**: Prometheus + Grafana

## Scaling

### Horizontal Scaling

1. **API Servers**:
```bash
docker-compose up -d --scale api=3
```

2. **Load Balancer**:
Use Nginx or Caddy to distribute traffic:

```nginx
upstream api_servers {
    server api1:3000;
    server api2:3000;
    server api3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_servers;
    }
}
```

### Database Scaling

1. **Read Replicas**:
Set up PostgreSQL replication for read queries

2. **Connection Pooling**:
Use PgBouncer for connection pooling

3. **Partitioning**:
Partition telemetry table by date

### Redis Scaling

1. **Redis Cluster**: For high availability
2. **Redis Sentinel**: For automatic failover

## SSL/TLS Configuration

### Using Caddy (Automatic)

Caddy automatically obtains SSL certificates:

```
api.yourdomain.com {
    reverse_proxy api:3000
}
```

### Using Nginx + Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker image
        run: docker build -t smartwatch-api .

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push smartwatch-api

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/smartwatch-backend
            docker-compose pull
            docker-compose up -d
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Docker Security

```bash
# Run containers as non-root user
# Update Dockerfile:
USER node
```

### 3. Environment Variables

Never commit `.env` files. Use secrets management:
- AWS Secrets Manager
- HashiCorp Vault
- Docker Secrets

### 4. Regular Updates

```bash
# Update dependencies
npm audit
npm update

# Update Docker images
docker-compose pull
docker-compose up -d
```

## Troubleshooting

### API not starting

```bash
# Check logs
docker-compose logs api

# Common issues:
# 1. Database connection failed
#    - Verify DATABASE_URL
#    - Check if PostgreSQL is running
# 2. Redis connection failed
#    - Verify REDIS_HOST and REDIS_PORT
#    - Check if Redis is running
```

### Database migrations failed

```bash
# Check migration status
npx prisma migrate status

# Reset and retry
npx prisma migrate reset
npx prisma migrate deploy
```

### High memory usage

```bash
# Check container stats
docker stats

# Limit memory
docker-compose.yml:
  services:
    api:
      mem_limit: 512m
```

### Queue jobs not processing

```bash
# Check Redis connection
docker exec -it smartwatch-redis redis-cli ping

# Check queue status
docker exec -it smartwatch-redis redis-cli
> KEYS bull:*
> LLEN bull:telemetry:wait
```

## Rollback Procedure

### Application Rollback

```bash
# Revert to previous Docker image
docker-compose down
docker-compose up -d --force-recreate

# If using tags
docker pull smartwatch-api:previous-version
docker-compose up -d
```

### Database Rollback

```bash
# Restore from backup
docker exec -i smartwatch-postgres psql -U postgres smartwatch < backup.sql

# Revert migration (if possible)
# Note: Some migrations cannot be reverted
```

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring tools set up
- [ ] Health checks working
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] Incident response plan ready

## Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Open GitHub issue
4. Contact support team

# Staging Deployment Guide

## Status
✅ **Staging Docker Image Built Successfully**
- Image: `navex-market:staging`
- Size: ~107MB
- Base: nginx:alpine
- Staging Supabase Credentials: Embedded as build args
- Container tested: ✅ Running successfully on localhost:3001

## Staging Container Info
- **Project ID:** yyzkbaufcumjlxasrvsy
- **API URL:** https://yyzkbaufcumjlxasrvsy.supabase.co
- **Status:** Ready for deployment

## Deployment Options

### Option 1: Railway (Recommended - Easiest)
Railway automatically detects Docker images and handles deployment with minimal setup.

**Prerequisites:**
- Railway account (free tier available)
- Docker image pushed to Docker Hub OR Railway CLI

**Steps:**
1. Sign up at https://railway.app
2. Create new project
3. Connect GitHub repository OR deploy Docker image directly
4. Add environment variables in Railway dashboard:
   ```
   VITE_SUPABASE_URL=https://yyzkbaufcumjlxasrvsy.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_06esfZYS_8iBVIJAwsW_9Q_3xBanFG0
   VITE_SUPABASE_PROJECT_ID=yyzkbaufcumjlxasrvsy
   ```
5. Deploy container
6. Access at `https://your-project.railway.app`

**Timeline:** ~5 minutes setup, ~2 minutes deployment

---

### Option 2: Render (Docker-Native)
Render is built for Docker deployments and offers a simple UI.

**Prerequisites:**
- Render account (free tier available)
- Docker image (local or Docker Hub)

**Steps:**
1. Sign up at https://render.com
2. Create new "Web Service"
3. Choose "Deploy from Docker image"
4. Provide Docker image URI (`navex-market:staging`)
5. Add environment variables
6. Deploy

**Timeline:** ~10 minutes setup, ~3 minutes deployment

---

### Option 3: DigitalOcean App Platform
App Platform runs Docker containers with auto-scaling and monitoring.

**Prerequisites:**
- DigitalOcean account ($5-12/month)
- Docker image on Docker Hub

**Steps:**
1. Push image: `docker tag navex-market:staging yourusername/navex-market:staging` → `docker push`
2. Create App on DigitalOcean
3. Select Docker Hub image source
4. Configure environment variables
5. Deploy

**Timeline:** ~15 minutes setup, ~5 minutes deployment

---

### Option 4: Vercel (Quick, Optimized for React)
Perfect for React apps - optimized caching and edge deployment.

**Prerequisites:**
- Vercel account
- GitHub repository connection

**Steps:**
1. Connect GitHub repo to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables
5. Deploy

**Timeline:** ~5 minutes setup, ~2 minutes deployment

---

### Option 5: Docker Hub + Cloud VM
Maximum control - manage your own server.

**Steps:**
1. Tag image: `docker tag navex-market:staging yourusername/navex-market:staging`
2. Push to Docker Hub: `docker push yourusername/navex-market:staging`
3. SSH into cloud server (AWS EC2, DigitalOcean, Linode, etc.)
4. Pull and run:
   ```bash
   docker pull yourusername/navex-market:staging
   docker run -p 80:80 -d \
     -e VITE_SUPABASE_URL=https://yyzkbaufcumjlxasrvsy.supabase.co \
     -e VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_06esfZYS_8iBVIJAwsW_9Q_3xBanFG0 \
     -e VITE_SUPABASE_PROJECT_ID=yyzkbaufcumjlxasrvsy \
     yourusername/navex-market:staging
   ```
5. Access at your domain/IP

**Timeline:** Varies by cloud provider, usually 10-20 minutes

---

## Quick Commands

### Test Locally
```bash
docker run -p 3001:80 navex-market:staging
# Visit http://localhost:3001
```

### Push to Docker Hub
```bash
docker login
docker tag navex-market:staging yourusername/navex-market:staging
docker push yourusername/navex-market:staging
```

### Clean Up Local
```bash
docker stop navex-test
docker rm navex-test
docker rmi navex-market:staging
```

---

## Production Readiness

Once staging is deployed and tested:

### Build Production Image
```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-production-url \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your_prod_key \
  --build-arg VITE_SUPABASE_PROJECT_ID=your_prod_id \
  -t navex-market:production .
```

### Test Production Container
```bash
docker run -p 3002:80 navex-market:production
```

### Deploy Production
Follow same deployment platform steps as staging, using `navex-market:production` image.

---

## Next Steps

1. Choose a deployment platform from above
2. Set up account if needed
3. Deploy staging image
4. Test staging environment:
   - Sign up flow
   - Create deal room
   - Check Supabase connectivity
5. Once stable, proceed with production deployment

## Support

- Railway Support: support@railway.app
- Render Support: support@render.com
- Vercel Support: support@vercel.com
- Docker Documentation: https://docs.docker.com

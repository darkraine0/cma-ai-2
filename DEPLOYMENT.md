# Deployment Guide

## ✅ Build Status

Your project has been successfully built! The production build is ready in the `.next` directory.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Create a `.env.production` file (or set these in your hosting platform) with the following variables:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your-very-secure-random-secret-key-here
JWT_EXPIRES_IN=7d

# Application URL (for password reset links)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: API URL (if different from same origin)
NEXT_PUBLIC_API_URL=/api
```

**⚠️ Important Security Notes:**
- `JWT_SECRET` should be a long, random string (at least 32 characters)
- Never commit `.env` files to version control
- Use different secrets for development and production

### 2. Database Setup

- Ensure your MongoDB database is accessible from your production server
- Verify database connection string is correct
- Test database connectivity before deployment

### 3. Build Verification

The build has been completed successfully. You can verify by:

```bash
npm run build
```

If successful, you'll see:
- ✓ Compiled successfully
- `.next` directory created with production files

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`

4. **Production Deploy**:
   ```bash
   vercel --prod
   ```

### Option 2: Other Platforms

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### Docker
Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Traditional Server (Node.js)
1. Build the project: `npm run build`
2. Start production server: `npm start`
3. Ensure Node.js 20+ is installed
4. Set up process manager (PM2, systemd, etc.)

## 📦 Production Build Commands

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Start production server
npm start
```

## 🔒 Security Checklist

- [ ] `JWT_SECRET` is set to a strong random value
- [ ] MongoDB connection uses authentication
- [ ] Environment variables are not exposed in client-side code
- [ ] HTTPS is enabled in production
- [ ] CORS is properly configured (if needed)
- [ ] Rate limiting is implemented (recommended)
- [ ] Error messages don't expose sensitive information

## 📧 Email Service Integration (For Password Reset)

Currently, password reset links are logged to console. For production, integrate an email service:

### Option 1: Resend (Recommended)
```bash
npm install resend
```

### Option 2: SendGrid
```bash
npm install @sendgrid/mail
```

### Option 3: AWS SES
```bash
npm install @aws-sdk/client-ses
```

### Option 4: Nodemailer
```bash
npm install nodemailer
```

Update `app/api/auth/forgot-password/route.ts` to send emails instead of console logging.

## 🧪 Testing Before Deployment

1. **Test Authentication Flow**:
   - Sign up
   - Sign in
   - Sign out
   - Forgot password
   - Reset password

2. **Test Protected Routes**:
   - Verify redirect to signin when not authenticated
   - Verify access when authenticated

3. **Test API Routes**:
   - Communities API
   - Companies API
   - Plans API

## 📊 Monitoring & Logging

Consider setting up:
- Error tracking (Sentry, LogRocket, etc.)
- Analytics (Google Analytics, Plausible, etc.)
- Uptime monitoring
- Database monitoring

## 🔄 Post-Deployment

1. Test all critical user flows
2. Monitor error logs
3. Check database connections
4. Verify email functionality (if implemented)
5. Test password reset flow end-to-end

## 🐛 Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm ci`
- Check TypeScript errors: `npm run build`
- Verify Node.js version (20+)

### Runtime Errors
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check server logs for detailed error messages

### Authentication Issues
- Verify `JWT_SECRET` is set correctly
- Check cookie settings (secure, sameSite)
- Ensure HTTPS is enabled in production

## 📝 Additional Notes

- The build output is in `.next` directory
- Static files are optimized automatically
- API routes are serverless-ready
- The app uses Next.js 16 App Router
- React 19 is used for the frontend

## 🆘 Support

If you encounter issues:
1. Check the build logs
2. Verify environment variables
3. Check server logs
4. Review the error messages in the browser console

---

**Build Status**: ✅ Ready for Deployment
**Last Build**: Successfully completed
**Build Output**: `.next` directory

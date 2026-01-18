# Environment Variables Setup Guide

## 📝 Step-by-Step Setup

### Step 1: Create `.env.local` file

Create a file named `.env.local` in the root directory of your project (same level as `package.json`).

### Step 2: Add Required Variables

Copy and paste the following into your `.env.local` file, then fill in your actual values:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
# MongoDB connection string
# Format: mongodb://username:password@host:port/database
# Or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_URI=mongodb://localhost:27017/marketmap-homes

# ============================================
# AUTHENTICATION CONFIGURATION
# ============================================
# JWT Secret Key - MUST be a long, random string (at least 32 characters)
# Generate one using: openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-SECRET-KEY-AT-LEAST-32-CHARACTERS-LONG

# JWT Token Expiration (e.g., "7d", "24h", "30d")
JWT_EXPIRES_IN=7d

# ============================================
# APPLICATION CONFIGURATION
# ============================================
# Your application URL (for password reset links)
# For local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production, use your actual domain:
# NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: API URL (defaults to /api if not set)
# NEXT_PUBLIC_API_URL=/api
```

## 🔐 Generating a Secure JWT Secret

### Option 1: Using Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 2: Using OpenSSL
```bash
openssl rand -base64 32
```

### Option 3: Online Generator
Visit: https://generate-secret.vercel.app/32

## 📋 Quick Setup Checklist

- [ ] Created `.env.local` file in project root
- [ ] Added `MONGODB_URI` with your MongoDB connection string
- [ ] Generated and added secure `JWT_SECRET` (32+ characters)
- [ ] Set `JWT_EXPIRES_IN` (default: "7d")
- [ ] Set `NEXT_PUBLIC_APP_URL` (http://localhost:3000 for local)

## 🗄️ MongoDB Setup

### Local MongoDB
```env
MONGODB_URI=mongodb://localhost:27017/marketmap-homes
```

### MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/database`

### MongoDB Connection String Format
```
mongodb://[username:password@]host[:port][/database][?options]
```

## ✅ Verification

After creating `.env.local`:

1. **Restart your development server** (if running):
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart: npm run dev
   ```

2. **Test the connection**:
   - Start the app: `npm run dev`
   - Try to sign up or sign in
   - Check console for MongoDB connection messages

## 🚨 Important Security Notes

1. **Never commit `.env.local` to Git** (already in `.gitignore`)
2. **Use different secrets for development and production**
3. **Keep your JWT_SECRET secure** - if compromised, all tokens become invalid
4. **Rotate secrets periodically** in production

## 🔄 For Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. **Set environment variables in your hosting platform**:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Other platforms: Check their documentation

2. **Use production values**:
   - `MONGODB_URI`: Production database connection
   - `JWT_SECRET`: Different secret from development
   - `NEXT_PUBLIC_APP_URL`: Your production domain (https://your-domain.com)

## 📝 Example `.env.local` (Local Development)

```env
MONGODB_URI=mongodb://localhost:27017/marketmap-homes
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🆘 Troubleshooting

### "MONGODB_URI is not configured"
- Check that `.env.local` exists in the project root
- Verify the variable name is exactly `MONGODB_URI`
- Restart your development server after creating/updating `.env.local`

### "JWT_SECRET is not set"
- Ensure `JWT_SECRET` is in your `.env.local` file
- Make sure it's at least 32 characters long
- Restart the server after adding it

### MongoDB Connection Failed
- Verify your MongoDB is running (if local)
- Check your connection string format
- Ensure network access is allowed (for MongoDB Atlas)

---

**Next Steps**: After setting up `.env.local`, restart your dev server and test the application!

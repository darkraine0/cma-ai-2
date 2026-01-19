# Environment Variables Setup Guide

## 📝 Step-by-Step Setup

### Step 1: Create `.env` file

Create a file named `.env` in the root directory of your project (same level as `package.json`).

**Note:** This project uses `.env` (not `.env.local`) to connect to the server MongoDB database.

### Step 2: Add Required Variables

Copy and paste the following into your `.env` file, then fill in your actual values:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
# MongoDB connection string (Server Database)
# Format: mongodb://username:password@host:port/database
# Or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_URI=mongodb+srv://username:password@server-cluster.mongodb.net/database

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

- [ ] Created `.env` file in project root
- [ ] Added `MONGODB_URI` with your server MongoDB connection string
- [ ] Generated and added secure `JWT_SECRET` (32+ characters)
- [ ] Set `JWT_EXPIRES_IN` (default: "7d")
- [ ] Set `NEXT_PUBLIC_APP_URL` (http://localhost:3000 for local)

## 🗄️ MongoDB Setup

### Server MongoDB (Current Configuration)
This project uses a server MongoDB database. Add your server connection string to `.env`:

```env
MONGODB_URI=your-server-mongodb-connection-string
```

**Example formats:**
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database`
- MongoDB Server: `mongodb://username:password@host:port/database`

### Switching from Local to Server Database

If you previously used `.env.local` for local MongoDB:

1. **Remove or rename `.env.local`** (it takes precedence over `.env`)
   ```bash
   # Option 1: Delete it
   rm .env.local
   
   # Option 2: Rename it as backup
   mv .env.local .env.local.backup
   ```

2. **Ensure `.env` has your server MongoDB URI**

3. **Restart your development server**
   ```bash
   npm run dev
   ```

**Note:** In Next.js, `.env.local` takes precedence over `.env`. To use `.env`, you must remove or rename `.env.local`.

### MongoDB Connection String Format
```
mongodb://[username:password@]host[:port][/database][?options]
```

## ✅ Verification

After creating or updating `.env`:

1. **Remove `.env.local` if it exists** (it overrides `.env`)
   ```bash
   # Delete or rename .env.local
   rm .env.local
   ```

2. **Restart your development server** (required after env changes):
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart: npm run dev
   ```

3. **Test the connection**:
   - Start the app: `npm run dev`
   - Check console for "MongoDB connected successfully" message
   - Try to sign up or sign in
   - Verify data is saved to server database

## 🚨 Important Security Notes

1. **Never commit `.env` to Git** (already in `.gitignore`)
2. **Use different secrets for development and production**
3. **Keep your JWT_SECRET secure** - if compromised, all tokens become invalid
4. **Keep your MongoDB connection string secure** - contains credentials
5. **Rotate secrets periodically** in production

**Environment File Precedence in Next.js:**
- `.env.local` (highest priority - overrides everything)
- `.env.development` / `.env.production` (environment-specific)
- `.env` (base configuration)

To use `.env`, make sure `.env.local` is removed or renamed.

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

## 📝 Example `.env` (Server Database)

```env
# Server MongoDB connection
MONGODB_URI=mongodb+srv://username:password@server-cluster.mongodb.net/database

# Authentication
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN=7d

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI (if using AI features)
OPENAI_API_KEY=your-openai-api-key
```

## 🆘 Troubleshooting

### "MONGODB_URI is not configured"
- Check that `.env` exists in the project root
- Verify the variable name is exactly `MONGODB_URI`
- Ensure `.env.local` doesn't exist (it overrides `.env`)
- Restart your development server after creating/updating `.env`

### "JWT_SECRET is not set"
- Ensure `JWT_SECRET` is in your `.env` file
- Make sure it's at least 32 characters long
- Restart the server after adding it

### MongoDB Connection Failed
- Verify your server MongoDB connection string is correct
- Check your connection string format
- Ensure network access is allowed (for MongoDB Atlas)
- Check if `.env.local` exists and is overriding `.env`
- Verify MongoDB credentials are correct
- Test connection from MongoDB Compass or CLI

---

## 🔄 Migration from `.env.local` to `.env`

If you're switching from local MongoDB to server MongoDB:

1. **Backup your current `.env.local`** (optional):
   ```bash
   cp .env.local .env.local.backup
   ```

2. **Create or update `.env`** with server MongoDB URI:
   ```env
   MONGODB_URI=your-server-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=7d
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Remove `.env.local`**:
   ```bash
   rm .env.local
   ```

4. **Restart your development server**:
   ```bash
   npm run dev
   ```

5. **Verify connection**: Check console for "MongoDB connected successfully"

---

**Next Steps**: After setting up `.env`, restart your dev server and test the application!

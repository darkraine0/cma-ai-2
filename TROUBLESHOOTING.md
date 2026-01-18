# Troubleshooting Guide

## Signup Page Hangs / Stops After "Creating account..."

### Problem
When clicking "Sign Up", the button changes to "Creating account..." but the page hangs/stops.

### Most Common Causes

#### 1. MongoDB Not Running (Most Likely)
**Symptom**: Page hangs, no error message appears

**Solution**:
- **Windows**: Check if MongoDB is running
  ```powershell
  # Check MongoDB service
  Get-Service MongoDB
  
  # Start MongoDB if stopped
  Start-Service MongoDB
  ```
  
- **Or install/start MongoDB**:
  - Download from: https://www.mongodb.com/try/download/community
  - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

- **Update `.env.local`** with your MongoDB connection string:
  ```env
  MONGODB_URI=mongodb://localhost:27017/marketmap-homes
  # OR for MongoDB Atlas:
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
  ```

#### 2. Database Connection Timeout
**Symptom**: Request times out after 30 seconds

**Solution**:
- Check your MongoDB connection string in `.env.local`
- Verify MongoDB is accessible
- For MongoDB Atlas, check network access settings

#### 3. Environment Variables Not Loaded
**Symptom**: Error about MONGODB_URI not configured

**Solution**:
- Ensure `.env.local` exists in project root
- Restart development server after creating/updating `.env.local`
- Check that `MONGODB_URI` is set correctly

### Quick Fix Steps

1. **Check MongoDB Status**:
   ```bash
   # Try to connect to MongoDB
   mongosh mongodb://localhost:27017
   ```

2. **Check Server Console**:
   - Look for error messages in the terminal where `npm run dev` is running
   - Check for "MongoDB connection error" messages

3. **Verify Environment Variables**:
   ```bash
   # Check .env.local exists and has MONGODB_URI
   cat .env.local
   ```

4. **Test Database Connection**:
   - Try accessing MongoDB directly
   - Or use MongoDB Compass to verify connection

### Error Messages to Look For

- **"Database connection failed"**: MongoDB not running or wrong connection string
- **"Request timed out"**: MongoDB connection timeout (check network/firewall)
- **"MONGODB_URI is not configured"**: `.env.local` missing or incorrect

### Alternative: Use MongoDB Atlas (Cloud)

If local MongoDB is problematic, use MongoDB Atlas:

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   ```

### Still Having Issues?

1. Check browser console (F12) for client-side errors
2. Check server terminal for backend errors
3. Verify MongoDB is running and accessible
4. Ensure `.env.local` is in the project root (same level as `package.json`)

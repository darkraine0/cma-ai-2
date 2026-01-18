# Admin & Authentication System Documentation

## ✅ Implementation Complete

A comprehensive authentication and admin system has been implemented with the following features:

## 📋 Features Implemented

### 1. User Registration & Email Verification ✅
- Users sign up with email/password
- Email verification token is generated and sent (logged to console in dev)
- After signup, users cannot fully access the application
- After email verification, user status is set to "pending"
- Pending users cannot fully access until approved by admin

### 2. Extended User Model ✅
The User model now includes:
- **role**: `"admin"` | `"user"` (extensible enum)
- **permission**: `"viewer"` | `"editor"` (controls home page access)
- **status**: `"pending"` | `"approved"` | `"rejected"` (approval workflow)
- **emailVerified**: boolean (email verification status)
- **emailVerificationToken**: string (for email verification)
- **emailVerificationExpires**: Date (token expiration)

### 3. Admin Assignment ✅
- **First registered user** automatically becomes:
  - `role = "admin"`
  - `status = "approved"`
- **All subsequent users** default to:
  - `role = "user"`
  - `status = "pending"`

### 4. Admin Navigation ✅
- Admin pages available at `/admin/*`
- **Admin button** appears in Navbar (top-right) **only for admin users**
- Non-admin users cannot see the admin button
- Backend strictly enforces role-based access

### 5. Admin Pages ✅
- **`/admin/dashboard`**: Overview with user statistics
- **`/admin/users`**: User management page
  - Lists all users with email, role, permission, status
  - Admin can approve/reject pending users
  - Admin can assign permissions (viewer/editor)

### 6. Permission-Based Access Control ✅
- **Home page** supports two permission modes:
  - **Viewer**: Read-only access (cannot add/edit communities)
  - **Editor**: Full edit access (can add/edit communities)
- Permission logic enforced **server-side** in API routes

### 7. Scalable Architecture ✅
- Role system uses enums (easy to extend)
- Permission system uses enums (easy to extend
- Admin utilities in `app/lib/admin.ts` (reusable)
- Modular API routes
- Easy to add new admin pages

### 8. Security ✅
- **Never trusts frontend** - all checks are server-side
- All admin APIs validate `role === "admin"` from database
- All protected APIs validate `status === "approved"` from database
- Permission checks query database for current user state
- No hardcoded admin emails or IDs

## 📁 File Structure

```
app/
├── models/
│   └── User.ts                    # Extended with role, permission, status
├── lib/
│   ├── auth.ts                    # Authentication utilities
│   └── admin.ts                   # Admin & permission utilities
├── api/
│   ├── auth/
│   │   ├── signup/route.ts        # Auto-assigns first user as admin
│   │   ├── signin/route.ts        # Checks email verification
│   │   ├── verify-email/route.ts  # Email verification endpoint
│   │   └── resend-verification/route.ts
│   └── admin/
│       └── users/
│           ├── route.ts           # List all users
│           ├── approve/route.ts   # Approve/reject users
│           └── update-permission/route.ts
├── admin/
│   ├── layout.tsx                 # Admin layout with navigation
│   ├── dashboard/page.tsx         # Admin dashboard
│   └── users/page.tsx             # User management
├── verify-email/
│   └── page.tsx                   # Email verification page
└── components/
    ├── AuthGuard.tsx              # Updated to check status
    ├── Navbar.tsx                 # Shows Admin button for admins
    └── PendingApprovalBanner.tsx  # Shows pending status
```

## 🔐 Security Implementation

### Server-Side Validation
All security checks query the database to ensure current user state:

```typescript
// app/lib/admin.ts
export async function requireAdmin(request: NextRequest) {
  // Always queries database - never trusts token alone
  const user = await User.findById(tokenPayload.userId);
  if (user.role !== UserRole.ADMIN) {
    return error response;
  }
}
```

### Protected API Routes
- **POST /api/communities** - Requires editor permission
- **DELETE /api/communities** - Requires editor permission
- **POST /api/companies** - Requires editor permission
- **DELETE /api/companies** - Requires editor permission
- **POST /api/plans** - Requires editor permission
- **GET /api/admin/users** - Requires admin role
- **POST /api/admin/users/approve** - Requires admin role
- **POST /api/admin/users/update-permission** - Requires admin role

## 🔄 User Flow

### New User Registration
1. User signs up → Account created with `status: "pending"`, `emailVerified: false`
2. Email verification link sent (logged to console in dev)
3. User clicks link → `emailVerified: true`, `status: "pending"`
4. User can sign in but sees "Pending Approval" banner
5. Admin approves user → `status: "approved"`
6. User gets full access based on permission

### First User (Admin)
1. First user signs up → Automatically `role: "admin"`, `status: "approved"`
2. Still needs email verification
3. After verification, has full admin access

## 🎯 Permission System

### Viewer Permission
- Can view all data
- Cannot create/edit/delete communities, companies, or plans
- "Add Community" button hidden

### Editor Permission
- Can view all data
- Can create/edit/delete communities, companies, and plans
- "Add Community" button visible

### Admin Role
- Has all editor permissions
- Can access admin pages
- Can approve/reject users
- Can assign permissions

## 📧 Email Verification

Currently, verification links are logged to console. For production:

1. Install email service (Resend, SendGrid, etc.)
2. Update `app/api/auth/signup/route.ts` to send email
3. Update `app/api/auth/forgot-password/route.ts` to send email

Example integration:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: user.email,
  subject: 'Verify your email',
  html: `<a href="${verificationUrl}">Verify Email</a>`
});
```

## 🚀 Testing the System

1. **Create First User (Admin)**:
   - Sign up → Check console for verification link
   - Verify email → Status becomes "pending" (but admin is auto-approved)
   - Sign in → Should see Admin button

2. **Create Second User**:
   - Sign up → Check console for verification link
   - Verify email → Status becomes "pending"
   - Sign in → Should see "Pending Approval" banner
   - Cannot add/edit communities (viewer permission)

3. **Admin Approves User**:
   - Admin logs in → Clicks "Admin" button
   - Goes to `/admin/users`
   - Approves pending user
   - Assigns "editor" permission

4. **User Gets Editor Access**:
   - User signs in → No longer sees pending banner
   - Can now add/edit communities

## 🔧 Configuration

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Extending Roles
To add new roles, update `app/models/User.ts`:
```typescript
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator', // New role
}
```

### Extending Permissions
To add new permissions, update `app/models/User.ts`:
```typescript
export enum UserPermission {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  MANAGER = 'manager', // New permission
}
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in (checks email verification)
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user
- `GET /api/auth/verify-email?token=...` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### Admin (Requires Admin Role)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/approve` - Approve/reject user
- `POST /api/admin/users/update-permission` - Update user permission

## ✅ Security Checklist

- [x] Server-side role validation (queries database)
- [x] Server-side permission validation (queries database)
- [x] Server-side status validation (queries database)
- [x] Admin routes protected
- [x] Editor routes protected
- [x] No hardcoded admin emails/IDs
- [x] Email verification required
- [x] Admin approval required
- [x] First user auto-assigned as admin

## 🎉 System Ready

The authentication and admin system is fully implemented and ready for use!

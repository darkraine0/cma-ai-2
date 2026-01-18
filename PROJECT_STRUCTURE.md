# MarketMap Homes - Project Structure & Workflow

## 📁 Project Overview

This is a **Next.js 16** application (App Router) that manages home plans, communities, and companies with authentication. It uses:
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens with bcrypt password hashing

---

## 🚀 Startup Flow: What Happens When You Run `npm run dev`

### 1. **Entry Point: `package.json`**
```json
"scripts": {
  "dev": "next dev"  // ← This command starts everything
}
```

### 2. **Next.js Framework Initialization**
- Next.js reads `next.config.ts` for configuration
- Starts the development server on `http://localhost:3000`
- Sets up the App Router system

### 3. **Root Layout: `app/layout.tsx`** ⭐ **FIRST FILE TO EXECUTE**
This is the **root component** that wraps every page:

```
app/layout.tsx
├── Sets up fonts (Geist Sans, Geist Mono)
├── Loads global CSS (app/globals.css)
├── Wraps with ThemeProvider (dark/light mode)
└── Wraps with AuthGuard (authentication check)
    └── Renders Navbar
        └── Renders {children} (the actual page)
```

**Execution Order:**
1. `layout.tsx` renders first
2. `AuthGuard` component checks authentication
3. If authenticated → shows `Navbar` + page content
4. If not authenticated → redirects to `/signin`

### 4. **Page Routing: `app/page.tsx`** (Home Page)
When you visit `http://localhost:3000`:
- Next.js looks for `app/page.tsx` (this is the root route `/`)
- `AuthGuard` checks if user is logged in
- If not logged in → redirects to `/signin`
- If logged in → renders the Communities page

---

## 🔐 Authentication Flow

### **AuthGuard Component** (`app/components/AuthGuard.tsx`)

```
User visits any page
    ↓
AuthGuard checks:
    ├── Is route public? (/signin, /signup)
    │   └── YES → Show page immediately
    │
    └── Is route protected?
        ├── Call /api/auth/me
        ├── Check auth token in cookies
        ├── Valid token? → Show page
        └── Invalid/No token? → Redirect to /signin
```

### **Sign In Flow:**
```
1. User visits /signin
   └── app/signin/page.tsx renders

2. User enters email/password
   └── Form submits to /api/auth/signin

3. API Route: app/api/auth/signin/route.ts
   ├── Connects to MongoDB
   ├── Finds user by email
   ├── Compares password (bcrypt)
   ├── Generates JWT token
   └── Sets token in HTTP-only cookie

4. Client redirects to / (home page)
   └── AuthGuard sees valid token → Shows page
```

---

## 📂 Project Structure

```
cma-ai/
│
├── app/                          # Next.js App Router directory
│   │
│   ├── layout.tsx               # ⭐ ROOT LAYOUT (wraps all pages)
│   ├── page.tsx                 # Home page (/) - Communities list
│   ├── globals.css              # Global styles
│   │
│   ├── api/                     # Backend API Routes
│   │   ├── auth/
│   │   │   ├── signin/route.ts  # POST - User login
│   │   │   ├── signup/route.ts  # POST - User registration
│   │   │   ├── signout/route.ts # POST - User logout
│   │   │   └── me/route.ts      # GET - Get current user
│   │   │
│   │   ├── communities/
│   │   │   └── route.ts          # GET/POST/DELETE - Communities CRUD
│   │   │
│   │   ├── companies/
│   │   │   └── route.ts          # Companies API
│   │   │
│   │   └── plans/
│   │       └── route.ts          # Plans API
│   │
│   ├── components/              # React Components
│   │   ├── AuthGuard.tsx        # ⭐ Authentication wrapper
│   │   ├── Navbar.tsx            # Navigation bar
│   │   ├── Loader.tsx           # Loading spinner
│   │   ├── ErrorMessage.tsx     # Error display
│   │   └── ui/                  # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   │
│   ├── models/                  # MongoDB Models (Mongoose)
│   │   ├── User.ts              # User schema (email, password, role)
│   │   ├── Community.ts         # Community schema
│   │   ├── Company.ts           # Company schema
│   │   ├── Plan.ts              # Plan schema
│   │   └── PriceHistory.ts      # Price history schema
│   │
│   ├── lib/                     # Utility Libraries
│   │   ├── mongodb.ts           # MongoDB connection (cached)
│   │   └── auth.ts              # Auth utilities (JWT, bcrypt)
│   │
│   ├── middleware/              # Server Middleware
│   │   └── auth.ts              # requireAuth(), requireRole()
│   │
│   ├── signin/
│   │   └── page.tsx             # Sign in page (/signin)
│   │
│   ├── signup/
│   │   └── page.tsx             # Sign up page (/signup)
│   │
│   ├── community/
│   │   └── [communityName]/
│   │       └── page.tsx         # Dynamic route: /community/:name
│   │
│   ├── companies/
│   │   └── page.tsx             # Companies page (/companies)
│   │
│   └── manage/
│       └── page.tsx             # Management page (/manage)
│
├── package.json                 # Dependencies & scripts
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS config
└── tsconfig.json               # TypeScript config
```

---

## 🔄 Complete Request Flow Example

### **Scenario: User visits homepage after login**

```
1. Browser Request
   GET http://localhost:3000/

2. Next.js App Router
   ├── Matches route: app/page.tsx
   └── Executes: app/layout.tsx (wraps page)

3. Layout Execution (app/layout.tsx)
   ├── Loads fonts
   ├── Applies global CSS
   ├── Wraps with ThemeProvider
   └── Wraps with AuthGuard

4. AuthGuard Check (app/components/AuthGuard.tsx)
   ├── Client-side: useEffect runs
   ├── Calls: GET /api/auth/me
   │   └── API Route: app/api/auth/me/route.ts
   │       ├── Reads auth-token from cookies
   │       ├── Verifies JWT token
   │       ├── Connects to MongoDB
   │       ├── Fetches user data
   │       └── Returns user info
   ├── Token valid? → Show content
   └── Token invalid? → Redirect to /signin

5. Page Rendering (app/page.tsx)
   ├── Renders Navbar (app/components/Navbar.tsx)
   ├── Fetches communities: GET /api/communities
   │   └── API Route: app/api/communities/route.ts
   │       ├── Connects to MongoDB
   │       ├── Queries Community model
   │       └── Returns JSON data
   ├── Fetches plans: GET /api/plans
   └── Renders community cards with data

6. Response to Browser
   └── HTML + React components rendered
```

---

## 🗄️ Database Models

### **User Model** (`app/models/User.ts`)
```typescript
{
  email: string (unique, indexed)
  password: string (bcrypt hashed)
  name: string (optional)
  role: 'admin' | 'user'
  isEmailVerified: boolean
  lastLogin: Date
  createdAt: Date
  updatedAt: Date
}
```

### **Community Model** (`app/models/Community.ts`)
```typescript
{
  name: string (unique, indexed)
  description: string
  location: string
  companies: ObjectId[] (references to Company)
  createdBy: ObjectId (references User)
  updatedBy: ObjectId (references User)
  createdAt: Date
  updatedAt: Date
}
```

### **Company, Plan, PriceHistory** - Similar structure with ownership tracking

---

## 🔑 Key Files Explained

### **1. `app/layout.tsx`** - Root Layout
- **Purpose**: Wraps every page in the app
- **Runs**: On every page load
- **Contains**: Theme provider, AuthGuard, Navbar

### **2. `app/page.tsx`** - Home Page
- **Route**: `/` (root)
- **Purpose**: Displays list of communities
- **Type**: Client Component (`"use client"`)

### **3. `app/components/AuthGuard.tsx`** - Authentication Wrapper
- **Purpose**: Protects routes, checks authentication
- **Public Routes**: `/signin`, `/signup`
- **Protected Routes**: Everything else

### **4. `app/lib/mongodb.ts`** - Database Connection
- **Purpose**: Cached MongoDB connection (reuses connection)
- **Used by**: All API routes that need database access

### **5. `app/lib/auth.ts`** - Authentication Utilities
- **Functions**:
  - `hashPassword()` - Hash passwords with bcrypt
  - `comparePassword()` - Verify passwords
  - `generateToken()` - Create JWT tokens
  - `verifyToken()` - Validate JWT tokens
  - `getCurrentUserFromRequest()` - Extract user from request

---

## 🌐 API Routes Structure

All API routes follow this pattern:
```
app/api/[resource]/route.ts

Exports:
- GET()    - Fetch data
- POST()   - Create data
- PUT()    - Update data
- DELETE() - Delete data
```

**Example: `app/api/auth/signin/route.ts`**
```typescript
export async function POST(request: NextRequest) {
  // 1. Connect to database
  await connectDB();
  
  // 2. Parse request body
  const { email, password } = await request.json();
  
  // 3. Business logic
  const user = await User.findOne({ email });
  const isValid = await comparePassword(password, user.password);
  
  // 4. Generate token
  const token = generateToken({ userId, email, role });
  
  // 5. Set cookie & return response
  response.cookies.set('auth-token', token);
  return NextResponse.json({ user });
}
```

---

## 🎨 Frontend Architecture

### **Component Hierarchy:**
```
RootLayout (app/layout.tsx)
└── ThemeProvider
    └── AuthGuard
        └── Navbar
            └── Page Content (app/page.tsx)
                └── Components
                    ├── Card
                    ├── Button
                    └── ...
```

### **State Management:**
- **React Hooks**: `useState`, `useEffect`
- **No global state library** (Redux, Zustand, etc.)
- Each component manages its own state

### **Styling:**
- **Tailwind CSS** - Utility-first CSS
- **CSS Variables** - For theming (dark/light mode)
- **Component Library** - Custom UI components in `app/components/ui/`

---

## 🔒 Security Features

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **HTTP-Only Cookies**: Tokens stored in secure cookies
4. **Route Protection**: AuthGuard prevents unauthorized access
5. **API Protection**: Middleware functions for API routes
6. **Ownership Tracking**: All models track `createdBy` and `updatedBy`

---

## 📝 Environment Variables Required

Create `.env.local` file:
```env
MONGODB_URI=mongodb://localhost:27017/your-database
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRES_IN=7d
```

---

## 🚦 Development Workflow

1. **Start Server**: `npm run dev`
2. **Build**: `npm run build`
3. **Production**: `npm start`

---

## 📚 Next Steps for Understanding

1. **Read**: `app/layout.tsx` - Understand root structure
2. **Read**: `app/components/AuthGuard.tsx` - Understand auth flow
3. **Read**: `app/api/auth/signin/route.ts` - Understand API structure
4. **Read**: `app/models/User.ts` - Understand database models
5. **Read**: `app/lib/auth.ts` - Understand auth utilities

---

This project follows **Next.js 16 App Router** conventions with a clean separation between:
- **Frontend** (React components in `app/`)
- **Backend** (API routes in `app/api/`)
- **Database** (Models in `app/models/`)
- **Utilities** (Helper functions in `app/lib/`)

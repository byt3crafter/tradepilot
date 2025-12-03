# TradePilot Code Customizations Guide

This document provides a comprehensive list of all customizations made to the TradePilot codebase. This is essential for AI agents and future developers to understand the project's unique architecture and requirements.

---

## Project Overview

**TradePilot** is a professional trading journal and analytics platform built with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: NestJS + Prisma ORM
- **Authentication**: Clerk Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Custom Tailwind theme with "future-dark" aesthetic

---

## Core Architecture Customizations

### 1. **Authentication System (Clerk + Custom AuthContext)**

**Location**: `context/AuthContext.tsx`, `App.tsx`

**Customization Details**:
- Integrated Clerk authentication (`@clerk/clerk-react` v5.57.0)
- Custom `AuthContext` wrapper for managing auth state alongside Clerk
- Multi-level routing based on authentication status:
  - `SignedIn` → AuthenticatedApp (Dashboard with nested providers)
  - `SignedOut` → UnauthenticatedApp (Landing, Login, Signup, Public pages)
  - Admin routes via hash routing (`#/admin-panel`)

**Key Points for Future Work**:
- Clerk Publishable Key must be set in `VITE_CLERK_PUBLISHABLE_KEY` environment variable
- AuthContext provides custom auth state management beyond Clerk
- All authenticated routes wrapped in `<SignedIn>` component
- Public pages (Privacy, Terms, FAQ, About Us) accessible without authentication

---

### 2. **Animated Background System**

**Location**: `index.html`, `App.tsx`, Custom JavaScript in HTML

**Customization Details**:
- UnicornStudio animated background integrated via JavaScript in `index.html`
- Global function `showAnimatedBackground()` controls visibility
- **Landing Page Only**: Background shows only on landing page (`/`)
- **Dashboard**: Background hidden when user is authenticated
- **Other Public Pages**: Background hidden on auth pages (login, signup)

**Implementation Strategy** (App.tsx:36-86):
```typescript
// AuthenticatedApp: Hide background when logged in
React.useEffect(() => {
  (window as any).showAnimatedBackground?.(false);
}, []);

// UnauthenticatedApp: Show only on landing page
React.useEffect(() => {
  if (path === '/') {
    (window as any).showAnimatedBackground?.(true);
  } else {
    (window as any).showAnimatedBackground?.(false);
  }
}, [path]);
```

**Important Notes**:
- The background persists across page refreshes via IndexedDB/localStorage
- Animation initialization happens in `index.html`
- Grid fade effect applied to prevent full coverage

---

### 3. **Multi-Provider Architecture**

**Location**: `App.tsx` (lines 50-72), `context/` directory

**Nested Providers for Authenticated App** (in order):
1. `UIProvider` - Global UI state
2. `ViewProvider` - View/layout management
3. `PaddleProvider` - Payment processing (v5.x custom wrapper)
4. `SubscriptionProvider` - Subscription state management
5. `AssetProvider` - Trading assets/instruments
6. `AccountProvider` - User account data
7. `PlaybookProvider` - Trading playbooks
8. `ChecklistProvider` - Trading checklists
9. `SettingsProvider` - User settings
10. `TradeProvider` - Trade data management (custom P/L logic)
11. `NotificationProvider` - In-app notifications

**Key Principle**: This nesting order matters. Don't reorder without testing, as some providers depend on others being available.

---

## Feature Customizations

### 4. **Trading Dashboard (DashboardPage)**

**Location**: `pages/DashboardPage.tsx`, `components/Dashboard/`

**Customization Details**:
- Bento-grid layout with multiple card sections
- Real-time trade tracking with live P/L calculations
- Components include:
  - `EquityHero` - Main equity display
  - `StatGrid` - Key trading statistics
  - `RecentActivity` - Activity feed
  - `AccountStats` - Account overview
  - `AiDebriefCard` - AI-powered trade analysis (currently disabled in some commits)
  - `OnboardingCard` - First-time user guide

**Note**: The `AiDebriefCard` was temporarily removed (commit 991c193) due to performance concerns. If re-enabling, ensure proper loading states.

---

### 5. **Profit/Loss (P/L) Calculation System**

**Location**: `context/TradeContext.tsx`, `4claude.RD` (requirements)

**Customization Details** (from 4claude.RD):
- **Direction Factor Logic**:
  - BUY/LONG trades: `directionFactor = +1`
  - SELL/SHORT trades: `directionFactor = -1`
- **Formula**: `P/L = (exitPrice - entryPrice) * directionFactor`
- **Gross vs Net P/L**:
  - Gross P/L: Raw profit/loss from price movement
  - Net P/L: Gross P/L minus commissions/fees
- **Helper Function**: `computePL(trade, currentPrice?)` should:
  - Calculate both `grossPL` and `netPL`
  - Return object with both values
  - Be called consistently across: history tables, expanded rows, live trades, stats cards

**Result Field Derivation**:
- Win: `netPL > 0`
- Loss: `netPL < 0`
- Breakeven: `netPL = 0`

---

### 6. **Legal & Documentation Pages**

**Location**: `pages/` directory

**Pages Created** (commit 2d8c114):
- `PrivacyPolicyPage.tsx` - Comprehensive privacy policy
- `TermsOfServicePage.tsx` - Terms of service
- `RiskDisclaimerPage.tsx` - Risk disclaimer for trading
- `AboutPage.tsx` - Company about page
- `AboutUsPage.tsx` - Our story/company mission (added in commit a2ba8f6)
- `FAQPage.tsx` - Frequently asked questions

**Routing** (App.tsx:94-111):
```typescript
if (path === '/privacy') return <PrivacyPolicyPage />;
if (path === '/terms') return <TermsOfServicePage />;
if (path === '/risk-disclaimer') return <RiskDisclaimerPage />;
if (path === '/about') return <AboutPage />;
if (path === '/about-us') return <AboutUsPage />;
if (path === '/faq') return <FAQPage />;
```

**Navigation Updates**:
- Landing page footer includes links to all legal pages
- FAQ link removed from header navigation (commit f773e18)
- About link removed from header (commit fdb964d) but "Our Story" available in footer

---

### 7. **UI/UX Customizations**

#### Trading Limits Display
**Commits**: b7f861b, 5713aca
- Simplified trading limits display
- Visual feedback with indicators
- Portal-based tooltips for additional context
- API validation error fixes

#### Notification System
**Commits**: cfa5d17, ad10240, 6009409, b143a6c, d0eb553
- Redesigned notification dropdown
- Portal architecture for proper z-index handling
- Positioned to prevent overlap with dashboard elements
- Trial banner with proper visibility
- Equity card alignment to industry standards

#### Admin Panel
**Commits**: 9c1e037, 292f109
- Role-based access control (RBAC)
- JWT role extraction for admin identification
- Hash-based routing (`#/admin-panel`)
- Admin page protected by `<SignedIn>` wrapper

---

## Configuration Customizations

### 8. **Tailwind CSS Configuration**

**Location**: `tailwind.config.js`, `styles/`

**Custom Theme Values**:
- **Colors**:
  - `future-dark` - Dark background (#0f0f1e)
  - `future-light` - Light text
  - `future-gray` - Secondary text
  - `void` - Very dark background
  - `primary`, `secondary` - Brand colors
- **Fonts**:
  - `orbitron` - Futuristic display font
- **Animations**:
  - `fade-in-up` - Landing page entrance animation

**PostCSS Configuration** (commit bda32f0):
- Replaced Tailwind CDN with proper PostCSS build
- `postcss.config.js` configures autoprefixer + tailwindcss

---

### 9. **Environment Variables**

**Required Variables**:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_BACKEND_URL=http://localhost:3001
```

**Optional Variables**:
- Database connection strings (backend)
- Paddle API keys
- Email service credentials

---

## Data Flow & Context Management

### 10. **TradeContext (Custom P/L Logic)**

**Location**: `context/TradeContext.tsx`

**Responsibilities**:
- Manage trade data state
- Calculate P/L for all trades
- Filter and sort trade history
- Track live positions
- Provide real-time updates to dashboard

**Critical Implementation Note**:
All P/L calculations must use the `computePL()` helper to ensure consistency across the app.

---

### 11. **PaddleContext (Payment Processing)**

**Location**: `context/PaddleContext.tsx`

**Customization**:
- Custom wrapper around Paddle (v5.x)
- Handles subscription products
- Manages payment workflow
- Token management for authenticated requests

---

### 12. **Subscription Management**

**Location**: `context/SubscriptionContext.tsx`

**Features**:
- Trial period tracking (15-day free trial mentioned in LandingPage)
- Subscription status management
- Paddle integration for payments

---

## Important Development Guidelines

### 13. **Routing Philosophy**

**Current Routing System**:
- **Path-based** for public pages and auth flows
- **Hash-based** for authenticated app (`#/dashboard`, `#/admin-panel`)
- **Custom routing** in App.tsx based on `window.location.pathname` and `window.location.hash`

**Future Changes**:
- Consider migrating to React Router for scalability
- Keep in mind the split between signed-in/signed-out flows

---

### 14. **Component Naming & Organization**

**Convention**:
- Page components: `*Page.tsx` in `/pages`
- UI components: `/components/ui`
- Dashboard components: `/components/Dashboard`
- Context providers: `/context/*Context.tsx`

**File Permissions**: Some files have restricted permissions (chmod 600). These may contain sensitive configs - be careful when modifying.

---

### 15. **Type System**

**Location**: `types.ts`, `constants.ts`

**Key Types**:
- Trade, Account, Subscription, Playbook, Checklist types
- API response types
- Notification types

**Constants**:
- Brand colors, sizes, strings
- API endpoints base URLs
- Feature flags

---

## Recent Fixes & Known Issues

### Fixed Issues

| Commit | Issue | Solution |
|--------|-------|----------|
| bda32f0 | Tailwind CDN inconsistency | Switched to PostCSS build |
| 96c9299 | CORS errors (dev/prod) | Fixed backend CORS configuration |
| b143a6c | UI misalignment | Professional layout adjustments |
| cfa5d17 | Notification overlap | Portal-based positioning |
| a2ba8f6 | Background animation lost on refresh | Persistence implementation |
| e46795d | JSX syntax error in AboutUsPage | Fixed structure |

### Known Considerations

1. **Background Animation**: Relies on UnicornStudio JavaScript initialization - test carefully when updating `index.html`
2. **P/L Logic**: Currently needs implementation review (see 4claude.RD notes)
3. **Admin Panel**: Requires JWT role extraction - ensure JWT includes role field
4. **Responsive Design**: Mobile-first approach used throughout

---

## Testing Recommendations

When modifying these customizations:

1. **Authentication Flow**: Test both authenticated and unauthenticated routes
2. **Background Animation**: Verify on landing page and persistence across refreshes
3. **P/L Calculations**: Test with buy, sell, and mixed position scenarios
4. **Responsive Design**: Test at 320px, 768px, 1024px breakpoints
5. **Legal Pages**: Ensure all links in footer work correctly
6. **Admin Routes**: Test both authenticated and non-admin users accessing `/admin-panel`

---

## File Structure Quick Reference

```
TradePilot/
├── pages/                    # Page components
├── components/               # Reusable components
├── context/                  # Context providers (15 providers)
├── hooks/                    # Custom React hooks
├── services/                 # API services
├── utils/                    # Utility functions
├── types.ts                  # Type definitions
├── constants.ts              # Configuration constants
├── App.tsx                   # Main app routing logic
├── index.tsx                 # React entry point
├── index.html                # HTML with UnicornStudio integration
├── tailwind.config.js        # Tailwind theme
├── postcss.config.js         # PostCSS configuration
├── vite.config.ts            # Vite build config
└── CUSTOMIZATIONS.md         # This file
```

---

## Questions or Issues?

If you encounter issues related to these customizations:

1. Check the git history for the relevant feature/fix commits
2. Review the nested provider order in App.tsx
3. Ensure environment variables are properly set
4. Verify Clerk authentication is properly configured
5. Check browser console for animation initialization errors

---

**Last Updated**: December 3, 2025
**Created**: By Claude Code Agent
**Project**: TradePilot v0.0.0

---

## Recent Updates (December 3, 2025)

### Admin Panel Enhancements

**Location**: `pages/AdminPage.tsx`, `components/admin/`, `backend/src/admin/`

**Customization Details**:
- **Sidebar Navigation**: Added `AdminSidebar` component matching user dashboard design
  - Dashboard view: Overview stats
  - Users view: Detailed user management
- **Enhanced User Table**: Displays comprehensive user information
  - User role (USER/ADMIN) with visual badges
  - Trial expiration dates with expired status indicators
  - API usage cost and token consumption per user
  - Last login timestamps
- **Admin Authentication**: 
  - Added `/api/auth/me` debug endpoint to verify JWT claims
  - Requires `public_metadata.role` in Clerk JWT template
  - AdminGuard validates role from database after JWT verification

**Key Features**:
- Role-based access control (RBAC) with visual indicators
- Trial management with expiration tracking
- API usage monitoring per user
- Promote users to admin (via Clerk dashboard)
- Grant/revoke Pro access
- Delete users with cascade protection

---

### API Usage Tracking System

**Location**: `backend/src/ai/`, `backend/prisma/schema.prisma`

**Database Schema**:
```prisma
model ApiUsage {
  id        String   @id @default(uuid())
  endpoint  String   // e.g., 'generate-idea', 'parse-trade-text'
  model     String   // e.g., 'gemini-2.5-flash'
  tokens    Int      // Total tokens used
  cost      Float    // Calculated cost in USD
  timestamp DateTime @default(now())
  userId    String
  user      User     @relation(...)
}
```

**Implementation**:
- **AiService.logUsage()**: Logs every AI API call with token count and cost
- **Cost Calculation**: Approximate $0.0000002 per token (Gemini 2.5 Flash average)
- **Tracked Endpoints**:
  - `/api/ai/generate-idea` - Trade idea generation
  - `/api/ai/parse-trade-text` - Natural language trade parsing
- **Admin Dashboard**: Aggregates total cost and tokens per user
- **Non-blocking**: Logging failures don't affect user requests

**Usage Metadata**:
- Extracts `usageMetadata` from Gemini API responses
- Calculates total tokens: `promptTokenCount + candidatesTokenCount`
- Stores per-request granular data for auditing

---

### Authentication Improvements

**Location**: `backend/src/auth/`

**Changes**:
- **JWT Strategy**: Extracts `public_metadata.role` from Clerk tokens
- **User Sync**: Updates user role on login if present in JWT
- **Debug Endpoint**: `GET /api/auth/me` returns authenticated user's claims
- **Admin Guard**: Validates `user.role === 'ADMIN'` from database

**Setup Requirements**:
1. Configure Clerk JWT Template to include:
   ```json
   {
     "public_metadata": "{{user.public_metadata}}"
   }
```
   ```
2. Set user role in Clerk Dashboard: `public_metadata.role = "ADMIN"`
3. User must sign out and sign in again to refresh token

---

---

### Viewport-Based Layout System (Scrollbar Fix)

**Location**: `styles/globals.css`, `index.html`, `pages/DashboardPage.tsx`, `pages/AdminPage.tsx`

**System Design Philosophy**:
This is a **viewport-based layout system** where the entire application fits within the browser viewport without page-level scrolling. Individual containers manage their own scroll independently.

**Architecture**:

1. **Foundation Layer** (`styles/globals.css`):
   ```css
   html {
     height: 100vh;
     overflow: hidden;
   }
   
   body {
     height: 100vh;
     overflow: hidden;
   }
   
   #root {
     height: 100vh;
     overflow: hidden;
     position: relative;
   }
   ```

2. **HTML Layer** (`index.html`):
   ```html
   <body class="overflow-hidden h-screen">
   ```

3. **Application Layer** (DashboardPage, AdminPage):
   - Use `fixed inset-0` for full viewport coverage
   - Use `flex` layout for proper space distribution
   - Fixed elements (sidebar, header, banner) use `flex-shrink-0`
   - Scrollable content uses `flex-1 overflow-y-auto`

**DashboardPage Structure**:
```
fixed inset-0 (viewport container)
├── Sidebar (fixed position)
└── flex-1 flex flex-col (main area)
    ├── TrialBanner (flex-shrink-0, no scroll)
    ├── Mobile Header (flex-shrink-0, no scroll)
    └── Main Content (flex-1 overflow-y-auto, scrolls)
```

**AdminPage Structure**:
```
fixed inset-0 (viewport container)
├── AdminSidebar (fixed position)
└── flex-1 flex flex-col (main area)
    ├── Header (flex-shrink-0, no scroll)
    └── Main Content (flex-1 overflow-y-auto, scrolls)
```

**Key Principles**:
1. **No page-level scrolling** - html, body, #root all have `overflow: hidden`
2. **Viewport-based sizing** - Use `100vh` not `100%` to avoid calculation issues
3. **Flexbox for layout** - Use `flex-col` with `flex-1` and `flex-shrink-0`
4. **Explicit scroll containers** - Only scrollable areas have `overflow-y-auto`
5. **Fixed positioning** - Top-level containers use `fixed inset-0`

**Benefits**:
- ✅ No unwanted scrollbars
- ✅ Predictable layout behavior
- ✅ Better mobile experience
- ✅ Proper scroll containment
- ✅ No nested height calculation issues

---

### Spacing Utilities: Space-Y vs Flexbox Gap (Critical Layout Fix)

**Location**: `components/Dashboard/`, Dashboard components

**Problem Fixed** (Commit cfa9f6a):
Tailwind's `space-y-X` utilities add **bottom margins** to child elements, which causes overflow calculation errors in flex containers. When cards load and animate, the margins cause content to exceed viewport bounds, triggering unwanted scrollbars.

**Solution Implemented**:
Replaced all `space-y-X` utilities with `flex flex-col gap-X`:

| Component | Before | After | Reason |
|-----------|--------|-------|--------|
| Dashboard.tsx (line 50) | `space-y-8` | `flex flex-col gap-8` | Main wrapper animating during load |
| KeyMetricsDashboard.tsx (line 20) | `space-y-6` | `flex flex-col gap-6` | Left column with cards |
| DashboardHeader.tsx (line 25) | `space-y-1` | `flex flex-col gap-1` | Title section in scrollable area |
| RecentActivity.tsx (line 50) | `space-y-1` | `flex flex-col gap-1` | Activity list with flex-1 overflow-y-auto |
| OnboardingQuestionnaire.tsx (line 61) | `space-y-8` | `flex flex-col gap-8` | Form sections in scrollable container |

**Why This Works**:
- `space-y-X` adds margins → causes overflow in animated flex containers
- `gap-X` distributes space without margins → stays within bounds
- More predictable with animations and responsive layouts

**Key Principle**:
**Never use `space-y-X` inside scrollable containers or animated elements**. Always use `flex flex-col gap-X` instead.

**Also Fixed**:
- Loading spinner: `fixed inset-0` → `flex justify-center items-center min-h-[400px]`
  - Respects scrollable container bounds instead of full-screen overlay
  - Prevents layout conflicts with viewport system

---

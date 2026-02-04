# Continue as Guest Feature

## Overview
Added "Continue as Guest" functionality to the customer app, allowing users to browse and explore without creating an account. Authentication is only required when accessing protected features like checkout.

## Implementation Date
February 3, 2026

---

## Feature Components

### 1. Authentication Modal (ProtectedRoute)
**File:** `apps/customer/src/components/ProtectedRoute.tsx`

When users try to access protected routes, a modal appears with:
- **Large icon** (shopping cart or user icon)
- **Context-aware messaging** (different text for checkout vs other features)
- **Two primary actions:**
  - "Sign In / Register" button (orange gradient)
  - "Continue as Guest" button (gray, returns to browsing)
- **Informational text** about benefits of creating an account

**Key Features:**
- Modal is dismissible (clicking outside or ESC closes it)
- Persists intended destination for post-login redirect
- Shows loading spinner while checking auth status
- Context-aware messaging based on route (checkout vs other features)

### 2. Authentication Page
**File:** `apps/customer/src/pages/Auth.tsx`

Full-page authentication interface with:
- **Crave'n branding** (logo and gradient background)
- **Dual-mode form:**
  - Sign In mode (email + password)
  - Sign Up mode (full name + email + password)
- **Form validation** and error handling
- **Toggle between modes** (sign in ↔ sign up)
- **Continue as Guest button** (always visible)
- **Legal links** (Privacy Policy, Terms of Service)

**Key Features:**
- Checks if already authenticated on mount
- Redirects to intended destination after successful auth
- Handles email confirmation flow
- Stores full name in user metadata
- Form state preserved when switching modes
- Gradient background with white form card

---

## User Experience

### Scenario 1: Guest Browsing → Checkout Attempt
1. User opens app → lands on restaurants page
2. Browses restaurants, views menus, adds items to cart
3. Clicks "Checkout" button
4. **Authentication modal appears** with:
   - Message: "Ready to place your order?"
   - Context: "Sign in or create an account to complete your order..."
   - Two buttons: "Sign In / Register" and "Continue as Guest"
5. User has choice:
   - **Option A:** Click "Continue as Guest" → returns to restaurants page, cart preserved
   - **Option B:** Click "Sign In / Register" → navigates to auth page

### Scenario 2: Creating Account from Checkout
1. User at checkout, modal appears
2. Clicks "Sign In / Register"
3. Lands on auth page with beautiful gradient background
4. Clicks "Sign up" link to switch to registration mode
5. Enters: Full Name, Email, Password
6. Submits form → account created instantly
7. Automatically redirected back to `/checkout`
8. Cart contents preserved throughout entire flow
9. Can now complete order

### Scenario 3: Changing Mind During Auth
1. User on auth page after clicking "Sign In / Register"
2. Decides not to create account right now
3. Clicks "Continue as Guest" button on auth page
4. Returns to restaurants page immediately
5. Cart preserved, can continue browsing
6. Can attempt checkout again later

### Scenario 4: Accessing Account Features
1. Logged-out user clicks "Account" in bottom nav
2. Authentication modal appears with:
   - Message: "Access Your Account"
   - Context: "Sign in to access your account features..."
   - Two buttons: "Sign In / Register" and "Continue as Guest"
3. Same options as checkout flow

---

## Technical Implementation

### Protected Route Logic
```typescript
// Check authentication
const { data: { session } } = await supabase.auth.getSession();
const authenticated = !!session;

// If not authenticated, show modal
if (!authenticated) {
  setShowAuthModal(true);
}

// Modal actions:
handleSignIn() → navigate('/auth', { state: { from: location } })
handleContinueAsGuest() → navigate('/restaurants', { replace: true })
```

### Auth Page Logic
```typescript
// Sign In
supabase.auth.signInWithPassword({ email, password })
  → navigate to intended destination or '/restaurants'

// Sign Up
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: fullName } }
})
  → navigate to intended destination or '/restaurants'

// Continue as Guest
handleContinueAsGuest() → navigate('/restaurants', { replace: true })
```

### Cart Persistence
- Cart stored in `localStorage` via `CartContext`
- Survives page refreshes
- Preserved across authentication flows
- Guest cart becomes user's cart after login

---

## UI/UX Design

### Authentication Modal
- **Size:** Medium (responsive)
- **Position:** Centered overlay
- **Background:** Semi-transparent backdrop
- **Dismissible:** Yes (ESC key, click outside, or Continue as Guest)
- **Icon:** 64px circle with gradient background
  - Checkout: Shopping cart icon
  - Other: User icon
- **Colors:**
  - Primary action: Orange to red gradient
  - Secondary action: Light gray
  - Icons: White on orange gradient background

### Auth Page
- **Background:** Full-page orange to red gradient
- **Form Card:** White paper with shadow, rounded corners
- **Logo:** 64px height, centered above form
- **Form Width:** Maximum 420px (responsive container)
- **Input Fields:**
  - Left icons for visual guidance
  - Floating labels
  - Mantine UI components for consistency
- **Buttons:**
  - Primary: Orange gradient, full width, large
  - Secondary: Light gray, full width
  - Text links: Mantine anchor styling

---

## Benefits

### For Users
✅ **No forced registration** — Browse freely without commitment  
✅ **Clear options** — Always know they can continue browsing  
✅ **Cart preserved** — Never lose items when exploring auth  
✅ **Context-aware messaging** — Understand why auth is needed  
✅ **Easy account creation** — Simple 3-field form when ready

### For Business
✅ **Lower friction** — More users engage with browsing  
✅ **Higher conversion** — Users commit when ready (at checkout)  
✅ **Better data** — Know when users choose guest vs create account  
✅ **Flexible funnel** — Multiple touchpoints for account creation  
✅ **Cart retention** — Users don't abandon due to auth wall

---

## Routes Behavior

### Public Routes (No Auth Modal)
- `/` → Redirects to `/restaurants`
- `/restaurants` → Browse all restaurants
- `/restaurants/cuisine/:cuisine` → Filter by cuisine
- `/restaurant/:id` → View restaurant details
- `/restaurant/:id/menu` → Browse menu, add to cart
- `/legal/*` → All legal pages
- `/promotion-details` → View promotions
- `/auth` → Authentication page

### Protected Routes (Show Auth Modal)
- `/checkout` → Place order
- `/order-history` → View past orders
- `/favorites` → Saved restaurants
- `/account/*` → All account pages
- `/notifications` → View notifications
- `/tester-hub` → Tester program
- `/crave-more` → Subscription features
- `/customer-support` → Support chat

---

## Testing Checklist

- [x] Guest can browse restaurants without auth
- [x] Guest can view restaurant menus
- [x] Guest can add items to cart
- [x] Cart persists across pages
- [x] Checkout shows authentication modal
- [x] Modal has "Continue as Guest" option
- [x] "Continue as Guest" returns to restaurants
- [x] "Sign In / Register" navigates to auth page
- [x] Auth page has "Continue as Guest" button
- [x] Sign in works and redirects to intended destination
- [x] Sign up works and creates account
- [x] Cart persists after authentication
- [x] Modal is dismissible (ESC, click outside)
- [x] Legal links work on auth page
- [x] Already-authenticated users redirect properly
- [x] Error handling works (invalid credentials, etc.)

---

## Related Files

### New/Modified Files
- `apps/customer/src/components/ProtectedRoute.tsx` — Auth modal & routing logic
- `apps/customer/src/pages/Auth.tsx` — Full auth page with forms
- `apps/customer/src/App.tsx` — Route protection configuration
- `docs/CUSTOMER_APP_GUEST_BROWSING.md` — Full guest browsing docs
- `docs/CONTINUE_AS_GUEST_FEATURE.md` — This document

### Related Existing Files
- `apps/customer/src/contexts/CartContext.tsx` — Cart persistence
- `apps/customer/src/integrations/supabase/client.ts` — Auth client
- `apps/customer/src/components/mobile/GlobalMobileBottomNav.tsx` — Bottom nav

---

## Future Enhancements

1. **Social Sign-In**
   - Google OAuth
   - Apple Sign In
   - Facebook Login

2. **Guest Order Tracking**
   - Allow guests to track with order # + email
   - No account needed for basic tracking

3. **Guest Checkout**
   - Allow order placement without account
   - Create account after successful order
   - Email order confirmation with account creation link

4. **Remember Guest Preferences**
   - Save delivery address in localStorage
   - Remember favorite restaurants (migrate on signup)
   - Store payment methods (via Stripe tokenization)

5. **Progressive Account Creation**
   - Collect info gradually (name at checkout, password optional)
   - Convert guest orders to account automatically
   - Send magic link for passwordless auth

---

## Summary

✅ **Guest browsing fully implemented** — Browse restaurants freely  
✅ **Authentication modal with guest option** — Clear choice at gate  
✅ **Full authentication page** — Beautiful, functional auth UI  
✅ **Continue as Guest always available** — No pressure to create account  
✅ **Cart persistence throughout** — Never lose items  
✅ **Context-aware messaging** — Users understand why auth is needed  
✅ **Seamless redirect flow** — Return to intended destination after auth

The "Continue as Guest" feature provides a frictionless browsing experience while encouraging account creation at the right moment (checkout), leading to better user engagement and conversion rates.






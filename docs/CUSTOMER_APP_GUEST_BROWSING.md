# Customer App - Guest Browsing Implementation

## Overview

The customer mobile app now supports **guest browsing** with authentication required only for checkout and personal account features.

## Implementation Date
February 3, 2026

---

## Guest Access (No Login Required)

### Public Routes
Guests can freely browse and explore:

1. **Restaurants & Stores**
   - `/restaurants` — Browse all restaurants
   - `/restaurants/cuisine/:cuisine` — Filter by cuisine type
   - `/restaurant/:id` — View restaurant details
   - `/restaurant/:id/menu` — Browse restaurant menu and add items to cart

2. **Legal & Information**
   - `/legal/privacy` — Privacy Policy
   - `/legal/terms` — Terms of Service  
   - `/legal/cravemore` — Crave More Terms
   - `/promotion-details` — View promotion details

3. **Authentication**
   - `/auth` — Sign in / Register page

---

## Protected Routes (Login Required)

### Checkout & Orders
- `/checkout` — Place order (redirects to `/auth` if not logged in)
- `/track-order/:orderId` — Track active order
- `/payment-success` — Payment confirmation
- `/payment-canceled` — Payment cancellation
- `/order-history` — View past orders
- `/favorites` — Saved favorite restaurants

### Account & Settings
- `/account` — Customer dashboard
- `/account/edit-profile` — Edit profile information
- `/account/payment-methods` — Manage payment methods
- `/account/delivery-addresses` — Manage delivery addresses
- `/account/my-credits` — View Crave'n Credits balance
- `/my-credits` — Alternative credits page route
- `/notifications` — View notifications
- `/notification-settings` — Manage notification preferences

### Tester Program
- `/tester-hub` — Tester program dashboard
- `/account/tester-hub` — Alternative tester hub route
- `/tester/refer-merchant` — Refer merchants
- `/tester/driver-interest` — Express driver interest
- `/tester/invite-friends` — Invite friends to test
- `/invite-friends` — General invite friends

### Crave More Subscription
- `/crave-more` — Crave More subscription landing
- `/crave-more-subscription` — Subscription management
- `/cravemore` — Alternative Crave More route
- `/cravemore/success` — Subscription success page
- `/account/cravemore` — Account Crave More management

### Support & Admin
- `/customer-support` — Customer support chat
- `/admin/promo` — Promo management (admin only)

---

## User Flow

### Guest Browsing Flow
1. **Open App** → Automatically redirected to `/restaurants`
2. **Browse Restaurants** → View menus, add items to cart
3. **Ready to Checkout** → Tap "Checkout"
4. **Authentication Modal** → Shown overlay asking to sign in
   - **Option 1:** "Sign In / Register" → Go to auth page
   - **Option 2:** "Continue as Guest" → Return to browsing
5. **If Sign In Selected** → Navigate to `/auth` page
6. **Authentication Page** → Full-page auth UI with options:
   - Sign In form
   - Create Account form
   - "Continue as Guest" button (returns to browsing)
7. **After Authentication** → User returns to checkout with cart intact
8. **Complete Order** → Enter delivery info and place order

### Guest Checkout Account Creation
When a guest attempts to checkout:
1. Authentication modal appears with clear messaging
2. **"Continue as Guest"** option allows them to return to browsing
3. **"Sign In / Register"** option takes them to auth page
4. On auth page, they can:
   - Sign in with existing account
   - Create new account (email, password, full name)
   - Still choose "Continue as Guest" to go back
5. Account is created instantly (email confirmation optional)
6. User is redirected back to checkout
7. Their cart persists across all authentication flows

### Continue as Guest Feature
- Available on both authentication modal and auth page
- Always returns user to `/restaurants` page
- Preserves cart contents
- No pressure to create account
- Users can browse indefinitely without signing in

---

## Technical Implementation

### ProtectedRoute Component
**File**: `apps/customer/src/components/ProtectedRoute.tsx`

```typescript
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Checks authentication state
  // Redirects to /auth if not authenticated
  // Preserves intended destination in location state
  // Shows loading spinner while checking auth
};
```

### Route Configuration
**File**: `apps/customer/src/App.tsx`

Routes are organized into:
- **Public Routes** — Accessible without login
- **Protected Routes** — Wrapped in `<ProtectedRoute>` component

### Authentication Flow
1. `ProtectedRoute` checks `supabase.auth.getSession()`
2. If no session exists, redirects to `/auth` with `state={{ from: location }}`
3. After successful login, Auth page redirects to `state.from` or `/restaurants`
4. `ProtectedRoute` listens to `supabase.auth.onAuthStateChange()` for real-time updates

---

## Cart Persistence

**Implementation**: `apps/customer/src/contexts/CartContext.tsx`

- Cart data persists in `localStorage`
- Survives page refreshes and app restarts
- Preserved across authentication flow
- Guest cart automatically becomes authenticated user's cart after login

---

## Bottom Navigation

**Global Navigation**: `apps/customer/src/components/mobile/GlobalMobileBottomNav.tsx`

Bottom nav adapts based on authentication state:
- **Guest** — Shows "Sign In" option
- **Authenticated** — Shows account/profile option

---

## Future Enhancements

1. **Guest Order Tracking**
   - Allow guests to track orders with order number + email
   - No account required for basic order tracking

2. **Guest Favorite Restaurants**
   - Store favorites in localStorage for guests
   - Migrate to account upon registration

3. **Social Sign-In**
   - Add Google/Apple sign-in options
   - Faster guest-to-customer conversion

4. **One-Tap Checkout**
   - Save payment methods after first order
   - Apple Pay / Google Pay integration

---

## Testing Checklist

- [ ] Guest can browse restaurants without login
- [ ] Guest can view restaurant menus
- [ ] Guest can add items to cart
- [ ] Cart persists across pages
- [ ] Checkout redirects to auth when not logged in
- [ ] After login, user returns to checkout
- [ ] Cart items persist after authentication
- [ ] Protected routes redirect to auth
- [ ] Account pages require authentication
- [ ] Bottom nav shows appropriate state
- [ ] Legal pages accessible to guests

---

## Related Files

- `apps/customer/src/App.tsx` — Route configuration
- `apps/customer/src/components/ProtectedRoute.tsx` — Auth wrapper component
- `apps/customer/src/pages/Auth.tsx` — Sign in / register page
- `apps/customer/src/pages/Checkout.tsx` — Checkout page (protected)
- `apps/customer/src/contexts/CartContext.tsx` — Cart state management
- `apps/customer/src/components/mobile/GlobalMobileBottomNav.tsx` — Bottom navigation

---

## Summary

✅ **Guest browsing enabled** — Browse restaurants and menus freely  
✅ **Authentication on checkout** — Required only when placing orders  
✅ **Cart persistence** — Cart survives authentication flow  
✅ **Protected routes** — Account features require login  
✅ **Clean UX** — Seamless transition from guest to authenticated user


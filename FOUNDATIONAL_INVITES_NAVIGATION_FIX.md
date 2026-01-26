# Foundational Invites Navigation Issue - Analysis & Fix

## Issue Summary
When clicking the "Foundational Invites" tile in Main Hub, it redirects to home page (`/`) instead of navigating to `/hub/foundational/invites`.

## Root Cause Analysis

### Test Results
Automated Playwright test captured the navigation flow:
- Route order is **correct**: `/hub/foundational/invites` is defined before `/hub` in `App.tsx` (line 800 vs 802)
- BusinessAuthGuard correctly redirects unauthenticated users to `/auth?hq=true`
- Component has path verification logic that should prevent redirects

### Potential Issues Identified

1. **Permission Check**: The `isPortalAllowed` function may be returning `false` for Torrance
   - **Fix Applied**: Added explicit Torrance check at the start of `isPortalAllowed` function
   - **Location**: `src/pages/MainHub.tsx` line 1382

2. **Navigation Handler**: The click handler may not be executing
   - **Fix Applied**: Added comprehensive console logging to track navigation
   - **Location**: `src/pages/MainHub.tsx` line 2018

3. **Component Redirect**: HubFoundationalInvites component may be redirecting
   - **Status**: Component has path verification that should prevent this
   - **Location**: `src/pages/HubFoundationalInvites.tsx` line 28

## Fixes Applied

### 1. Enhanced Permission Check
```typescript
const isPortalAllowed = (id: string): boolean => {
  // TORRANCE STROMAN: UNIVERSAL ACCESS - CHECK FIRST
  const userEmail = user?.email?.toLowerCase() || '';
  const isTorrance = hasFullAccess(user?.email) || 
                    userEmail === 'tstroman.ceo@cravenusa.com' || 
                    userEmail.includes('torrance') || 
                    userEmail.includes('tstroman');
  
  if (isTorrance) {
    console.log('[MainHub] Torrance access granted for portal:', id);
    return true;
  }
  // ... rest of checks
}
```

### 2. Enhanced Navigation Logging
```typescript
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log('[MainHub] Portal clicked:', {
    id: portal.id,
    path: portal.path,
    allowed,
    userEmail: user?.email
  });
  if (allowed) {
    console.log('[MainHub] Navigating to:', portal.path);
    navigate(portal.path, { replace: false });
  } else {
    console.warn('[MainHub] Access denied for portal:', portal.id);
    message.warning('Access denied for this portal');
  }
}}
```

### 3. BusinessAuthGuard Logging
Added comprehensive logging to track authentication and redirects:
- Logs auth checks
- Logs route changes
- Logs redirect reasons

## Debugging Steps

### Step 1: Check Browser Console
When clicking the Foundational Invites tile, check the browser console for:
- `[MainHub] Portal clicked:` - Confirms click is registered
- `[MainHub] Navigating to: /hub/foundational/invites` - Confirms navigation attempt
- `[BusinessAuthGuard] Current path:` - Shows route changes
- `[HubFoundationalInvites] Component mounted` - Confirms component loads

### Step 2: Verify User Email
Check if the logged-in user's email matches Torrance's:
- Expected: `tstroman.ceo@cravenusa.com`
- Or contains: `torrance` or `tstroman`

### Step 3: Check Network Tab
Look for:
- Request to `/api/hub/invites/list` - Confirms component loaded
- Any 401/403 errors - Indicates permission issues
- Redirect responses (301/302)

### Step 4: Verify Route Matching
In React DevTools, check:
- Current route path
- Route component tree
- Any error boundaries triggered

## Expected Behavior

1. User clicks "Foundational Invites" tile
2. Console shows: `[MainHub] Portal clicked: { id: 'foundational-invites', path: '/hub/foundational/invites', allowed: true }`
3. Console shows: `[MainHub] Navigating to: /hub/foundational/invites`
4. URL changes to: `http://localhost:8080/hub/foundational/invites`
5. Console shows: `[BusinessAuthGuard] Authenticated, user: tstroman.ceo@cravenusa.com`
6. Console shows: `[HubFoundationalInvites] Component mounted, path: /hub/foundational/invites`
7. Page displays the Foundational Invites admin interface

## If Issue Persists

### Check These Files:
1. `src/pages/MainHub.tsx` - Verify permission check and navigation handler
2. `src/components/BusinessAuthGuard.tsx` - Verify auth logic
3. `src/pages/HubFoundationalInvites.tsx` - Verify component doesn't redirect
4. `src/App.tsx` - Verify route order (line 800 should be before 802)

### Manual Test:
1. Open browser console
2. Navigate to `/hub`
3. Click "Foundational Invites" tile
4. Copy all console logs
5. Check Network tab for redirects
6. Share logs for further analysis

## Files Modified
- `src/pages/MainHub.tsx` - Enhanced permission check and logging
- `src/components/BusinessAuthGuard.tsx` - Added comprehensive logging
- `src/pages/HubFoundationalInvites.tsx` - Enhanced path verification logging

## Test File Created
- `tests/foundational-invites-navigation.spec.ts` - Automated test to capture navigation flow
- `tests/foundational-invites-navigation-log.json` - Detailed log of test run

## Next Steps
1. Test with actual logged-in session (Torrance's account)
2. Review browser console logs when clicking tile
3. If issue persists, check for any error boundaries or global redirects
4. Verify no other code is intercepting the navigation


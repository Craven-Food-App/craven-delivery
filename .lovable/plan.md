

# Update Legal & Support Links in Feeder App Settings

## What Changes

The "Legal & Support" section in `AppSettingsPage.tsx` already has the correct 5 items (Terms of Service, Privacy Policy, Driver Agreement, Community Guidelines, Contact Support), matching the reference screenshot. However, the links currently point to **external broken URLs** (`craven.app/*`). These need to be updated to use the app's **internal routes** and the correct support email.

## Changes to Make

### `src/components/mobile/AppSettingsPage.tsx`

Update the `onClick` handlers in the Legal & Support section:

| Item | Current (broken) | Updated |
|------|-------------------|---------|
| Terms of Service | `window.open('https://craven.app/terms', '_blank')` | `window.open('/terms-of-service', '_blank')` |
| Privacy Policy | `window.open('https://craven.app/privacy', '_blank')` | `window.open('/feeder-privacy-policy', '_blank')` |
| Driver Agreement | `window.open('https://craven.app/driver-agreement', '_blank')` | `window.open('/independent-contractor-agreement', '_blank')` |
| Community Guidelines | `window.open('https://craven.app/community-guidelines', '_blank')` | `window.open('/safety', '_blank')` (the Safety page contains Community Guidelines) |
| Contact Support | `mailto:support@craven.app` | `mailto:support@cravenusa.com` (per branding standards) |

### Files Modified

| File | Change |
|------|--------|
| `src/components/mobile/AppSettingsPage.tsx` | Update 5 link URLs to internal routes and correct email |


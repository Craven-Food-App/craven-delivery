# Fix Test User Password Issue

Since the user exists and email is confirmed, the password is the issue.

## Solution: Reset Password in Dashboard

### Step 1: Reset Password

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find `tester@cravenusa.com` in the list
3. **Click directly on the user row** (not just the email)
4. In the user details panel that opens, look for:
   - **"Reset Password"** button, OR
   - **"Update User"** button, OR
   - **"..." menu** → **"Reset Password"**
5. Set the new password to: `Testing123!`
   - Make sure there are NO extra spaces before or after
   - Make sure it's exactly: Capital T, lowercase esting, 123, exclamation mark
6. **Save** or **Update**

### Step 2: Try a Simpler Password First (Test)

If `Testing123!` still doesn't work, try setting it to a simpler password first to test:

1. Reset password to: `test123456` (all lowercase, no special chars)
2. Try logging in with: `test123456`
3. If that works, then the issue is with special characters
4. If that doesn't work, there's a different issue

### Step 3: Verify Password Was Actually Set

After resetting, try logging in immediately. If it still doesn't work:

1. Go back to the user in Dashboard
2. Check if there's a "Password" field showing (it might show as hidden/encrypted)
3. Try resetting again, making absolutely sure:
   - No copy/paste issues
   - No extra spaces
   - Password field is actually being saved

### Step 4: Alternative - Use Password Reset Email

1. In Dashboard, find the user
2. Click **"Send Password Reset Email"** or **"Send Magic Link"**
3. Check the email inbox for `tester@cravenusa.com`
4. Use the reset link to set a new password

### Step 5: Check Supabase Auth Settings

1. Go to **Authentication** → **Settings** (or **Policies**)
2. Check if there are any password requirements that might be blocking it
3. Check if there are any email domain restrictions

## Common Password Issues:

- **Special characters**: `!` might be encoded differently
- **Case sensitivity**: Make sure `T` is capital
- **Hidden spaces**: Copy/paste might add spaces
- **Password policy**: Supabase might have min length/complexity requirements

## Quick Test:

Try this exact password (no special chars): `TestUser123`

If that works, then the `!` character is the issue. If it doesn't work, the problem is elsewhere.






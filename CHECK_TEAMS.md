# Quick Check: Teams Data Collection

## Step 1: Check Server Logs

When you log in, check your **terminal/console** (where you run `npm run dev`). Look for these log messages:

### ✅ Success Indicators:
```
Checking for provider_token: { hasProviderToken: true, ... }
Fetching teams from GitHub API...
Found X teams for org your-org-name: ["team1", "team2"]
✅ Updated profile with teams: ["team1", "team2"]
```

### ❌ Problem Indicators:
```
⚠️ No provider_token in session. Teams cannot be fetched.
```
OR
```
⚠️ GITHUB_ORG_NAME environment variable not set
```
OR
```
❌ Failed to fetch GitHub teams: 401 Unauthorized
```

## Step 2: Check Environment Variable

Make sure `.env.local` has:
```env
GITHUB_ORG_NAME=your-org-slug
```

**Important**: Use the **slug** (short name), not the display name. For example, if your org URL is `github.com/my-awesome-org`, use `my-awesome-org`.

## Step 3: Check Database

1. Go to Supabase Dashboard → Table Editor → `profiles` table
2. Find your user row
3. Check the `teams` column - it should be an array like `["team-slug-1", "team-slug-2"]` or `{}` if empty

## Step 4: Verify Migration

Run this in Supabase SQL Editor:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'teams';
```

If no rows returned, run the migration:
```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS teams text[] DEFAULT '{}';
```

## Step 5: Re-authenticate

1. **Log out** completely
2. **Clear browser cookies** (or use incognito)
3. **Log back in** - this triggers the team fetch

## What to Share

If teams still aren't being collected, share:
1. The **server console logs** from when you log in
2. Whether `hasProviderToken: true` or `false`
3. Any error messages you see
4. Your `.env.local` file (with sensitive data redacted)


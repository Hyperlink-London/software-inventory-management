# Troubleshooting: Teams Data Not Being Collected

If teams data is not being collected, follow these steps to diagnose and fix the issue:

## Step 1: Check Environment Variable

Verify that `GITHUB_ORG_NAME` is set in your `.env.local` file:

```env
GITHUB_ORG_NAME=your-org-name
```

**Important**: Use the organization **slug** (the short name in the URL), not the display name.

## Step 2: Check Database Migration

Ensure the `teams` column exists in your `profiles` table:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to check:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'teams';
   ```

3. If the column doesn't exist, run the migration:
   ```sql
   ALTER TABLE public.profiles
   ADD COLUMN IF NOT EXISTS teams text[] DEFAULT '{}';
   ```

## Step 3: Check Supabase OAuth Configuration

The `provider_token` must be available in your Supabase session. This is **critical**:

1. Go to Supabase Dashboard → Authentication → Providers → GitHub
2. Ensure the provider is enabled
3. **Check OAuth Scopes**: The scopes field should include `read:org` (it's already in the code)
4. **Important**: Supabase should automatically include `provider_token` in the session when using OAuth
   - If it's not there, you may need to check Supabase's OAuth settings
   - Some Supabase versions/configurations may require additional setup

**Note**: The `provider_token` is the GitHub access token that allows us to call GitHub's API. Without it, we cannot fetch team data.

## Step 4: Check Browser Console Logs

After logging in, check the browser console (F12 → Console tab) for:

- ✅ Success messages: "Found X teams for org..."
- ❌ Error messages: "No provider_token in session"
- ⚠️ Warning messages: "GITHUB_ORG_NAME environment variable not set"

## Step 5: Verify OAuth Scopes

The GitHub OAuth must request the `read:org` scope. Check `src/app/GitHubSignInButton.tsx`:

```typescript
scopes: "read:org read:user user:email"
```

## Step 6: Re-authenticate

If you logged in before setting up teams:

1. **Log out** completely
2. **Clear browser cookies** for your domain
3. **Log back in** - this will trigger the team fetch again

## Step 7: Check GitHub API Response

The callback route logs detailed information. Check your server logs (or terminal if running locally) for:

- GitHub API response status
- Number of teams received
- Any error messages

## Common Issues

### Issue: "No provider_token in session"

**This is the most common issue!**

**Possible Solutions**:

1. **Check Supabase Version**: Some Supabase versions/configurations may not return `provider_token` by default
   - Check your Supabase project settings
   - Look for "OAuth" or "Provider Token" settings

2. **Verify OAuth Flow**: 
   - The `provider_token` should be automatically included in the session
   - If it's missing, Supabase might need to be configured differently

3. **Alternative Approach**: If `provider_token` is not available, you may need to:
   - Use Supabase's Management API (requires service role key)
   - Or implement a client-side flow that fetches teams after login
   - Or use GitHub's OAuth flow directly (bypassing Supabase's OAuth)

4. **Check Session Data**: 
   - Add console.log in the callback route to see what's in the session
   - Look for `session.provider_token` in the logs
   - If it's `undefined` or `null`, that's the problem

5. **Supabase Support**: 
   - This might be a Supabase configuration issue
   - Contact Supabase support or check their docs for "provider_token" or "OAuth provider tokens"

### Issue: "401 Unauthorized" from GitHub API

**Solution**:
- The `read:org` scope might not be granted
- User needs to re-authenticate and grant the scope
- Check that the scope is requested in the OAuth call

### Issue: "403 Forbidden" from GitHub API

**Solution**:
- The user might not be a member of the organization
- The token might not have the right permissions
- Organization might have restricted third-party access

### Issue: Teams array is empty

**Solution**:
- User might not be in any teams in the organization
- The `GITHUB_ORG_NAME` might not match the organization slug
- Check the console logs to see what teams were fetched

## Testing

1. Log in with a GitHub account that:
   - Is a member of your organization
   - Belongs to at least one team in that organization

2. Check the console logs during login

3. Verify in Supabase:
   ```sql
   SELECT username, teams FROM profiles WHERE supabase_uid = 'your-user-id';
   ```

4. The `teams` column should contain an array like: `["team-slug-1", "team-slug-2"]`

## Still Not Working?

If teams are still not being collected:

1. Check all console logs (browser and server)
2. Verify the GitHub organization name matches exactly
3. Ensure the user is actually in teams in the GitHub organization
4. Try logging in with a different GitHub account that definitely has teams
5. Check Supabase logs for any database errors


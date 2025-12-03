# GitHub Team Integration Setup

## Overview
This integration fetches GitHub team membership during OAuth login and uses it to filter "Team Checkouts" to show only checkouts from users in the same team(s).

## Setup Steps

### 1. Run Database Migration

Execute the SQL migration to add the `teams` column to the `profiles` table:

```sql
-- Add teams column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS teams text[] DEFAULT '{}';

-- Create an index for faster queries on teams
CREATE INDEX IF NOT EXISTS idx_profiles_teams ON public.profiles USING GIN (teams);

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.teams IS 'Array of GitHub team slugs that this user belongs to';
```

You can run this in your Supabase SQL editor or via your database migration tool.

### 2. Set Environment Variable

Add the following environment variable to your `.env.local` file (or your deployment environment):

```env
GITHUB_ORG_NAME=your-github-org-name
```

Replace `your-github-org-name` with your actual GitHub organization name (the slug, not the display name).

### 3. Verify OAuth Scopes

The GitHub OAuth already includes the `read:org` scope in `src/app/GitHubSignInButton.tsx`. This is required to read team membership.

### 4. How It Works

1. **During Login**: When a user logs in with GitHub OAuth:
   - The auth callback fetches their team membership from GitHub API
   - Teams are filtered to only include teams from your organization
   - Team slugs are stored in the `profiles.teams` column as a text array

2. **Team Checkouts Filtering**: 
   - When viewing "Team Checkouts", the system:
     - Gets the current user's teams from their profile
     - Filters checkouts to show only those from recipients who share at least one team with the current user
     - If the user has no teams, the list will be empty

### 5. Testing

After setup:
1. Log in with a GitHub account that belongs to your organization
2. Check the browser console for logs showing teams fetched
3. Verify teams are stored in the `profiles` table
4. Test the "Team Checkouts" view to see filtered results

### Notes

- Team membership is fetched and stored on each login
- If a user is removed from a team on GitHub, their teams will be updated on their next login
- The `read:org` scope requires users to grant permission during OAuth
- Team slugs (not display names) are stored for consistency


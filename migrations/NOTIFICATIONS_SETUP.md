# Notifications Setup

Notifications require extra database objects that are **not** in your base schema. You must run the migration in Supabase.

## Step 1: Run the migration

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor**
3. Copy the contents of `notifications_and_push_tokens.sql`
4. Paste and click **Run**

## Step 2: Verify

In the SQL Editor, run:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'notification_messages'
);
```

If this returns `true`, the migration ran successfully.

## What the migration adds

| Object | Purpose |
|--------|---------|
| `push_tokens` | Stores Expo push tokens for the mobile app |
| `notification_messages` | Inbox table shared by web and app |
| `get_teammate_push_tokens()` | Returns teammates’ push tokens for sending notifications |
| `get_teammate_profile_ids()` | Returns teammates’ profile IDs for inserting notifications |

## Team notifications

Team notifications (checkout, item added) only work when:

- Both web and app use the **same Supabase project**
- Users have the `teams` column populated (from GitHub org or your auth flow)
- Users share at least one team with each other

## Overdue notifications

Overdue and due-tomorrow notifications work without teams. They are created when you load the Dashboard or Checkouts page.

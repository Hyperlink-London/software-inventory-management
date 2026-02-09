# Hyperlink Software Inventory Management

A web application for tracking physical inventory and managing item checkouts. Built with Next.js and Supabase.

## What It Does

This system helps teams track items (hardware, equipment, tools, etc.), manage who has them checked out, and get reminders when items are due or overdue. It pairs with a companion mobile app for on-the-go access.

### Features

- **Inventory** – Add, edit, and delete items with names, quantities, notes, images, and tags
- **Checkouts** – Check out items to users with expected return dates; check items back in when returned
- **Checkout views** – Filter by Your Checkouts, Everyone, Team, or Returned
- **Tags** – Organize items with custom tags for filtering
- **Teams** – Integrate with GitHub teams to filter checkouts by team membership
- **Notifications** – Inbox for team activity (checkouts, new items) and overdue/due-tomorrow reminders; synced with the mobile app
- **Profile** – View and manage your profile and teams

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database & Auth:** Supabase (PostgreSQL, Auth)
- **Auth Provider:** GitHub OAuth
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Supabase project
- GitHub OAuth app

### Installation

1. Clone the repository and install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.sample` to `.env.local` and fill in your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Configure GitHub OAuth in Supabase (Authentication → Providers → GitHub) and ensure your auth callback URL is correct.

4. Run the database migrations in the Supabase SQL Editor (see [Database Migrations](#database-migrations) below).

5. Start the development server:

   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

### Database Migrations

Run these migrations in your Supabase project’s SQL Editor (in order if needed):

| Migration | Purpose |
|-----------|---------|
| `migrations/add_teams_to_profiles.sql` | Adds `teams` column for GitHub team filtering |
| `migrations/notifications_and_push_tokens.sql` | Adds notification inbox and push tokens |

See `migrations/NOTIFICATIONS_SETUP.md` for detailed notification setup.

## Optional: Team Integration

To use team-based checkout filtering, configure GitHub team sync:

1. Run `migrations/add_teams_to_profiles.sql`
2. Set `GITHUB_ORG_NAME` in your environment
3. Use the `read:org` scope for GitHub OAuth

See `TEAM_SETUP.md` for full instructions.

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── actions/       # Server actions (checkout, items, notifications)
├── components/    # React components
├── contexts/      # React contexts (user/auth)
├── lib/           # Utilities and notification logic
└── utils/         # Supabase client helpers
```

## Scripts

- `pnpm dev` – Start development server
- `pnpm build` – Build for production
- `pnpm start` – Start production server

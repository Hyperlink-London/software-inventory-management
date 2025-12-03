-- Add teams column to profiles table
-- This will store an array of GitHub team slugs that the user belongs to

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS teams text[] DEFAULT '{}';

-- Create an index for faster queries on teams
CREATE INDEX IF NOT EXISTS idx_profiles_teams ON public.profiles USING GIN (teams);

-- Add a comment to document the column
COMMENT ON COLUMN public.profiles.teams IS 'Array of GitHub team slugs that this user belongs to';



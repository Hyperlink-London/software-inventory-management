"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * Fetches full names from Supabase auth metadata for a list of user UIDs
 * Uses the service role key to access auth.users table
 */
export async function getUserFullNames(uids: string[]): Promise<Record<string, string>> {
  if (!uids || uids.length === 0) {
    return {};
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Missing Supabase URL or Service Role Key. Full names will not be fetched.");
    // Return empty map - components will fall back to "Unknown"
    return {};
  }

  // Create admin client with service role key
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const fullNamesMap: Record<string, string> = {};

  try {
    // Try to get all users and filter (more efficient for multiple UIDs)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Error fetching users list, trying individual fetches:", error);
      // Fallback: try individual fetches
      for (const uid of uids) {
        try {
          const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(uid);
          if (!userError && user) {
            const fullName = extractFullName(user);
            fullNamesMap[uid] = fullName;
          } else {
            fullNamesMap[uid] = "Unknown";
          }
        } catch (err) {
          console.error(`Error fetching user ${uid}:`, err);
          fullNamesMap[uid] = "Unknown";
        }
      }
    } else {
      // Filter users by the UIDs we need
      const relevantUsers = users.filter((user) => uids.includes(user.id));
      for (const user of relevantUsers) {
        const fullName = extractFullName(user);
        fullNamesMap[user.id] = fullName;
      }
      
      // Set "Unknown" for any UIDs that weren't found
      for (const uid of uids) {
        if (!fullNamesMap[uid]) {
          fullNamesMap[uid] = "Unknown";
        }
      }
    }
  } catch (error) {
    console.error("Error in getUserFullNames:", error);
    // Set all to "Unknown" on error
    for (const uid of uids) {
      fullNamesMap[uid] = "Unknown";
    }
  }

  return fullNamesMap;
}

/**
 * Extracts full name from user metadata, with fallback options
 */
function extractFullName(user: any): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    user.user_metadata?.preferred_username ||
    user.email?.split("@")[0] ||
    "Unknown"
  );
}


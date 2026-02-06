


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."checkin_item"("p_checkout_id" "uuid") RETURNS TABLE("success" boolean, "returned_date" "date")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_checkout_record public.itemsignouts%ROWTYPE;
  v_returned_date date;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id
    AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT io.* INTO v_checkout_record
  FROM public.itemsignouts io
  WHERE io.id = p_checkout_id
    AND io.deleted_at IS NULL;

  IF v_checkout_record IS NULL THEN
    RAISE EXCEPTION 'Checkout record not found';
  END IF;

  IF v_checkout_record.recipient_id != v_profile_id THEN
    RAISE EXCEPTION 'You can only check in your own items';
  END IF;

  IF v_checkout_record.returned_date IS NOT NULL THEN
    RAISE EXCEPTION 'This item has already been checked in';
  END IF;

  v_returned_date := CURRENT_DATE;

  UPDATE public.itemsignouts
  SET returned_date = v_returned_date
  WHERE id = p_checkout_id;

  UPDATE public.items
  SET quantity = public.items.quantity + v_checkout_record.quantity
  WHERE public.items.id = v_checkout_record.item_id;

  RETURN QUERY
  SELECT true, v_returned_date;
END;
$$;


ALTER FUNCTION "public"."checkin_item"("p_checkout_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checkout_item"("p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "item_id" "uuid", "recipient_id" "uuid", "quantity" integer, "sign_out_date" "date", "expected_return_date" "date", "returned_date" "date", "deleted_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_checkout_id uuid;
  v_current_quantity integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id
    AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT i.quantity INTO v_current_quantity
  FROM public.items i
  WHERE i.id = p_item_id
    AND i.deleted_at IS NULL;

  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_current_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity. Only % available.', v_current_quantity;
  END IF;

  INSERT INTO public.itemsignouts (
    item_id,
    recipient_id,
    quantity,
    sign_out_date,
    expected_return_date
  )
  VALUES (
    p_item_id,
    v_profile_id,
    p_quantity,
    CURRENT_DATE,
    p_expected_return_date
  )
  RETURNING public.itemsignouts.id INTO v_checkout_id;

  UPDATE public.items
  SET quantity = public.items.quantity - p_quantity
  WHERE public.items.id = p_item_id;

  RETURN QUERY
  SELECT
    io.id,
    io.item_id,
    io.recipient_id,
    io.quantity,
    io.sign_out_date,
    io.expected_return_date,
    io.returned_date,
    io.deleted_at
  FROM public.itemsignouts io
  WHERE io.id = v_checkout_id;
END;
$$;


ALTER FUNCTION "public"."checkout_item"("p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_item"("p_item_name" "text", "p_quantity" integer, "p_notes" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "created_by" "uuid", "item_name" "text", "quantity" integer, "notes" "text", "image_URL" "text", "deleted_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_item_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id
    AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  INSERT INTO public.items (created_by, item_name, quantity, notes, "image_URL")
  VALUES (v_profile_id, p_item_name, p_quantity, p_notes, p_image_url)
  RETURNING public.items.id INTO v_item_id;

  RETURN QUERY
  SELECT
    i.id,
    i.created_by,
    i.item_name,
    i.quantity,
    i.notes,
    i."image_URL",
    i.deleted_at
  FROM public.items i
  WHERE i.id = v_item_id;
END;
$$;


ALTER FUNCTION "public"."create_item"("p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_tag"("p_name" "text") RETURNS TABLE("id" "uuid", "created_by" "uuid", "name" "text", "deleted_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_tag_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id
    AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  INSERT INTO public.tags (created_by, name)
  VALUES (v_profile_id, p_name)
  ON CONFLICT (name)
  DO UPDATE SET name = EXCLUDED.name
  RETURNING public.tags.id INTO v_tag_id;

  IF v_tag_id IS NULL THEN
    SELECT t.id INTO v_tag_id
    FROM public.tags t
    WHERE t.name = p_name
      AND t.deleted_at IS NULL
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.created_by,
    t.name,
    t.deleted_at
  FROM public.tags t
  WHERE t.id = v_tag_id;
END;
$$;


ALTER FUNCTION "public"."create_tag"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_image_from_storage"("p_image_url" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_filename text;
  v_bucket_name text := 'item-images';
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'User must be authenticated';
    RETURN;
  END IF;
  
  -- Extract filename from URL
  -- URL format: https://[project].supabase.co/storage/v1/object/public/item-images/filename
  v_filename := split_part(p_image_url, '/', -1);
  
  IF v_filename IS NULL OR v_filename = '' THEN
    RETURN QUERY SELECT false, 'Invalid image URL - could not extract filename';
    RETURN;
  END IF;
  
  -- Delete from storage using storage.objects table
  DELETE FROM storage.objects 
  WHERE bucket_id = v_bucket_name 
    AND name = v_filename;
  
  -- Check if any rows were affected
  IF FOUND THEN
    RETURN QUERY SELECT true, 'Image deleted successfully';
  ELSE
    RETURN QUERY SELECT false, 'Image file not found in storage';
  END IF;
  
EXCEPTION 
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error deleting image: ' || SQLERRM;
END;
$$;


ALTER FUNCTION "public"."delete_image_from_storage"("p_image_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_item"("p_item_id" "uuid") RETURNS TABLE("success" boolean, "deleted_at" timestamp with time zone, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_item_created_by uuid;
  v_deleted_at timestamp with time zone;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamp with time zone, 'User must be authenticated'::text;
    RETURN;
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamp with time zone, 'User profile not found'::text;
    RETURN;
  END IF;

  SELECT i.created_by INTO v_item_created_by
  FROM public.items i
  WHERE i.id = p_item_id AND i.deleted_at IS NULL;

  IF v_item_created_by IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamp with time zone, 'Item not found'::text;
    RETURN;
  END IF;

  IF v_item_created_by != v_profile_id THEN
    RETURN QUERY SELECT false, NULL::timestamp with time zone, 'You can only delete items you created'::text;
    RETURN;
  END IF;

  v_deleted_at := now();

  -- Update child tables first (while item still has deleted_at IS NULL so RLS policies pass)
  UPDATE public.itemtags it
  SET deleted_at = v_deleted_at
  WHERE it.item_id = p_item_id AND it.deleted_at IS NULL;

  UPDATE public.itemsignouts io
  SET deleted_at = v_deleted_at
  WHERE io.item_id = p_item_id AND io.deleted_at IS NULL;

  -- Then soft-delete the item
  UPDATE public.items
  SET deleted_at = v_deleted_at,
      "image_URL" = NULL
  WHERE id = p_item_id;

  RETURN QUERY SELECT true, v_deleted_at, 'Item deleted successfully'::text;
END;
$$;


ALTER FUNCTION "public"."delete_item"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_profile_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get profile ID from supabase_uid
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE supabase_uid = v_user_id
    AND deleted_at IS NULL;
  
  RETURN v_profile_id;
END;
$$;


ALTER FUNCTION "public"."get_current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM public.profiles
  WHERE supabase_uid = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_teams"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(teams, ARRAY[]::text[]) FROM public.profiles
  WHERE supabase_uid = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_my_teams"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    supabase_uid,
    email,
    username
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'preferred_username',
      split_part(NEW.raw_user_meta_data->>'email', '@', 1)
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_item"("p_item_id" "uuid", "p_item_name" "text" DEFAULT NULL::"text", "p_quantity" integer DEFAULT NULL::integer, "p_notes" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_verify_ownership" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "created_by" "uuid", "item_name" "text", "quantity" integer, "notes" "text", "image_URL" "text", "deleted_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_profile_id uuid;
  v_item_record public.items%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.profiles p
  WHERE p.supabase_uid = v_user_id
    AND p.deleted_at IS NULL;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT i.* INTO v_item_record
  FROM public.items i
  WHERE i.id = p_item_id
    AND i.deleted_at IS NULL;

  IF v_item_record IS NULL THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF p_verify_ownership AND v_item_record.created_by != v_profile_id THEN
    RAISE EXCEPTION 'You can only update items you created';
  END IF;

  UPDATE public.items
  SET
    item_name = COALESCE(p_item_name, public.items.item_name),
    quantity = COALESCE(p_quantity, public.items.quantity),
    notes = COALESCE(p_notes, public.items.notes),
    "image_URL" = COALESCE(p_image_url, public.items."image_URL")
  WHERE public.items.id = p_item_id;

  RETURN QUERY
  SELECT
    i.id,
    i.created_by,
    i.item_name,
    i.quantity,
    i.notes,
    i."image_URL",
    i.deleted_at
  FROM public.items i
  WHERE i.id = p_item_id;
END;
$$;


ALTER FUNCTION "public"."update_item"("p_item_id" "uuid", "p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text", "p_verify_ownership" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."itemsignouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid",
    "recipient_id" "uuid",
    "quantity" integer NOT NULL,
    "sign_out_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expected_return_date" "date",
    "returned_date" "date",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "itemsignouts_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."itemsignouts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_item_signouts" AS
 SELECT "id",
    "item_id",
    "recipient_id",
    "quantity",
    "sign_out_date",
    "expected_return_date",
    "returned_date",
    "deleted_at"
   FROM "public"."itemsignouts"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_item_signouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_tags" AS
 SELECT "id",
    "created_by",
    "name",
    "deleted_at"
   FROM "public"."tags"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."active_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid",
    "item_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "notes" "text",
    "deleted_at" timestamp with time zone,
    "image_URL" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "items_quantity_check" CHECK (("quantity" >= 0))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."itemtags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."itemtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supabase_uid" "uuid",
    "username" "text" NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "teams" "text"[] DEFAULT '{}'::"text"[],
    "full_name" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."teams" IS 'Array of GitHub team slugs that this user belongs to';



COMMENT ON COLUMN "public"."profiles"."full_name" IS 'Full name of the user from GitHub profile';



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itemsignouts"
    ADD CONSTRAINT "itemsignouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itemtags"
    ADD CONSTRAINT "itemtags_item_id_tag_id_key" UNIQUE ("item_id", "tag_id");



ALTER TABLE ONLY "public"."itemtags"
    ADD CONSTRAINT "itemtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_item_signouts_item_id" ON "public"."itemsignouts" USING "btree" ("item_id");



CREATE INDEX "idx_item_signouts_recipient_id" ON "public"."itemsignouts" USING "btree" ("recipient_id");



CREATE INDEX "idx_items_created_by" ON "public"."items" USING "btree" ("created_by");



CREATE INDEX "idx_itemtags_item_id" ON "public"."itemtags" USING "btree" ("item_id");



CREATE INDEX "idx_itemtags_tag_id" ON "public"."itemtags" USING "btree" ("tag_id");



CREATE INDEX "idx_profiles_supabase_uid" ON "public"."profiles" USING "btree" ("supabase_uid");



CREATE INDEX "idx_profiles_teams" ON "public"."profiles" USING "gin" ("teams");



CREATE INDEX "idx_tags_created_by" ON "public"."tags" USING "btree" ("created_by");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."itemsignouts"
    ADD CONSTRAINT "itemsignouts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."itemsignouts"
    ADD CONSTRAINT "itemsignouts_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."itemtags"
    ADD CONSTRAINT "itemtags_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."itemtags"
    ADD CONSTRAINT "itemtags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_supabase_uid_fkey" FOREIGN KEY ("supabase_uid") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Allow authenticated users to create tags" ON "public"."tags" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view tags" ON "public"."tags" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "items_delete" ON "public"."items" FOR DELETE TO "authenticated" USING (("created_by" = "public"."get_my_profile_id"()));



CREATE POLICY "items_insert" ON "public"."items" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "public"."get_my_profile_id"()));



CREATE POLICY "items_insert_any_authenticated" ON "public"."items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "items_select" ON "public"."items" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "items_select_non_deleted" ON "public"."items" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "items_update" ON "public"."items" FOR UPDATE TO "authenticated" USING (("created_by" = "public"."get_my_profile_id"())) WITH CHECK (("created_by" = "public"."get_my_profile_id"()));



CREATE POLICY "items_update_owner" ON "public"."items" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "items_update_quantity" ON "public"."items" FOR UPDATE TO "authenticated" USING ((("created_by" = "public"."get_my_profile_id"()) OR true)) WITH CHECK ((("created_by" = "public"."get_my_profile_id"()) OR true));



ALTER TABLE "public"."itemsignouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "itemsignouts_insert" ON "public"."itemsignouts" FOR INSERT TO "authenticated" WITH CHECK (("recipient_id" = "public"."get_my_profile_id"()));



CREATE POLICY "itemsignouts_insert_any_authenticated" ON "public"."itemsignouts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "itemsignouts_select" ON "public"."itemsignouts" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "itemsignouts_select_non_deleted" ON "public"."itemsignouts" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "itemsignouts_update" ON "public"."itemsignouts" FOR UPDATE TO "authenticated" USING ((("recipient_id" = "public"."get_my_profile_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."items" "i"
  WHERE (("i"."id" = "itemsignouts"."item_id") AND ("i"."created_by" = "public"."get_my_profile_id"())))))) WITH CHECK ((("recipient_id" = "public"."get_my_profile_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."items" "i"
  WHERE (("i"."id" = "itemsignouts"."item_id") AND ("i"."created_by" = "public"."get_my_profile_id"()))))));



CREATE POLICY "itemsignouts_update_if_recipient" ON "public"."itemsignouts" FOR UPDATE TO "authenticated" USING (("recipient_id" = ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."supabase_uid" = "auth"."uid"()))));



ALTER TABLE "public"."itemtags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "itemtags_delete" ON "public"."itemtags" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."items" "i"
  WHERE (("i"."id" = "itemtags"."item_id") AND ("i"."deleted_at" IS NULL) AND ("i"."created_by" = "public"."get_my_profile_id"())))));



CREATE POLICY "itemtags_insert" ON "public"."itemtags" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."items" "i"
  WHERE (("i"."id" = "itemtags"."item_id") AND ("i"."deleted_at" IS NULL) AND ("i"."created_by" = "public"."get_my_profile_id"())))));



CREATE POLICY "itemtags_insert_any_authenticated" ON "public"."itemtags" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "itemtags_select" ON "public"."itemtags" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "itemtags_select_non_deleted" ON "public"."itemtags" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "itemtags_update" ON "public"."itemtags" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."items" "i"
  WHERE (("i"."id" = "itemtags"."item_id") AND ("i"."deleted_at" IS NULL) AND ("i"."created_by" = "public"."get_my_profile_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."items" "i"
  WHERE (("i"."id" = "itemtags"."item_id") AND ("i"."deleted_at" IS NULL) AND ("i"."created_by" = "public"."get_my_profile_id"())))));



CREATE POLICY "itemtags_update_if_item_owner" ON "public"."itemtags" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."items" "i"
     JOIN "public"."profiles" "p" ON (("p"."id" = "i"."created_by")))
  WHERE (("i"."id" = "itemtags"."item_id") AND ("p"."supabase_uid" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("supabase_uid" = "auth"."uid"()));



CREATE POLICY "profiles_select_for_display" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("supabase_uid" = "auth"."uid"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("supabase_uid" = "auth"."uid"())) WITH CHECK (("supabase_uid" = "auth"."uid"()));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_delete" ON "public"."tags" FOR DELETE TO "authenticated" USING (("created_by" = "public"."get_my_profile_id"()));



CREATE POLICY "tags_insert" ON "public"."tags" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "public"."get_my_profile_id"()));



CREATE POLICY "tags_insert_any_authenticated" ON "public"."tags" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "tags_select" ON "public"."tags" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "tags_select_non_deleted" ON "public"."tags" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "tags_update" ON "public"."tags" FOR UPDATE TO "authenticated" USING (("created_by" = "public"."get_my_profile_id"())) WITH CHECK (("created_by" = "public"."get_my_profile_id"()));



CREATE POLICY "tags_update_owner" ON "public"."tags" FOR UPDATE TO "authenticated" USING ((("created_by" IS NULL) OR ("created_by" = ( SELECT "p"."id"
   FROM "public"."profiles" "p"
  WHERE ("p"."supabase_uid" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."checkin_item"("p_checkout_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."checkin_item"("p_checkout_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."checkin_item"("p_checkout_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."checkout_item"("p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."checkout_item"("p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."checkout_item"("p_item_id" "uuid", "p_quantity" integer, "p_expected_return_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_item"("p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_item"("p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_item"("p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tag"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_tag"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tag"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_image_from_storage"("p_image_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_image_from_storage"("p_image_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_image_from_storage"("p_image_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_item"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_item"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_item"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_item"("p_item_id" "uuid", "p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text", "p_verify_ownership" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_item"("p_item_id" "uuid", "p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text", "p_verify_ownership" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_item"("p_item_id" "uuid", "p_item_name" "text", "p_quantity" integer, "p_notes" "text", "p_image_url" "text", "p_verify_ownership" boolean) TO "service_role";


















GRANT ALL ON TABLE "public"."itemsignouts" TO "anon";
GRANT ALL ON TABLE "public"."itemsignouts" TO "authenticated";
GRANT ALL ON TABLE "public"."itemsignouts" TO "service_role";



GRANT ALL ON TABLE "public"."active_item_signouts" TO "anon";
GRANT ALL ON TABLE "public"."active_item_signouts" TO "authenticated";
GRANT ALL ON TABLE "public"."active_item_signouts" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."active_tags" TO "anon";
GRANT ALL ON TABLE "public"."active_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."active_tags" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."itemtags" TO "anon";
GRANT ALL ON TABLE "public"."itemtags" TO "authenticated";
GRANT ALL ON TABLE "public"."itemtags" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




































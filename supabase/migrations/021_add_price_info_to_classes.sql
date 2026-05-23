-- 021_add_price_info_to_classes.sql
-- Add price_info column to classes table for simple display of participation fee

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS price_info TEXT;

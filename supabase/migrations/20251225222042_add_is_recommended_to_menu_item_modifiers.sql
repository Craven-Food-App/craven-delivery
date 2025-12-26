-- Add is_recommended column to menu_item_modifiers table
ALTER TABLE public.menu_item_modifiers
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance when filtering recommended modifiers
CREATE INDEX IF NOT EXISTS idx_menu_item_modifiers_recommended 
ON public.menu_item_modifiers(menu_item_id, is_recommended) 
WHERE is_recommended = true;

-- Add comment to explain the column
COMMENT ON COLUMN public.menu_item_modifiers.is_recommended IS 'Indicates if this modifier is recommended and should be pre-selected for customers';


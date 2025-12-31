-- Create modifier_groups table for grouping modifiers (e.g., "Size", "Toppings", "Extras")
CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false, -- Whether at least one selection is required
  min_selections INTEGER NOT NULL DEFAULT 0, -- Minimum number of selections required
  max_selections INTEGER, -- Maximum number of selections allowed (NULL = unlimited)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT modifier_groups_name_check CHECK (name IS NOT NULL AND length(name) > 0)
);

-- Create modifier_group_items table for individual options within a group
CREATE TABLE IF NOT EXISTS public.modifier_group_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0, -- Additional price for this modifier
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT modifier_group_items_name_check CHECK (name IS NOT NULL AND length(name) > 0)
);

-- Create menu_item_modifier_groups junction table to associate modifier groups with menu items
CREATE TABLE IF NOT EXISTS public.menu_item_modifier_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, modifier_group_id)
);

-- Enable RLS
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modifier_groups
CREATE POLICY "Anyone can view active modifier groups for available restaurants"
  ON public.modifier_groups
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = modifier_groups.restaurant_id
      AND restaurants.is_active = true
    )
  );

CREATE POLICY "Restaurant owners can manage their modifier groups"
  ON public.modifier_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = modifier_groups.restaurant_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- RLS Policies for modifier_group_items
CREATE POLICY "Anyone can view available modifier group items for active groups"
  ON public.modifier_group_items
  FOR SELECT
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM public.modifier_groups
      WHERE modifier_groups.id = modifier_group_items.modifier_group_id
      AND modifier_groups.is_active = true
    )
  );

CREATE POLICY "Restaurant owners can manage modifier group items"
  ON public.modifier_group_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.modifier_groups
      JOIN public.restaurants ON restaurants.id = modifier_groups.restaurant_id
      WHERE modifier_groups.id = modifier_group_items.modifier_group_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- RLS Policies for menu_item_modifier_groups
CREATE POLICY "Anyone can view menu item modifier groups for available menu items"
  ON public.menu_item_modifier_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE menu_items.id = menu_item_modifier_groups.menu_item_id
      AND menu_items.is_available = true
    )
    AND EXISTS (
      SELECT 1 FROM public.modifier_groups
      WHERE modifier_groups.id = menu_item_modifier_groups.modifier_group_id
      AND modifier_groups.is_active = true
    )
  );

CREATE POLICY "Restaurant owners can manage menu item modifier groups"
  ON public.menu_item_modifier_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items
      JOIN public.restaurants ON restaurants.id = menu_items.restaurant_id
      WHERE menu_items.id = menu_item_modifier_groups.menu_item_id
      AND restaurants.owner_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_modifier_groups_restaurant_id ON public.modifier_groups(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_active ON public.modifier_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_modifier_group_items_group_id ON public.modifier_group_items(modifier_group_id);
CREATE INDEX IF NOT EXISTS idx_modifier_group_items_available ON public.modifier_group_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_groups_menu_item_id ON public.menu_item_modifier_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_groups_modifier_group_id ON public.menu_item_modifier_groups(modifier_group_id);

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_modifier_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_modifier_group_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_modifier_groups_updated_at_trigger
  BEFORE UPDATE ON public.modifier_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_modifier_groups_updated_at();

CREATE TRIGGER update_modifier_group_items_updated_at_trigger
  BEFORE UPDATE ON public.modifier_group_items
  FOR EACH ROW
  EXECUTE FUNCTION update_modifier_group_items_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.modifier_groups IS 'Groups of modifiers that can be applied to menu items (e.g., "Size", "Toppings", "Extras")';
COMMENT ON TABLE public.modifier_group_items IS 'Individual options within a modifier group (e.g., "Small", "Medium", "Large" for Size group)';
COMMENT ON TABLE public.menu_item_modifier_groups IS 'Junction table linking menu items to modifier groups';
COMMENT ON COLUMN public.modifier_groups.is_required IS 'Whether at least one selection from this group is required';
COMMENT ON COLUMN public.modifier_groups.min_selections IS 'Minimum number of selections required from this group';
COMMENT ON COLUMN public.modifier_groups.max_selections IS 'Maximum number of selections allowed (NULL = unlimited)';


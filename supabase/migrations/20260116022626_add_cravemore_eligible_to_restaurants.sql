-- Add cravemore_eligible column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS cravemore_eligible BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.restaurants.cravemore_eligible IS 'Whether this restaurant offers CraveMore benefits to customers';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_cravemore_eligible 
ON public.restaurants(cravemore_eligible) 
WHERE cravemore_eligible = true;


























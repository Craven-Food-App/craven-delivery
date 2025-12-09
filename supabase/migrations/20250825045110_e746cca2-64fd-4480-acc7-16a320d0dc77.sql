-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');

-- Create enum for vehicle types
CREATE TYPE public.vehicle_type AS ENUM ('car', 'bike', 'scooter', 'motorcycle', 'walking');

-- Create feeder applications table
CREATE TABLE public.feeder_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    
    -- Address
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    
    -- Vehicle Information
    vehicle_type vehicle_type NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_color TEXT,
    license_plate TEXT,
    
    -- Driver's License
    license_number TEXT NOT NULL,
    license_state TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    
    -- Tax Information
    ssn_last_four TEXT NOT NULL,
    
    -- Banking Information
    bank_account_type TEXT,
    routing_number TEXT,
    account_number_last_four TEXT,
    
    -- Documents (file paths will be stored here)
    drivers_license_front TEXT,
    drivers_license_back TEXT,
    insurance_document TEXT,
    vehicle_registration TEXT,
    profile_photo TEXT,
    
    -- Application Status
    status application_status NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id),
    CONSTRAINT valid_birth_date CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years'),
    CONSTRAINT valid_license_expiry CHECK (license_expiry > CURRENT_DATE)
);

-- Enable Row Level Security
ALTER TABLE public.feeder_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own application" 
ON public.feeder_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own application" 
ON public.feeder_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending application" 
ON public.feeder_applications 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_feeder_applications_updated_at
    BEFORE UPDATE ON public.feeder_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for application documents
INSERT INTO storage.buckets (id, name, public) VALUES ('feeder-documents', 'feeder-documents', false);

-- Create storage policies for feeder documents
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'feeder-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'feeder-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'feeder-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'feeder-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
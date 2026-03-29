-- 011_moca_classes_complete.sql
-- Create classes, class_pricing, and class_applications tables

-- 1. classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    capacity INTEGER DEFAULT 20,
    image_url TEXT,
    schedule_type TEXT DEFAULT 'one_time', -- 'one_time' | 'weekly'
    class_date TEXT, -- Quick display string (e.g., '4월 2일 목요일 1:30')
    start_date DATE,
    end_date DATE,
    day_of_week INTEGER[], -- 0-6 (Sunday-Saturday)
    start_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. class_pricing table (supports dynamic grade labels)
CREATE TABLE IF NOT EXISTS public.class_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    grade_label TEXT NOT NULL, -- 'SILVER', 'GOLD', '전속모델', etc.
    price INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. class_applications table
CREATE TABLE IF NOT EXISTS public.class_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    grade_label TEXT, -- The grade label at the time of application
    applied_price INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    payment_type TEXT, -- 'transfer', 'card'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(class_id, user_id)
);

-- 4. Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_applications ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- classes & class_pricing: Public read, Admin write
CREATE POLICY "Classes public read" ON public.classes FOR SELECT TO public USING (true);
CREATE POLICY "Class pricing public read" ON public.class_pricing FOR SELECT TO public USING (true);

-- applications: User read/write own, Admin read all
CREATE POLICY "Users browse own applications" ON public.class_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own applications" ON public.class_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin policies (requires is_admin check)
-- Assuming a function or field exists to check admin. 
-- In MOCA, we usually check against the 'users' table grade or a specific admin flag.
-- For now, let's keep it simple or use a placeholder if necessary.
-- If the project doesn't have an admin role system yet, we might need one.
-- Let's check the users table again for admin roles.

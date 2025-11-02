-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'instructor', 'admin');

-- Create enum for course status
CREATE TYPE public.course_status AS ENUM ('draft', 'pending', 'published', 'rejected');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create enum for payout status
CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    thumbnail_url TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT false,
    status course_status NOT NULL DEFAULT 'draft',
    total_duration INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sections table
CREATE TABLE public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subsections (lectures) table
CREATE TABLE public.subsections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    video_url TEXT,
    duration INTEGER DEFAULT 0, -- in seconds
    position INTEGER NOT NULL DEFAULT 0,
    is_preview BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resources table
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, course_id)
);

-- Create course_progress table
CREATE TABLE public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subsection_id UUID REFERENCES public.subsections(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, subsection_id)
);

-- Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'esewa' or 'khalti'
    payment_reference TEXT,
    status order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_requests table
CREATE TABLE public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status payout_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    certificate_number TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subsections_updated_at BEFORE UPDATE ON public.subsections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    
    -- Assign default student role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_roles (read-only for users, admin managed)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for categories
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Published courses are viewable by everyone" ON public.courses FOR SELECT USING (status = 'published' OR instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can create courses" ON public.courses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'instructor') AND instructor_id = auth.uid());
CREATE POLICY "Instructors can update own courses" ON public.courses FOR UPDATE USING (instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can delete own courses" ON public.courses FOR DELETE USING (instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sections
CREATE POLICY "Sections viewable for accessible courses" ON public.sections FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = sections.course_id AND (courses.status = 'published' OR courses.instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Instructors can manage sections" ON public.sections FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = sections.course_id AND courses.instructor_id = auth.uid())
);

-- RLS Policies for subsections
CREATE POLICY "Subsections viewable for accessible courses" ON public.subsections FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sections JOIN public.courses ON courses.id = sections.course_id WHERE sections.id = subsections.section_id AND (courses.status = 'published' OR courses.instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Instructors can manage subsections" ON public.subsections FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sections JOIN public.courses ON courses.id = sections.course_id WHERE sections.id = subsections.section_id AND courses.instructor_id = auth.uid())
);

-- RLS Policies for resources
CREATE POLICY "Resources viewable for accessible courses" ON public.resources FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sections JOIN public.courses ON courses.id = sections.course_id WHERE sections.id = resources.section_id AND (courses.status = 'published' OR courses.instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Instructors can manage resources" ON public.resources FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sections JOIN public.courses ON courses.id = sections.course_id WHERE sections.id = resources.section_id AND courses.instructor_id = auth.uid())
);

-- RLS Policies for enrollments
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Instructors can view enrollments for their courses" ON public.enrollments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for course_progress
CREATE POLICY "Users can view own progress" ON public.course_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.course_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can modify own progress" ON public.course_progress FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for reviews
CREATE POLICY "Approved reviews are viewable by everyone" ON public.reviews FOR SELECT USING (is_approved = true OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create reviews for enrolled courses" ON public.reviews FOR INSERT WITH CHECK (
    user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.user_id = auth.uid() AND enrollments.course_id = reviews.course_id)
);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payout_requests
CREATE POLICY "Instructors can view own payout requests" ON public.payout_requests FOR SELECT USING (instructor_id = auth.uid());
CREATE POLICY "Instructors can create payout requests" ON public.payout_requests FOR INSERT WITH CHECK (instructor_id = auth.uid() AND public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "Admins can manage payout requests" ON public.payout_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for certificates
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Public certificate verification" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "System can create certificates" ON public.certificates FOR INSERT WITH CHECK (user_id = auth.uid());
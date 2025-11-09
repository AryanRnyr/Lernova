-- Create cart_items table for shopping cart
CREATE TABLE public.cart_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Cart policies - users can only manage their own cart
CREATE POLICY "Users can view their own cart items"
ON public.cart_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own cart"
ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own cart"
ON public.cart_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add transaction_uuid column to orders for payment tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_uuid TEXT;
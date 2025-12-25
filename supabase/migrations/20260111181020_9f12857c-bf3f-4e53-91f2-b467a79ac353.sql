-- Add commission_at_order column to orders table to track commission at time of purchase
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 20;

-- Create instructor_payouts table to track individual payment records
CREATE TABLE IF NOT EXISTS public.instructor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  amount numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid
);

-- Enable RLS
ALTER TABLE public.instructor_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for instructor_payouts
CREATE POLICY "Instructors can view own payouts" 
ON public.instructor_payouts 
FOR SELECT 
USING (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all payouts" 
ON public.instructor_payouts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_instructor_payouts_instructor_id ON public.instructor_payouts(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_payouts_period ON public.instructor_payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_orders_commission ON public.orders(commission_percentage);
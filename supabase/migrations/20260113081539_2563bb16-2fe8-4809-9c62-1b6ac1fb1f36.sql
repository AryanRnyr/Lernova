-- Allow service role to update orders (for edge functions)
-- This policy allows users to update their own pending orders (for payment reference storage)
CREATE POLICY "Users can update own pending orders" 
ON public.orders 
FOR UPDATE 
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Allow instructors to view orders for their courses
CREATE POLICY "Instructors can view orders for their courses"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = orders.course_id 
    AND courses.instructor_id = auth.uid()
  )
);
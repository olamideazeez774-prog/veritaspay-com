-- Fix: Allow authenticated users to claim (insert) certificates
CREATE POLICY "Users can claim certificates"
ON public.certificates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix: Allow users to update their own certificates (for metadata updates)
CREATE POLICY "Users can update own certificates"
ON public.certificates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

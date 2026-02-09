-- Fix the existing empty referral codes
UPDATE public.affiliate_referral_codes 
SET referral_code = public.generate_referral_code() 
WHERE referral_code = '' OR referral_code IS NULL;

-- Make the trigger also fire on UPDATE so we can fix future issues
DROP TRIGGER IF EXISTS auto_referral_code_trigger ON public.affiliate_referral_codes;

CREATE TRIGGER auto_referral_code_trigger
BEFORE INSERT OR UPDATE ON public.affiliate_referral_codes
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_referral_code();

-- Also add a SELECT policy so anyone can look up a referral code by code value (for validation during registration)
-- Drop existing if any
DROP POLICY IF EXISTS "Anyone can validate referral codes" ON public.affiliate_referral_codes;

CREATE POLICY "Anyone can validate referral codes"
ON public.affiliate_referral_codes
FOR SELECT
USING (true);
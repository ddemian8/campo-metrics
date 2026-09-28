
-- Order matters: child tables first
DELETE FROM public.club_reports;
DELETE FROM public.club_sessions;
DELETE FROM public.club_players;
DELETE FROM public.club_members;
DELETE FROM public.clubs;

DELETE FROM public.affiliate_referrals;
DELETE FROM public.affiliate_payouts;
DELETE FROM public.affiliate_clicks;
DELETE FROM public.affiliate_profiles;
DELETE FROM public.affiliate_applications;

DELETE FROM public.promo_redemptions;
DELETE FROM public.transactions;
DELETE FROM public.reports;
DELETE FROM public.sessions;
DELETE FROM public.anonymous_sessions;
DELETE FROM public.player_stats_aggregate;
DELETE FROM public.profiles;

-- Clear auth users so emails (including DDemian6@gmail.com) can be re-registered
DELETE FROM auth.users;

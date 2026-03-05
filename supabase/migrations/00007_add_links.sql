-- Add links column for educational content URLs
ALTER TABLE public.sessions
ADD COLUMN links jsonb NOT NULL DEFAULT '[]';

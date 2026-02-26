-- Migration: 042_create_chat_memory
-- Stores LINE chat conversation history per user for RAG context
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS public.chat_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 'user' or 'assistant'
  message TEXT NOT NULL,
  intent VARCHAR(100),                        -- detected intent category
  metadata JSONB DEFAULT '{}',                -- extra context (e.g. products mentioned)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.chat_memory IS 'LINE chat conversation history for RAG context per user';

-- Indexes
CREATE INDEX idx_chat_memory_user ON public.chat_memory(line_user_id);
CREATE INDEX idx_chat_memory_user_time ON public.chat_memory(line_user_id, created_at DESC);
CREATE INDEX idx_chat_memory_intent ON public.chat_memory(intent);

-- RLS
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access chat_memory"
  ON public.chat_memory FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: keep only last 50 messages per user (via trigger)
CREATE OR REPLACE FUNCTION cleanup_old_chat_memory()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.chat_memory
  WHERE id IN (
    SELECT id FROM public.chat_memory
    WHERE line_user_id = NEW.line_user_id
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_chat_memory
  AFTER INSERT ON public.chat_memory
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_chat_memory();

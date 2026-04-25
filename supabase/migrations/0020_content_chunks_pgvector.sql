-- Tool 3 (visitor agent) infrastructure: vector store for site content.
-- Each public-facing page is split into ~500-token chunks, embedded with
-- OpenAI text-embedding-3-small (1536 dims), and stored here. The agent
-- retrieves top-K nearest chunks via cosine similarity to ground answers.

create extension if not exists vector;

create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  -- 'inventory' = a row in url_inventory (the website's content of record).
  -- Future kinds: 'manual' for hand-curated facts, 'faq' for Q&A pairs.
  source_kind text not null check (source_kind in ('inventory', 'manual', 'faq')),
  source_id uuid,
  -- Mirrored from url_inventory.property_id at embed time so the agent can
  -- scope retrieval per-property without joining back.
  property_id uuid,
  url_path text,
  title text,
  chunk_index int not null,
  content text not null,
  embedding vector(1536) not null,
  token_count int,
  embedded_with text,
  -- sha256 of the source body. Lets the backfill skip rows whose content
  -- hasn't changed since the last embed run.
  source_hash text,
  embedded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_kind, source_id, chunk_index)
);

create index if not exists content_chunks_embedding_idx
  on public.content_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists content_chunks_property_idx
  on public.content_chunks(property_id)
  where property_id is not null;

create index if not exists content_chunks_source_idx
  on public.content_chunks(source_kind, source_id);

-- Cosine-similarity retrieval RPC. Returns chunks ordered by similarity
-- descending. `filter_property_id` lets the agent answer questions
-- scoped to a single sub-property when the visitor is on its pages.
create or replace function public.match_content_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.65,
  match_count int default 8,
  filter_property_id uuid default null
) returns table (
  id uuid,
  source_kind text,
  source_id uuid,
  url_path text,
  title text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.source_kind,
    c.source_id,
    c.url_path,
    c.title,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.content_chunks c
  where (filter_property_id is null or c.property_id = filter_property_id)
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Supabase > SQL Editor. O servidor só guarda texto cifrado: sem a senha mestra do psicólogo ninguém lê.
create table if not exists public.prontuarios (
  id               uuid primary key default gen_random_uuid(),
  conteudo_cifrado text not null check (conteudo_cifrado ~ '^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$'),
  criado_em        timestamptz not null default now()
);

-- Bloqueia acesso direto com a chave pública ; a API usa a service key, só no servidor.
alter table public.prontuarios enable row level security;

grant select, insert on public.prontuarios to service_role; -- Acesso liberado para a API
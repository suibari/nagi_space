-- Nagi Space の保存先（design.md D1）。期限付きのキー・値の表と、それを操作する関数だけを置く。
-- 表は PostgREST に公開せず、関数の実行権限だけを nagi_space_api ロールに与える。
--
-- 適用後に必要な設定（自宅の PostgREST）：
--   1. db-schemas に nagi_space を加える
--   2. PostgREST が使うロール（anon か、JWT の role）に nagi_space_api を与える
--        例: grant nagi_space_api to web_anon;

create schema if not exists nagi_space;

do $$
begin
	if not exists (select 1 from pg_roles where rolname = 'nagi_space_api') then
		create role nagi_space_api nologin;
	end if;
end
$$;

create table if not exists nagi_space.kv (
	key text primary key,
	value text not null,
	expires_at timestamptz
);
create index if not exists kv_expires_at_idx on nagi_space.kv (expires_at) where expires_at is not null;

revoke all on schema nagi_space from public;
revoke all on all tables in schema nagi_space from public;
grant usage on schema nagi_space to nagi_space_api;

-- 期限切れの行をまれに掃除する。読み取りは期限切れを無視するので、遅れても結果は変わらない。
create or replace function nagi_space.kv_maybe_purge() returns void
language sql security definer set search_path = nagi_space as $$
	delete from kv where expires_at < now() and random() < 0.02;
$$;

create or replace function nagi_space.kv_expiry(p_ttl_seconds double precision)
returns timestamptz language sql stable as $$
	select case when p_ttl_seconds is null then null
		else now() + make_interval(secs => p_ttl_seconds) end;
$$;

-- 値を取得する。p_touch_ttl_seconds を渡すと、見つかったときに期限を延ばす（セッション用）。
create or replace function nagi_space.kv_get(p_key text, p_touch_ttl_seconds double precision default null)
returns text language plpgsql security definer set search_path = nagi_space as $$
declare
	v text;
begin
	if p_touch_ttl_seconds is null then
		select value into v from kv
		where key = p_key and (expires_at is null or expires_at > now());
	else
		update kv set expires_at = now() + make_interval(secs => p_touch_ttl_seconds)
		where key = p_key and (expires_at is null or expires_at > now())
		returning value into v;
	end if;
	return v;
end;
$$;

create or replace function nagi_space.kv_get_many(p_keys text[])
returns table (key text, value text) language sql stable security definer set search_path = nagi_space as $$
	select k.key, k.value from kv k
	where k.key = any (p_keys) and (k.expires_at is null or k.expires_at > now());
$$;

-- 書き込む。p_if_absent が true なら、まだ無い（期限切れを含む）ときだけ書き、書けたかを返す。
create or replace function nagi_space.kv_set(
	p_key text,
	p_value text,
	p_ttl_seconds double precision default null,
	p_if_absent boolean default false
) returns boolean language plpgsql security definer set search_path = nagi_space as $$
declare
	written boolean;
begin
	perform kv_maybe_purge();
	if p_if_absent then
		delete from kv where key = p_key and expires_at <= now();
		insert into kv (key, value, expires_at)
		values (p_key, p_value, nagi_space.kv_expiry(p_ttl_seconds))
		on conflict (key) do nothing;
		get diagnostics written = row_count;
		return written;
	end if;
	insert into kv (key, value, expires_at)
	values (p_key, p_value, nagi_space.kv_expiry(p_ttl_seconds))
	on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at;
	return true;
end;
$$;

create or replace function nagi_space.kv_del(p_keys text[]) returns void
language sql security definer set search_path = nagi_space as $$
	delete from kv where key = any (p_keys);
$$;

-- 値が一致するときだけ消す（自分が取ったロックや枠だけを外す）。
create or replace function nagi_space.kv_del_if(p_key text, p_value text) returns boolean
language plpgsql security definer set search_path = nagi_space as $$
declare
	deleted boolean;
begin
	delete from kv where key = p_key and value = p_value;
	get diagnostics deleted = row_count;
	return deleted;
end;
$$;

-- 接頭辞で一覧する。% と _ はそのまま文字として扱う。
create or replace function nagi_space.kv_list(p_prefix text)
returns table (key text, value text) language sql stable security definer set search_path = nagi_space as $$
	select k.key, k.value from kv k
	where k.key like replace(replace(replace(p_prefix, '\', '\\'), '%', '\%'), '_', '\_') || '%'
		and (k.expires_at is null or k.expires_at > now())
	order by k.key;
$$;

-- 残りの期限（秒）。期限なしは null、無いキーは -1。テストと運用の確認用。
create or replace function nagi_space.kv_ttl(p_key text) returns double precision
language sql stable security definer set search_path = nagi_space as $$
	select coalesce(
		(select case when expires_at is null then null
			else extract(epoch from expires_at - now()) end
		 from kv where key = p_key and (expires_at is null or expires_at > now())),
		case when exists (select 1 from kv where key = p_key and (expires_at is null or expires_at > now()))
			then null else -1 end
	);
$$;

revoke all on all functions in schema nagi_space from public;
grant execute on function
	nagi_space.kv_get(text, double precision),
	nagi_space.kv_get_many(text[]),
	nagi_space.kv_set(text, text, double precision, boolean),
	nagi_space.kv_del(text[]),
	nagi_space.kv_del_if(text, text),
	nagi_space.kv_list(text),
	nagi_space.kv_ttl(text)
to nagi_space_api;

-- 期限付きの数え上げ（リアクションの連投制限。REACT-03）。期限切れの値は 0 から数え直す。
create or replace function nagi_space.kv_incr(p_key text, p_ttl_seconds double precision)
returns integer language plpgsql security definer set search_path = nagi_space as $$
declare
	n integer;
begin
	insert into kv (key, value, expires_at)
	values (p_key, '1', now() + make_interval(secs => p_ttl_seconds))
	on conflict (key) do update set
		value = case when kv.expires_at is not null and kv.expires_at <= now() then '1'
			else (kv.value::integer + 1)::text end,
		expires_at = case when kv.expires_at is not null and kv.expires_at <= now()
			then now() + make_interval(secs => p_ttl_seconds) else kv.expires_at end
	returning value::integer into n;
	return n;
end;
$$;

revoke all on function nagi_space.kv_incr(text, double precision) from public;
grant execute on function nagi_space.kv_incr(text, double precision) to nagi_space_api;

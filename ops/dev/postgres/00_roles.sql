-- ローカル開発用。本番では既存の PostgREST のロール構成に合わせる（db/migrations の先頭のコメント参照）。
create role authenticator login password 'authenticator' noinherit;
create role web_anon nologin;
grant web_anon to authenticator;

/**
 * ログイン時にまとめて要求するスコープ（design.md D2）。
 * rpc の aud を * にするのは、bare aud で照合する旧 PDS に合わせるため（Nagi と同じ）。
 */
export const OAUTH_SCOPES = [
	'atproto',
	'rpc:com.suibari.nagi.getMutes?aud=*',
	'rpc:com.suibari.nagi.getPreferences?aud=*',
	'rpc:com.suibari.nagi.createReport?aud=*',
	'rpc:com.suibari.nagi.ensureRecord?aud=*',
	'repo:com.suibari.nagi.post?action=create',
	'blob:image/*'
] as const;

export const OAUTH_SCOPE = OAUTH_SCOPES.join(' ');

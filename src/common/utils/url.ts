/** 去掉 http(s)://，得到 domain/path */
export function stripUrlProtocol(url: string): string {
  return (url || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^\/+/, '');
}

/** 对外访问统一拼 https://；入参可以是 domain/path 或已带协议的完整 URL */
export function toHttpsUrl(url: string): string {
  const bare = stripUrlProtocol(url);
  return bare ? `https://${bare}` : '';
}

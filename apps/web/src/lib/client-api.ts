export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export async function api<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (method !== 'GET') {
    const tokenResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
    if (!tokenResponse.ok) throw new ApiError(tokenResponse.status, 'Não foi possível iniciar uma sessão segura.');
    const token = await tokenResponse.json() as { data: { csrfToken: string } };
    headers.set('X-CSRF-Token', token.data.csrfToken);
  }
  const response = await fetch(`/api/${path}`, { method, headers, credentials: 'same-origin', cache: 'no-store',
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('auth/')) window.location.assign('/login');
    const message = response.status === 429 ? 'Muitas tentativas. Aguarde um minuto.' :
      response.status === 401 ? 'Credenciais inválidas ou sessão expirada.' :
      response.status === 404 ? 'Recurso não encontrado.' :
      response.status === 400 ? 'Confira os dados. O link pode estar inválido ou expirado.' : 'Não foi possível concluir. Tente novamente.';
    throw new ApiError(response.status, message);
  }
  return (await response.json() as { data: T }).data;
}

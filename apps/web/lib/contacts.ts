import type { ContactInput, ContactPage, PublicContact } from "@phone-book/db/schema";

const ENDPOINT = "/api/contacts";

async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const detail = body?.message;

  return Array.isArray(detail) ? detail[0] : (detail ?? `Request failed (${response.status})`);
}

async function send<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });

  if (!response.ok) throw new Error(await errorMessage(response));

  return response.status === 204 ? (undefined as T) : await response.json();
}

const PAGE_LIMIT = 20;

export const contactsApi = {
  list: (query: { cursor?: string; search?: string } = {}) => {
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (query.cursor) params.set("cursor", query.cursor);
    if (query.search) params.set("search", query.search);

    return send<ContactPage>(`${ENDPOINT}?${params}`);
  },
  create: (input: ContactInput) =>
    send<PublicContact>(ENDPOINT, { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: ContactInput) =>
    send<PublicContact>(`${ENDPOINT}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  removeMany: (ids: string[]) =>
    send<void>(ENDPOINT, { method: "DELETE", body: JSON.stringify({ ids }) }),
};

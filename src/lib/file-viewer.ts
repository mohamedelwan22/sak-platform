import { tokenStorage } from "./tokenStorage";

export async function openProtectedFile(url: string): Promise<void> {
  const token = tokenStorage.getAccessToken();
  if (!token) return;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Failed to load file (${res.status})`);

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}

export async function getSpeciesImageUrl(guid: string): Promise<string | null> {
  try {
    const url = `https://species-ws.ala.org.au/species/${encodeURIComponent(guid)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: Record<string, unknown> = await res.json();
    const imageUrl = data.smallImageUrl ?? data.imageUrl ?? data.thumbnailUrl ?? null;

    return typeof imageUrl === "string" ? imageUrl : null;
  } catch {
    return null;
  }
}

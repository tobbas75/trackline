export interface ALASpeciesResult {
  guid: string;
  commonName: string | null;
  scientificName: string;
  rank: string;
  kingdom: string | null;
}

export async function searchSpecies(query: string, limit = 10): Promise<ALASpeciesResult[]> {
  const url = new URL("https://api.ala.org.au/species/search/auto");
  url.searchParams.set("q", query);
  url.searchParams.set("idxType", "TAXON");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data: Record<string, unknown> = await res.json();
  const autoCompleteList = (data.autoCompleteList ?? []) as Record<string, unknown>[];

  return autoCompleteList.map((item) => ({
    guid: String(item.guid ?? ""),
    commonName: item.commonName ? String(item.commonName) : null,
    scientificName: String(
      (item.matchedNames as string[] | undefined)?.[0] ?? item.name ?? ""
    ),
    rank: String(item.rankString ?? ""),
    kingdom: item.kingdom ? String(item.kingdom) : null,
  }));
}

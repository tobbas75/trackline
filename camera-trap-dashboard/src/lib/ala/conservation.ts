export interface ConservationStatus {
  [jurisdiction: string]: string;
}

export async function getConservationStatus(guid: string): Promise<ConservationStatus | null> {
  try {
    const url = `https://species-ws.ala.org.au/species/${encodeURIComponent(guid)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data: Record<string, unknown> = await res.json();
    const statuses: ConservationStatus = {};

    const lists = (data.conservationStatuses ?? []) as Record<string, unknown>[];
    for (const item of lists) {
      const jurisdiction = String(item.region ?? item.system ?? "Unknown");
      const status = String(item.status ?? item.rawStatus ?? "Unknown");
      statuses[jurisdiction] = status;
    }

    return Object.keys(statuses).length > 0 ? statuses : null;
  } catch {
    return null;
  }
}

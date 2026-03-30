declare module "shapefile" {
  interface Source {
    read(): Promise<{ done: boolean; value: GeoJSON.Feature }>;
  }
  export function open(
    shp: string,
    dbf?: string,
    options?: Record<string, unknown>
  ): Promise<Source>;
}

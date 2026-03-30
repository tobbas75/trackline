/**
 * Supabase Database Types
 *
 * These will be auto-generated from the Supabase schema once the project is connected.
 * For now, we define the core types manually to match our planned schema.
 */

export type UserRole = "admin" | "manager" | "ranger" | "viewer";

export type BurnSeason = "EDS" | "LDS";

export type BurnPlanStatus = "draft" | "reviewed" | "approved" | "scheduled" | "active" | "completed" | "cancelled";

export type FireScarSource = "nafi_modis" | "nafi_sentinel" | "sentinel_manual" | "field_mapped" | "landgate";

export type ChecklistType = "bombardier" | "ground_crew" | "safety" | "pre_flight" | "post_flight";

export type EquipmentType = "aircraft" | "vehicle" | "incendiary_device" | "communication";

export type BurnType = "aerial" | "road";

export type VegetationIndexType = "ndvi" | "nbr" | "dnbr" | "bai" | "fmc" | "true_colour" | "false_colour" | "fire_enhanced";

export type VegetationSource = "dea_ows" | "cdse_sentinel_hub";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      organization: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
        };
      };
      project: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          boundary: Json; // GeoJSON stored as JSONB
          area_ha: number | null;
          rainfall_zone: "high" | "low" | null;
          state: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          description?: string | null;
          boundary: Json;
          area_ha?: number | null;
          rainfall_zone?: "high" | "low" | null;
          state?: string | null;
          status?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          boundary?: Json;
          area_ha?: number | null;
          rainfall_zone?: "high" | "low" | null;
          state?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
      user_project: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          role: UserRole;
        };
        Update: {
          role?: UserRole;
        };
      };
      fire_season: {
        Row: {
          id: string;
          project_id: string;
          year: number;
          eds_start_month: number;
          eds_end_month: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          year: number;
          eds_start_month?: number;
          eds_end_month?: number;
          status?: string;
        };
        Update: {
          year?: number;
          eds_start_month?: number;
          eds_end_month?: number;
          status?: string;
        };
      };
      fire_scar: {
        Row: {
          id: string;
          project_id: string;
          geometry: Json;
          year: number;
          month: number | null;
          burn_season: BurnSeason | null;
          area_ha: number | null;
          source: FireScarSource;
          source_resolution_m: number | null;
          imported_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          geometry: Json;
          year: number;
          month?: number | null;
          burn_season?: BurnSeason | null;
          area_ha?: number | null;
          source: FireScarSource;
          source_resolution_m?: number | null;
        };
        Update: {
          geometry?: Json;
          year?: number;
          month?: number | null;
          burn_season?: BurnSeason | null;
          area_ha?: number | null;
        };
      };
      analysis_zone: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          slug: string;
          description: string | null;
          boundary: Json; // GeoJSON polygon
          area_ha: number | null;
          color: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          slug: string;
          description?: string | null;
          boundary: Json;
          area_ha?: number | null;
          color?: string | null;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          boundary?: Json;
          area_ha?: number | null;
          color?: string | null;
          sort_order?: number;
        };
      };
      burn_plan: {
        Row: {
          id: string;
          fire_season_id: string;
          project_id: string;
          name: string;
          description: string | null;
          planned_geometry: Json;
          planned_area_ha: number | null;
          target_season: BurnSeason | null;
          vegetation_types: string[] | null;
          priority: number;
          status: BurnPlanStatus;
          burn_type: BurnType | null;
          ignition_lines: Json | null;
          zone_id: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fire_season_id: string;
          project_id: string;
          name: string;
          description?: string | null;
          planned_geometry: Json;
          planned_area_ha?: number | null;
          target_season?: BurnSeason | null;
          vegetation_types?: string[] | null;
          priority?: number;
          status?: BurnPlanStatus;
          burn_type?: BurnType | null;
          ignition_lines?: Json | null;
          zone_id?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          planned_geometry?: Json;
          planned_area_ha?: number | null;
          target_season?: BurnSeason | null;
          vegetation_types?: string[] | null;
          priority?: number;
          status?: BurnPlanStatus;
          burn_type?: BurnType | null;
          ignition_lines?: Json | null;
          zone_id?: string | null;
        };
      };
      reference_layer: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          geojson_data: Json;
          geometry_type: string;
          feature_count: number;
          color: string;
          visible: boolean;
          sort_order: number;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          geojson_data: Json;
          geometry_type: string;
          feature_count?: number;
          color?: string;
          visible?: boolean;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          visible?: boolean;
          sort_order?: number;
        };
      };
      hotspot: {
        Row: {
          id: string;
          project_id: string | null;
          location: Json;
          acquisition_time: string;
          satellite: string | null;
          confidence: number | null;
          frp: number | null;
          source: string;
          ingested_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          location: Json;
          acquisition_time: string;
          satellite?: string | null;
          confidence?: number | null;
          frp?: number | null;
          source: string;
        };
        Update: {
          project_id?: string | null;
          confidence?: number | null;
        };
      };
      sentinel_scene: {
        Row: {
          id: string;
          project_id: string;
          scene_id: string;
          satellite: string;
          acquired_at: string;
          cloud_cover_pct: number | null;
          bbox: Json | null;
          thumbnail_url: string | null;
          source: VegetationSource;
          stac_properties: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          scene_id: string;
          satellite: string;
          acquired_at: string;
          cloud_cover_pct?: number | null;
          bbox?: Json | null;
          thumbnail_url?: string | null;
          source?: VegetationSource;
          stac_properties?: Json | null;
        };
        Update: {
          cloud_cover_pct?: number | null;
          thumbnail_url?: string | null;
          stac_properties?: Json | null;
        };
      };
      vegetation_analysis: {
        Row: {
          id: string;
          project_id: string;
          zone_id: string | null;
          scene_id: string | null;
          index_type: VegetationIndexType;
          source: VegetationSource;
          date_start: string;
          date_end: string;
          mean_value: number | null;
          min_value: number | null;
          max_value: number | null;
          std_dev: number | null;
          area_above_threshold_ha: number | null;
          threshold_value: number | null;
          wms_params: Json;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          zone_id?: string | null;
          scene_id?: string | null;
          index_type: VegetationIndexType;
          source?: VegetationSource;
          date_start: string;
          date_end: string;
          mean_value?: number | null;
          min_value?: number | null;
          max_value?: number | null;
          std_dev?: number | null;
          area_above_threshold_ha?: number | null;
          threshold_value?: number | null;
          wms_params: Json;
          notes?: string | null;
        };
        Update: {
          mean_value?: number | null;
          min_value?: number | null;
          max_value?: number | null;
          std_dev?: number | null;
          area_above_threshold_ha?: number | null;
          threshold_value?: number | null;
          notes?: string | null;
        };
      };
      sentinel_imagery_cache: {
        Row: {
          id: string;
          product: string;
          date_start: string;
          date_end: string;
          baseline_start: string | null;
          baseline_end: string | null;
          storage_path: string;
          width: number;
          height: number;
          resolution_m: number;
          bbox_west: number;
          bbox_south: number;
          bbox_east: number;
          bbox_north: number;
          file_size_bytes: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product: string;
          date_start: string;
          date_end: string;
          baseline_start?: string | null;
          baseline_end?: string | null;
          storage_path: string;
          width: number;
          height: number;
          resolution_m?: number;
          bbox_west: number;
          bbox_south: number;
          bbox_east: number;
          bbox_north: number;
          file_size_bytes?: number | null;
          source?: string;
        };
        Update: {
          storage_path?: string;
          file_size_bytes?: number | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      burn_season: BurnSeason;
      burn_plan_status: BurnPlanStatus;
      fire_scar_source: FireScarSource;
      checklist_type: ChecklistType;
      equipment_type: EquipmentType;
      vegetation_index_type: VegetationIndexType;
      vegetation_source: VegetationSource;
    };
  };
}

-- Originally: 001_initial_schema.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Fire Program Management App - Initial Schema
-- Requires PostGIS extension enabled on the Supabase project

CREATE EXTENSION IF NOT EXISTS postgis;

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'ranger', 'viewer');
CREATE TYPE burn_season AS ENUM ('EDS', 'LDS');
CREATE TYPE burn_plan_status AS ENUM ('draft', 'reviewed', 'approved', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE fire_scar_source AS ENUM ('nafi_modis', 'nafi_sentinel', 'sentinel_manual', 'field_mapped', 'landgate');
CREATE TYPE checklist_type AS ENUM ('bombardier', 'ground_crew', 'safety', 'pre_flight', 'post_flight');
CREATE TYPE equipment_type AS ENUM ('aircraft', 'vehicle', 'incendiary_device', 'communication');
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'retired');

-- Organizations
CREATE TABLE organization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    boundary GEOMETRY(MultiPolygon, 4326),
    boundary_geojson JSONB, -- Stored as GeoJSON for easy client-side access
    area_ha DECIMAL(12,2),
    rainfall_zone TEXT CHECK (rainfall_zone IN ('high', 'low')),
    state TEXT, -- NT, WA, QLD
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, slug)
);
CREATE INDEX idx_project_boundary ON project USING GIST (boundary);

-- User-Project membership
CREATE TABLE user_project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, project_id)
);

-- Fire Seasons
CREATE TABLE fire_season (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
    eds_start_month INTEGER DEFAULT 1 CHECK (eds_start_month BETWEEN 1 AND 12),
    eds_end_month INTEGER DEFAULT 7 CHECK (eds_end_month BETWEEN 1 AND 12),
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, year)
);

-- Burn Plans
CREATE TABLE burn_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fire_season_id UUID NOT NULL REFERENCES fire_season(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    planned_geometry GEOMETRY(MultiPolygon, 4326),
    planned_area_ha DECIMAL(12,2),
    target_season burn_season,
    vegetation_types TEXT[], -- Array of fuel class codes
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status burn_plan_status DEFAULT 'draft',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_burn_plan_geom ON burn_plan USING GIST (planned_geometry);

-- Cultural Zones (no-go / restricted areas)
CREATE TABLE cultural_zone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    zone_type TEXT DEFAULT 'restricted' CHECK (zone_type IN ('no_go', 'restricted', 'seasonal', 'cultural_site')),
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cultural_zone_geom ON cultural_zone USING GIST (geometry);

-- Daily Plans
CREATE TABLE daily_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fire_season_id UUID REFERENCES fire_season(id),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    weather_conditions JSONB, -- {temp, humidity, wind_speed, wind_dir, rainfall, fire_danger}
    crew_ids UUID[] DEFAULT '{}',
    notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Flight Plans
CREATE TABLE flight_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id UUID REFERENCES daily_plan(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    flight_path GEOMETRY(LineString, 4326),
    aircraft_id UUID,
    pilot_name TEXT,
    navigator_name TEXT,
    incendiary_type TEXT,
    incendiary_quantity INTEGER,
    flight_type TEXT DEFAULT 'burn' CHECK (flight_type IN ('burn', 'ferry', 'recon')),
    planned_start TIMESTAMPTZ,
    planned_duration_minutes INTEGER,
    status TEXT DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_flight_plan_geom ON flight_plan USING GIST (flight_path);

-- Burn Executions (actual burns recorded in the field)
CREATE TABLE burn_execution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    burn_plan_id UUID REFERENCES burn_plan(id),
    daily_plan_id UUID REFERENCES daily_plan(id),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    actual_geometry GEOMETRY(MultiPolygon, 4326),
    actual_area_ha DECIMAL(12,2),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    burn_season burn_season,
    weather_at_ignition JSONB,
    crew_present UUID[],
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ -- null until synced from offline
);
CREATE INDEX idx_burn_exec_geom ON burn_execution USING GIST (actual_geometry);

-- GPS Tracks
CREATE TABLE gps_track (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    burn_execution_id UUID REFERENCES burn_execution(id),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    track GEOMETRY(LineString, 4326),
    recorded_at TIMESTAMPTZ NOT NULL,
    device_id TEXT,
    point_count INTEGER,
    distance_km DECIMAL(8,2),
    raw_points JSONB -- [{lat, lng, timestamp, accuracy}]
);
CREATE INDEX idx_gps_track_geom ON gps_track USING GIST (track);

-- Incendiary Drops
CREATE TABLE incendiary_drop (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    burn_execution_id UUID REFERENCES burn_execution(id),
    flight_plan_id UUID REFERENCES flight_plan(id),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326),
    dropped_at TIMESTAMPTZ,
    incendiary_type TEXT,
    quantity INTEGER,
    notes TEXT
);
CREATE INDEX idx_incendiary_drop_geom ON incendiary_drop USING GIST (location);

-- Daily Checklists
CREATE TABLE daily_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id UUID REFERENCES daily_plan(id),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    checklist_date DATE NOT NULL,
    checklist_type checklist_type NOT NULL,
    items JSONB NOT NULL DEFAULT '[]', -- [{task, completed, completed_by, completed_at, notes}]
    signed_off_by UUID REFERENCES auth.users(id),
    signed_off_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ
);

-- Fire Scars (imported from NAFI, Sentinel, or field-mapped)
CREATE TABLE fire_scar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 2000),
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    burn_season burn_season,
    area_ha DECIMAL(12,2),
    source fire_scar_source NOT NULL,
    source_resolution_m INTEGER,
    imported_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fire_scar_geom ON fire_scar USING GIST (geometry);
CREATE INDEX idx_fire_scar_year ON fire_scar (project_id, year);

-- Fire History Overlay (pre-computed analysis results)
CREATE TABLE fire_history_overlay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    analysis_year INTEGER NOT NULL,
    analysis_period_start INTEGER NOT NULL,
    burns_total INTEGER DEFAULT 0,
    burns_early INTEGER DEFAULT 0,
    burns_late INTEGER DEFAULT 0,
    last_burn_year INTEGER,
    last_burn_season burn_season,
    last_late_burn_year INTEGER,
    patch_age INTEGER,
    computed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_fire_overlay_geom ON fire_history_overlay USING GIST (geometry);

-- Hotspots (cached from DEA/NAFI feeds)
CREATE TABLE hotspot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES project(id),
    location GEOMETRY(Point, 4326) NOT NULL,
    acquisition_time TIMESTAMPTZ NOT NULL,
    satellite TEXT,
    confidence INTEGER,
    frp DECIMAL(8,2),
    source TEXT CHECK (source IN ('dea', 'nafi', 'landgate')),
    ingested_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hotspot_geom ON hotspot USING GIST (location);
CREATE INDEX idx_hotspot_time ON hotspot (acquisition_time DESC);

-- Vegetation Map (fuel type polygons per project)
CREATE TABLE vegetation_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    fuel_class TEXT NOT NULL,
    fuel_class_name TEXT,
    fuel_load_t_ha DECIMAL(6,2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vegetation_map_geom ON vegetation_map USING GIST (geometry);

-- Carbon methodology tables are defined in migration 007_carbon_methodology.sql.
-- Keeping them out of 001 avoids duplicate CREATE TABLE conflicts during fresh setup.

-- Equipment
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type equipment_type NOT NULL,
    registration TEXT,
    status equipment_status DEFAULT 'available',
    current_location GEOMETRY(Point, 4326),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Incendiary Inventory
CREATE TABLE incendiary_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    fire_season_id UUID REFERENCES fire_season(id),
    item_type TEXT NOT NULL,
    quantity_start DECIMAL(10,2),
    quantity_used DECIMAL(10,2) DEFAULT 0,
    quantity_remaining DECIMAL(10,2),
    unit TEXT,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- Documents
CREATE TABLE document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('healthy_country_plan', 'burn_plan', 'compliance', 'training', 'report', 'operational', 'other')),
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES project(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_log_project ON audit_log (project_id, created_at DESC);

-- Helper function: classify burn season based on month and cutoff
CREATE OR REPLACE FUNCTION classify_burn_season(
    burn_month INTEGER,
    cutoff_month INTEGER
) RETURNS burn_season AS $$
BEGIN
    IF burn_month <= cutoff_month THEN
        RETURN 'EDS';
    ELSE
        RETURN 'LDS';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER burn_plan_updated_at
    BEFORE UPDATE ON burn_plan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security policies
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_season ENABLE ROW LEVEL SECURITY;
ALTER TABLE burn_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_zone ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE burn_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_scar ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checklist ENABLE ROW LEVEL SECURITY;

-- Basic RLS: users can see data for projects they belong to
CREATE POLICY "Users can view their projects"
    ON project FOR SELECT
    USING (
        id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can insert projects"
    ON project FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT p.organization_id FROM project p
            JOIN user_project up ON up.project_id = p.id
            WHERE up.user_id = auth.uid() AND up.role = 'admin'
        )
        OR NOT EXISTS (SELECT 1 FROM project) -- Allow first project creation
    );

CREATE POLICY "Users can view their project memberships"
    ON user_project FOR SELECT
    USING (user_id = auth.uid());

-- Project-scoped data: accessible to project members
CREATE POLICY "Project members can view fire seasons"
    ON fire_season FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view burn plans"
    ON burn_plan FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view fire scars"
    ON fire_scar FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view hotspots"
    ON hotspot FOR SELECT
    USING (
        project_id IS NULL
        OR project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid())
    );

CREATE POLICY "Project members can view cultural zones"
    ON cultural_zone FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view daily plans"
    ON daily_plan FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view checklists"
    ON daily_checklist FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

-- Write policies for managers and above
CREATE POLICY "Managers can create burn plans"
    ON burn_plan FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM user_project
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Rangers can create burn executions"
    ON burn_execution FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM user_project
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ranger')
        )
    );

CREATE POLICY "Rangers can create GPS tracks"
    ON gps_track FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM user_project
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ranger')
        )
    );

CREATE POLICY "Rangers can create checklists"
    ON daily_checklist FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id FROM user_project
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'ranger')
        )
    );

CREATE POLICY "Project members can view burn executions"
    ON burn_execution FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view GPS tracks"
    ON gps_track FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

CREATE POLICY "Project members can view flight plans"
    ON flight_plan FOR SELECT
    USING (project_id IN (SELECT project_id FROM user_project WHERE user_id = auth.uid()));

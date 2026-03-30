-- Originally: 007_carbon_methodology.sql (applied to live DB; local filename updated for namespace convention — do NOT re-apply)
-- Migration governance: see portal/PROTECTED_SURFACES.md for cross-app safety rules

-- Migration 007: Carbon Methodology Tables
-- Implements savanna burning carbon abatement calculation
-- per the Australian Government's Carbon Credits (Savanna Fire Management) methodology.

-- ─── Carbon Project ────────────────────────────────────────────────────────────

CREATE TABLE carbon_project (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  start_date          DATE NOT NULL,
  methodology_version TEXT NOT NULL DEFAULT '2.1',
  -- tCO₂-e historical emissions baseline (average of pre-project years)
  baseline_emissions  DECIMAL(12,2) NOT NULL,
  -- Permanence discount (typically 0.25 = 25%)
  permanence_discount DECIMAL(5,4) NOT NULL DEFAULT 0.25,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_carbon_project_per_project UNIQUE(project_id)
);

-- ─── ACCU Reporting Periods ────────────────────────────────────────────────────

CREATE TABLE accu_period (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carbon_project_id        UUID NOT NULL REFERENCES carbon_project(id) ON DELETE CASCADE,
  period_start             DATE NOT NULL,
  period_end               DATE NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (
                             status IN ('draft', 'submitted', 'under_review', 'approved', 'issued')
                           ),

  -- Emissions by season (tCO₂-e)
  project_emissions_eds    DECIMAL(12,2) NOT NULL DEFAULT 0,
  project_emissions_lds    DECIMAL(12,2) NOT NULL DEFAULT 0,
  project_emissions_total  DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Abatement calculations (tCO₂-e)
  gross_abatement          DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_abatement            DECIMAL(12,2) NOT NULL DEFAULT 0,
  uncertainty_buffer       DECIMAL(12,2)          DEFAULT 0,

  -- ACCU issuance
  accus_eligible           DECIMAL(12,2) NOT NULL DEFAULT 0,
  accus_issued             DECIMAL(12,2),
  accu_price               DECIMAL(12,2),          -- AUD per ACCU at time of issuance
  revenue                  DECIMAL(12,2),           -- AUD

  -- Workflow timestamps
  submitted_at             TIMESTAMPTZ,
  approved_at              TIMESTAMPTZ,
  issued_at                TIMESTAMPTZ,

  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),

  -- Business invariants
  CONSTRAINT valid_period             CHECK (period_end > period_start),
  CONSTRAINT valid_gross_abatement    CHECK (gross_abatement >= 0),
  CONSTRAINT valid_net_abatement      CHECK (net_abatement >= 0 AND net_abatement <= gross_abatement),
  CONSTRAINT valid_accus_eligible     CHECK (accus_eligible >= 0),
  CONSTRAINT valid_accus_issued       CHECK (accus_issued IS NULL OR accus_issued >= 0),
  CONSTRAINT valid_revenue            CHECK (revenue IS NULL OR revenue >= 0)
);

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE carbon_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE accu_period    ENABLE ROW LEVEL SECURITY;

-- Users can view carbon data for projects they are members of
CREATE POLICY "Users can view carbon projects for their projects"
  ON carbon_project FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_project WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view ACCU periods for their projects"
  ON accu_period FOR SELECT
  USING (
    carbon_project_id IN (
      SELECT id FROM carbon_project WHERE project_id IN (
        SELECT project_id FROM user_project WHERE user_id = auth.uid()
      )
    )
  );

-- ─── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_carbon_project_project_id     ON carbon_project(project_id);
CREATE INDEX idx_accu_period_carbon_project_id ON accu_period(carbon_project_id);
CREATE INDEX idx_accu_period_status            ON accu_period(status);
CREATE INDEX idx_accu_period_dates             ON accu_period(period_start, period_end);

-- ─── updated_at trigger ────────────────────────────────────────────────────────

-- Reuse function if it already exists from a prior migration
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carbon_project_updated_at
  BEFORE UPDATE ON carbon_project
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accu_period_updated_at
  BEFORE UPDATE ON accu_period
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Documentation ─────────────────────────────────────────────────────────────

COMMENT ON TABLE  carbon_project                          IS 'Carbon methodology project configuration per fire management project';
COMMENT ON TABLE  accu_period                             IS 'Annual ACCU calculation and issuance records';
COMMENT ON COLUMN carbon_project.baseline_emissions       IS 'Historical average annual emissions in tCO₂-e (pre-project baseline period)';
COMMENT ON COLUMN carbon_project.permanence_discount      IS 'Permanence discount applied to gross abatement (typically 0.25 = 25%)';
COMMENT ON COLUMN accu_period.status                      IS 'Workflow: draft → submitted → under_review → approved → issued';
COMMENT ON COLUMN accu_period.project_emissions_eds       IS 'tCO₂-e from early dry season fires';
COMMENT ON COLUMN accu_period.project_emissions_lds       IS 'tCO₂-e from late dry season fires (high emissions)';
COMMENT ON COLUMN accu_period.gross_abatement             IS 'baseline_emissions − project_emissions_total';
COMMENT ON COLUMN accu_period.net_abatement               IS 'gross_abatement × (1 − permanence_discount)';
COMMENT ON COLUMN accu_period.accus_eligible              IS 'max(0, net_abatement − uncertainty_buffer)';

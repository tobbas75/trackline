"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";

interface Unit {
  id: string;
  name: string;
  phone_id?: string;
  last_lat?: number;
  last_lng?: number;
  last_seen?: string;
  firmware_ver?: string;
  battery_pct?: number;
  solar_ok?: boolean;
  armed?: boolean;
  device_type?: 'trap_monitor' | 'camera_trap';
  connectivity_method?: 'sms' | 'mqtt';
  model?: string;
  cam_firmware_version?: string;
}

export default function UnitsPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string | undefined;

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) {
      loadUnits();
    }
  }, [orgId]);

  async function loadUnits() {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orgs/${orgId}/units`);
      const data = await res.json();

      if (!res.ok) {
        setUnits([]);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Failed to load units.",
        );
        return;
      }

      setUnits(Array.isArray(data) ? data : []);
      if (!Array.isArray(data)) {
        setError("Unexpected units response format.");
      }
    } catch {
      setUnits([]);
      setError("Network error while loading units.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(unitId: string) {
    if (!orgId) return;
    if (
      !confirm(
        "Delete this unit? This will remove all associated events and data.",
      )
    ) {
      return;
    }

    await fetch(`/api/orgs/${orgId}/units/${unitId}`, { method: "DELETE" });
    loadUnits();
  }

  function handleEdit(unit: Unit) {
    setEditingUnit(unit);
    setShowForm(true);
    setFormError(null);
  }

  function handleAdd() {
    setEditingUnit(null);
    setShowForm(true);
    setFormError(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-(--tm-bg)">
        <Navigation orgName="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-4">🪤</div>
            <div className="text-(--tm-accent) animate-pulse">Loading units...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-(--tm-bg)">
      <Navigation orgId={orgId} unitCount={units.length} />

      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 bg-(--tm-panel) border-b border-(--tm-border) p-4 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-(--tm-muted) hover:text-(--tm-text) mb-2 inline-block"
              >
                ← Back
              </Link>
              <h1 className="text-3xl font-bold text-(--tm-accent)">
                Unit Management
              </h1>
              <p className="text-(--tm-muted) text-sm mt-1">
                {units.length} unit{units.length !== 1 ? 's' : ''} deployed
                {units.some(u => u.device_type === 'camera_trap') && (
                  <> ({units.filter(u => u.device_type === 'camera_trap').length} camera, {units.filter(u => (u.device_type || 'trap_monitor') === 'trap_monitor').length} trap)</>
                )}
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="px-6 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-bold transition-colors whitespace-nowrap"
            >
              + Add Unit
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4">
          {error && (
            <div className="mb-6 rounded-lg border border-(--tm-danger-border) bg-(--tm-danger-soft) px-4 py-3 text-(--tm-danger)">
              <div className="font-bold mb-1">⚠️ Error</div>
              <p>{error}</p>
            </div>
          )}

          {units.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🪤</div>
              <h2 className="text-2xl font-bold text-(--tm-text) mb-2">
                No units yet
              </h2>
              <p className="text-(--tm-muted) mb-6">
                Deploy your first trap monitor to get started
              </p>
              <button
                onClick={handleAdd}
                className="px-8 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-bold transition-colors"
              >
                Deploy First Unit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-5 hover:border-(--tm-accent) transition-all"
                  style={{ boxShadow: "var(--tm-shadow)" }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-(--tm-text) truncate">
                        {unit.name}
                      </h3>
                      <p className="text-xs text-(--tm-muted) font-mono">
                        {unit.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {unit.device_type === 'camera_trap' && (
                        <span className="rounded bg-(--tm-accent-soft) px-1.5 py-0.5 text-[10px] font-semibold text-(--tm-accent) uppercase">Cam</span>
                      )}
                      <span
                        className={`ml-1 w-4 h-4 rounded-full ${
                          unit.armed ? "bg-(--tm-accent)" : "bg-(--tm-offline)"
                        }`}
                        title={unit.armed ? "Armed" : "Disarmed"}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4 text-sm bg-(--tm-panel-soft) rounded p-3">
                    {unit.phone_id && (
                      <div className="flex items-center gap-2 text-(--tm-text-secondary)">
                        <span className="text-sm">📱</span>
                        <span className="font-mono">{unit.phone_id}</span>
                      </div>
                    )}
                    {unit.battery_pct !== undefined && (
                      <div className="flex items-center gap-2 text-(--tm-text-secondary)">
                        <span className="text-sm">🔋</span>
                        <div className="w-12 bg-(--tm-bg-subtle) rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              unit.battery_pct > 50
                                ? "bg-(--tm-accent)"
                                : unit.battery_pct > 20
                                  ? "bg-(--tm-warning)"
                                  : "bg-(--tm-danger)"
                            }`}
                            style={{ width: `${unit.battery_pct}%` }}
                          />
                        </div>
                        <span className="text-xs">{unit.battery_pct}%</span>
                      </div>
                    )}
                    {unit.firmware_ver && (
                      <div className="flex items-center gap-2 text-(--tm-text-secondary)">
                        <span className="text-sm">📦</span>
                        <span>FW {unit.firmware_ver}</span>
                      </div>
                    )}
                    {unit.last_seen && (
                      <div className="flex items-center gap-2 text-(--tm-text-secondary)">
                        <span className="text-sm">⏰</span>
                        <span>{new Date(unit.last_seen).toLocaleString()}</span>
                      </div>
                    )}
                    {unit.device_type === 'camera_trap' && unit.model && (
                      <div className="flex items-center gap-2 text-(--tm-text-secondary)">
                        <span className="text-sm">📷</span>
                        <span>{unit.model}</span>
                      </div>
                    )}
                    {unit.last_lat && unit.last_lng && (
                      <div className="flex items-center gap-2 text-(--tm-text-secondary)">
                        <span className="text-sm">📍</span>
                        <span className="text-xs">
                          {unit.last_lat.toFixed(4)}, {unit.last_lng.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(unit)}
                      className="flex-1 px-4 py-2.5 bg-(--tm-panel-soft) hover:bg-(--tm-bg-subtle) rounded-lg text-(--tm-text-secondary) hover:text-(--tm-text) font-medium transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/dashboard/units/${unit.id}`}
                      className="flex-1 px-4 py-2.5 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-medium transition-colors text-sm text-center"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="px-4 py-2.5 bg-(--tm-danger-soft) hover:opacity-80 text-(--tm-danger) rounded-lg font-medium transition-colors text-sm"
                      title="Delete unit"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showForm && orgId && (
        <UnitForm
          orgId={orgId}
          unit={editingUnit}
          error={formError}
          onError={setFormError}
          onClose={() => {
            setShowForm(false);
            setEditingUnit(null);
            setFormError(null);
            loadUnits();
          }}
        />
      )}
    </div>
  );
}

function UnitForm({
  orgId,
  unit,
  error,
  onError,
  onClose,
}: {
  orgId: string;
  unit: Unit | null;
  error: string | null;
  onError: (err: string | null) => void;
  onClose: () => void;
}) {
  const [id, setId] = useState(unit?.id || "");
  const [name, setName] = useState(unit?.name || "");
  const [phoneId, setPhoneId] = useState(unit?.phone_id || "");
  const [lat, setLat] = useState(unit?.last_lat?.toString() || "");
  const [lng, setLng] = useState(unit?.last_lng?.toString() || "");
  const [armed, setArmed] = useState(unit?.armed ?? true);
  const [deviceType, setDeviceType] = useState<'trap_monitor' | 'camera_trap'>(unit?.device_type || 'trap_monitor');
  const [model, setModel] = useState(unit?.model || '');
  const [camFirmwareVersion, setCamFirmwareVersion] = useState(unit?.cam_firmware_version || '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);

    if (!id.trim() || !name.trim()) {
      onError("Unit ID and Name are required");
      return;
    }

    setSaving(true);

    try {
      const data = {
        id,
        name,
        phone_id: deviceType === 'trap_monitor' ? (phoneId || undefined) : undefined,
        last_lat: lat ? parseFloat(lat) : undefined,
        last_lng: lng ? parseFloat(lng) : undefined,
        armed: deviceType === 'trap_monitor' ? armed : undefined,
        device_type: deviceType,
        ...(deviceType === 'camera_trap' ? {
          model: model || undefined,
          cam_firmware_version: camFirmwareVersion || undefined,
        } : {}),
      };

      const url = unit
        ? `/api/orgs/${orgId}/units/${unit.id}`
        : `/api/orgs/${orgId}/units`;
      const method = unit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        onError(
          typeof errData?.error === "string"
            ? errData.error
            : "Failed to save unit",
        );
        return;
      }

      onClose();
    } catch (err) {
      onError("Network error while saving unit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-(--tm-overlay) flex items-center justify-center p-4 z-50">
      <div className="bg-(--tm-panel) rounded-lg border border-(--tm-border) max-w-2xl w-full" style={{ boxShadow: "var(--tm-shadow-lg)" }}>
        {/* Header */}
        <div className="border-b border-(--tm-border) px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-(--tm-text)">
            {unit ? "✏️ Edit Unit" : "➕ Add New Unit"}
          </h2>
          <button
            onClick={onClose}
            className="text-(--tm-muted) hover:text-(--tm-text) text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-(--tm-danger-border) bg-(--tm-danger-soft) px-4 py-3 text-(--tm-danger) text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-(--tm-muted) mb-2">
                Unit ID *
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={!!unit}
                required
                placeholder="TRAP_001"
                className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus) disabled:opacity-50"
              />
              <p className="text-xs text-(--tm-muted) mt-1">
                Cannot be changed after creation
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-(--tm-muted) mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="North Paddock Trap"
                className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-(--tm-muted) mb-2">Device Type</label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value as 'trap_monitor' | 'camera_trap')}
              disabled={!!unit}
              className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) focus:outline-none focus:border-(--tm-input-focus) disabled:opacity-50"
            >
              <option value="trap_monitor">Trap Monitor</option>
              <option value="camera_trap">Camera Trap</option>
            </select>
            <p className="text-xs text-(--tm-muted) mt-1">Cannot be changed after creation</p>
          </div>

          {deviceType === 'trap_monitor' && (
            <div>
              <label className="block text-sm font-bold text-(--tm-muted) mb-2">
                Phone Number / SIM ID
              </label>
              <input
                type="text"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="+61400000000"
                className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus)"
              />
            </div>
          )}

          {deviceType === 'camera_trap' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-(--tm-muted) mb-2">Camera Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="NE301"
                  className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus)"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-(--tm-muted) mb-2">Camera Firmware</label>
                <input
                  type="text"
                  value={camFirmwareVersion}
                  onChange={(e) => setCamFirmwareVersion(e.target.value)}
                  placeholder="v2.1.0"
                  className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus)"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-(--tm-muted) mb-2">
              Location
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude (-12.4634)"
                className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus)"
              />
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude (130.8456)"
                className="w-full px-4 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded-lg text-(--tm-text) placeholder:text-(--tm-muted) focus:outline-none focus:border-(--tm-input-focus)"
              />
            </div>
          </div>

          {deviceType === 'trap_monitor' && (
            <div className="bg-(--tm-panel-soft) rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={armed}
                  onChange={(e) => setArmed(e.target.checked)}
                  className="w-5 h-5 rounded bg-(--tm-input-bg) border border-(--tm-input-border) cursor-pointer accent-(--tm-accent)"
                />
                <span className="text-(--tm-text-secondary)">
                  Unit is <strong>armed</strong> (will send alerts when trap
                  triggered)
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-(--tm-border)">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-(--tm-border) rounded-lg text-(--tm-text-secondary) hover:bg-(--tm-panel-soft) font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-bold transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : unit ? "Update Unit" : "Create Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

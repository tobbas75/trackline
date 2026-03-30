# Phase 11: Camera Dashboard + Image Viewer - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Camera event browsing, full image viewer with detection bounding box overlays, species/confidence/date filters, and camera events in the unified timeline alongside trap events.

Requirements: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, VIEW-07

</domain>

<decisions>
## Implementation Decisions

### Camera Event List (VIEW-01)
- New CameraEventList component showing thumbnail, species detected, confidence, timestamp
- Thumbnails from Supabase Storage (camera_events.image_path)
- Sorted by captured_at DESC
- Pagination or infinite scroll (Claude's discretion)

### Image Viewer with Bounding Boxes (VIEW-02, VIEW-03)
- Full-screen or modal image viewer
- Bounding boxes drawn as overlays on the image using CSS/SVG (not canvas)
- Each box shows species label and confidence score
- Bounding box coordinates from camera_detections (normalised 0-1, multiply by image dimensions)
- Colour-coded by species or confidence level (Claude's discretion)

### Filters (VIEW-04, VIEW-05, VIEW-06)
- Species filter: dropdown/multiselect from species seen in this org's events
- Confidence threshold: slider or input (0-100%)
- Date range: date picker (start/end)
- Filters combinable — all three applied simultaneously
- Filters applied client-side on fetched data (for simplicity) or via Supabase query params

### Unified Timeline (VIEW-07)
- Camera events appear alongside trap events in existing EventList
- Type indicator badge: "Trap" vs "Camera" on each event
- Product toggle from Phase 10 filters which events show
- When toggle is "All" — both types in chronological order
- When toggle is "Camera Trap" — only camera events
- When toggle is "Trap Monitor" — only trap events (existing behaviour)

### Claude's Discretion
- Component composition and file structure
- CSS styling approach (Tailwind classes)
- Whether image viewer is modal or separate page
- Pagination vs infinite scroll
- Filter UI component choices

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- frontend/src/components/dashboard/EventList.tsx — extend for camera events
- frontend/src/components/dashboard/ProductToggle.tsx — already filters by device_type (Phase 10)
- frontend/src/hooks/useDashboardData.ts — already has filteredEvents by product toggle
- frontend/src/lib/types.ts — CameraEvent, CameraDetection types (Phase 8)
- Supabase Storage bucket camera-images (Phase 8)
- Tailwind CSS for all styling

### Established Patterns
- Components in frontend/src/components/dashboard/
- Data fetching via Supabase client in hooks
- Tailwind for styling, no CSS modules

### Integration Points
- EventList.tsx — add camera event rendering alongside trap events
- useDashboardData.ts — add camera event fetching and filter state
- page.tsx (dashboard) — wire new filter components

</code_context>

<specifics>
## Specific Ideas

- Bounding box overlay using absolute-positioned divs over the image (simpler than SVG/canvas)
- Species filter populated from: SELECT DISTINCT class_name FROM camera_detections WHERE camera_event_id IN (events for this org)
- Image viewer: click thumbnail to open full view with bounding boxes

</specifics>

<deferred>
## Deferred Ideas

- Camera event map view (GPS-tagged detections on Leaflet)
- Species frequency charts / analytics
- Bulk image export
- Video support

</deferred>

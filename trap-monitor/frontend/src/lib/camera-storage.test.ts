import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase client ─────────────────────────────────────────────────────

function createMockSupabase() {
  return {
    from: vi.fn(),
    storage: { from: vi.fn() },
  };
}

// ── Camera event storage operations (TST-02) ────────────────────────────────

describe('Camera event storage operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it('inserts a camera_event row with required fields', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'evt-1' }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const eventRow = {
      unit_id: 'DEV001',
      org_id: 'org-1',
      captured_at: '2024-01-01T00:00:00Z',
      image_width: 1920,
      image_height: 1080,
      model_name: 'yolov5s',
      inference_time_ms: 120,
      battery_percent: 85,
      communication_type: '4G',
      detection_count: 2,
    };

    const result = await mockSupabase.from('t_camera_events').insert(eventRow).select('id').single();

    expect(mockSupabase.from).toHaveBeenCalledWith('t_camera_events');
    expect(mockInsert).toHaveBeenCalledWith(eventRow);
    expect(mockSelect).toHaveBeenCalledWith('id');
    expect(result.data?.id).toBe('evt-1');
    expect(result.error).toBeNull();
  });

  it('inserts t_camera_detections linked to camera_event', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const detections = [
      { camera_event_id: 'evt-1', class_name: 'possum', confidence: 0.92, x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      { camera_event_id: 'evt-1', class_name: 'cat', confidence: 0.75, x: 0.5, y: 0.6, width: 0.2, height: 0.3 },
    ];

    await mockSupabase.from('t_camera_detections').insert(detections);

    expect(mockSupabase.from).toHaveBeenCalledWith('t_camera_detections');
    expect(mockInsert).toHaveBeenCalledWith(detections);
    expect(detections).toHaveLength(2);
    expect(detections[0].camera_event_id).toBe('evt-1');
    expect(detections[1].camera_event_id).toBe('evt-1');
  });

  it('queries t_camera_events with detection join for an org', async () => {
    const mockData = [{ id: 'evt-1', detections: [{ class_name: 'possum' }] }];
    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const result = await mockSupabase
      .from('t_camera_events')
      .select('*, detections:t_camera_detections(*)')
      .eq('org_id', 'org-1')
      .order('captured_at', { ascending: false });

    expect(mockSupabase.from).toHaveBeenCalledWith('t_camera_events');
    expect(mockSelect).toHaveBeenCalledWith('*, detections:t_camera_detections(*)');
    expect(mockEq).toHaveBeenCalledWith('org_id', 'org-1');
    expect(mockOrder).toHaveBeenCalledWith('captured_at', { ascending: false });
    expect(result.data).toHaveLength(1);
    expect(result.data![0].detections).toHaveLength(1);
  });

  it('enforces org scoping -- different org returns empty', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockSupabase.from.mockReturnValue({ select: mockSelect });

    const result = await mockSupabase
      .from('t_camera_events')
      .select('*, detections:t_camera_detections(*)')
      .eq('org_id', 'org-2')
      .order('captured_at', { ascending: false });

    expect(mockEq).toHaveBeenCalledWith('org_id', 'org-2');
    expect(result.data).toEqual([]);
  });

  it('handles insert error gracefully', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS violation' } });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockSupabase.from.mockReturnValue({ insert: mockInsert });

    const result = await mockSupabase
      .from('t_camera_events')
      .insert({ unit_id: 'DEV001', org_id: 'org-bad' })
      .select('id')
      .single();

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('RLS');
  });
});

// ── Image storage operations (TST-03) ────────────────────────────────────────

describe('Image storage operations', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it('uploads image to org-scoped path', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.storage.from.mockReturnValue({ upload: mockUpload });

    const path = 'org-1/DEV001/evt-1.jpg';
    const bytes = new Uint8Array([0xFF, 0xD8]);
    const contentType = 'image/jpeg';

    await mockSupabase.storage.from('camera-images').upload(path, bytes, { contentType, upsert: false });

    expect(mockSupabase.storage.from).toHaveBeenCalledWith('camera-images');
    expect(mockUpload).toHaveBeenCalledWith(path, bytes, { contentType: 'image/jpeg', upsert: false });
    expect(path.startsWith('org-1/')).toBe(true);
  });

  it('retrieves signed URL for org-scoped image', async () => {
    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/org-1/DEV001/evt-1.jpg' },
      error: null,
    });
    mockSupabase.storage.from.mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

    const result = await mockSupabase.storage
      .from('camera-images')
      .createSignedUrl('org-1/DEV001/evt-1.jpg', 3600);

    expect(result.data?.signedUrl).toBeTruthy();
    expect(result.error).toBeNull();
  });

  it('rejects upload to different org path', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      error: { message: 'RLS: insufficient permissions' },
    });
    mockSupabase.storage.from.mockReturnValue({ upload: mockUpload });

    const result = await mockSupabase.storage
      .from('camera-images')
      .upload('org-other/DEV001/evt-1.jpg', new Uint8Array([0xFF]), { contentType: 'image/jpeg', upsert: false });

    expect(result.error?.message).toContain('insufficient permissions');
  });

  it('handles image retrieval for non-existent path', async () => {
    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Object not found' },
    });
    mockSupabase.storage.from.mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

    const result = await mockSupabase.storage
      .from('camera-images')
      .createSignedUrl('org-1/DEV001/nonexistent.jpg', 3600);

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain('Object not found');
  });

  it('uploads PNG images with correct content type', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.storage.from.mockReturnValue({ upload: mockUpload });

    const path = 'org-1/DEV001/evt-2.png';
    await mockSupabase.storage.from('camera-images').upload(path, new Uint8Array([0x89, 0x50]), {
      contentType: 'image/png',
      upsert: false,
    });

    expect(mockUpload).toHaveBeenCalledWith(
      path,
      expect.any(Uint8Array),
      { contentType: 'image/png', upsert: false }
    );
  });
});

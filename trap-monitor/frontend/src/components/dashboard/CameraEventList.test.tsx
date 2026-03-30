import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraEventList } from './CameraEventList';
import type { CameraEvent, CameraDetection } from '@/lib/types';

// -- Test helpers -----------------------------------------------------------

function createDetection(overrides?: Partial<CameraDetection>): CameraDetection {
  return {
    id: 'det-1',
    camera_event_id: 'evt-1',
    class_name: 'Possum',
    confidence: 0.92,
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.4,
    ...overrides,
  };
}

function createCameraEvent(overrides?: Partial<CameraEvent>): CameraEvent {
  return {
    id: 'evt-1',
    unit_id: 'CAM001',
    org_id: 'org-1',
    captured_at: new Date().toISOString(),
    image_path: 'org-1/CAM001/evt-1.jpg',
    detection_count: 1,
    detections: [createDetection()],
    ...overrides,
  };
}

const mockGetImageUrl = vi.fn((path: string) => `https://storage.example.com/${path}`);

// -- Tests ------------------------------------------------------------------

describe('CameraEventList', () => {
  beforeEach(() => {
    mockGetImageUrl.mockClear();
  });

  it('renders "Camera Events" heading', () => {
    render(
      <CameraEventList events={[createCameraEvent()]} getImageUrl={mockGetImageUrl} />,
    );
    expect(screen.getByText('Camera Events')).toBeInTheDocument();
  });

  it('renders empty state when no events', () => {
    render(<CameraEventList events={[]} getImageUrl={mockGetImageUrl} />);
    expect(screen.getByText('No camera events found')).toBeInTheDocument();
  });

  it('renders event cards with thumbnail images', () => {
    const events = [
      createCameraEvent({ id: 'evt-1', image_path: 'org-1/CAM001/evt-1.jpg' }),
      createCameraEvent({ id: 'evt-2', image_path: 'org-1/CAM001/evt-2.jpg' }),
    ];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(mockGetImageUrl).toHaveBeenCalled();
  });

  it('renders placeholder when event has no image_path', () => {
    const events = [createCameraEvent({ id: 'evt-no-img', image_path: undefined })];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    // No <img> elements should be present — uses svg placeholder instead
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('shows top detection species name and confidence', () => {
    const events = [
      createCameraEvent({
        detections: [createDetection({ class_name: 'Possum', confidence: 0.92 })],
      }),
    ];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    expect(screen.getByText('Possum')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('shows "+N more" when multiple detections', () => {
    const events = [
      createCameraEvent({
        detections: [
          createDetection({ id: 'd1', class_name: 'Possum', confidence: 0.92 }),
          createDetection({ id: 'd2', class_name: 'Wallaby', confidence: 0.7 }),
          createDetection({ id: 'd3', class_name: 'Fox', confidence: 0.5 }),
        ],
      }),
    ];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows "No detections" when detection array empty', () => {
    const events = [createCameraEvent({ detections: [] })];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    expect(screen.getByText('No detections')).toBeInTheDocument();
  });

  it('respects maxEvents prop', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      createCameraEvent({ id: `evt-${i}`, image_path: `org-1/CAM001/evt-${i}.jpg` }),
    );
    render(
      <CameraEventList events={events} getImageUrl={mockGetImageUrl} maxEvents={3} />,
    );

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('opens ImageViewer when event card clicked', async () => {
    const user = userEvent.setup();
    const events = [createCameraEvent({ image_path: 'org-1/CAM001/evt-1.jpg' })];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    // Click the card
    const card = screen.getByRole('img').closest('[class*="cursor-pointer"]');
    expect(card).not.toBeNull();
    await user.click(card!);

    // ImageViewer should now be open
    expect(screen.getByLabelText('Close image viewer')).toBeInTheDocument();
  });

  it('does not open ImageViewer for event without image_path', async () => {
    const user = userEvent.setup();
    const events = [createCameraEvent({ image_path: undefined, detections: [] })];
    render(<CameraEventList events={events} getImageUrl={mockGetImageUrl} />);

    // Click the card (find by "No detections" text content)
    const card = screen.getByText('No detections').closest('[class*="cursor-pointer"]');
    expect(card).not.toBeNull();
    await user.click(card!);

    // ImageViewer should NOT open since no image_path
    expect(screen.queryByLabelText('Close image viewer')).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageViewer } from './ImageViewer';
import type { CameraEvent, CameraDetection } from '@/lib/types';

// -- Test helpers -----------------------------------------------------------

function createDetection(overrides?: Partial<CameraDetection>): CameraDetection {
  return {
    id: 'det-1',
    camera_event_id: 'evt-1',
    class_name: 'Possum',
    confidence: 0.9,
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.4,
    ...overrides,
  };
}

function createViewerEvent(overrides?: Partial<CameraEvent>): CameraEvent {
  return {
    id: 'evt-1',
    unit_id: 'CAM001',
    org_id: 'org-1',
    captured_at: new Date().toISOString(),
    image_path: 'org-1/CAM001/evt-1.jpg',
    detection_count: 2,
    detections: [
      createDetection({ id: 'det-1', class_name: 'Possum', confidence: 0.9 }),
      createDetection({ id: 'det-2', class_name: 'Fox', confidence: 0.4 }),
    ],
    ...overrides,
  };
}

// -- Tests ------------------------------------------------------------------

describe('ImageViewer', () => {
  const defaultProps = {
    event: createViewerEvent(),
    imageUrl: 'https://example.com/img.jpg',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onClose = vi.fn();
  });

  it('renders the image with correct src', () => {
    render(<ImageViewer {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('renders close button with aria-label', () => {
    render(<ImageViewer {...defaultProps} />);
    expect(screen.getByLabelText('Close image viewer')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    render(<ImageViewer {...defaultProps} />);

    // Use fireEvent to avoid event bubbling to backdrop (userEvent bubbles)
    fireEvent.click(screen.getByLabelText('Close image viewer'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const { container } = render(<ImageViewer {...defaultProps} />);

    // The outermost div is the backdrop (fixed inset-0)
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not close when image container clicked', () => {
    render(<ImageViewer {...defaultProps} />);

    // Click the image itself — stopPropagation should prevent onClose
    const img = screen.getByRole('img');
    fireEvent.click(img);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<ImageViewer {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders bounding box overlays for each detection', () => {
    render(<ImageViewer {...defaultProps} />);

    // Each detection has a label with "ClassName XX%"
    expect(screen.getByText('Possum 90%')).toBeInTheDocument();
    expect(screen.getByText('Fox 40%')).toBeInTheDocument();
  });

  it('shows species label and confidence on bounding box', () => {
    const event = createViewerEvent({
      detections: [createDetection({ class_name: 'Wallaby', confidence: 0.85 })],
    });
    render(<ImageViewer event={event} imageUrl={defaultProps.imageUrl} onClose={defaultProps.onClose} />);

    expect(screen.getByText('Wallaby 85%')).toBeInTheDocument();
  });

  it('applies green border for high confidence (>=0.8)', () => {
    const event = createViewerEvent({
      detections: [createDetection({ id: 'det-hi', confidence: 0.9 })],
    });
    const { container } = render(
      <ImageViewer event={event} imageUrl={defaultProps.imageUrl} onClose={defaultProps.onClose} />,
    );

    // The bounding box div should have border-green-400 class
    const bbox = container.querySelector('.border-green-400');
    expect(bbox).not.toBeNull();
  });

  it('applies yellow border for medium confidence (>=0.5, <0.8)', () => {
    const event = createViewerEvent({
      detections: [createDetection({ id: 'det-mid', confidence: 0.6 })],
    });
    const { container } = render(
      <ImageViewer event={event} imageUrl={defaultProps.imageUrl} onClose={defaultProps.onClose} />,
    );

    const bbox = container.querySelector('.border-yellow-400');
    expect(bbox).not.toBeNull();
  });

  it('applies red border for low confidence (<0.5)', () => {
    const event = createViewerEvent({
      detections: [createDetection({ id: 'det-lo', confidence: 0.3 })],
    });
    const { container } = render(
      <ImageViewer event={event} imageUrl={defaultProps.imageUrl} onClose={defaultProps.onClose} />,
    );

    const bbox = container.querySelector('.border-red-400');
    expect(bbox).not.toBeNull();
  });

  it('shows "No detections" when detection array empty', () => {
    const event = createViewerEvent({ detections: [] });
    render(
      <ImageViewer event={event} imageUrl={defaultProps.imageUrl} onClose={defaultProps.onClose} />,
    );

    expect(screen.getByText('No detections')).toBeInTheDocument();
  });

  it('displays event metadata', () => {
    const event = createViewerEvent({
      model_name: 'YOLOv8',
      battery_percent: 85,
    });
    render(
      <ImageViewer event={event} imageUrl={defaultProps.imageUrl} onClose={defaultProps.onClose} />,
    );

    expect(screen.getByText('Model: YOLOv8')).toBeInTheDocument();
    expect(screen.getByText('Battery: 85%')).toBeInTheDocument();
  });
});

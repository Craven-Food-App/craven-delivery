import cravenPinIcon from '@/assets/feeder_nav_button_compressed.png';

/**
 * The resolved URL to the Crave'N gold compass pin icon — for use in dynamic DOM elements.
 */
export const CRAVEN_PIN_URL: string = cravenPinIcon;

/**
 * Creates a branded Crave'N map-marker DOM element using the gold compass pin.
 *
 * @param size  Pixel width/height of the marker (default 36)
 * @param label Optional tooltip-style label shown on hover
 * @returns     An HTMLDivElement ready to pass to `new mapboxgl.Marker({ element: el })`
 */
export function createCravenMarkerElement(size: number = 36, label?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'craven-map-pin';
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background-image: url('${cravenPinIcon}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    transition: transform 0.15s ease;
  `;

  // Hover scale effect
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

  if (label) {
    el.title = label;
  }

  return el;
}


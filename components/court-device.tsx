/**
 * The atmospheric court linework behind hero regions. Purely decorative: it is
 * hidden from assistive technology and never sits over text that must be read.
 */
export function CourtDevice() {
  return (
    <svg
      className="court-device"
      viewBox="0 0 600 400"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="60" y="30" width="480" height="340" />
      <line x1="60" y1="200" x2="540" y2="200" />
      <rect x="60" y="110" width="240" height="180" />
      <rect x="300" y="110" width="240" height="180" />
      <line x1="300" y1="30" x2="300" y2="370" />
    </svg>
  );
}

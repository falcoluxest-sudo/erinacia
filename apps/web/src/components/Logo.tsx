// Erinacia hedgehog, front view. `mono` is the one-colour mark for small sizes.

const STAR =
  'M60 7L63.4 15.1L67.8 7.6L70 16.1L75.5 9.2L76.4 18L82.8 12L82.5 20.7L89.7 15.7L88.2 24.4L96 20.4L93.2 28.8L101.6 26L97.6 33.8L106.3 32.3L101.3 39.5L110 39.2L104 45.6L112.8 46.5L105.9 52L114.4 54.2L106.9 58.6L115 62L106.9 65.4L114.4 69.8L105.9 72L112.8 77.5L104 78.4L110 84.8L101.3 84.5L106.3 91.7L97.6 90.2L101.6 98L93.2 95.2L96 103.6L88.2 99.6L89.7 108.3L82.5 103.3L82.8 112L76.4 106L75.5 114.8L70 107.9L67.8 116.4L63.4 108.9L60 117L56.6 108.9L52.2 116.4L50 107.9L44.5 114.8L43.6 106L37.2 112L37.5 103.3L30.3 108.3L31.8 99.6L24 103.6L26.8 95.2L18.4 98L22.4 90.2L13.7 91.7L18.7 84.5L10 84.8L16 78.4L7.2 77.5L14.1 72L5.6 69.8L13.1 65.4L5 62L13.1 58.6L5.6 54.2L14.1 52L7.2 46.5L16 45.6L10 39.2L18.7 39.5L13.7 32.3L22.4 33.8L18.4 26L26.8 28.8L24 20.4L31.8 24.4L30.3 15.7L37.5 20.7L37.2 12L43.6 18L44.5 9.2L50 16.1L52.2 7.6L56.6 15.1Z';
const FACE =
  'M60 46C66 37 82 38 87 50C93 63 87 82 74 89C69 92 64 93 60 93C56 93 51 92 46 89C33 82 27 63 33 50C38 38 54 37 60 46Z';

export function Logo({ size = 40, mono = false }: { size?: number; mono?: boolean }) {
  if (mono) {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <path d={STAR} fill="currentColor" />
        <path d={FACE} fill="var(--branco)" />
        <circle cx="48" cy="61" r="6" fill="currentColor" />
        <circle cx="72" cy="61" r="6" fill="currentColor" />
        <ellipse cx="60" cy="74" rx="6.5" ry="5" fill="var(--ipe)" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <path d={STAR} fill="#4A3222" stroke="#4A3222" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="60" cy="62" r="46" fill="#6B4A2E" />
      <circle cx="34" cy="43" r="7.5" fill="#3A2618" />
      <circle cx="86" cy="43" r="7.5" fill="#3A2618" />
      <path d={FACE} fill="#D9B88F" />
      <ellipse cx="60" cy="77" rx="14" ry="11" fill="#E9D3A8" />
      <circle cx="48" cy="61" r="5.5" fill="#1B1410" />
      <circle cx="46.4" cy="59.2" r="1.7" fill="#fff" />
      <circle cx="72" cy="61" r="5.5" fill="#1B1410" />
      <circle cx="70.4" cy="59.2" r="1.7" fill="#fff" />
      <ellipse cx="60" cy="73" rx="5.5" ry="4.2" fill="#1B1410" />
      <path d="M55.5 80Q60 83.5 64.5 80" stroke="#1B1410" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

interface SpilBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'onDark';
  decorative?: boolean;
}

export function SpilBrandLogo({
  size = 'md',
  variant = 'default',
  decorative = false,
}: SpilBrandLogoProps) {
  const imgSize =
    size === 'sm' ? 'h-7 w-auto' : size === 'lg' ? 'h-11 w-auto' : 'h-9 w-auto';

  const img = (
    <img
      src="/assets/aistudio/image_ae7332b1.png"
      alt={decorative ? '' : 'Logo SPIL'}
      aria-hidden={decorative ? true : undefined}
      className={`${imgSize} object-contain shrink-0 select-none`}
    />
  );

  if (variant === 'onDark') {
    const pad = size === 'sm' ? 'px-1.5 py-1 rounded-lg' : 'px-2.5 py-2 rounded-xl';
    return (
      <div
        className={`inline-flex items-center justify-center bg-white ${pad} shadow-sm ring-1 ring-white/25 shrink-0`}
      >
        {img}
      </div>
    );
  }

  return img;
}

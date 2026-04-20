import React from 'react';

type BrandLogoVariant = 'light' | 'dark';

interface BrandLogoProps {
  variant: BrandLogoVariant;
  className?: string;
}

export function BrandLogo({ variant, className = '' }: BrandLogoProps) {
  const src = variant === 'light'
    ? '/assets/logo_servv_white.PNG'
    : '/assets/logo_servv_black.PNG';

  return (
    <img
      src={src}
      alt="Servv logo"
      className={`block w-auto object-contain select-none ${className}`.trim()}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}

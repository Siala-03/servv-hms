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
      className={`w-auto object-contain ${className}`.trim()}
      loading="eager"
      decoding="async"
    />
  );
}

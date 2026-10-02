import React from 'react';

export const LOGO_URL = '/brand/logo-primary.svg';
export const LOGO_ICON_URL = '/brand/logo-icon.svg';

export default function BrandLogo({ className = 'h-7 w-auto' }) {
  return (
    <img
      src={LOGO_URL}
      alt="Congo Commerce"
      className={`shrink-0 object-contain rounded-sm ${className}`} />);


}
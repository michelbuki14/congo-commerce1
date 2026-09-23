import React from 'react';
import { Image } from '@/components/ui/image';

export const LOGO_URL = 'https://media.base44.com/images/public/6ab43a1371d65d1a911b0fe7/838f7b224_1790196759.png';

// The uploaded file is a sheet holding two versions of the mark (full lockup on
// top, icon only below). These values crop it down to the full lockup.
const CROP = {
  width: '132.27%',
  height: '219.39%',
  left: '-16.14%',
  top: '-47.99%',
};

export default function BrandLogo({ className = 'h-8 w-[95px] sm:h-9 sm:w-[107px]' }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      <Image
        src={LOGO_URL}
        alt="Congo Commerce"
        style={{ position: 'absolute', ...CROP }}
      />
    </span>
  );
}
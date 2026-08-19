'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a permit's qrPayload exactly as-is — the same string a Field
 * Officer's phone would scan (see mobile/src/offline/verifyPermit.ts).
 * Client-side only: `qrcode`'s toDataURL works in the browser via canvas. */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', width: size, margin: 2 }).then(
      (url) => {
        if (!cancelled) setDataUrl(url);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded-md bg-gray-100"
      />
    );
  }

  // A data: URI generated client-side, not an external asset next/image
  // would have anything to optimize.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt="Permit QR code" width={size} height={size} className="rounded-md" />;
}

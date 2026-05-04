"use client";

import Image from "next/image";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

function isDataUrl(url: string): boolean {
  return url.startsWith("data:") || url.startsWith("blob:");
}

export function SafeImage({ src, alt, className, fill, width, height }: SafeImageProps) {
  if (isDataUrl(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes="(max-width: 768px) 100vw, 400px"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 400}
      height={height ?? 300}
      className={className}
    />
  );
}

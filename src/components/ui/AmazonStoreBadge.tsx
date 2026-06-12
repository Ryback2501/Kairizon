import type { JSX } from "react";
import { getAmazonDomainInfo } from "@/lib/amazon";

// viewBox "0 0 20 12" — 5:3 ratio, renders clearly at 14–20 px wide
const FLAGS: Record<string, () => JSX.Element> = {
  US: () => (
    <>
      <rect width="20" height="12" fill="#fff" />
      <rect y="0"     width="20" height="0.92" fill="#B22234" />
      <rect y="1.85"  width="20" height="0.92" fill="#B22234" />
      <rect y="3.69"  width="20" height="0.92" fill="#B22234" />
      <rect y="5.54"  width="20" height="0.92" fill="#B22234" />
      <rect y="7.38"  width="20" height="0.92" fill="#B22234" />
      <rect y="9.23"  width="20" height="0.92" fill="#B22234" />
      <rect y="11.08" width="20" height="0.92" fill="#B22234" />
      <rect width="8" height="6.46" fill="#3C3B6E" />
    </>
  ),
  GB: () => (
    <>
      <rect width="20" height="12" fill="#012169" />
      <path d="M0,0 L20,12 M20,0 L0,12" stroke="#fff" strokeWidth="3.5" />
      <path d="M0,0 L20,12 M20,0 L0,12" stroke="#C8102E" strokeWidth="2" />
      <rect x="8.5" y="0" width="3" height="12" fill="#fff" />
      <rect y="4.5" width="20" height="3" fill="#fff" />
      <rect x="9.25" y="0" width="1.5" height="12" fill="#C8102E" />
      <rect y="5.25" width="20" height="1.5" fill="#C8102E" />
    </>
  ),
  DE: () => (
    <>
      <rect width="20" height="4"  fill="#000" />
      <rect y="4" width="20" height="4"  fill="#DD0000" />
      <rect y="8" width="20" height="4"  fill="#FFCE00" />
    </>
  ),
  FR: () => (
    <>
      <rect width="20" height="12" fill="#ED2939" />
      <rect width="13.34" height="12" fill="#fff" />
      <rect width="6.67"  height="12" fill="#002395" />
    </>
  ),
  ES: () => (
    <>
      <rect width="20" height="12" fill="#AA151B" />
      <rect y="3" width="20" height="6" fill="#F1BF00" />
    </>
  ),
  IT: () => (
    <>
      <rect width="20" height="12" fill="#CE2B37" />
      <rect width="13.34" height="12" fill="#fff" />
      <rect width="6.67"  height="12" fill="#009246" />
    </>
  ),
  JP: () => (
    <>
      <rect width="20" height="12" fill="#fff" />
      <circle cx="10" cy="6" r="3.6" fill="#BC002D" />
    </>
  ),
  CA: () => (
    <>
      <rect width="20" height="12" fill="#FF0000" />
      <rect x="4" width="12" height="12" fill="#fff" />
      {/* Simplified 11-point maple leaf */}
      <polygon
        points="10,2.5 10.7,4.3 13,3.8 12,5.5 14,6 11.5,6.8 11,8.8 9,8.8 8.5,6.8 6,6 8,5.5 7,3.8 9.3,4.3"
        fill="#FF0000"
      />
      <rect x="9.6" y="8.8" width="0.8" height="1.2" fill="#FF0000" />
    </>
  ),
  AU: () => (
    <>
      <rect width="20" height="12" fill="#00247D" />
      {/* Union Jack (top-left quadrant) */}
      <path d="M0,0 L10,6 M10,0 L0,6" stroke="#fff" strokeWidth="2.5" />
      <path d="M0,0 L10,6 M10,0 L0,6" stroke="#CF142B" strokeWidth="1.5" />
      <rect x="4" y="0" width="2" height="6" fill="#fff" />
      <rect y="2.5" width="10" height="1" fill="#fff" />
      <rect x="4.5" y="0" width="1" height="6" fill="#CF142B" />
      <rect y="2.75" width="10" height="0.5" fill="#CF142B" />
      {/* Commonwealth star */}
      <circle cx="3" cy="9.5" r="1" fill="#fff" />
      {/* Southern Cross (4 large + 1 small) */}
      <circle cx="15.5" cy="3"   r="0.9" fill="#fff" />
      <circle cx="18"   cy="6"   r="0.9" fill="#fff" />
      <circle cx="15.5" cy="9"   r="0.9" fill="#fff" />
      <circle cx="13.5" cy="6.5" r="0.9" fill="#fff" />
      <circle cx="14.5" cy="4.5" r="0.5" fill="#fff" />
    </>
  ),
  BR: () => (
    <>
      <rect width="20" height="12" fill="#009C3B" />
      <polygon points="10,1.5 18.5,6 10,10.5 1.5,6" fill="#FFDF00" />
      <circle cx="10" cy="6" r="3" fill="#002776" />
      <path d="M7.2,7 A3,3 0 0 1 12.8,7" stroke="#fff" strokeWidth="0.6" fill="none" />
    </>
  ),
  MX: () => (
    <>
      <rect width="20" height="12" fill="#CE1126" />
      <rect width="13.34" height="12" fill="#fff" />
      <rect width="6.67"  height="12" fill="#006847" />
      {/* Simplified coat of arms — olive wreath outline */}
      <circle cx="10" cy="6" r="1.8" fill="none" stroke="#8B6914" strokeWidth="0.5" />
    </>
  ),
  NL: () => (
    <>
      <rect width="20" height="4"  fill="#AE1C28" />
      <rect y="4" width="20" height="4"  fill="#fff" />
      <rect y="8" width="20" height="4"  fill="#21468B" />
    </>
  ),
  PL: () => (
    <>
      <rect width="20" height="6"  fill="#fff" />
      <rect y="6" width="20" height="6"  fill="#DC143C" />
    </>
  ),
  SE: () => (
    <>
      <rect width="20" height="12" fill="#006AA7" />
      <rect x="6" width="3" height="12" fill="#FECC02" />
      <rect y="4.5" width="20" height="3" fill="#FECC02" />
    </>
  ),
  TR: () => (
    <>
      <rect width="20" height="12" fill="#E30A17" />
      <circle cx="7.5" cy="6" r="3"   fill="#fff" />
      <circle cx="8.8" cy="6" r="2.4" fill="#E30A17" />
      {/* 5-pointed star */}
      <polygon
        points="13,4 13.5,5.3 14.9,5.4 13.9,6.3 14.2,7.6 13,6.9 11.8,7.6 12.1,6.3 11.1,5.4 12.5,5.3"
        fill="#fff"
      />
    </>
  ),
  IN: () => (
    <>
      <rect width="20" height="4"  fill="#FF9933" />
      <rect y="4" width="20" height="4"  fill="#fff" />
      <rect y="8" width="20" height="4"  fill="#138808" />
      {/* Ashoka Chakra — blue circle outline */}
      <circle cx="10" cy="6" r="1.3" fill="none" stroke="#000080" strokeWidth="0.5" />
    </>
  ),
  SG: () => (
    <>
      <rect width="20" height="6"  fill="#EF3340" />
      <rect y="6" width="20" height="6"  fill="#fff" />
      {/* Crescent */}
      <circle cx="5"   cy="3" r="2"   fill="#fff" />
      <circle cx="6.2" cy="3" r="1.6" fill="#EF3340" />
      {/* 5 stars in pentagon, r=1.4 from centre (10,3) */}
      {([0, 72, 144, 216, 288] as const).map((deg, i) => {
        const rad = (deg - 90) * (Math.PI / 180);
        return (
          <circle
            key={i}
            cx={+(10 + 1.4 * Math.cos(rad)).toFixed(2)}
            cy={+(3  + 1.4 * Math.sin(rad)).toFixed(2)}
            r="0.45"
            fill="#fff"
          />
        );
      })}
    </>
  ),
  AE: () => (
    <>
      <rect width="20" height="4"  fill="#00732F" />
      <rect y="4" width="20" height="4"  fill="#fff" />
      <rect y="8" width="20" height="4"  fill="#000" />
      <rect width="4" height="12" fill="#FF0000" />
    </>
  ),
  SA: () => (
    <>
      <rect width="20" height="12" fill="#006C35" />
      {/* Simplified sword blade */}
      <rect x="3"   y="7.6" width="14" height="0.6" fill="#fff" />
      {/* Cross-guard */}
      <rect x="4.5" y="6.5" width="0.6" height="2.5" fill="#fff" />
    </>
  ),
  BE: () => (
    <>
      <rect width="20" height="12" fill="#EF3340" />
      <rect width="13.34" height="12" fill="#FFE000" />
      <rect width="6.67"  height="12" fill="#000" />
    </>
  ),
};

interface AmazonStoreBadgeProps {
  url: string;
}

export function AmazonStoreBadge({ url }: AmazonStoreBadgeProps) {
  const { countryCode } = getAmazonDomainInfo(url);

  let domain: string;
  let origin: string;
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, "");
    origin = parsed.origin;
  } catch {
    return null;
  }

  const FlagContent = FLAGS[countryCode];

  return (
    <a
      href={origin}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-[10px] text-brand-gray hover:text-brand-ink transition-colors"
      title={`Open ${domain}`}
    >
      {FlagContent && (
        <svg
          viewBox="0 0 20 12"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-auto shrink-0 rounded-[1px]"
          aria-hidden="true"
        >
          <FlagContent />
        </svg>
      )}
      <span className="truncate">{domain}</span>
    </a>
  );
}

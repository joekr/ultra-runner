// components/Icons.tsx — SVG icons for the game
import { type VNode } from "preact";

interface IconProps {
  size?: number;
  color?: string;
}

export function RunnerIcon({ size = 48, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="36" cy="12" r="6" fill={color} />
      <path d="M24 22L32 18L40 24L36 36L42 44L38 52" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M32 18L26 28L18 32" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M36 36L28 42L22 52" stroke={color} stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M38 52L44 54" stroke={color} stroke-width="3" stroke-linecap="round" />
      <path d="M22 52L16 54" stroke={color} stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

export function ShoeIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 22C4 22 6 14 10 12C14 10 16 14 20 14C24 14 28 12 28 16V22C28 24 26 26 24 26H8C6 26 4 24 4 22Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M10 22H14" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M18 22H22" stroke={color} stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

export function ShirtIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L8 8L4 6V14L8 12V28H24V12L28 14V6L24 8L20 4H12Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function WatchIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="16" height="20" rx="4" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <circle cx="16" cy="16" r="5" stroke={color} stroke-width="1.5" />
      <path d="M16 13V16L18 18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M12 6V3H20V6" stroke={color} stroke-width="1.5" />
      <path d="M12 26V29H20V26" stroke={color} stroke-width="1.5" />
    </svg>
  );
}

export function TrophyIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4H22V14C22 17.3137 19.3137 20 16 20C12.6863 20 10 17.3137 10 14V4Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <path d="M10 8H6C6 12 8 14 10 14" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M22 8H26C26 12 24 14 22 14" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M16 20V24" stroke={color} stroke-width="2" />
      <path d="M12 24H20V26H12V24Z" fill={color} opacity="0.3" stroke={color} stroke-width="1.5" />
    </svg>
  );
}

export function MedalIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L16 12L20 4" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="16" cy="20" r="8" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <text x="16" y="24" text-anchor="middle" font-size="10" font-weight="bold" fill={color}>1</text>
    </svg>
  );
}

export function HeartRateIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 16H10L13 8L16 24L19 12L22 16H28" stroke={color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function MountainIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 26L12 8L18 18L22 12L28 26H4Z" fill={color} opacity="0.15" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

// Gear item icons — Shoes

export function BasicTrainerIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 21C5 21 7 14 11 12C14 10.5 16 13 20 13C24 13 27 12 27 15V21C27 23 25 25 23 25H9C7 25 5 23 5 21Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function CushionedShoeIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20C5 20 7 13 11 11C14 9.5 16 12 20 12C24 12 27 11 27 14V20C27 22 25 24 23 24H9C7 24 5 22 5 20Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M5 24H27" stroke={color} stroke-width="2.5" stroke-linecap="round" />
      <path d="M7 27H25" stroke={color} stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

export function TrailShoeIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20C5 20 7 13 11 11C14 9.5 16 12 20 12C24 12 27 11 27 14V20C27 22 25 24 23 24H9C7 24 5 22 5 20Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M7 25L9 27" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M12 25L14 27" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M17 25L19 27" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M22 25L24 27" stroke={color} stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

export function CarbonRacerIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 22C4 22 6 16 10 15C13 14 15 16 20 16C25 16 28 15 28 18V22C28 23 27 24 26 24H6C5 24 4 23 4 22Z" fill={color} opacity="0.2" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8 20L24 19" stroke={color} stroke-width="1" stroke-linecap="round" stroke-dasharray="2 2" />
    </svg>
  );
}

export function PremiumTrailIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 19C4 19 6 11 11 9C15 7.5 17 11 21 11C25 11 28 10 28 14V19C28 21 26 23 24 23H8C6 23 4 21 4 19Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 21H26" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M6 25L8 23" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M11 25L13 23" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M16 25L18 23" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M21 25L23 23" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M26 25L28 23" stroke={color} stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

export function UltraCushionIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 18C5 18 7 12 11 10C14 8.5 16 11 20 11C24 11 27 10 27 13V18C27 19 26 20 25 20H7C6 20 5 19 5 18Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="5" y="20" width="22" height="4" rx="2" fill={color} opacity="0.15" stroke={color} stroke-width="2" />
      <rect x="4" y="24" width="24" height="4" rx="2" fill={color} opacity="0.1" stroke={color} stroke-width="2" />
    </svg>
  );
}

// Gear item icons — Apparel

export function CottonTeeIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4L7 8L3 6V14L7 12V28H25V12L29 14V6L25 8L21 4H11Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function TechTeeIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L8 8L4 6V14L8 12V28H24V12L28 14V6L24 8L20 4H12Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 14L16 16L20 14" stroke={color} stroke-width="1" stroke-linecap="round" stroke-dasharray="2 2" />
    </svg>
  );
}

export function BasketballShortsIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8H26V16L22 26H18L16 18L14 26H10L6 16V8Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 8H26" stroke={color} stroke-width="2.5" stroke-linecap="round" />
      <path d="M14 8V14" stroke={color} stroke-width="1" stroke-linecap="round" stroke-dasharray="2 2" />
    </svg>
  );
}

export function SplitShortsIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 8H24V14L20 24H18L16 16L14 24H12L8 14V8Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8 8H24" stroke={color} stroke-width="2.5" stroke-linecap="round" />
    </svg>
  );
}

export function RacingSingletIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L10 8V28H22V8L20 4H12Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 4C12 4 10 6 10 8" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M20 4C20 4 22 6 22 8" stroke={color} stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

export function RainJacketIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 6L8 10L4 8V16L8 14V28H24V14L28 16V8L24 10L20 6H12Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M13 2C13 2 12 4 12 6H20C20 4 19 2 19 2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="14" cy="2" r="2" fill={color} opacity="0.3" />
      <circle cx="18" cy="2" r="2" fill={color} opacity="0.3" />
      <path d="M14 1H18" stroke={color} stroke-width="3" stroke-linecap="round" />
    </svg>
  );
}

export function SunHatIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 18C8 12 11 8 16 8C21 8 24 12 24 18" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M8 18H24" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M4 20C4 20 8 18 16 18C24 18 28 20 28 20" stroke={color} stroke-width="2.5" stroke-linecap="round" />
      <path d="M24 20L28 22" stroke={color} stroke-width="2" stroke-linecap="round" />
    </svg>
  );
}

export function CompressionSocksIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4V20C12 22 10 26 10 26C10 28 12 28 14 28H18C20 28 20 26 20 26L18 20V4H12Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 8H18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M12 12H18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M12 16H18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

export function RunningSocksIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12V20C12 22 10 26 10 26C10 28 12 28 14 28H18C20 28 20 26 20 26L18 20V12H12Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 14H18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

// Gear item icons — Accessories

export function GpsWatchBasicIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="16" height="20" rx="4" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <circle cx="16" cy="16" r="5" stroke={color} stroke-width="1.5" />
      <path d="M16 13V16L18 18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M12 6V3H20V6" stroke={color} stroke-width="1.5" />
      <path d="M12 26V29H20V26" stroke={color} stroke-width="1.5" />
    </svg>
  );
}

export function GpsWatchAdvancedIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="5" width="18" height="22" rx="4" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <rect x="10" y="10" width="12" height="12" rx="1" stroke={color} stroke-width="1.5" />
      <path d="M12 14H20" stroke={color} stroke-width="1" stroke-linecap="round" />
      <path d="M12 17H18" stroke={color} stroke-width="1" stroke-linecap="round" />
      <path d="M12 20H16" stroke={color} stroke-width="1" stroke-linecap="round" />
      <path d="M12 5V2H20V5" stroke={color} stroke-width="1.5" />
      <path d="M12 27V30H20V27" stroke={color} stroke-width="1.5" />
      <circle cx="24" cy="8" r="2" fill={color} opacity="0.4" />
    </svg>
  );
}

export function FoamRollerIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="6" cy="16" rx="3" ry="6" fill={color} opacity="0.15" stroke={color} stroke-width="2" />
      <rect x="6" y="10" width="20" height="12" rx="1" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <ellipse cx="26" cy="16" rx="3" ry="6" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <path d="M10 12V20" stroke={color} stroke-width="1" stroke-linecap="round" />
      <path d="M14 12V20" stroke={color} stroke-width="1" stroke-linecap="round" />
      <path d="M18 12V20" stroke={color} stroke-width="1" stroke-linecap="round" />
      <path d="M22 12V20" stroke={color} stroke-width="1" stroke-linecap="round" />
    </svg>
  );
}

export function MassageGunIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="16" height="8" rx="3" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <path d="M20 14H26" stroke={color} stroke-width="3" stroke-linecap="round" />
      <circle cx="27" cy="14" r="2" fill={color} opacity="0.3" stroke={color} stroke-width="1.5" />
      <rect x="10" y="18" width="6" height="10" rx="2" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
    </svg>
  );
}

export function HeadlampIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 16C6 11 10 8 16 8C22 8 26 11 26 16" stroke={color} stroke-width="2.5" stroke-linecap="round" />
      <rect x="12" y="12" width="8" height="6" rx="2" fill={color} opacity="0.3" stroke={color} stroke-width="2" />
      <path d="M14 18L10 26" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
      <path d="M16 18L16 27" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
      <path d="M18 18L22 26" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
    </svg>
  );
}

// Gear icon mapping
export function getGearIcon(templateId: string, size?: number, color?: string): VNode | null {
  const s = size ?? 32;
  const c = color ?? "currentColor";
  switch (templateId) {
    // Shoes
    case "basic_trainers": return <BasicTrainerIcon size={s} color={c} />;
    case "cushioned_road": return <CushionedShoeIcon size={s} color={c} />;
    case "trail_shoes": return <TrailShoeIcon size={s} color={c} />;
    case "carbon_racer": return <CarbonRacerIcon size={s} color={c} />;
    case "premium_trail": return <PremiumTrailIcon size={s} color={c} />;
    case "ultra_cushion": return <UltraCushionIcon size={s} color={c} />;
    // Apparel
    case "cotton_tee": return <CottonTeeIcon size={s} color={c} />;
    case "tech_tee": return <TechTeeIcon size={s} color={c} />;
    case "basketball_shorts": return <BasketballShortsIcon size={s} color={c} />;
    case "split_shorts": return <SplitShortsIcon size={s} color={c} />;
    case "racing_singlet": return <RacingSingletIcon size={s} color={c} />;
    case "rain_jacket": return <RainJacketIcon size={s} color={c} />;
    case "sun_hat": return <SunHatIcon size={s} color={c} />;
    case "compression_socks": return <CompressionSocksIcon size={s} color={c} />;
    case "running_socks": return <RunningSocksIcon size={s} color={c} />;
    case "elite_singlet": return <RacingSingletIcon size={s} color={c} />;
    case "compression_tights": return <SplitShortsIcon size={s} color={c} />;
    // Shoes (high tier)
    case "elite_trainer": return <CushionedShoeIcon size={s} color={c} />;
    case "super_shoe": return <CarbonRacerIcon size={s} color={c} />;
    // Accessories
    case "gps_watch_basic": return <GpsWatchBasicIcon size={s} color={c} />;
    case "gps_watch_advanced": return <GpsWatchAdvancedIcon size={s} color={c} />;
    case "foam_roller": return <FoamRollerIcon size={s} color={c} />;
    case "massage_gun": return <MassageGunIcon size={s} color={c} />;
    case "headlamp_basic": return <HeadlampIcon size={s} color={c} />;
    case "recovery_boots": return <CompressionSocksIcon size={s} color={c} />;
    case "heart_rate_monitor": return <GpsWatchBasicIcon size={s} color={c} />;
    case "hydration_vest": return <ShirtIcon size={s} color={c} />;
    default: return null;
  }
}

// Consumable icons

export function GelPacketIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4H20L22 8V24C22 26 20 28 18 28H14C12 28 10 26 10 24V8L12 4Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M10 12H22" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M14 16L16 20L18 16" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function ChewsIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="14" r="4" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <circle cx="20" cy="14" r="4" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
      <circle cx="15" cy="22" r="4" fill={color} opacity="0.2" stroke={color} stroke-width="2" />
    </svg>
  );
}

export function FoodIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="20" height="12" rx="2" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 16H26" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M6 13H26" stroke={color} stroke-width="1" stroke-linecap="round" opacity="0.4" />
      <path d="M6 19H26" stroke={color} stroke-width="1" stroke-linecap="round" opacity="0.4" />
    </svg>
  );
}

export function DrinkIcon({ size = 32, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4H20V8L18 10V26C18 27 17 28 16 28C15 28 14 27 14 26V10L12 8V4Z" fill={color} opacity="0.2" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M12 4H20" stroke={color} stroke-width="2.5" stroke-linecap="round" />
      <path d="M14 16H18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <path d="M14 20H18" stroke={color} stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

export function getConsumableIcon(templateId: string, size?: number, color?: string): VNode | null {
  const s = size ?? 32;
  const c = color ?? "currentColor";
  switch (templateId) {
    case "basic_gel":
    case "caffeinated_gel":
    case "premium_gel":
      return <GelPacketIcon size={s} color={c} />;
    case "energy_chews":
    case "electrolyte_gummies":
      return <ChewsIcon size={s} color={c} />;
    case "stroopwafel":
    case "snack_bar":
    case "peanut_butter_sandwich":
    case "boiled_potato":
      return <FoodIcon size={s} color={c} />;
    case "electrolyte_mix":
    case "recovery_drink":
      return <DrinkIcon size={s} color={c} />;
    default:
      return null;
  }
}

// Workout type icons
export function EasyRunIcon({ size = 24, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="5" r="2.5" fill={color} />
      <path d="M10 10L13 8L17 11L15 17L18 21" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M13 8L9 12L6 14" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M15 17L11 19L8 23" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function IntervalsIcon({ size = 24, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 18L6 6L9 14L12 4L15 16L18 8L21 18" stroke={color} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function RestIcon({ size = 24, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3C7 3 4 7 4 12C4 17 8 21 12 21C17 21 21 17 21 12" stroke={color} stroke-width="2" stroke-linecap="round" />
      <path d="M16 3C14 5 14 9 16 11C18 13 22 13 24 11" stroke={color} stroke-width="1.5" stroke-linecap="round" />
      <text x="10" y="15" font-size="7" fill={color}>z</text>
      <text x="14" y="12" font-size="5" fill={color}>z</text>
    </svg>
  );
}

// components/TrailMap.tsx — SVG trail map showing runner progress along a path

interface TrailMapProps {
  progress: number;          // 0-1, how far along the trail
  terrain?: string;          // "flat_road" | "rolling_hills" | "steep_climb" etc
  segments?: number;         // total segments (for races)
  currentSegment?: number;   // current segment index (for races)
  aidStations?: number[];    // segment indices that have aid stations
  height?: number;           // SVG height, default 120
  showRunner?: boolean;      // default true
}

// Trail path definitions per terrain — hand-drawn-looking SVG paths
// viewBox is 400x120; paths wind left to right
const TRAIL_PATHS: Record<string, string> = {
  flat_road:
    "M 10,80 C 40,78 60,82 100,80 S 160,76 200,78 S 260,82 300,80 S 360,76 390,78",
  rolling_hills:
    "M 10,90 C 40,70 60,50 100,55 S 140,85 180,75 S 220,40 260,55 S 300,90 340,70 S 370,50 390,60",
  steep_climb:
    "M 10,105 C 40,100 70,95 100,85 S 140,70 170,55 S 200,40 240,30 S 280,25 320,22 S 360,18 390,15",
  default:
    "M 10,85 C 50,80 80,75 120,78 S 180,85 220,76 S 280,70 330,78 S 370,82 390,80",
};

// Background scenery elements per terrain
function BackgroundScenery({ terrain }: { terrain: string }) {
  switch (terrain) {
    case "flat_road":
      // City building silhouettes
      return (
        <g opacity="0.12">
          <rect x="30" y="30" width="18" height="45" rx="1" fill="currentColor" />
          <rect x="55" y="40" width="12" height="35" rx="1" fill="currentColor" />
          <rect x="75" y="25" width="15" height="50" rx="1" fill="currentColor" />
          <rect x="140" y="35" width="20" height="40" rx="1" fill="currentColor" />
          <rect x="170" y="45" width="10" height="30" rx="1" fill="currentColor" />
          <rect x="250" y="30" width="14" height="45" rx="1" fill="currentColor" />
          <rect x="280" y="40" width="18" height="35" rx="1" fill="currentColor" />
          <rect x="330" y="38" width="12" height="37" rx="1" fill="currentColor" />
          <rect x="360" y="28" width="16" height="47" rx="1" fill="currentColor" />
        </g>
      );
    case "rolling_hills":
      // Tree silhouettes
      return (
        <g opacity="0.15">
          <polygon points="50,45 55,20 60,45" fill="currentColor" />
          <polygon points="48,50 55,30 62,50" fill="currentColor" />
          <polygon points="120,60 126,32 132,60" fill="currentColor" />
          <polygon points="118,65 126,42 134,65" fill="currentColor" />
          <polygon points="210,38 216,10 222,38" fill="currentColor" />
          <polygon points="208,44 216,20 224,44" fill="currentColor" />
          <polygon points="290,55 295,28 300,55" fill="currentColor" />
          <polygon points="288,60 295,38 302,60" fill="currentColor" />
          <polygon points="355,42 360,18 365,42" fill="currentColor" />
          <polygon points="353,48 360,26 367,48" fill="currentColor" />
        </g>
      );
    case "steep_climb":
      // Mountain peaks in background
      return (
        <g opacity="0.12">
          <polygon points="40,105 80,15 120,105" fill="currentColor" />
          <polygon points="100,105 150,8 200,105" fill="currentColor" />
          <polygon points="180,105 230,5 280,105" fill="currentColor" />
          <polygon points="260,105 310,10 360,105" fill="currentColor" />
          <polygon points="320,105 365,20 400,105" fill="currentColor" />
        </g>
      );
    default:
      return (
        <g opacity="0.1">
          <polygon points="60,55 68,25 76,55" fill="currentColor" />
          <polygon points="180,50 188,22 196,50" fill="currentColor" />
          <polygon points="310,52 317,28 324,52" fill="currentColor" />
        </g>
      );
  }
}

// Get terrain-specific colors
function getTerrainColors(terrain: string) {
  switch (terrain) {
    case "flat_road":
      return {
        trailDone: "#8a8a8a",
        trailAhead: "#c8c8c8",
        bg: "rgba(140, 140, 140, 0.06)",
        sceneryColor: "#6b6b6b",
      };
    case "rolling_hills":
      return {
        trailDone: "#6b8c5a",
        trailAhead: "#b5c7a8",
        bg: "rgba(107, 140, 90, 0.08)",
        sceneryColor: "#5a7a4a",
      };
    case "steep_climb":
      return {
        trailDone: "#5a5a6a",
        trailAhead: "#9a9aaa",
        bg: "rgba(90, 90, 106, 0.08)",
        sceneryColor: "#4a4a5a",
      };
    default:
      return {
        trailDone: "#8a7a6a",
        trailAhead: "#c8baa8",
        bg: "rgba(138, 122, 106, 0.06)",
        sceneryColor: "#7a6a5a",
      };
  }
}

// Compute a point along an SVG path at a given fraction (0-1)
// We use a hidden <path> element and getPointAtLength for accuracy,
// but since we're in SSR-compatible Preact, we'll approximate with
// a simple linear interpolation along sampled points.
function getPointOnPath(pathD: string, t: number): { x: number; y: number } {
  // Parse the path to extract control points and interpolate
  // For simplicity, sample the cubic bezier path at the given t
  // We'll parse the key points from our known path formats

  const clampedT = Math.max(0, Math.min(1, t));

  // Extract numeric coordinates from the path
  const nums = pathD.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  // Build point pairs
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nums.length; i += 2) {
    if (i + 1 < nums.length) {
      points.push({ x: nums[i], y: nums[i + 1] });
    }
  }

  if (points.length < 2) return { x: 10, y: 80 };

  // Linear interpolation through the extracted points
  const segCount = points.length - 1;
  const rawIdx = clampedT * segCount;
  const idx = Math.floor(rawIdx);
  const frac = rawIdx - idx;

  if (idx >= segCount) return points[points.length - 1];

  const p0 = points[idx];
  const p1 = points[idx + 1];
  return {
    x: p0.x + (p1.x - p0.x) * frac,
    y: p0.y + (p1.y - p0.y) * frac,
  };
}

export function TrailMap({
  progress,
  terrain = "default",
  segments,
  currentSegment,
  aidStations,
  height = 120,
  showRunner = true,
}: TrailMapProps) {
  const pathD = TRAIL_PATHS[terrain] ?? TRAIL_PATHS.default;
  const colors = getTerrainColors(terrain);
  const runnerPos = getPointOnPath(pathD, progress);

  return (
    <div
      class="trail-map"
      style={{ background: colors.bg, height: `${height}px` }}
    >
      <svg
        viewBox="0 0 400 120"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ color: colors.sceneryColor }}
      >
        {/* Background scenery */}
        <BackgroundScenery terrain={terrain} />

        {/* Trail ahead (dimmed) */}
        <path
          d={pathD}
          fill="none"
          stroke={colors.trailAhead}
          stroke-width="6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        {/* Trail completed (highlighted) — clip to runner position */}
        <defs>
          <clipPath id="trail-done-clip">
            <rect x="0" y="0" width={runnerPos.x} height="120" />
          </clipPath>
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke={colors.trailDone}
          stroke-width="6"
          stroke-linecap="round"
          stroke-linejoin="round"
          clip-path="url(#trail-done-clip)"
        />

        {/* Segment markers for races */}
        {segments != null && segments > 0 && (
          <g>
            {Array.from({ length: segments + 1 }).map((_, i) => {
              // skip start (0) and end markers
              if (i === 0 || i === segments) return null;
              const t = i / segments;
              const pt = getPointOnPath(pathD, t);
              const isAid = aidStations?.includes(i);
              const isDone = currentSegment != null && i <= currentSegment;
              return (
                <g key={i}>
                  {/* Segment dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={3}
                    fill={isDone ? "#fff" : "rgba(255,255,255,0.7)"}
                    stroke={isDone ? colors.trailDone : colors.trailAhead}
                    stroke-width="1.5"
                  />
                  {/* Aid station marker */}
                  {isAid && (
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      text-anchor="middle"
                      font-size="12"
                      font-weight="bold"
                      fill="var(--color-sage, #6b8c5a)"
                    >
                      +
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Start marker */}
        <circle
          cx={getPointOnPath(pathD, 0).x}
          cy={getPointOnPath(pathD, 0).y}
          r="4"
          fill={colors.trailDone}
          stroke="#fff"
          stroke-width="1.5"
        />

        {/* Finish marker */}
        <g>
          {(() => {
            const fp = getPointOnPath(pathD, 1);
            return (
              <>
                <rect
                  x={fp.x - 4}
                  y={fp.y - 16}
                  width="3"
                  height="16"
                  fill={colors.trailDone}
                  rx="1"
                />
                <rect
                  x={fp.x - 4}
                  y={fp.y - 16}
                  width="10"
                  height="7"
                  fill={colors.trailDone}
                  opacity="0.6"
                  rx="1"
                />
              </>
            );
          })()}
        </g>

        {/* Runner dot */}
        {showRunner && (
          <circle
            class="trail-map__runner"
            cx={runnerPos.x}
            cy={runnerPos.y}
            r="6"
            fill="var(--color-terracotta, #c2703e)"
            stroke="#fff"
            stroke-width="2"
          />
        )}
      </svg>
    </div>
  );
}

// components/AchievementToast.tsx — Toast notification for earned achievements

import { useEffect, useState, useRef } from "preact/hooks";
import {
  pendingAchievements,
  dismissAchievementNotification,
} from "../state/achievementNotifications";
import type { AchievementNotification } from "../state/achievementNotifications";

const DISPLAY_DURATION = 3000;
const ANIMATION_DURATION = 300;

export function AchievementToast() {
  const queue = pendingAchievements.value;
  const [showing, setShowing] = useState<AchievementNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    // Only pick up a new toast if we're not currently showing one
    if (queue.length === 0 || processingRef.current) return;

    processingRef.current = true;
    const item = queue[0];
    setShowing(item);

    // Slide in
    const slideInTimer = requestAnimationFrame(() => setVisible(true));

    // After display duration, slide out
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      // After slide-out animation, clean up and allow next
      setTimeout(() => {
        setShowing(null);
        processingRef.current = false;
        dismissAchievementNotification();
      }, ANIMATION_DURATION);
    }, DISPLAY_DURATION);

    return () => {
      cancelAnimationFrame(slideInTimer);
      clearTimeout(dismissTimer);
    };
  }, [queue.length, queue[0]?.id]);

  if (!showing) return null;

  return (
    <div
      onClick={() => {
        // Allow tap to dismiss early
        setVisible(false);
        setTimeout(() => {
          setShowing(null);
          processingRef.current = false;
          dismissAchievementNotification();
        }, ANIMATION_DURATION);
      }}
      style={{
        position: "fixed",
        top: "env(safe-area-inset-top, 0)",
        left: "50%",
        transform: visible
          ? "translate(-50%, 12px)"
          : "translate(-50%, -100%)",
        transition: `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out`,
        opacity: visible ? 1 : 0,
        zIndex: 9999,
        width: "calc(100% - 32px)",
        maxWidth: "400px",
        background: "linear-gradient(135deg, var(--color-terracotta), #c0392b)",
        color: "#fff",
        borderRadius: "var(--radius-md, 12px)",
        padding: "12px 16px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ fontSize: "24px", lineHeight: 1, flexShrink: 0 }}>
          {"\u2605"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "var(--text-xs, 11px)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              opacity: 0.8,
              marginBottom: "2px",
            }}
          >
            Achievement Unlocked
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "var(--text-base, 15px)",
              lineHeight: 1.2,
            }}
          >
            {showing.name}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs, 11px)",
              opacity: 0.85,
              marginTop: "2px",
              lineHeight: 1.3,
            }}
          >
            {showing.description}
          </div>
        </div>
      </div>
    </div>
  );
}

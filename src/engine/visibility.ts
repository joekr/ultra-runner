/**
 * Visibility change handler.
 *
 * Pauses the game loop and saves when the tab is hidden,
 * computes idle gains and restarts when the tab becomes visible again.
 */

/**
 * Sets up listeners for document visibility changes.
 * @param onHide - Called when the tab becomes hidden (stop loop, save)
 * @param onShow - Called when the tab becomes visible (compute idle, restart)
 * @returns A cleanup function that removes the listener.
 */
export function setupVisibilityHandler(
  onHide: () => void,
  onShow: () => void,
): () => void {
  function handleVisibilityChange(): void {
    if (document.hidden) {
      onHide();
    } else {
      onShow();
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

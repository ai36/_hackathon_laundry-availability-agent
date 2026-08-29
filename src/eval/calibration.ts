/**
 * Maps an evaluation frame to the calibrated camera that owns it (D-0015).
 *
 * The frame's label carries a `camera` field; `data/site-config.json` holds that camera's
 * declared machine ids, its annotated "spatial key" still, and its analysis mask. The
 * calibrated eval (`--mode=calibrated`) classifies only the camera's machines, using those
 * two images as extra references. Unlike the portal, the eval reads the **committed**
 * `data/site-config.json` — `npm run eval` reproduces from a clean checkout (portal edits
 * land in `data/config-overrides.json` / `data/reservations.json`, not here).
 */
import { loadFrameLabels } from "./dataset";
import { loadSiteConfig, type Camera } from "./site-config";

/** The camera a frame belongs to, or `null` if the label has no `camera` or it is unknown. */
export function cameraForFrame(
  frameId: string,
  cameras: Camera[] = loadSiteConfig().cameras,
  labels = loadFrameLabels(),
): Camera | null {
  const id = labels.get(frameId)?.camera?.trim();
  if (!id) return null;
  return cameras.find((c) => c.id === id) ?? null;
}

/**
 * Site config (`data/site-config.json`) — the cameras an integrator declares (D-0015).
 * Read/write helpers shared by `/api/cameras` and `/api/upload`. Committed (small,
 * human-authored). Uploaded images live under `data/site-config/<owner>/`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "@/config";

export const SITE_ID_RE = /^[A-Za-z0-9_-]+$/;

export interface Camera {
  id: string;
  /** Free-text-entered machine ids this camera observes (D-0015). */
  machineIds: string[];
  /** A static image used as this camera's feed for testing (D-0016 StaticImageFrameSource). */
  stubImage?: string;
  /** A still with machine ids drawn on it — the spatial key for the agent (D-0015). */
  annotatedShot?: string;
  /**
   * An analysis mask (D-0015): a transparent image where opaque black `rgb(0,0,0)` regions
   * cover parts of the frame the agent should ignore. Stored here; runtime application is
   * pending (D-0016).
   */
  mask?: string;
}

export interface SiteConfig {
  cameras: Camera[];
}

function siteConfigPath(): string {
  return join(config.paths.dataset, "site-config.json");
}

export function loadSiteConfig(path = siteConfigPath()): SiteConfig {
  if (!existsSync(path)) return { cameras: [] };
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<SiteConfig>;
  return { cameras: Array.isArray(raw.cameras) ? raw.cameras : [] };
}

export function writeSiteConfig(cfg: SiteConfig, path = siteConfigPath()): SiteConfig {
  const seen = new Set<string>();
  for (const cam of cfg.cameras) {
    if (!SITE_ID_RE.test(cam.id)) throw new Error(`camera id "${cam.id}" must match ${SITE_ID_RE}`);
    if (seen.has(cam.id)) throw new Error(`duplicate camera id "${cam.id}"`);
    seen.add(cam.id);
    for (const mid of cam.machineIds) {
      if (!SITE_ID_RE.test(mid))
        throw new Error(`camera ${cam.id}: machine id "${mid}" is invalid`);
    }
  }
  const cameras = [...cfg.cameras].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
  const out = { cameras };
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
  return out;
}

/** Parse a free-text "W-01, W-02 W-03" list into clean ids. */
export function parseMachineIds(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export function upsertCamera(cfg: SiteConfig, cam: Camera & { targetId?: string }): SiteConfig {
  const targetId = cam.targetId ?? cam.id;
  const idx = cfg.cameras.findIndex((c) => c.id === targetId);
  const cameras = [...cfg.cameras];
  const next: Camera = {
    id: cam.id,
    machineIds: cam.machineIds,
    stubImage: cam.stubImage,
    annotatedShot: cam.annotatedShot,
    mask: cam.mask,
  };
  if (idx === -1) cameras.push(next);
  else cameras[idx] = { ...cameras[idx], ...next };
  return { cameras };
}

export function removeCamera(cfg: SiteConfig, id: string): SiteConfig {
  return { cameras: cfg.cameras.filter((c) => c.id !== id) };
}

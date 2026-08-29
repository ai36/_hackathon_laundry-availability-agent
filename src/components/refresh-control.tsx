"use client";

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/stores";

type RefreshResult = {
  ok?: boolean;
  error?: string;
  room?: unknown;
  live?: boolean;
  capture?: { camera: string; feed: string | null; classified: number; error?: string }[];
  ranAt?: string;
  note?: string;
};

/**
 * Manual + auto "refresh recognition". Each run POSTs /api/refresh, which captures each
 * camera's feed and (with a key) runs the agent, then re-fuses. Auto = a client interval at
 * the configured period (runtime.stateRefreshSeconds) — the browser stand-in for the D-0016
 * container's cron.
 */
export const RefreshControl = observer(function RefreshControl() {
  const { machines } = useStore();
  const period = machines.refreshSeconds;

  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [last, setLast] = useState<RefreshResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycles = useRef(0);

  // Hard cap on unattended auto-refresh — bounds cost when a key + camera feeds are present.
  const MAX_AUTO = 60;

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = (await res.json()) as RefreshResult;
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      machines.applyRoom(data.room as Parameters<typeof machines.applyRoom>[0]);
      setLast(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "refresh failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (auto) {
      cycles.current = 0;
      timer.current = setInterval(
        () => {
          cycles.current += 1;
          if (cycles.current > MAX_AUTO) {
            setAuto(false);
            setErr(`auto-refresh stopped after ${MAX_AUTO} cycles — toggle again to resume`);
            return;
          }
          void run();
        },
        Math.max(5, period) * 1000,
      );
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // run is stable enough for this demo; re-arm on auto / period change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, period]);

  const captured = last?.capture?.filter((c) => c.feed).length ?? 0;
  const classified = last?.capture?.reduce((n, c) => n + c.classified, 0) ?? 0;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={run} disabled={busy}>
          <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
          {busy ? "refreshing…" : "refresh recognition"}
        </Button>
        <label className="text-on-surface-variant flex items-center gap-1.5 text-[13px]">
          <Switch checked={auto} onCheckedChange={setAuto} />
          auto · every {period}s
        </label>
      </div>
      {err && <span className="text-error text-[13px] break-words">{err}</span>}
      {last && !err && (
        <span className="text-outline text-[13px] break-words">
          {captured} camera{captured === 1 ? "" : "s"} captured
          {last.live ? `, ${classified} machine reads (live)` : ""}
          {last.note ? ` — ${last.note}` : ""}
        </span>
      )}
    </div>
  );
});

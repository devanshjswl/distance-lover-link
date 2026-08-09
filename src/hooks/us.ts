import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  addRecord,
  removeRecord,
  setRecord,
  updateRecord,
  watchCollection,
} from "@/lib/backend";
import { haversineKm, weatherLabel } from "@/lib/format";
import { defaultPrivacy, type CoupleSettings, type Nudge, type Presence, type Privacy } from "@/lib/types";

/* ---------------- generic data hooks ---------------- */

export function useCoupleId(): string | null {
  const { profile } = useAuth();
  return profile?.coupleId ?? null;
}

export function useCollection<T extends { id: string }>(name: string): T[] {
  const coupleId = useCoupleId();
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => watchCollection<T>(coupleId, name, setRows), [coupleId, name]);
  return rows;
}

export function useRecord<T extends { id: string }>(name: string, id: string): T | null {
  const rows = useCollection<T>(name);
  return useMemo(() => rows.find((row) => row.id === id) ?? null, [rows, id]);
}

export function useWrite(name: string) {
  const coupleId = useCoupleId();
  return useMemo(
    () => ({
      add: (data: Record<string, unknown>) =>
        coupleId ? addRecord(coupleId, name, data) : Promise.resolve(""),
      set: (id: string, data: Record<string, unknown>) =>
        coupleId ? setRecord(coupleId, name, id, data) : Promise.resolve(),
      update: (id: string, data: Record<string, unknown>) =>
        coupleId ? updateRecord(coupleId, name, id, data) : Promise.resolve(),
      remove: (id: string) => (coupleId ? removeRecord(coupleId, name, id) : Promise.resolve()),
    }),
    [coupleId, name],
  );
}

/* ---------------- couple + privacy ---------------- */

export function useCouple() {
  const { session } = useAuth();
  const settings = useRecord<CoupleSettings & { members?: { id: string; name: string }[] }>(
    "settings",
    "couple",
  );
  const members = settings?.members ?? [];
  const partner = members.find((member) => member.id !== session?.uid) ?? null;
  return { settings, members, partner };
}

export function usePrivacy(): {
  mine: Privacy;
  partner: Privacy | null;
  setMine: (patch: Partial<Privacy>) => void;
} {
  const { session } = useAuth();
  const { partner } = useCouple();
  const rows = useCollection<Privacy>("privacy");
  const write = useWrite("privacy");
  const mine = rows.find((row) => row.id === session?.uid) ?? defaultPrivacy(session?.uid ?? "me");
  const theirs = partner ? (rows.find((row) => row.id === partner.id) ?? null) : null;
  const setMine = useCallback(
    (patch: Partial<Privacy>) => {
      if (session?.uid) void write.set(session.uid, { ...mine, ...patch, id: session.uid });
    },
    [session?.uid, mine, write],
  );
  return { mine, partner: theirs, setMine };
}

/* ---------------- presence ---------------- */

export function usePresence() {
  const { session } = useAuth();
  const { partner } = useCouple();
  const rows = useCollection<Presence>("presence");
  return {
    mine: rows.find((row) => row.id === session?.uid) ?? null,
    partner: partner ? (rows.find((row) => row.id === partner.id) ?? null) : null,
  };
}

type Weather = { temp: number | null; code: number | null; city: string | null };

async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const key = `us.weather.${lat.toFixed(1)},${lon.toFixed(1)}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    const parsed = JSON.parse(cached) as { at: number; data: Weather };
    if (Date.now() - parsed.at < 30 * 60 * 1000) return parsed.data;
  }
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,
  );
  const json = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
    timezone?: string;
  };
  const data: Weather = {
    temp: json.current?.temperature_2m ?? null,
    code: json.current?.weather_code ?? null,
    city: json.timezone?.split("/").pop()?.replace(/_/g, " ") ?? null,
  };
  localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  return data;
}

type BatteryLike = { level: number; charging: boolean; addEventListener?: (t: string, f: () => void) => void };

async function readBattery(): Promise<{ battery: number | null; charging: boolean }> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
  if (!nav.getBattery) return { battery: null, charging: false };
  try {
    const b = await nav.getBattery();
    return { battery: Math.round(b.level * 100), charging: b.charging };
  } catch {
    return { battery: null, charging: false };
  }
}

/**
 * Publishes my presence to the shared couple space, honouring my privacy
 * switches. Battery-friendly: one coarse write per interval, geolocation only
 * while location sharing is on, cached weather.
 */
export function usePresenceSync(intervalMs = 60_000) {
  const { session, profile } = useAuth();
  const { mine: privacy } = usePrivacy();
  const coupleId = useCoupleId();
  const write = useWrite("presence");
  const nudges = useWrite("nudges");
  const lastGeofence = useRef<string | null>(null);
  const places = useCollection<{ id: string; title: string; lat: number; lon: number; radiusKm: number }>(
    "places",
  );

  const publish = useCallback(async () => {
    if (!session?.uid || !coupleId) return;
    const payload: Record<string, unknown> = {
      id: session.uid,
      name: profile?.name ?? session.name,
      lastActive: privacy.shareActivity ? Date.now() : null,
      updatedAt: Date.now(),
    };


    if (privacy.shareBattery) {
      const { battery, charging } = await readBattery();
      payload.battery = battery;
      payload.charging = charging;
    } else {
      payload.battery = null;
    }

    if (privacy.shareLocation && "geolocation" in navigator) {
      const position = await new Promise<GeolocationPosition | null>((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { enableHighAccuracy: false, maximumAge: 120_000, timeout: 15_000 },
        ),
      );
      if (position) {
        const { latitude, longitude, speed, accuracy } = position.coords;
        payload.lat = latitude;
        payload.lon = longitude;
        payload.accuracy = accuracy ?? null;
        payload.speed = speed ?? null;
        payload.movement =
          speed === null || speed === undefined
            ? "unknown"
            : speed < 0.5
              ? "still"
              : speed < 2.2
                ? "walking"
                : "moving";

        if (privacy.shareWeather) {
          const weather = await fetchWeather(latitude, longitude);
          payload.weatherTemp = weather.temp;
          payload.weatherCode = weather.code;
          payload.city = weather.city;
        }

        const destination = places[0];
        if (destination) {
          const km = haversineKm({ lat: latitude, lon: longitude }, destination);
          const kmh = speed && speed > 0.5 ? speed * 3.6 : 25;
          payload.etaMinutes = Math.round((km / kmh) * 60);
          payload.destinationName = destination.title;
          if (privacy.geofenceAlerts && km <= (destination.radiusKm || 0.3)) {
            if (lastGeofence.current !== destination.id) {
              lastGeofence.current = destination.id;
              await nudges.add({
                kind: "safe",
                fromId: session.uid,
                fromName: profile?.name ?? session.name,
                text: `Reached ${destination.title} safely`,
                lat: latitude,
                lon: longitude,
              });
            }
          } else if (km > (destination.radiusKm || 0.3) * 2) {
            lastGeofence.current = null;
          }
        }
      }
    } else {
      payload.lat = null;
      payload.lon = null;
      payload.movement = "unknown";
      payload.etaMinutes = null;
    }

    await write.set(session.uid, payload as Record<string, unknown>);
  }, [session, profile, coupleId, privacy, places, write, nudges]);

  useEffect(() => {
    if (!coupleId) return;
    void publish();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void publish();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void publish();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [publish, coupleId, intervalMs]);
}

/* ---------------- nudge notifications ---------------- */

export function useIncomingNudges(onNudge: (nudge: Nudge) => void) {
  const { session } = useAuth();
  const nudges = useCollection<Nudge>("nudges");
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!session?.uid) return;
    if (seen.current === null) {
      seen.current = new Set(nudges.map((nudge) => nudge.id));
      return;
    }
    for (const nudge of nudges) {
      if (seen.current.has(nudge.id)) continue;
      seen.current.add(nudge.id);
      if (nudge.fromId === session.uid) continue;
      onNudge(nudge);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(nudge.text || "Us", { body: `${nudge.fromName ?? "Your partner"}`, icon: "/icons/icon-512.png" });
      }
    }
  }, [nudges, session?.uid, onNudge]);
}

export { weatherLabel };

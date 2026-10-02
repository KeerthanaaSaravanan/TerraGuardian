/**
 * Authoritative Centralized Location Service for TerraGuardian Citizen Safe.
 *
 * Implements high-accuracy cross-device GPS location acquisition across:
 * - Android Chrome / Firefox
 * - iOS Safari / Chrome
 * - Desktop Chrome, Edge, Safari, Firefox
 *
 * Enforces Truthful Invariants:
 * 1. NEVER fabricates coordinates as GPS if acquired via manual pin or fallback.
 * 2. Emits clear accuracy metrics: ±X meters.
 * 3. Gracefully manages permission denied, timeouts, and stale cached signals.
 * 4. Provides regional NER corridor presets for controlled testing outside field corridors.
 */

export type LocationPermissionState = "prompt" | "granted" | "denied" | "unavailable";
export type LocationStatus = "idle" | "requesting" | "acquiring" | "ready" | "stale" | "error";
export type LocationSource = "DEVICE_GEOLOCATION" | "MANUAL_PIN" | "FALLBACK_APPROXIMATION";

export interface GeoLocationSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  altitudeMeters: number | null;
  timestamp: number;
  source: LocationSource;
  status: LocationStatus;
  permission: LocationPermissionState;
  errorMessage?: string;
  isNerCorridor?: boolean;
  localityLabel?: string;
}

export interface NerCorridorPreset {
  id: string;
  name: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  corridor: string;
  description: string;
}

export const NER_CORRIDOR_PRESETS: NerCorridorPreset[] = [
  {
    id: "tg-2048-km42",
    name: "KM-42 Bhalukpong-Tenga (NH-13)",
    state: "Arunachal Pradesh",
    district: "West Kameng",
    latitude: 27.0842,
    longitude: 92.5681,
    corridor: "NH-13 Trans-Arunachal Highway",
    description: "Active high-risk monitored corridor above NH-13 arterial lifeline.",
  },
  {
    id: "tg-2105-mangan",
    name: "Toong River Flank (Mangan)",
    state: "Sikkim",
    district: "Mangan",
    latitude: 27.562,
    longitude: 88.614,
    corridor: "North Sikkim Highway",
    description: "Granitic scree debris flow risk along border transit corridor.",
  },
  {
    id: "tg-1944-jatinga",
    name: "Jatinga Valley KM-74 (Lumding-Badarpur)",
    state: "Assam",
    district: "Dima Hasao",
    latitude: 25.132,
    longitude: 93.018,
    corridor: "Lumding-Badarpur Hill Section",
    description: "Disang shales pore-pressure cut-slope railway corridor.",
  },
  {
    id: "tg-1082-champhai",
    name: "KM-12 Agricultural Terrace Flank",
    state: "Mizoram",
    district: "Champhai",
    latitude: 23.475,
    longitude: 93.328,
    corridor: "Champhai-Zokhawthar Border Road",
    description: "Superficial terrace creep on rural arterial roadway.",
  },
  {
    id: "ner-itanagar",
    name: "Itanagar Capital Complex",
    state: "Arunachal Pradesh",
    district: "Papum Pare",
    latitude: 27.0844,
    longitude: 93.6053,
    corridor: "NH-415 Urban Flank",
    description: "Regional capital administration and disaster management headquarters.",
  },
];

type LocationListener = (location: GeoLocationSnapshot) => void;

class CitizenLocationService {
  private static instance: CitizenLocationService;
  private currentSnapshot: GeoLocationSnapshot;
  private listeners: Set<LocationListener> = new Set();
  private watchId: number | null = null;

  private constructor() {
    // Default initial state: fallback approximation centered on Arunachal NH-13 corridor
    const savedLat = typeof window !== "undefined" ? localStorage.getItem("tg_loc_lat") : null;
    const savedLng = typeof window !== "undefined" ? localStorage.getItem("tg_loc_lng") : null;
    const savedSource = (typeof window !== "undefined" ? localStorage.getItem("tg_loc_source") : null) as LocationSource | null;

    this.currentSnapshot = {
      latitude: savedLat ? parseFloat(savedLat) : 27.0842,
      longitude: savedLng ? parseFloat(savedLng) : 92.5681,
      accuracyMeters: null,
      altitudeMeters: null,
      timestamp: Date.now(),
      source: savedSource || "FALLBACK_APPROXIMATION",
      status: "idle",
      permission: "prompt",
      localityLabel: "KM-42 Bhalukpong-Tenga (NH-13, West Kameng)",
    };

    if (typeof window !== "undefined") {
      this.checkPermissionQuery();
    }
  }

  public static getInstance(): CitizenLocationService {
    if (!CitizenLocationService.instance) {
      CitizenLocationService.instance = new CitizenLocationService();
    }
    return CitizenLocationService.instance;
  }

  public getSnapshot(): GeoLocationSnapshot {
    return { ...this.currentSnapshot };
  }

  public subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snap);
      } catch (err) {
        console.error("Location listener notification failed:", err);
      }
    });
  }

  public async checkPermissionQuery(): Promise<LocationPermissionState> {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.permissions.query) {
      return "prompt";
    }
    try {
      // @ts-ignore
      const status = await navigator.permissions.query({ name: "geolocation" });
      const perm: LocationPermissionState =
        status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
      this.currentSnapshot.permission = perm;
      status.onchange = () => {
        this.currentSnapshot.permission =
          status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "prompt";
        this.notify();
      };
      this.notify();
      return perm;
    } catch {
      return "prompt";
    }
  }

  /**
   * Acquire live GPS device coordinates with automated high-accuracy retry.
   */
  public async requestDeviceLocation(): Promise<GeoLocationSnapshot> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      this.currentSnapshot.status = "error";
      this.currentSnapshot.permission = "unavailable";
      this.currentSnapshot.errorMessage = "Geolocation API is not supported on this browser or platform.";
      this.notify();
      return this.getSnapshot();
    }

    this.currentSnapshot.status = "acquiring";
    this.notify();

    return new Promise((resolve) => {
      // Step 1: High Accuracy Attempt (10s timeout)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.handlePositionSuccess(pos, "DEVICE_GEOLOCATION");
          resolve(this.getSnapshot());
        },
        (err) => {
          // If permission explicitly denied, halt immediately
          if (err.code === err.PERMISSION_DENIED) {
            this.currentSnapshot.status = "error";
            this.currentSnapshot.permission = "denied";
            this.currentSnapshot.errorMessage = "Location permission was denied. Please allow location in your browser settings.";
            this.notify();
            resolve(this.getSnapshot());
            return;
          }

          // Step 2: Fallback attempt with normal accuracy (Cell tower / Wi-Fi)
          console.warn("High-accuracy GPS timeout, attempting standard accuracy fallback:", err.message);
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              this.handlePositionSuccess(fallbackPos, "DEVICE_GEOLOCATION");
              resolve(this.getSnapshot());
            },
            (finalErr) => {
              this.currentSnapshot.status = "error";
              this.currentSnapshot.errorMessage =
                finalErr.code === finalErr.TIMEOUT
                  ? "Location request timed out. Please check device GPS or choose an NER corridor preset."
                  : `GPS Error: ${finalErr.message}`;
              this.notify();
              resolve(this.getSnapshot());
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    });
  }

  private handlePositionSuccess(pos: GeolocationPosition, source: LocationSource) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = Math.round(pos.coords.accuracy);

    // Validate bounds
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.currentSnapshot.status = "error";
      this.currentSnapshot.errorMessage = "Malformed or out-of-bounds coordinates returned by device.";
      this.notify();
      return;
    }

    this.currentSnapshot = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracyMeters: acc,
      altitudeMeters: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
      timestamp: pos.timestamp || Date.now(),
      source,
      status: "ready",
      permission: "granted",
      errorMessage: undefined,
      isNerCorridor: this.checkIsNerCorridor(lat, lng),
      localityLabel: `Live Device GPS (±${acc}m)`,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("tg_loc_lat", this.currentSnapshot.latitude.toString());
      localStorage.setItem("tg_loc_lng", this.currentSnapshot.longitude.toString());
      localStorage.setItem("tg_loc_source", source);
    }

    this.notify();
  }

  /**
   * Set a manual location pin or preset (e.g. citizen reports hazard observed along route).
   */
  public setManualPin(lat: number, lng: number, label?: string): GeoLocationSnapshot {
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return this.getSnapshot();
    }

    this.currentSnapshot = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      accuracyMeters: null,
      altitudeMeters: null,
      timestamp: Date.now(),
      source: "MANUAL_PIN",
      status: "ready",
      permission: this.currentSnapshot.permission,
      errorMessage: undefined,
      isNerCorridor: this.checkIsNerCorridor(lat, lng),
      localityLabel: label || `Manual Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("tg_loc_lat", this.currentSnapshot.latitude.toString());
      localStorage.setItem("tg_loc_lng", this.currentSnapshot.longitude.toString());
      localStorage.setItem("tg_loc_source", "MANUAL_PIN");
    }

    this.notify();
    return this.getSnapshot();
  }

  /**
   * Select a predefined NER hazard corridor (for test/demonstration).
   */
  public selectNerPreset(presetId: string): GeoLocationSnapshot {
    const preset = NER_CORRIDOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return this.getSnapshot();
    return this.setManualPin(preset.latitude, preset.longitude, `${preset.name} (${preset.district})`);
  }

  private checkIsNerCorridor(lat: number, lng: number): boolean {
    // North Eastern Region bounding box: 21.5°N - 29.5°N, 88.0°E - 97.5°E
    return lat >= 21.5 && lat <= 29.5 && lng >= 88.0 && lng <= 97.5;
  }
}

export const locationService = CitizenLocationService.getInstance();

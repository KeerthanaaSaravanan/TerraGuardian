import { useState, useEffect, useCallback } from "react";
import {
  locationService,
  GeoLocationSnapshot,
  NER_CORRIDOR_PRESETS,
  NerCorridorPreset,
} from "../services/citizenLocationService";

export function useLocationService() {
  const [location, setLocation] = useState<GeoLocationSnapshot>(() => locationService.getSnapshot());

  useEffect(() => {
    const unsubscribe = locationService.subscribe((snapshot) => {
      setLocation(snapshot);
    });
    return unsubscribe;
  }, []);

  const requestGps = useCallback(async () => {
    return await locationService.requestDeviceLocation();
  }, []);

  const startTracking = useCallback(() => {
    locationService.startTracking();
  }, []);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
  }, []);

  const setManualPin = useCallback((lat: number, lng: number, label?: string) => {
    return locationService.setManualPin(lat, lng, label);
  }, []);

  const selectPreset = useCallback((presetId: string) => {
    return locationService.selectNerPreset(presetId);
  }, []);

  return {
    location,
    requestGps,
    startTracking,
    stopTracking,
    setManualPin,
    selectPreset,
    presets: NER_CORRIDOR_PRESETS,
  };
}

import React, { createContext, useContext, useState, type ReactNode } from "react";
import {
  PublicObservationData,
  DEMO_PUBLIC_OBSERVATION,
  SAMPLE_OBSERVATION_PHOTOS,
} from "../data/publicObservationDemo";

export type PublicStep =
  | "LANDING"
  | "ACCESS"
  | "CAPTURE_PHOTO"
  | "LOCATION_CONTEXT"
  | "REVIEW"
  | "PROCESSING"
  | "RESULT";

export interface PublicReportContextType {
  currentPublicStep: PublicStep;
  setPublicStep: (step: PublicStep) => void;
  
  // Observation state
  selectedPhotoIndex: number;
  setSelectedPhotoIndex: (idx: number) => void;
  customImageData: string | null;
  setCustomImageData: (data: string | null) => void;
  activeImage: string;
  
  // Location state
  locationMode: "DEMO_PRESET" | "DEVICE_GPS";
  setLocationMode: (mode: "DEMO_PRESET" | "DEVICE_GPS") => void;
  customCoordinates: { lat: number; lng: number } | null;
  setCustomCoordinates: (coords: { lat: number; lng: number } | null) => void;
  isGpsLoading: boolean;
  requestDeviceLocation: () => Promise<void>;
  
  // Description / Note
  reporterNote: string;
  setReporterNote: (note: string) => void;
  
  // Processing stages simulation
  processingStage: number; // 0 to 4
  startProcessingSequence: () => void;
  
  // Final compiled submission
  compiledObservation: PublicObservationData;
  isSubmittedToOperations: boolean;
  resetReport: () => void;
}

const PublicReportContext = createContext<PublicReportContextType | undefined>(undefined);

export const PublicReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPublicStep, setPublicStep] = useState<PublicStep>("LANDING");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [customImageData, setCustomImageData] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<"DEMO_PRESET" | "DEVICE_GPS">("DEMO_PRESET");
  const [customCoordinates, setCustomCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [reporterNote, setReporterNote] = useState<string>(
    "Active slope failure observed with debris spilling onto roadside."
  );
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [isSubmittedToOperations, setIsSubmittedToOperations] = useState<boolean>(false);

  const activeImage =
    customImageData ||
    SAMPLE_OBSERVATION_PHOTOS[selectedPhotoIndex]?.thumbnail ||
    DEMO_PUBLIC_OBSERVATION.image;

  const requestDeviceLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Using deterministic demo location.");
      return;
    }
    setIsGpsLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 7000,
        });
      });
      setCustomCoordinates({
        lat: Number(pos.coords.latitude.toFixed(4)),
        lng: Number(pos.coords.longitude.toFixed(4)),
      });
      setLocationMode("DEVICE_GPS");
    } catch {
      // Fallback calmly to demo preset
      setLocationMode("DEMO_PRESET");
    } finally {
      setIsGpsLoading(false);
    }
  };

  const startProcessingSequence = () => {
    setPublicStep("PROCESSING");
    setProcessingStage(0);

    const stages = [
      () => setProcessingStage(1), // Metadata & Image validation
      () => setProcessingStage(2), // Computer Vision slope feature extraction
      () => setProcessingStage(3), // Critical infrastructure corridor proximity check
      () => setProcessingStage(4), // Preliminary AI evaluation synthesis
      () => {
        setIsSubmittedToOperations(true);
        setPublicStep("RESULT");
      },
    ];

    stages.forEach((stageFn, index) => {
      setTimeout(stageFn, (index + 1) * 800);
    });
  };

  const resetReport = () => {
    setPublicStep("LANDING");
    setSelectedPhotoIndex(0);
    setCustomImageData(null);
    setLocationMode("DEMO_PRESET");
    setCustomCoordinates(null);
    setProcessingStage(0);
    setIsSubmittedToOperations(false);
  };

  const compiledObservation: PublicObservationData = {
    ...DEMO_PUBLIC_OBSERVATION,
    image: activeImage,
    location: {
      ...DEMO_PUBLIC_OBSERVATION.location,
      lat: customCoordinates ? customCoordinates.lat : DEMO_PUBLIC_OBSERVATION.location.lat,
      lng: customCoordinates ? customCoordinates.lng : DEMO_PUBLIC_OBSERVATION.location.lng,
      isLiveDeviceGps: locationMode === "DEVICE_GPS",
    },
    reporterNote,
  };

  return (
    <PublicReportContext.Provider
      value={{
        currentPublicStep,
        setPublicStep,
        selectedPhotoIndex,
        setSelectedPhotoIndex,
        customImageData,
        setCustomImageData,
        activeImage,
        locationMode,
        setLocationMode,
        customCoordinates,
        setCustomCoordinates,
        isGpsLoading,
        requestDeviceLocation,
        reporterNote,
        setReporterNote,
        processingStage,
        startProcessingSequence,
        compiledObservation,
        isSubmittedToOperations,
        resetReport,
      }}
    >
      {children}
    </PublicReportContext.Provider>
  );
};

export const usePublicReport = (): PublicReportContextType => {
  const ctx = useContext(PublicReportContext);
  if (!ctx) {
    throw new Error("usePublicReport must be used within PublicReportProvider");
  }
  return ctx;
};

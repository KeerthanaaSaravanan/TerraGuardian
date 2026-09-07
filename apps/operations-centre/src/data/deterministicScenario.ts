/**
 * TerraGuardian AI — Deterministic Demo Scenario (TG-2048)
 *
 * This file encapsulates the single deterministic incident used for the
 * Smart India Hackathon operational walkthrough.
 *
 * All values represent realistic operational data for the North Eastern Region
 * (NH-13 corridor in West Kameng, Arunachal Pradesh).
 *
 * This structured mock replaces live API connectors for the 30-min clickable demo,
 * but adheres strictly to the typed contracts so it can be swapped seamlessly with
 * real backend adapters in later phases.
 */

export interface DemoIncident {
  id: string;
  code: string;
  title: string;
  locationName: string;
  state: string;
  district: string;
  corridor: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status:
    | "DETECTED"
    | "ASSESSING"
    | "VERIFYING"
    | "VERIFIED"
    | "DECISION_REQUIRED"
    | "AUTHORIZED"
    | "RESPONDING"
    | "MONITORING"
    | "RESOLVED"
    | "REVIEWED";
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  riskScore: number; // 0 - 100
  confidenceLevel: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";
  confidenceScore: number; // 0 - 100
  priorityLevel: "CRITICAL (P1)" | "HIGH (P2)" | "MODERATE (P3)" | "LOW (P4)";
  priorityScore: number;
  detectedAt: string;
  updatedAt: string;
  weatherSummary: string;
  geologySummary: string;
  isPrimaryDemo: boolean;
}

export const OTHER_NER_INCIDENTS: DemoIncident[] = [
  {
    id: "TG-1082",
    code: "TG-1082",
    title: "Lower Subansiri Slope Ravelling",
    locationName: "Gerukamukh Sector, NH-229",
    state: "Arunachal Pradesh",
    district: "Lower Subansiri",
    corridor: "NH-229 Axis",
    coordinates: { lat: 27.521, lng: 94.254 },
    status: "MONITORING",
    riskLevel: "LOW",
    riskScore: 28,
    confidenceLevel: "HIGH",
    confidenceScore: 82,
    priorityLevel: "LOW (P4)",
    priorityScore: 25,
    detectedAt: "2026-09-07T03:15:00Z",
    updatedAt: "2026-09-07T05:30:00Z",
    weatherSummary: "Light drizzle (14mm/24h)",
    geologySummary: "Siwalik sandstone, moderate stabilization intact",
    isPrimaryDemo: false,
  },
  {
    id: "TG-1944",
    code: "TG-1944",
    title: "Dima Hasao Hill Cut Embankment Subsidence",
    locationName: "Jatinga Valley Railway Link KM-74",
    state: "Assam",
    district: "Dima Hasao",
    corridor: "Lumding-Badarpur Hill Section",
    coordinates: { lat: 25.132, lng: 93.018 },
    status: "ASSESSING",
    riskLevel: "MODERATE",
    riskScore: 61,
    confidenceLevel: "MODERATE",
    confidenceScore: 58,
    priorityLevel: "HIGH (P2)",
    priorityScore: 74,
    detectedAt: "2026-09-07T04:40:00Z",
    updatedAt: "2026-09-07T06:10:00Z",
    weatherSummary: "Moderate continuous shower (68mm/24h)",
    geologySummary: "Disang shales with heavy moisture pore pressure",
    isPrimaryDemo: false,
  },
  {
    id: "TG-2105",
    code: "TG-2105",
    title: "Mangan-Chungthang Road Blockage Debris",
    locationName: "Toong River Flank, North Sikkim",
    state: "Sikkim",
    district: "Mangan",
    corridor: "North Sikkim Highway",
    coordinates: { lat: 27.562, lng: 88.614 },
    status: "RESPONDING",
    riskLevel: "HIGH",
    riskScore: 78,
    confidenceLevel: "HIGH",
    confidenceScore: 88,
    priorityLevel: "HIGH (P2)",
    priorityScore: 80,
    detectedAt: "2026-09-06T22:00:00Z",
    updatedAt: "2026-09-07T05:45:00Z",
    weatherSummary: "High altitude downpour (112mm/24h)",
    geologySummary: "Glacial till with loose granitic scree",
    isPrimaryDemo: false,
  },
];

export interface EvidenceItem {
  id: string;
  sourceType: "WEATHER" | "SATELLITE" | "TERRAIN" | "HISTORICAL" | "FIELD";
  sourceName: string;
  observation: string;
  metric: string;
  reliability: "HIGH" | "MODERATE" | "LOW";
  freshness: string;
  status: "CONFIRMING" | "CONFLICTING" | "INCONCLUSIVE" | "VERIFIED";
  details: string;
}

export const INITIAL_EVIDENCE: EvidenceItem[] = [
  {
    id: "EVD-01",
    sourceType: "WEATHER",
    sourceName: "IMD AWS Bhalukpong Station (#428)",
    observation: "Extreme Cumulative Precipitation Exceeded",
    metric: "184.6 mm / 24h",
    reliability: "HIGH",
    freshness: "12 mins ago",
    status: "CONFIRMING",
    details: "Rainfall rate peaked at 28.4 mm/hr between 04:00-06:00 IST. Threshold for slope saturation (120mm) exceeded by 153%.",
  },
  {
    id: "EVD-02",
    sourceType: "SATELLITE",
    sourceName: "Sentinel-2 MSI Optical / Sentinel-1 SAR",
    observation: "Optical Obscured by Monsoon Cloud Cover; SAR Ambiguous",
    metric: "88% Cloud Cover",
    reliability: "MODERATE",
    freshness: "3 hours ago",
    status: "INCONCLUSIVE",
    details: "Dense monsoon stratus prevented multispectral scar detection. Sentinel-1 SAR backscatter shows 3.2 dB surface roughness anomaly along cut face, but coherence is degraded by torrential rainfall.",
  },
  {
    id: "EVD-03",
    sourceType: "TERRAIN",
    sourceName: "Geological Survey of India (GSI) NLSM",
    observation: "High Hazard Debris Flow Geomorphology",
    metric: "Slope Angle: 44.2°",
    reliability: "HIGH",
    freshness: "Static Basemap (2024)",
    status: "CONFIRMING",
    details: "Lithology: Highly fractured Daling-Buxa formation mica-schist with deep colluvium overburden. Known chronic slip zone during active monsoon.",
  },
  {
    id: "EVD-04",
    sourceType: "HISTORICAL",
    sourceName: "Border Roads Organisation (BRO) Vartak Log",
    observation: "Recurrent Slide Vulnerability at KM-42 Culvert",
    metric: "3 Events (2021-2024)",
    reliability: "HIGH",
    freshness: "Archived Record",
    status: "CONFIRMING",
    details: "Culvert #42/2 previously blocked in July 2023 causing road shoulder collapse. Structural toe-wall repair completed November 2023.",
  },
];

export interface ImpactNode {
  stage: string;
  name: string;
  category: "ORIGIN" | "CORRIDOR" | "COMMUNITY" | "LIFELINE";
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  description: string;
  vulnerabilityFactor: string;
}

export const HAZARD_PROPAGATION_CHAIN: ImpactNode[] = [
  {
    stage: "1. Hazard Origin",
    name: "KM-42 Hill Face Scarp",
    category: "ORIGIN",
    severity: "HIGH",
    description: "Active tension cracking with 450 m³ saturated debris mass poised above roadway.",
    vulnerabilityFactor: "Slope angle 44.2° + 184mm antecedent rainfall",
  },
  {
    stage: "2. Strategic Corridor",
    name: "NH-13 Trans-Arunachal Highway",
    category: "CORRIDOR",
    severity: "CRITICAL",
    description: "Sole heavy-transport axis connecting Bhalukpong, Tenga, Bomdila, and Tawang.",
    vulnerabilityFactor: "ZERO alternative heavy vehicle detours within 180 km",
  },
  {
    stage: "3. Downstream Population",
    name: "Lower Bhalukpong Hamlet",
    category: "COMMUNITY",
    severity: "HIGH",
    description: "1,420 civil residents located in the immediate alluvial runout zone.",
    vulnerabilityFactor: "Riverine proximity + flash mudflow hazard",
  },
  {
    stage: "4. Critical Lifeline Facility",
    name: "West Kameng District Civil Hospital & Army Transit Supply Depot",
    category: "LIFELINE",
    severity: "CRITICAL",
    description: "Daily medical oxygen, emergency transit, and food supplies depend on uninterrupted corridor access.",
    vulnerabilityFactor: "Immediate supply interruption if road remains severed > 6 hours",
  },
];

export interface FieldReport {
  officerName: string;
  unit: string;
  callsign: string;
  timestamp: string;
  coordinates: {
    lat: number;
    lng: number;
    altitude: string;
  };
  summary: string;
  photoUrl: string;
  keyFindings: string[];
}

export const SIMULATED_FIELD_REPORT: FieldReport = {
  officerName: "Sub-Inspector R. Thapa",
  unit: "State Disaster Response Force (SDRF) Quick Response Team Bravo",
  callsign: "SDRF-KAMENG-02",
  timestamp: "Just now (Live Field Upload)",
  coordinates: {
    lat: 27.0842,
    lng: 92.5681,
    altitude: "892m MSL",
  },
  summary: "Active slope slippage confirmed. Mud slurry and rock fragments currently blocking 60% of northbound carriage. Culvert 42/2 overflowing heavily. Hillside tension crack expanding visibly.",
  photoUrl: "field_debris_km42.jpg",
  keyFindings: [
    "Slurry deposit: 1.2m depth across 18m asphalt span",
    "Visible headscarp tension crack length: ~24 meters",
    "Water cascading across road surface, eroding downhill embankment",
    "Two loaded civilian trucks stranded 80m south of slide zone",
    "Urgent recommendation: Enforce immediate vehicular stoppage at KM-38 Police Checkpost",
  ],
};

export interface OperationalTask {
  id: string;
  agency: string;
  title: string;
  description: string;
  status: "PENDING" | "DISPATCHED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED" | "UNCONFIRMED_GAP";
  assignedTo: string;
  timestamp: string;
  isActionGapTrigger?: boolean;
}

export const INITIAL_OPERATIONAL_TASKS: OperationalTask[] = [
  {
    id: "TSK-01",
    agency: "Border Roads Organisation (TF 14 / 85 RCC)",
    title: "Pre-position Heavy Earthmover & JCB at KM-40",
    description: "Deploy JCB-3DX and wheel loader to staging point 2km south of slide for immediate clearance once slope stabilizes.",
    status: "ACKNOWLEDGED",
    assignedTo: "Officer Commanding Major V. Sharma",
    timestamp: "12m ago",
  },
  {
    id: "TSK-02",
    agency: "West Kameng Traffic Police (Bhalukpong)",
    title: "Establish Physical Roadblock & Heavy Vehicle Diversion at KM-38 Checkpost",
    description: "Erect physical barriers. Halt all uphill container and fuel tankers. Inform drivers of alternative holding zone at Bhalukpong ground.",
    status: "UNCONFIRMED_GAP",
    assignedTo: "ASI D. Sonam (Bhalukpong Thana)",
    timestamp: "14m ago",
    isActionGapTrigger: true,
  },
  {
    id: "TSK-03",
    agency: "Public Works Department (PWD / NHIDCL)",
    title: "Inspect Culvert 42/2 Spillway and Downhill Scour",
    description: "Clear debris screen to relieve hydrostatic backpressure threatening road shoulder integrity.",
    status: "IN_PROGRESS",
    assignedTo: "Junior Engineer K. Deka",
    timestamp: "8m ago",
  },
  {
    id: "TSK-04",
    agency: "District Disaster Management Authority (DDMA)",
    title: "Broadcast Cell-Broadcast SMS & Siren Warning to Lower Bhalukpong",
    description: "Issue precautionary Flash Flood / Slurry Warning to 380 households in downstream alluvial basin.",
    status: "COMPLETED",
    assignedTo: "DDMO Control Room",
    timestamp: "10m ago",
  },
];

export interface TimelineMilestone {
  step: number;
  time: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  actor: string;
}

export const REPLAY_TIMELINE_STEPS: TimelineMilestone[] = [
  {
    step: 1,
    time: "04:15 IST",
    title: "Precipitation Spike Detected",
    badge: "SENSE",
    badgeColor: "#3B82F6",
    description: "IMD AWS Bhalukpong registers sudden cloudburst burst exceeding 180mm cumulative 24h rainfall.",
    actor: "Automated Weather Connector",
  },
  {
    step: 2,
    time: "04:22 IST",
    title: "Incident Twin Initialized: TG-2048",
    badge: "DETECT",
    badgeColor: "#F97316",
    description: "Algorithm evaluates terrain slope (44°) + soil saturation → Assesses RISK as HIGH.",
    actor: "TerraGuardian Risk Engine",
  },
  {
    step: 3,
    time: "04:30 IST",
    title: "Evidence Reconciled: Partially Conflicting",
    badge: "RECONCILE",
    badgeColor: "#FBBF24",
    description: "Optical satellite clouded out (88% cloud cover). Confidence constrained to MODERATE (54%). Risk ≠ Confidence.",
    actor: "Evidence Fusion Layer",
  },
  {
    step: 4,
    time: "04:35 IST",
    title: "Field Verification Requested",
    badge: "VERIFY",
    badgeColor: "#A78BFA",
    description: "Duty Officer requests ground patrol confirmation from SDRF Team Bravo before declaring official road closure.",
    actor: "District Duty Officer",
  },
  {
    step: 5,
    time: "04:48 IST",
    title: "Field Evidence Uploaded with Geo-Photo",
    badge: "GROUND TRUTH",
    badgeColor: "#10B981",
    description: "SDRF Sub-Inspector R. Thapa arrives at KM-42. Confirms active debris encroaching highway. Confidence surges from MODERATE (54%) to HIGH (94%).",
    actor: "SI R. Thapa (SDRF Patrol)",
  },
  {
    step: 6,
    time: "04:52 IST",
    title: "Impact Propagation & Priority Elevated",
    badge: "PRIORITIZE",
    badgeColor: "#EF4444",
    description: "NH-13 is sole lifeline to Tawang district and Army depots. Priority marked CRITICAL (P1) (Hazard + Lifeline Criticality).",
    actor: "Impact & Infrastructure Engine",
  },
  {
    step: 7,
    time: "04:56 IST",
    title: "Authority Decision: Traffic Restriction Approved",
    badge: "DECIDE",
    badgeColor: "#10B981",
    description: "Executive Magistrate approves AI recommendation: 'Temporary commercial traffic stoppage at KM-38'. AI recommends; authorized human decides.",
    actor: "Magistrate / DC West Kameng",
  },
  {
    step: 8,
    time: "05:00 IST",
    title: "Operational Tasks Dispatched",
    badge: "ACT",
    badgeColor: "#06B6D4",
    description: "Tasks issued to BRO, Traffic Police, PWD, and DDMA. Initial actions acknowledged.",
    actor: "Inter-Agency Dispatch",
  },
  {
    step: 9,
    time: "05:14 IST",
    title: "ACTION GAP DETECTED (14 min unconfirmed)",
    badge: "AUDIT ALERT",
    badgeColor: "#EF4444",
    description: "Traffic Police Checkpoint KM-38 did not confirm physical barricade. Operational alert triggered. Approved action ≠ Completed action.",
    actor: "Autonomous Conformance Watchdog",
  },
  {
    step: 10,
    time: "05:18 IST",
    title: "Action Confirmed & Response Closed-Loop",
    badge: "CONFIRM",
    badgeColor: "#22C55E",
    description: "ASI Sonam verifies barricade in place via TETRA radio. Traffic safely diverted. State updated to MONITORING / RESOLVED.",
    actor: "ASI D. Sonam (Traffic Police)",
  },
];

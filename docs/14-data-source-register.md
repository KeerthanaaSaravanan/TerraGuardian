# TerraGuardian AI — Data Source Register
**Document ID:** `TG-DOC-14-DATA-SOURCE-REGISTER`  
**Status:** APPROVED FOR PHASE 5 DATA FABRIC  
**Governing Standard:** Section 8 & 9 of Engineering Constitution  
**Version:** `1.0.0`  

---

## 1. Register Format & Classification Matrix

Every data source feeding TerraGuardian is audited against five architectural dimensions:
- **Tier:** 
  - `Tier 1`: Authoritative Indian Government Sources (GSI, IMD, SOI, NDMA, ISRO/NRSC).
  - `Tier 2`: Authoritative Global Earth Observation & Science Archives (Copernicus ESA, NASA, USGS).
  - `Tier 3`: Crowdsourced / Open Geospatial Data (OpenStreetMap, Safe Citizen submissions).
  - `Tier 4`: Simulated Test Fixtures (Seed scenarios, synthetic bench data).
- **Format:** Ingestion wire format (GeoJSON, GeoTIFF, NetCDF, JSON REST, MQTT).
- **Access Protocol:** Public Open Access, Free Registration/API Key, or Authenticated Agency Token.
- **Latency / Update Frequency:** Real-time stream, hourly, daily, 12-day orbital cycle, or static base layer.
- **Connector Status:** `CONNECTED` (Active in prod), `ADAPTER_READY` (Schema validated, needs live credentials), or `PLANNED` (Phase 5 roadmap).

---

## 2. Authoritative Government Sources (Tier 1)

### GSI — Geological Survey of India (Bhukosh)
- **Data Products:**
  - National Landslide Susceptibility Mapping (NLSM) at 1:50,000 scale.
  - Geological Lithology & Structural Fault Maps of North-Eastern Region (NER).
  - Historical Landslide Inventory (macro and meso scales).
- **Format:** WebGIS WMS/WFS endpoints, Shapefile exports.
- **Access Protocol:** Free registration at `bhukosh.gsi.gov.in`.
- **Spatial Coverage:** Arunachal Pradesh, Assam, Meghalaya, Manipur, Mizoram, Nagaland, Sikkim, Tripura.
- **Connector Status:** `PLANNED` (Phase 5 ingestion target for historical landslide scars & lithology).

### IMD — India Meteorological Department
- **Data Products:**
  - Automated Weather Station (AWS) and Agro-meteorological network (hourly rainfall, temperature, relative humidity).
  - High-Resolution Gridded Daily Rainfall (0.25° x 0.25° binary / NetCDF for India).
  - Quantitative Precipitation Forecasts (QPF) and heavy rainfall warnings.
- **Format:** REST API / IMD Pune NDC data download portal / NetCDF4.
- **Access Protocol:** Academic / Research API token; open-portal download for gridded archives.
- **Spatial Coverage:** Pan-India; regional AWS network across NER hill states.
- **Connector Status:** `ADAPTER_READY` (Internal Pydantic validator exists in `app/adapters/imd.py`; live network pipeline to be connected in Phase 5).

### Survey of India (SOI) & Local Government Directory (LGD)
- **Data Products:**
  - Official administrative boundaries: State, District, Sub-division, Tehsil/Block, Gram Panchayat.
  - National Topographic Database (1:50,000 scale).
- **Format:** GeoJSON, Shapefile (via `data.gov.in` and Bharat Maps).
- **Access Protocol:** Open Government Data (OGD) License India.
- **Spatial Coverage:** 8 North-Eastern states, 130 districts.
- **Connector Status:** `PLANNED` (Immediate Phase 5 priority: replace synthetic 4-vertex bounding boxes with real SOI GeoJSON).

### ISRO / NRSC — Bhuvan Geospatial Portal
- **Data Products:**
  - Bhuvan Disaster Management Support (NDEM) landslide inventory.
  - Cartosat-1 / Cartosat-2 Digital Elevation Models (where unrestricted).
- **Format:** OGC WMS/WMTS tile services.
- **Access Protocol:** Bhuvan API Key / Web map service credentials.
- **Connector Status:** `PLANNED` (Secondary validation layer).

---

## 3. Global Earth Observation & Science Archives (Tier 2)

### Copernicus Data Space Ecosystem (CDSE) — European Space Agency
- **Data Products:**
  - **Sentinel-1 SAR:** C-band Interferometric Wide Swath (IW) Single Look Complex (SLC) for Ground Deformation (InSAR / DInSAR).
  - **Sentinel-2 Multispectral:** Level-2A Bottom-Of-Atmosphere (BOA) optical imagery (10m/20m resolution) for vegetation health (NDVI) and scar mapping.
  - **Copernicus DEM (GLO-30):** Global 30-meter Digital Elevation Model (Cloud-Optimized GeoTIFF).
- **Format:** Cloud-Optimized GeoTIFF (COG), STAC API, SAFE archive packages.
- **Access Protocol:** Free registration at `dataspace.copernicus.eu` (OAuth2 token).
- **Update Frequency:** Sentinel-1: 12-day repeat orbit; Sentinel-2: 5-day repeat with dual satellites; DEM: Static 30m base.
- **Connector Status:** `ADAPTER_READY` (Schema validator in `app/adapters/copernicus.py`; Phase 5 will connect direct STAC COG querying for DEM and pre-computed displacement).

### NASA — Global Landslide Catalog (COOLR) & GPM
- **Data Products:**
  - **NASA COOLR:** Cooperative Open Online Landslide Repository (rainfall-triggered landslide points, dates, casualties).
  - **NASA GPM (IMERG):** Global Precipitation Measurement half-hourly and daily satellite rainfall estimates (0.1° x 0.1°).
- **Format:** CSV, GeoJSON, HDF5/NetCDF4.
- **Access Protocol:** Open Access via NASA Earthdata portal.
- **Connector Status:** `PLANNED` (Phase 5 ingestion target for historical benchmark dataset).

---

## 4. Crowdsourced & Open Geospatial Sources (Tier 3)

### OpenStreetMap (OSM)
- **Data Products:**
  - Highway and transport network: National Highways (NH-13, NH-15, NH-29, NH-102), state highways, local mountain roads.
  - Critical infrastructure: Hospitals, primary health centres, relief shelters, bridges, culverts, police stations.
- **Format:** GeoJSON via Overpass API / OSM PBF extracts.
- **Access Protocol:** Open Data Commons Open Database License (ODbL).
- **Spatial Coverage:** Full coverage for all NER transport corridors.
- **Connector Status:** `PLANNED` (Immediate Phase 5 priority: replace 6-vertex NH-13 line with real OSM centerline polyline).

### TerraGuardian Safe — Citizen Observation Network
- **Data Products:**
  - Citizen-submitted georeferenced hazard photos, text descriptions, road blockage reports, and location coordinates.
- **Format:** Pydantic JSON REST payload (`SafeCitizenReport`).
- **Access Protocol:** Authenticated mobile PWA endpoint (`/api/v1/public/report`).
- **Update Frequency:** Real-time asynchronous push.
- **Connector Status:** `CONNECTED` (Active, but requires UI filter remediation under TG-001).

---

## 5. IoT & In-Situ Instrumentation (Tier 3 / Local)

### Geotechnical Slope Sensors (Inclinometers & Piezometers)
- **Data Products:**
  - Borehole MEMS biaxial inclinometer tilt ($\theta_x, \theta_y$ in degrees).
  - Displacement rate ($\text{mm/hour}$ or $\text{mm/day}$).
  - Vibrating wire piezometer pore water pressure ($\text{kPa}$).
  - In-situ tipping bucket rain gauge ($0.2\text{ mm}$ per tip).
- **Format:** JSON payload over MQTT / HTTPS webhook.
- **Connector Status:** `ADAPTER_READY` (`app/adapters/iot_sensor.py` validates incoming schema; physical field gateway connector to be staged).

---

## 6. Simulated Test Fixtures (Tier 4)

### Seed Demonstration Scenarios
- **Data Products:**
  - West Kameng Bhalukpong KM 42 simulated incident.
  - 4-vertex bounding box for West Kameng.
  - 6-vertex NH-13 road corridor polyline.
  - Synthetic historical weather records (`seed_service.py`).
- **Format:** Python in-memory dictionaries & SQLite seed tables.
- **Classification:** `SIMULATED` / `GEOGRAPHICALLY_GROUNDED_FIXTURE`.
- **Connector Status:** `ACTIVE` (Frozen under Phase 4R; MUST NOT be labeled as `REAL_HISTORICAL` per Defect TG-006).

---

## 7. Connector Status Summary & Ingestion Roadmap

| Source Name | Tier | Format | Auth | Frequency | Current Code Status | Phase 5 Target |
|---|:---:|---|:---:|:---:|---|---|
| **SOI Admin Boundaries** | Tier 1 | GeoJSON | Open | Static | Not Ingested | Ingest 8 States, 130 Districts |
| **OSM Road Corridors** | Tier 3 | GeoJSON | ODbL | Weekly | Not Ingested | Ingest NH-13, NH-15, NH-29 centerlines |
| **Copernicus DEM 30m** | Tier 2 | COG | Free Token | Static | Not Ingested | Download/Stream 30m DEM for NER corridors |
| **NASA COOLR Landslides** | Tier 2 | CSV/GeoJSON | Open | Historical | Not Ingested | Ingest ~500+ historical NER events |
| **IMD Daily Rainfall** | Tier 1 | NetCDF/JSON | Open/Reg | Daily | `ADAPTER_READY` | Ingest 2020-2026 daily gridded series |
| **Sentinel-1 InSAR** | Tier 2 | COG/JSON | CDSE Auth | 12-day | `ADAPTER_READY` | Connect EGMS/ASF displacement layers |
| **TerraGuardian Safe** | Tier 3 | JSON/Photo | API | Real-time | `CONNECTED` | Fix UI visibility & spatial indexing (TG-001) |
| **Seed Fixtures** | Tier 4 | SQLite | Local | Static | `ACTIVE` | Retag as `FIXTURE` (Fix TG-006) |

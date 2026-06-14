# StationGo

An interactive data visualization web service for exploring Seoul subway (Lines 1–8) boarding and alighting data from 2025.
You can compare passenger counts intuitively on a map by adjusting time slots, weekday/weekend, line, passenger type, and passenger count range. Peak-concentration and stable-pattern comparisons are also available.
Clicking a specific station reveals detailed information including time-slot patterns, age group distributions, and similar stations.

---

## Project Background and Goals

### Background

Opening the publicly available boarding/alighting data in Excel tells you little more than *"which station has the most passengers."* It is difficult to manipulate and explore data interactively by changing conditions, and it fails to answer *"why does that station matter to us."* As a result, practitioners who need to choose retail locations or event venues still rely on static, surface-level data or gut instinct.

StationGo targets exactly this gap. It **pre-generates derivative metrics that are genuinely useful from an analytical perspective**—such as similar-station indices and weekday/weekend comparisons—and **overlays them on a map so that commercial and geographic interpretation becomes possible**.

### Target Users and Goals

- **Target users** — Practitioners who want to strategically explore Seoul subway usage patterns, including **marketers** evaluating pop-up store or promotional locations and **political strategists** designing campaign routes.
- **User needs** — Users must be able to define their own *Target Passenger Profile* (line, time slot, passenger type, volume range) and directly locate matching stations on the map.
- **Goal** — By identifying **high-potential locations based on historical usage patterns**, StationGo serves as an **urban-strategy intelligence engine** that enables evidence-based, cost-effective site selection rather than relying on intuition.

### Why a Map?

Combining filters, rankings, and a detailed dashboard on one screen creates a high information density. Even so, the map was chosen as the core interface because **site selection is inherently a geographic decision**. Data only becomes interpretable when read in the context of **geographic surroundings**—nearby commercial districts, accessibility, and relationships with adjacent stations. Context that disappears in tables or charts alone is naturally unified by a map through the single axis of *location*.

### Novelty

- **Shifting from What to Why** — While most systems show *what is happening at a given station*, StationGo uses a **Station Similarity Index** to explain *why that station is meaningful* and which stations resemble it.
- **Finding Similar Stations by Usage Pattern** — Rather than raw volume, it finds stations whose *shape of usage pattern* is similar. Each station is represented as a time-slot usage vector broken down by (weekday/weekend × boarding/alighting × passenger type), deviation from the city-wide average is combined into an embedding, and **cosine similarity** is used to derive the top-5 most similar stations (only top 3 are shown in the live service). This is an analytical layer absent from standard public-transit apps.
- **Making Data Limitations Visible** — During preprocessing, gaps in public data were discovered—such as instability in foreign-passenger classification and merge mismatches caused by station name changes. StationGo surfaces these limitations rather than hiding them, so users can also evaluate the reliability of each metric.

---

## Key Features

- **Map-based exploration** — Station metrics displayed as circle sizes on Kakao Maps, with automatic filtering based on zoom level. Zooming in (lower zoom level) enables comparison and clicking of stations outside the ranking.
- **Filter panel** — Filter by combining line, user type (general / child / youth / senior), time slot, boarding/alighting direction, and passenger volume range.
- **Ranking view** — Browse top stations under the current filter via pagination, preventing screen clutter. Distinguishes between Local Top (for the browsed area) and overall ranking (center-bottom).
- **Station detail dashboard** — Brief summary, time-slot chart, age-group pie chart, boarding ratio bar, and similar-station list.
- **Presets** — Apply frequently used filter combinations (rush hour, evening peak, weekend, etc.) in a single click.
- **Station search** — Quickly search by station name and pan the map to that station.

---

## How to Use

### 1. Add the Raw Data File (2025)

Download `final_merged_weekly_nonzero.csv` from the link below and place it in the `src/data/` folder.

- Download: https://drive.google.com/file/d/1mq6Vc7YKdPVo1Jl2eCVi1dr1__xe6iKx/view?usp=sharing

```
src/
└── data/
    └── final_merged_weekly_nonzero.csv  ← place it here
```

> **If you replace the data file, you must delete `src/data/passenger_summary.json`.**
> When you run `npm run dev` / `npm run build`, the preprocessing script (`preprocess.mjs`) runs automatically and regenerates `passenger_summary.json`. If the old file remains, the previous data will be used as-is.

### 2. Install Packages

```bash
npm install
```

### 3. Set Environment Variables (required for map display)

Copy `.env.example` to create `.env.local` and enter your Kakao Maps app key.

```bash
cp .env.example .env.local
# Enter the value for VITE_KAKAO_MAP_KEY in .env.local
```

A JavaScript app key can be issued from the Kakao Developer Console (https://developers.kakao.com).

### 4. Run the Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.
On the first run, the preprocessing script reads the CSV and auto-generates `passenger_summary.json`.

### 5. Production Build

```bash
npm run build
npm run preview   # Local preview of the build output
```

---

## Data Summary

### Source Data

Based on the per-station, per-day, per-time-slot, per-passenger-type boarding/alighting data for Lines 1–8 published by Seoul Metro.

| Item | Details |
|------|---------|
| Source | Seoul Metro Public Data |
| Scope | All stations on Lines 1–8 |
| Direction | Boarding / Alighting |
| Time slots | 00:00 – 24:00 (1-hour intervals) |
| Passenger types | General, Child, Youth, Middle/High School Student, Senior, Staff, Foreign (English / Japanese / Chinese) |

### Preprocessing Decisions

**Weekly aggregation**
The source data is daily. To reduce day-of-week variance and data size, it has been summarized at the weekly level in the form of `Month N, Week M Weekday/Weekend`.

**Merging foreign-passenger counts**
Foreign passenger counts are unstable as a separate aggregate (recorded only at certain stations and time slots), so they have been merged into the general passenger category for type classification.

**Removing Staff and Middle/High School Student types**
Staff is excluded because they are not actual fare-paying passengers. Middle/high school students and youth overlap significantly in benefit eligibility, and since "youth" is the more general category, middle/high school student data is merged into youth.
(Youth += Middle/High School Student)

**Merging pre-06:00 time slots**
The 00:00–05:00 window has very few train services, so data is absent or extremely sparse at most stations.
Providing these as individual time slots would result in excessive empty intervals, so they have been consolidated into a single `pre-06:00` bucket.
This bucket is excluded from display in the in-app visualization.

**Removing missing and zero values**
Records with zero passenger counts have all been removed; the final input file is `final_merged_weekly_nonzero.csv`, with `nonzero` explicit in the filename.

### Datasets Used

#### `final_merged_weekly_nonzero.csv` — Weekly boarding/alighting aggregate (~1.2M records)

The final input file generated from Seoul Metro source data after the preprocessing steps above.

| Column | Format | Range / Example |
|--------|--------|-----------------|
| `날짜` | String | `1월 1주차 평일` – `6월 말 주말` |
| `호선` | String | `1호선` – `8호선` |
| `역명` | String | Station name (e.g., `강남`, `홍대입구`) |
| `역번호` | Integer | Seoul Metro station code (e.g., `222`) |
| `구분` | Category | `승차` / `하차` (Boarding / Alighting) |
| `주말구분` | Category | `평일` / `주말` (Weekday / Weekend) |
| `시간대` | Category | `06시간대이전`, `06-07시간대` … `23-24시간대` |
| `이용객수_노인` | Float | Senior-discount ridership for the time slot |
| `이용객수_어린이` | Float | Child ridership |
| `이용객수_외국인` | Float | Foreign ridership (consolidated) |
| `이용객수_일반` | Float | General ridership |
| `이용객수_직원` | Float | Staff ridership |
| `이용객수_청소년` | Float | Youth ridership (includes middle/high school students) |
| `이용객수_전체` | Float | Sum of all types above |
| `위도` / `경도` | Float | Station coordinates (e.g., `37.498`, `127.028`) |

> Records with zero passenger counts have been removed (`nonzero`).

---

#### `station_info.csv` — Station Metadata (239 stations)

Based on the Seoul Metro **Station Master** data, this file consolidates coordinates, line information, and similar-station data for Lines 1–8 stations appearing in the boarding/alighting dataset.

The following two cases have been merged into a single row:

- **Station name changes** — Stations where an official sub-name was added or changed (e.g., `삼각지(전쟁기념관)` → `삼각지`, `총신대입구(이수)` → `이수`)
- **Multiple lines sharing the same location** — Physically identical locations with different line codes (e.g., `가락시장` belongs to both Line 3 and Line 8) → Multiple values separated by `/` in the `호선` and `역번호` columns.

| Column | Format | Range / Example |
|--------|--------|-----------------|
| `기준역` | String | Unified representative station name (e.g., `가락시장`, `강남`) |
| `호선` | String | Single (`2호선`) or multiple (`3호선/8호선`) |
| `역번호` | String | Single (`222`) or multiple (`340/2818`) |
| `x` | Float | Longitude (e.g., `127.118077`) |
| `y` | Float | Latitude (e.g., `37.492566`) |
| `유사역_1` – `유사역_3` | String | Names of stations with similar usage patterns (up to 3) |

---

## Data Preprocessing Structure

`scripts/preprocess.mjs` reads `final_merged_weekly_nonzero.csv` and converts it to `src/data/passenger_summary.json`.
It is registered in the `predev` / `prebuild` hooks to run automatically before `npm run dev` and `npm run build`.

| File | Role |
|------|------|
| `final_merged_weekly_nonzero.csv` | Raw weekly boarding/alighting data (not in git — requires separate download) |
| `src/data/passenger_summary.json` | Preprocessing output (auto-generated, included in git) |
| `src/data/station_info.csv` | Static station coordinate and line metadata |
| `src/data/station_peak_concentration_stability.csv` | Derived congestion and stability metrics |

---

## Tech Stack

| Technology | Reason for Choice |
|------------|-------------------|
| **React 19 + Vite** | Component-based UI composition and convenient state management. Vite provides fast HMR. |
| **Zustand** | Manages global filter state (line, time slot, selected station, etc.) concisely without the boilerplate of Redux. |
| **react-leaflet / Leaflet** | Open-source map library. Leaflet's custom layer functionality is used to directly wrap the Kakao Maps SDK. |
| **Recharts** | Declaratively composes dashboard charts such as time-slot line charts and age-group pie charts. |
| **Lucide React** | Consistent SVG icon set. Small bundle size with tree-shaking support. |
| **Kakao Maps SDK** | Adopted to accurately display Seoul subway station locations within a Korean map context. |

---

## Project Structure

```
StationGo/
├── scripts/
│   └── preprocess.mjs        # CSV → JSON preprocessing script
├── src/
│   ├── App.jsx                # Overall layout and components (map, sidebar, dashboard)
│   ├── data/
│   │   ├── loaders.js                              # Data loading utilities
│   │   ├── passenger_summary.json                  # Preprocessing output (auto-generated)
│   │   ├── station_info.csv                        # Station metadata
│   │   └── station_peak_concentration_stability.csv
│   └── assets/               # Static assets such as ranking badge images
├── index.html
├── vite.config.js
└── package.json
```

# MASTER FRONTEND DEVELOPMENT PROMPT
## Project: FIRENEXUS – Global MODIS & VIIRS Fire Intelligence Platform

Act as a world-class frontend architect, senior React engineer, creative UI/UX designer, 3D visualization specialist, and geospatial data visualization engineer.

Your task is to design and implement a complete, premium-quality, highly interactive frontend for a global satellite-based fire intelligence and observation platform.

This is a serious scientific visualization platform, not a generic admin dashboard or a typical hackathon website.

The platform focuses on harmonizing and exploring active fire observations from NASA's MODIS and VIIRS satellite instruments.

IMPORTANT PROJECT SCOPE:

The application must cover the ENTIRE WORLD.

It must support global geographical exploration across all continents, countries, regions, oceans, and geographical coordinates.

Do not restrict the platform to any particular city, district, state, or country.

The global scope must be reflected throughout the landing page, maps, dashboards, filters, visualizations, and application architecture.

We are developing ONLY THE FRONTEND in this phase.

Do not implement a backend, database, authentication server, machine learning server, or real API integration yet.

Use carefully structured mock datasets and realistic simulated interactions for the frontend demonstration. Clearly identify simulated data wherever it is displayed. Never represent mock data as verified live NASA observations.

The architecture must be prepared for future backend and NASA FIRMS API integration without requiring a complete frontend rewrite.

---

# 1. CORE DESIGN PHILOSOPHY

Create a visually exceptional scientific intelligence platform inspired by professional aerospace command systems, satellite observation platforms, modern geospatial software, and high-end data analytics products.

Design requirements:

- Premium dark scientific interface.
- Deep midnight navy / near-black background.
- Subtle cyan, electric blue, orange, and warm red accents.
- Beautiful typography with strong readability.
- Sophisticated spacing and layout.
- Professional card design.
- Subtle glass effects only where appropriate.
- Fine borders and restrained glow effects.
- Smooth transitions and meaningful animations.
- Clean information hierarchy.
- High-quality icons and visualization components.

Avoid:

- Generic AI dashboard templates.
- Excessive gradients.
- Excessive neon effects.
- Unnecessary glowing borders.
- Oversized typography.
- Decorative neural network graphics.
- Random floating elements.
- Excessive particle animations.
- Fake scientific indicators.
- Unnecessary UI elements.

The interface should feel like a real Earth observation and geospatial intelligence product.

# 2. TECHNOLOGY STACK

Use:

- React.js
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion for animations
- Three.js
- React Three Fiber
- Drei
- CesiumJS if appropriate for advanced geospatial globe capabilities
- MapLibre GL JS or Leaflet for 2D maps
- Recharts or Plotly for analytical charts
- Lucide React for icons

Choose compatible, stable package versions.

Do not install unnecessary libraries.

For the main 3D globe, prefer a suitable globe-based rendering solution with realistic Earth textures, geographic coordinates, and interactive camera controls.

The application must be modular and maintainable.

# 3. COMPLETE APPLICATION STRUCTURE

Build the following pages and modules.

A. Landing Page
B. Global Intelligence Dashboard
C. Interactive 3D Earth Explorer
D. Fire Hotspot Monitoring
E. MODIS vs VIIRS Comparison
F. Global Burning Activity Calendar
G. Historical Fire Analytics
H. Geospatial Analysis
I. Anomaly Detection Explorer
J. Data Explorer
K. Methodology and About

All pages must be navigable and functional.

# 4. LANDING PAGE – CRITICAL REQUIREMENT

The landing page is the first impression of the entire application.

Create a premium cinematic landing page.

SECTION 1: NAVIGATION

- FIRENEXUS logo.
- Home.
- Explore Earth.
- Global Dashboard.
- Compare Satellites.
- Analytics.
- About.
- Launch Explorer CTA.

The navigation must be responsive and functional.

SECTION 2: HERO

Headline:

"SEE FIRE ACTIVITY.
UNDERSTAND OUR PLANET."

Supporting text:

"Explore global fire activity through harmonized satellite observations from NASA's MODIS and VIIRS instruments."

Primary CTA:
"Explore Global Earth"

Secondary CTA:
"Discover the Science"

Hero visual:

- Large interactive 3D Earth.
- Slowly rotating globe.
- Realistic Earth texture.
- Atmospheric glow.
- Night-side lighting if supported.
- Subtle geographic details.
- Simulated fire observation markers.
- Smooth camera movement.

The globe must be interactive, not just a background image.

SECTION 3: PLATFORM OVERVIEW

Present the key capabilities:

- Global Fire Monitoring.
- Satellite Data Harmonization.
- Historical Fire Analysis.
- Multi-dimensional Exploration.

SECTION 4: HOW IT WORKS

Explain the platform workflow:

1. Satellite observations.
2. Data standardization.
3. Spatial and temporal matching.
4. Harmonization.
5. Global analysis and visualization.

SECTION 5: SATELLITE TECHNOLOGY

Create two professional cards:

MODIS:
Moderate Resolution Imaging Spectroradiometer.

VIIRS:
Visible Infrared Imaging Radiometer Suite.

Explain their roles and differences using accurate scientific information.

SECTION 6: VISUAL ANALYTICS PREVIEW

Include:
- Global fire map preview.
- Historical fire trend preview.
- Satellite comparison preview.
- Burning activity calendar preview.

SECTION 7: FINAL CTA

"Explore the signals. Understand the patterns. Discover our planet."

Add a prominent Launch Global Explorer button.

SECTION 8: FOOTER

Include:
- About the platform.
- Data sources.
- Methodology.
- NASA FIRMS reference.
- NASA Earthdata reference.
- Navigation links.
- Project credits.

# 5. GLOBAL INTELLIGENCE DASHBOARD

Build a professional dashboard with:

Top navigation:
- Application logo.
- Page navigation.
- Global search.
- Notification icon (if implemented meaningfully).
- Theme setting if supported.

Dashboard summary cards:

- Total detected fire observations.
- MODIS observation count.
- VIIRS observation count.
- High-confidence observations.
- Active geographical regions.
- Selected observation period.

Every statistic must use clearly labelled demo data until real data integration.

Dashboard sections:

1. Global hotspot map.
2. MODIS vs VIIRS distribution.
3. Historical activity chart.
4. Regional activity ranking.
5. Daily and monthly activity trends.
6. Recent observation table.

Include functional filters:

- Date range.
- Satellite instrument.
- Confidence level.
- Fire radiative power.
- Country.
- Continent.
- Latitude and longitude.
- Observation period.

Filters must update the visible mock data and visualizations consistently.

# 6. INTERACTIVE 3D EARTH EXPLORER

This is one of the most important features.

Create a beautiful, fully interactive 3D Earth visualization.

Required functionality:

- Realistic 3D globe.
- Earth texture.
- Atmospheric layer.
- Continents and geographical boundaries.
- Ocean visualization.
- Zoom in / zoom out.
- Rotate using mouse drag.
- Smooth camera movement.
- Reset camera.
- Auto rotation toggle.
- Coordinate display.
- Latitude and longitude information.
- Country/region selection where supported.
- Geographic search.
- Observation markers.
- Marker clustering where necessary.

FIRE HOTSPOT VISUALIZATION:

Represent fire observations with visually distinguishable markers.

Suggested visual encoding:

- MODIS: orange markers.
- VIIRS: cyan markers.
- High-intensity observations: stronger visual emphasis.
- Confidence categories: distinct marker styles.

Clicking a marker should open an information panel containing:

- Latitude.
- Longitude.
- Observation date.
- Observation time.
- Satellite instrument.
- Confidence.
- Fire Radiative Power (FRP).
- Detection information.

Add a legend explaining all marker types.

Add layer controls:

- MODIS observations.
- VIIRS observations.
- Combined observations.
- Fire intensity.
- Geographic boundaries.
- Satellite coverage (only if properly represented).

All visual layers must be independently toggleable.

IMPORTANT:

Do not create fake satellite orbit paths and claim they represent actual satellite positions.

Do not invent geographical data.

Mock observation coordinates must be valid and geographically plausible, and clearly identified as simulated.

# 7. 2D AND 3D MULTI-DIMENSIONAL VISUALIZATION

Create multiple visualization modes.

MODE 1: 3D GLOBE

- Rotatable Earth.
- Fire observation markers.
- Instrument-specific layers.
- Interactive geographical exploration.

MODE 2: 2D GLOBAL MAP

- Flat world map.
- Zoom and pan.
- Fire observation clusters.
- Country boundaries.
- Heatmap layer.

MODE 3: DENSITY HEATMAP

- Spatial density visualization.
- Adjustable intensity.
- Dynamic filtering.

MODE 4: TEMPORAL VISUALIZATION

- Time slider.
- Date selection.
- Playback controls.
- Day-by-day observation changes.
- Monthly and yearly exploration.

MODE 5: MULTI-DIMENSIONAL ANALYSIS

Allow users to explore the relationships between:

- Latitude.
- Longitude.
- Observation time.
- Satellite instrument.
- Confidence.
- Fire Radiative Power.
- Historical activity.

Include interactive scatter plots, bubble charts, heatmaps, time-series charts, and geographic visualizations.

Users should be able to change axes, select dimensions, filter observations, and inspect individual data points.

# 8. MODIS VS VIIRS COMPARISON CENTER

Create a dedicated comparison page.

The objective is to understand differences between MODIS and VIIRS observations.

Include:

- Side-by-side satellite data comparison.
- Shared geographic selection.
- Shared time selection.
- Observation count comparison.
- Spatial resolution comparison.
- Confidence distribution.
- Fire Radiative Power distribution.
- Matched observations.
- Unmatched observations.
- Spatial matching visualization.
- Temporal matching visualization.

Create a comparison map with two independently toggleable layers.

Include a comparison table:

Parameter | MODIS | VIIRS

Parameters:

- Instrument.
- Spatial resolution.
- Observation date.
- Detection count.
- Confidence.
- FRP.
- Matched observation count.

IMPORTANT SCIENTIFIC REQUIREMENT:

Do not assume that every MODIS and VIIRS hotspot represents the same physical fire.

Do not directly add the two sensor counts as unique fire events.

Explain that spatial resolution, overpass timing, detection sensitivity, cloud cover, and observation conditions can affect differences.

Present the harmonization process as:

1. Data standardization.
2. Spatial matching.
3. Temporal matching.
4. Observation quality assessment.
5. Duplicate handling.
6. Harmonized output generation.

Do not claim actual harmonization has occurred until the real processing algorithm is implemented and validated.

# 9. GLOBAL BURNING ACTIVITY CALENDAR

Create an advanced calendar interface.

Features:

- Year selector.
- Month selector.
- Daily fire activity.
- Monthly activity overview.
- Annual activity overview.
- Color-coded activity intensity.
- Interactive calendar cells.
- Day selection.
- Historical comparison.

Clicking a calendar date should update the global map and associated analytics.

Include a timeline slider for historical exploration.

The calendar must work with simulated data initially.

# 10. HISTORICAL FIRE ANALYTICS

Build an advanced analytics page.

Include:

- Yearly activity trends.
- Monthly seasonality.
- Daily activity patterns.
- Regional comparisons.
- Continental activity comparisons.
- MODIS and VIIRS detection trends.
- FRP distribution.
- Confidence distribution.

Use interactive charts.

Support:
- Hover tooltips.
- Legends.
- Zoom.
- Data selection.
- Download chart data as CSV where feasible.

Historical data periods must be explicitly labelled according to the selected dataset. Never imply complete global observations for periods when a sensor was not operational.

# 11. ANOMALY DETECTION EXPLORER

Create an exploratory anomaly analysis page.

Features:

- Historical baseline visualization.
- Current-period versus historical-period comparison.
- Unusual activity indicators.
- Regional anomaly ranking.
- Anomaly timeline.
- Interactive anomaly map.

Use a clearly defined demo algorithm for mock data.

Display the methodology and clearly explain that simulated anomaly scores are demonstrations, not validated fire forecasts.

# 12. DATA EXPLORER

Build a professional scientific data explorer.

Include:

- Searchable observation table.
- Sorting.
- Filtering.
- Pagination.
- Column selection.
- Export to CSV.
- Observation details panel.

Columns:

- Observation ID.
- Latitude.
- Longitude.
- Date.
- Time.
- Satellite.
- Confidence.
- FRP.
- Brightness temperature where available.
- Data status.

Provide a simulated dataset with realistic field formats.

Do not fabricate a live NASA API connection.

# 13. INTERACTION AND USER EXPERIENCE

Every interactive element must work.

Implement:

- Functional buttons.
- Functional navigation.
- Search functionality.
- Working filters.
- Date selectors.
- Dropdowns.
- Interactive charts.
- Map controls.
- Globe controls.
- Modal dialogs.
- Side panels.
- Tooltips.
- Loading states.
- Empty states.
- Error states.
- Responsive navigation.

Use meaningful animations.

Avoid unnecessary animation that impacts scientific readability.

Add keyboard accessibility and appropriate ARIA labels.

# 14. FRONTEND ARCHITECTURE

Use a clean modular structure.

Suggested structure:

src/
  assets/
  components/
    layout/
    navigation/
    cards/
    charts/
    maps/
    globe/
    filters/
    panels/
    ui/
  pages/
    LandingPage/
    Dashboard/
    EarthExplorer/
    Comparison/
    FireCalendar/
    Analytics/
    AnomalyExplorer/
    DataExplorer/
    About/
  data/
    mock/
  hooks/
  services/
  types/
  utils/
  styles/
  App.tsx
  main.tsx

Keep data models, visualization components, and UI components separated.

Create reusable components.

Create a centralized mock data service.

Prepare a future data-provider abstraction so a real NASA FIRMS API service can replace the mock service without rewriting the pages.

Use TypeScript interfaces for observation records, filters, satellite metadata, and visualization settings.

# 15. PERFORMANCE AND QUALITY

The platform must be optimized.

Requirements:

- Lazy-load heavy visualization components.
- Avoid unnecessary React re-renders.
- Use memoization where appropriate.
- Optimize globe rendering.
- Limit rendering of large numbers of markers.
- Use clustering or aggregation for large mock datasets.
- Use responsive chart containers.
- Handle WebGL limitations gracefully.
- Provide a fallback visualization when WebGL is unavailable.
- Support modern desktop and mobile browsers.

Do not sacrifice performance for decorative effects.

# 16. RESPONSIVE DESIGN

Desktop:
- Full dashboard layout.
- Large interactive globe.
- Multi-panel analytics.

Tablet:
- Adaptive grid.
- Collapsible sidebars.
- Responsive charts.

Mobile:
- Single-column layout.
- Touch-friendly controls.
- Simplified globe interactions.
- Bottom navigation or compact navigation.
- Horizontally scrollable data tables where necessary.

# 17. SCIENTIFIC ACCURACY AND DATA INTEGRITY

This is a scientific platform.

Follow these rules:

- Clearly label mock data.
- Never claim simulated observations are real NASA observations.
- Never invent live satellite status.
- Never fabricate scientific conclusions.
- Show units for measurements.
- Explain data limitations.
- Respect sensor operational periods.
- Distinguish hotspots from confirmed fire incidents.
- Do not present historical anomaly analysis as a guaranteed prediction.
- Include data source references and methodology descriptions.

# 18. DEVELOPMENT EXECUTION PLAN

Follow this order:

PHASE 1:
Inspect the current workspace and existing files.

Do not overwrite or delete existing project work without permission.

PHASE 2:
Establish the design system, application structure, typography, colors, and reusable components.

PHASE 3:
Develop the landing page completely.

PHASE 4:
Implement global navigation and dashboard layouts.

PHASE 5:
Implement the interactive 3D globe and 2D map.

PHASE 6:
Implement MODIS and VIIRS comparison.

PHASE 7:
Implement the calendar and analytics pages.

PHASE 8:
Implement anomaly explorer and data explorer.

PHASE 9:
Implement mock data interactions and connect all frontend components.

PHASE 10:
Test all routes, controls, filters, responsive layouts, performance, and accessibility.

After each phase:
- Run the application.
- Check for console errors.
- Fix broken interactions.
- Verify responsive behavior.
- Preserve previously completed functionality.

Do not simply generate static UI screenshots.

The actual application must run locally and be interactive.

# 19. FINAL ACCEPTANCE CRITERIA

The frontend is complete only when:

1. A professional landing page exists.
2. The entire application has global geographical scope.
3. The 3D Earth is interactive.
4. The 2D global map is interactive.
5. MODIS and VIIRS layers can be independently enabled and disabled.
6. Satellite comparison works with demonstration data.
7. Date and geographic filters work.
8. The burning activity calendar is interactive.
9. Historical analytics charts work.
10. The anomaly explorer works with labelled simulated data.
11. The data explorer supports filtering and CSV export.
12. All pages are connected through functional navigation.
13. Responsive layouts work.
14. No broken buttons or placeholder links remain.
15. No simulated data is presented as real NASA data.
16. The application runs without critical console errors.
17. The architecture is ready for future backend integration.

FINAL INSTRUCTION:

Work as an experienced product engineering team, not as a simple code generator.

Prioritize scientific accuracy, exceptional visual quality, interactive 3D geospatial visualization, clean architecture, and reliable functionality.

Build the complete frontend step by step.

Do not begin backend development.

Do not stop after creating the landing page.

Complete and test the entire frontend before declaring the project finished.
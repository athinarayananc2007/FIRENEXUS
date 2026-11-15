# FIRENEXUS: Mathematical Formulations & Algorithmic Explanations

**System**: FIRENEXUS Satellite Active Fire Monitoring & Harmonization Platform  
**Purpose**: Rigorous Scientific Reference Explaining All Algorithms, Formulas, and Models  
**Implementation Modules**: `app/services/spatial_matching_service.py`, `temporal_matching_service.py`, `sensor_normalization_service.py`, `fire_event_service.py`, `frp_analysis_service.py`, `calibration_service.py`, `anomaly_detection_service.py`  

---

## 1. Geodesic Distance Formulation (Haversine Algorithm)

To evaluate spatial separation between satellite fire observations anywhere on the Earth without spherical distortion, FIRENEXUS calculates great-circle distance using the **Haversine Formula**.

### 1.1 Mathematical Formula
Given two coordinates $P_1 = (\phi_1, \lambda_1)$ and $P_2 = (\phi_2, \lambda_2)$ where $\phi$ is latitude in radians and $\lambda$ is longitude in radians:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{\max(0.0, 1.0 - a)}\right)$$

$$d = R_{\text{Earth}} \cdot c$$

Where:
- $R_{\text{Earth}} = 6,371,000.0\text{ meters}$ (WGS 84 mean volumetric Earth radius).
- $d$: Geodesic surface separation in meters.
- $\operatorname{atan2}(y, x)$: Two-argument arctangent ensuring numerical stability across all quadrants and antipodal coordinates.

---

## 2. Sensor Footprint Geometry & Spatial Overlap

### 2.1 Optical Pixel Distortion at Swath Edges
Satellite optical detectors scan perpendicular to the orbital ground track. As scan angle $\theta$ increases away from nadir toward swath edge ($\pm 55^\circ$ for MODIS, $\pm 56^\circ$ for VIIRS):
1. The line-of-sight slant range to the ground increases as $1 / \cos\theta$.
2. The projected ground area expands non-linearly:
   - Along-scan ground dimension: $S \propto \sec^2\theta$.
   - Along-track ground dimension: $T \propto \sec\theta$.

In MODIS Collection 6.1, a nadir pixel ($1.0\text{ km} \times 1.0\text{ km} = 1.0\text{ km}^2$) expands at swath edge to **$4.8\text{ km} \times 2.0\text{ km} \approx 9.6\text{ km}^2$** (nearly a tenfold area increase). In VIIRS, onboard 3:1 sample aggregation constrains a nadir pixel ($0.375\text{ km} \times 0.375\text{ km} \approx 0.14\text{ km}^2$) to **$0.8\text{ km} \times 0.8\text{ km} \approx 0.64\text{ km}^2$** at swath edge.

### 2.2 Effective Footprint Radius
FIRENEXUS converts reported along-scan ground dimension $S$ and along-track dimension $T$ (provided in FIRMS CSV records) into an equivalent circular radius $r$:

$$r = \frac{\sqrt{S \cdot T}}{2} \cdot 1000\text{ meters}$$

If scan and track are unpopulated, fallback nominal radii are applied:
- $\text{VIIRS}$: $r_{\text{nadir}} = \frac{375\text{ m}}{2} = 187.5\text{ m}$.
- $\text{MODIS}$: $r_{\text{nadir}} = \frac{1000\text{ m}}{2} = 500.0\text{ m}$.

### 2.3 Footprint Intersection Ratio ($\eta$)
Given two observations with effective radii $r_1, r_2$ and center separation $d$, let $r_{\max} = \max(r_1, r_2)$ and $r_{\min} = \min(r_1, r_2)$:

$$\eta = \begin{cases} 
1.0 & \text{if } d \le (r_{\max} - r_{\min}) \quad \text{(Smaller pixel completely inside larger pixel)} \\
0.0 & \text{if } d \ge (r_1 + r_2) \quad \text{(Footprints do not touch)} \\
\max\left(0.0, \min\left(1.0, \frac{(r_1 + r_2) - d}{2 \cdot r_{\min}}\right)\right) & \text{otherwise} \quad \text{(Linear geometric decay approximation)}
\end{cases}$$

---

## 3. Orbit-Aware Temporal Alignment

### 3.1 Satellite Overpass Science
Earth observation satellites occupy Sun-Synchronous Polar Orbits. The local solar time (LST) of equator crossings dictates the burning phase observed:

| Satellite Platform | Sensor | Orbit Type | Equator Crossing (LST) | Matching Window ($w$) |
| :--- | :--- | :--- | :--- | :--- |
| **Aqua** | MODIS | Afternoon (Ascending) | ~1:30 PM | **3,600 s (1.0 hr)** with VIIRS |
| **Suomi-NPP** | VIIRS | Afternoon (Ascending) | ~1:30 PM | **3,600 s (1.0 hr)** with Aqua |
| **NOAA-20 / JPSS-1** | VIIRS | Afternoon (Ascending) | ~1:30 PM (50 min offset) | **3,600 s (1.0 hr)** with Aqua |
| **NOAA-21 / JPSS-2** | VIIRS | Afternoon (Ascending) | ~1:30 PM (Phased orbit) | **3,600 s (1.0 hr)** with Aqua |
| **Terra** | MODIS | Morning (Descending) | ~10:30 AM | **14,400 s (4.0 hr)** with VIIRS |

### 3.2 Dynamic Temporal Window Selection
$$\Delta t = |t_{\text{MODIS}} - t_{\text{VIIRS}}| \quad \text{(in seconds, UTC)}$$

$$w = \begin{cases}
3,600\text{ s} & \text{if both satellites are in afternoon sun-synchronous orbits} \\
14,400\text{ s} & \text{if one satellite is morning (Terra) and one is afternoon (VIIRS)} \\
7,200\text{ s} & \text{default cross-orbit fallback}
\end{cases}$$

Diurnal phase consistency requires:
$$\text{is\_match} = (\Delta t \le w) \land (\text{day\_night}_1 == \text{day\_night}_2)$$

---

## 4. Composite Match Scoring Formulation

To score cross-sensor correspondence without circular reasoning, FIRENEXUS combines normalized spatial proximity and normalized temporal separation:

$$s_{\text{spatial}} = \max\left(0.0, 1.0 - \frac{d}{d_{\max}}\right), \quad d_{\max} = 2,000\text{ m}$$

$$s_{\text{temporal}} = \max\left(0.0, 1.0 - \frac{\Delta t}{w}\right)$$

$$\text{match\_score} = w_s \cdot s_{\text{spatial}} + w_t \cdot s_{\text{temporal}}$$

Where:
- $w_s = 0.60$ (spatial proximity weighting: 60%).
- $w_t = 0.40$ (temporal alignment weighting: 40%).
- Match Classification:
  $$\text{status} = \begin{cases}
  \text{"confirmed"} & \text{if } \text{match\_score} \ge 0.70 \\
  \text{"candidate"} & \text{if } 0.25 \le \text{match\_score} < 0.70 \\
  \text{"rejected"} & \text{if } \text{match\_score} < 0.25
  \end{cases}$$

---

## 5. Connected-Component Fire Event Clustering

Hotspot detections are discrete spatial samples. In nature, multiple nearby hotspots represent a single wildfire front.

### 5.1 Graph Connected-Component Clustering
Given a set of observations $V = \{o_1, o_2, \dots, o_n\}$ sorted chronologically:
- An edge exists between $o_i$ and $o_j$ if:
  1. $\Delta t = |t_i - t_j| \le \Delta t_{\text{event}} = 43,200\text{ s (12 hours)}$.
  2. Geodesic distance $d(o_i, o_j) \le r_{\text{event}} = 3,000\text{ m (3.0 km)}$.
  3. Distance from cluster seed observation $d(o_{\text{seed}}, o_j) \le d_{\max} = 15,000\text{ m (15.0 km)}$.

### 5.2 Prevention of Runaway Transitive Chaining
In connected-component clustering, chaining occurs when observation A links to B, B links to C, and C links to D across hundreds of kilometers. Condition (3) prevents this: no cluster member may exceed **15.0 km** from the seed detection, forcing distinct fire complexes to form separate clusters.

### 5.3 Cluster Centroid & Energy Aggregations
For a cluster $C$ containing $k$ observations:
$$\text{Centroid} = \left(\frac{1}{k}\sum_{i=1}^k \phi_i, \; \frac{1}{k}\sum_{i=1}^k \lambda_i\right)$$

$$\text{Total FRP} = \sum_{i=1}^k \text{FRP}_i, \quad \text{Peak FRP} = \max_{i=1 \dots k} \text{FRP}_i, \quad \text{Duration} = \frac{t_{\max} - t_{\min}}{3600}\text{ hours}$$

---

## 6. Fire Radiative Power (FRP) Statistical Metrics

FRP measures instantaneous radiant heat output in Megawatts (MW). FIRENEXUS computes parametric, non-parametric, and paired error metrics.

### 6.1 Univariate Distribution Metrics
- **Mean ($\mu$) & Variance ($\sigma^2$)**:
  $$\mu = \frac{1}{n}\sum_{i=1}^n x_i, \quad \sigma^2 = \frac{1}{n-1}\sum_{i=1}^n (x_i - \mu)^2, \quad \sigma = \sqrt{\sigma^2}$$
- **Percentiles ($P_k$) via Linear Interpolation**:
  For rank $R = \frac{k}{100}(n - 1)$, let $i = \lfloor R \rfloor$ and $f = R - i$:
  $$P_k = x_i + f \cdot (x_{i+1} - x_i)$$
- **Interquartile Range (IQR)**:
  $$\text{IQR} = P_{75} - P_{25}$$

### 6.2 Paired Cross-Sensor Comparative Metrics (MODIS $x$, VIIRS $y$)
- **Mean Bias Error (MBE)**:
  $$\text{MBE} = \frac{1}{n}\sum_{i=1}^n (y_i - x_i)$$
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{n}\sum_{i=1}^n |y_i - x_i|$$
- **Root Mean Square Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{n}\sum_{i=1}^n (y_i - x_i)^2}$$
- **Mean Absolute Percentage Error (MAPE)**:
  $$\text{MAPE} = \frac{100\%}{n}\sum_{i=1}^n \frac{|y_i - x_i|}{\max(1.0, x_i)}$$
- **Pearson Linear Correlation ($r$)**:
  $$r = \frac{\sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^n (x_i - \bar{x})^2 \cdot \sum_{i=1}^n (y_i - \bar{y})^2}}$$
- **Spearman Rank Correlation ($\rho$)**:
  Computed as Pearson's $r$ applied to ranked sequences $\operatorname{rank}(x)$ and $\operatorname{rank}(y)$ with fractional ranking for ties.

---

## 7. Cross-Sensor Calibration Regressions

FIRENEXUS implements empirical regression to bridge MODIS and VIIRS energy baselines.

### 7.1 Chronological Split Protocol
To eliminate temporal data leakage, observations are sorted chronologically:
- **Training Set (70%)**: Earliest 70% of matched pairs.
- **Testing Set (30%)**: Subsequent 30% holdout test pairs.

### 7.2 Ordinary Least Squares (OLS) Linear Model ($y = \beta_1 x + \beta_0$)
$$\beta_1 = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sum (x_i - \bar{x})^2}, \quad \beta_0 = \bar{y} - \beta_1 \bar{x}$$

### 7.3 Zero-Intercept Scaling Ratio Model ($y = \beta x$)
In physical radiative transfer, when fire radiant energy is zero, measured radiance anomaly is zero:
$$\beta = \frac{\sum x_i y_i}{\sum x_i^2}, \quad \beta_0 = 0.0$$

### 7.4 Coefficient of Determination ($R^2$) on Test Set
$$R^2 = 1.0 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$$

---

## 8. Multi-Method Anomaly Detection

### 8.1 Standard Z-Score
$$Z = \frac{x - \mu}{\sigma}, \quad \text{Flagged if } Z \ge 3.0$$

### 8.2 Robust Modified Z-Score using Median Absolute Deviation (MAD)
Because mega-fires heavily distort mean and standard deviation, FIRENEXUS implements the Rousseeuw–Croux Modified Z-score:

$$\text{MAD} = \operatorname{median}\left(|x_i - \operatorname{median}(x)|\right)$$

$$M_i = \frac{0.6745 \cdot (x_i - \operatorname{median}(x))}{\text{MAD}}$$

Flagged as an anomaly if $M_i \ge 3.5$.

### 8.3 Interquartile Range (IQR) Upper Fence
$$\text{Upper Bound} = Q_3 + 1.5 \cdot \text{IQR}, \quad \text{Flagged if } x > \text{Upper Bound}$$

### 8.4 Radiometric Saturation Thresholds
Monitors mid-infrared channel saturation limits:
- **VIIRS Band I4**: Flagged if $T_{\text{bright}} \ge 365.0\text{ K}$ (saturation limit $\approx 367\text{ K}$).
- **MODIS Band 21**: Flagged if $T_{\text{bright}} \ge 450.0\text{ K}$ (saturation limit $\approx 500\text{ K}$).

### 8.5 Spatial Isolation Test
Calculates nearest-neighbor geodesic distance $d_{\min}$ across all active hotspots within the temporal window:
$$\text{Flagged if } d_{\min} > 15,000\text{ meters (15.0 km)}$$
Identifies isolated gas flaring, false detections, or single-pixel lightning ignitions.

---

## 9. Illustrative Calculation Walkthrough (Synthetic Example)

*(Note: The following numbers are synthetic to demonstrate mathematical execution step-by-step).*

### Scenario:
- **MODIS Observation**: Lat $34.050^\circ$, Lon $-118.250^\circ$, Time `13:30:00 UTC`, FRP $= 50.0\text{ MW}$, Scan $= 1.2\text{ km}$, Track $= 1.1\text{ km}$.
- **VIIRS Observation**: Lat $34.053^\circ$, Lon $-118.252^\circ$, Time `13:35:00 UTC`, FRP $= 54.0\text{ MW}$, Scan $= 0.4\text{ km}$, Track $= 0.4\text{ km}$.

### Step 1: Haversine Distance ($d$)
$$\Delta\phi = (34.053 - 34.050) \cdot \frac{\pi}{180} = 0.003 \cdot 0.0174533 \approx 5.236 \times 10^{-5}\text{ rad}$$
$$\Delta\lambda = (-118.252 - (-118.250)) \cdot \frac{\pi}{180} = -0.002 \cdot 0.0174533 \approx -3.491 \times 10^{-5}\text{ rad}$$
$$d = 381.4\text{ meters}$$

### Step 2: Footprint Overlap ($\eta$)
$$r_{\text{MODIS}} = \frac{\sqrt{1.2 \cdot 1.1}}{2} \cdot 1000 = 574.4\text{ m}$$
$$r_{\text{VIIRS}} = \frac{\sqrt{0.4 \cdot 0.4}}{2} \cdot 1000 = 200.0\text{ m}$$
$$r_{\max} - r_{\min} = 574.4 - 200.0 = 374.4\text{ m}$$
Since $d = 381.4\text{ m}$ is slightly greater than $374.4\text{ m}$ but well within $r_1 + r_2 = 774.4\text{ m}$:
$$\eta = \frac{774.4 - 381.4}{2 \cdot 200.0} = \frac{393.0}{400.0} = 0.9825 \quad (98.25\% \text{ footprint overlap})$$

### Step 3: Match Scoring
$$\Delta t = 300\text{ seconds}, \quad w = 3,600\text{ seconds (Aqua } \leftrightarrow \text{ VIIRS)}$$
$$s_{\text{spatial}} = 1.0 - \frac{381.4}{2000.0} = 0.8093$$
$$s_{\text{temporal}} = 1.0 - \frac{300}{3600} = 0.9167$$
$$\text{match\_score} = 0.60 \cdot 0.8093 + 0.40 \cdot 0.9167 = 0.4856 + 0.3667 = \mathbf{0.852}$$
**Classification**: Since $0.852 \ge 0.70$, this pair is marked as **`confirmed`**.

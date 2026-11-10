# Scarap_Yukti — Hero Video Editorial Decisions & Post-Production Log

**Project**: Scarap_Yukti Responsible E-Waste Marketplace  
**Phase**: 3.3 Autonomous Cinematic Hero Video Production  
**Deliverable**: `public/videos/scarap-hero.mp4` (4.08 MB) & `public/videos/scarap-hero-poster.webp` (215.8 KB)  
**Editor**: Antigravity Post-Production & Video Engineering Desk  
**Target Duration**: 9–12 seconds (Final duration: **10.708 seconds**)  
**Output Resolution**: 1920×1080 (16:9 Landscape @ 24.00 FPS)  

---

## 1. Editorial Vision & Narrative Arc

The Scarap_Yukti hero video serves as the visual anchor of the landing page, establishing an immediate industrial technology aesthetic. Rather than using generic stock footage or corporate CGI, the montage follows a strict three-beat documentary progression:

```
[ Beat 1: The Raw Scrap ]       [ Beat 2: Micro-Architecture ]       [ Beat 3: Facility Logistics ]
Aggregated E-Waste Scrap  ──>  Macro Circuitry & Metallurgy  ──>  Industrial Conveyor & Sorting
  (Pexels #14593616)                 (Pexels #3866849)                  (Pexels #29702573)
```

1. **Shot 1 (Beat 1 — Upstream Generation & Aggregation)**:
   - **Source**: `source1_ewaste.mp4` (Pexels #14593616)
   - **Content**: A continuous slow-panning camera glide across an authentic pile of decommissioned electronic hardware, circuit boards, ribbon cables, and components.
   - **Narrative Purpose**: Directly grounds the platform in the physical reality of India's e-waste dilemma (Schedule I equipment requiring formalization).

2. **Shot 2 (Beat 2 — Recoverable Metallurgy & Semiconductor Traceability)**:
   - **Source**: `source2_pcb_macro.mp4` (Pexels #3866849)
   - **Content**: Pristine 4K macro dolly tracking over surface-mount silicon microchips, soldered pins, and gold-plated copper bus traces on a printed circuit board.
   - **Narrative Purpose**: Represents the high-value precious metals (Gold, Silver, Copper, Palladium) and forensic custody tracking that Scarap_Yukti protects against illegal acid-leaching.

3. **Shot 3 (Beat 3 — Industrial Facility Processing & Mass-Balance Intake)**:
   - **Source**: `source3_conveyor.mp4` (Pexels #29702573)
   - **Content**: Heavy industrial sorting machinery, high-volume automated conveyor belts, and mechanical handling inside a licensed processing plant.
   - **Narrative Purpose**: Completes the loop, demonstrating the transition from informal scrap collection into certified industrial smelting and dismantler intake.

### Why Source 4 (`source4_worker.mp4`) Was Excluded
Source 4 (Pexels #3214639) was downloaded, inspected via contact sheet, and evaluated. It depicts a municipal worker manually sorting paper and plastic bottles in a brightly backlit warehouse with high-contrast window flare. In accordance with editorial instructions (*"Human-led recycling operation, only if the footage is visually suitable. Three excellent shots are preferable to four mediocre shots"*), Shot 4 was excluded to preserve 100% focus on electronic hardware and maintain pristine industrial color consistency.

---

## 2. Edit Decision List (EDL) & Master Timeline

| Shot # | Source Asset | In Point (Source) | Out Point (Source) | Cut Duration | Sequence Timeline (Output) | Transition to Next Shot |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **01** | `source1_ewaste` (1080p) | `00:01.000` | `00:05.000` | 4.000s | `00:00.000` – `00:03.500` | 0.5s Cross-Dissolve (`fade`) |
| **02** | `source2_pcb_macro` (4K UHD) | `00:02.000` | `00:06.000` | 4.000s | `00:03.500` – `00:07.000` | 0.5s Cross-Dissolve (`fade`) |
| **03** | `source3_conveyor` (4K UHD) | `00:05.000` | `00:09.500` | 4.500s | `00:07.000` – `00:10.708` | 0.8s Head-to-Tail Loop Blend |

---

## 3. Loop Continuity Design

Background hero videos on commercial web applications loop indefinitely. A jarring hard cut from Shot 3 back to Shot 1 creates distracting visual fatigue.

To achieve an organic, infinite loop:
1. The base 3-shot sequence is assembled to 11.5 seconds.
2. A head-to-tail dissolve is applied across the loop boundary:
   - The first 0.8s of the sequence is split as `[head]`.
   - The remaining sequence `[main]` runs from $t = 0.8\text{s}$ through $11.5\text{s}$.
   - At $t = 9.9\text{s}$ of `[main]`, a 0.8s `xfade` dissolves into `[head]`.
3. **Loop Verification**:
   - The final frame of the video dissolves smoothly into the texture and luminance of the opening frame.
   - Mean RGB difference between the very first frame and the very last frame is **8.6 / 255** (subtle, natural frame-to-frame ambient delta, zero cut discontinuity).

---

## 4. Color Grading & Look Development

To harmonize with Scarap_Yukti’s dark graphite theme (`--bg-canvas: #090b0e`, `--border-subtle: #262c36`, `--accent-lime: #a3e635`):

1. **Downsampling & Filtering**:
   - 4K sources downsampled to 1080p using high-order Lanczos filtering (`scale=1920:1080:flags=lanczos`), eliminating aliasing on microchip pins and conveyor mesh.
2. **Contrast & Black Point**:
   - Contrast adjusted with `eq=contrast=1.05:brightness=-0.02` to anchor shadow details and prevent washed-out milky blacks.
3. **Color Saturation**:
   - Saturation lowered to `0.88` (`eq=saturation=0.88`) to remove harsh oversaturation and create a muted, high-end documentary film grade.
4. **CSS Backdrop Synergy**:
   - In `App.css`, `.hero-background-video` is displayed with `opacity: 0.22`, blending behind `.hero-video-overlay` (radial gradient from `rgba(9, 11, 14, 0.4)` to `rgba(9, 11, 14, 0.96)`). Text legibility on top of the hero remains 100% compliant with WCAG AAA contrast standards.

---

## 5. Technical Encoding Specifications

```bash
ffmpeg -y \
  -i source1_ewaste.mp4 \
  -i source2_pcb_macro.mp4 \
  -i source3_conveyor.mp4 \
  -filter_complex "[0:v]trim=1.0:5.0,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=24,format=yuv420p,eq=contrast=1.05:brightness=-0.02:saturation=0.88[v0]; \
                   [1:v]trim=2.0:6.0,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=24,format=yuv420p,eq=contrast=1.05:brightness=-0.02:saturation=0.88[v1]; \
                   [2:v]trim=5.0:9.5,setpts=PTS-STARTPTS,scale=1920:1080:flags=lanczos,fps=24,format=yuv420p,eq=contrast=1.05:brightness=-0.02:saturation=0.88[v2]; \
                   [v0][v1]xfade=transition=fade:duration=0.5:offset=3.5[x1]; \
                   [x1][v2]xfade=transition=fade:duration=0.5:offset=7.0[raw]; \
                   [raw]split[m][h]; \
                   [m]trim=0.8:11.5,setpts=PTS-STARTPTS[main]; \
                   [h]trim=0.0:0.8,setpts=PTS-STARTPTS[head]; \
                   [main][head]xfade=transition=fade:duration=0.8:offset=9.9,format=yuv420p[outv]" \
  -map "[outv]" \
  -an \
  -c:v libx264 \
  -profile:v high \
  -level 4.1 \
  -pix_fmt yuv420p \
  -preset slow \
  -crf 24 \
  -movflags +faststart \
  public/videos/scarap-hero.mp4
```

### Output Validation Metrics:
- **Duration**: 10.708 s
- **Resolution**: 1920×1080
- **Frame Rate**: 24.00 fps
- **Video Bitrate**: 3,198.5 kbps
- **Container**: MP4 (MPEG-4 Part 14) with faststart atom at head
- **File Size**: **4,281,209 bytes (4.08 MB)** — squarely inside the 3–5 MB target range.
- **Audio Stream**: None (`-an` strictly enforced, 0 audio channels).
- **Poster Frame**: Extracted at $t = 1.500\text{s}$ as `public/videos/scarap-hero-poster.webp` (215.8 KB, WebP Q88).

---
name: Clinical Intelligence System
colors:
  surface: '#121416'
  surface-dim: '#121416'
  surface-bright: '#38393c'
  surface-container-lowest: '#0c0e10'
  surface-container-low: '#1a1c1e'
  surface-container: '#1e2022'
  surface-container-high: '#282a2c'
  surface-container-highest: '#333537'
  on-surface: '#e2e2e5'
  on-surface-variant: '#bbc9cf'
  inverse-surface: '#e2e2e5'
  inverse-on-surface: '#2f3033'
  outline: '#859399'
  outline-variant: '#3c494e'
  surface-tint: '#4cd6ff'
  primary: '#a4e6ff'
  on-primary: '#003543'
  primary-container: '#00d1ff'
  on-primary-container: '#00566a'
  inverse-primary: '#00677f'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#ffd59c'
  on-tertiary: '#442b00'
  tertiary-container: '#feb127'
  on-tertiary-container: '#6b4700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b7eaff'
  primary-fixed-dim: '#4cd6ff'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#004e60'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffddb1'
  tertiary-fixed-dim: '#ffba49'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#121416'
  on-background: '#e2e2e5'
  surface-variant: '#333537'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 42px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '450'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-safe: 24px
---

## Brand & Style

This design system is engineered for elite medical environments where split-second decision-making and deep clinical research intersect. The personality is **authoritative, analytical, and uncompromising**. It avoids all decorative flourishes in favor of "Mission-Control" sophistication.

The aesthetic follows a **Refined Technical Minimalism** approach. It utilizes a dark, low-fatigue environment to prioritize high-contrast data visualization and diagnostic imagery. Every visual element must serve a functional purpose, evoking the feeling of a precision instrument rather than a consumer application. The emotional response should be one of absolute trust, clarity, and cognitive ease under high-pressure scenarios.

## Colors

The palette is strictly functional, utilizing a high-contrast dark-mode foundation to reduce eye strain during extended clinical shifts.

- **Base Layers:** The primary background uses a deep graphite to provide maximum contrast for diagnostic data. Surface layers use subtle shifts in value to indicate hierarchy.
- **Accents:** Icy Cyan is reserved for active states, primary actions, and "AI-assisted" insights. Clinical Blue is used for structural signals and secondary interactive elements.
- **Semantic States:** Status colors (Red, Amber, Green) are high-chroma to ensure they pierce through the dark interface during critical alerts. No decorative gradients are permitted; use solid fills or subtle 1px strokes to maintain medical-grade precision.

## Typography

Typography is treated as a critical data layer. **Inter** provides the necessary legibility for patient records and clinical notes, while **JetBrains Mono** is introduced for tabular data, timestamps, and vitals to ensure numerical alignment and technical clarity.

- **Hierarchy:** Use tight leading for headers to maintain density, but generous leading (1.5x+) for body text to aid in reading long-form clinical reports.
- **Labels:** Small-caps are used for metadata categories to distinguish them from actionable data.
- **Density:** On mobile devices, headline sizes should scale down by 20% to prevent excessive wrapping in data-heavy views.

## Layout & Spacing

The layout philosophy follows a **Dense Modular Grid**. Efficiency of information is prioritized over white space.

- **Grid Model:** A 12-column fluid grid is used for desktop dashboards. Components should snap to a 4px baseline grid to maintain mathematical rigor.
- **Panels:** Use a "Master-Detail" layout pattern. Left-hand navigation is collapsed by default to maximize the diagnostic workspace. Right-hand "Intelligence" panels provide contextual AI insights without obscuring the primary patient record.
- **Breakpoints:** 
  - **Desktop (1440px+):** Full multi-panel view.
  - **Tablet (768px-1024px):** Single active panel with collapsible sidebars. 
  - **Mobile (<768px):** Linearized data cards; charts shift to simplified sparklines.

## Elevation & Depth

This system avoids traditional drop shadows to maintain a flat, "instrument-panel" feel. 

- **Tonal Layering:** Depth is conveyed through surface color stepping. The base is `#0A0C0E`. Floating modals or popovers use `#1C2128` with a 1px solid border in `#444C56`.
- **Ghost Outlines:** Use low-opacity borders (`#30363D`) to define structural boundaries. 
- **Active State:** Instead of elevation, use the Primary Accent (`#00D1FF`) as a 2px left-border or a subtle outer glow to indicate focus.
- **Glassmorphism:** Reserved strictly for ephemeral overlays (e.g., toast notifications) with a `20px` backdrop blur and 10% opacity white tint to suggest a "heads-up display" effect.

## Shapes

The shape language is **Technical and Precise**. 

- **Radius:** A consistent `4px` (Soft) radius is applied to all buttons, input fields, and containers. This provides just enough approachable "human" feel while maintaining a disciplined, professional structure.
- **Interactive Elements:** Buttons utilize the 4px radius. Smaller UI components like checkboxes and status tags also follow this `0.25rem` rule.
- **Exceptions:** Search bars and specific "AI Prompt" inputs may use a fully rounded (Pill) shape to distinguish "Human Input" from "System Output."

## Components

- **Clinical Tables:** High-density rows (32px height) with 1px bottom borders. Hover states should trigger a subtle `#161B22` background fill. Column headers use `label-caps`.
- **Intelligence Cards:** Surface-raised containers with a subtle `Icy Cyan` top-border (2px) to denote AI-generated content.
- **Buttons:** 
  - *Primary:* Solid `#00D1FF` fill with black text for maximum prominence.
  - *Secondary:* Ghost style with `#30363D` border and white text.
- **Status Indicators:** Compact, pill-shaped tags. Use high-contrast backgrounds (e.g., Red for Critical) with white text. Include a small leading dot for color-blind accessibility.
- **Input Fields:** Dark background (`#0A0C0E`), 1px border (`#30363D`). On focus, the border transitions to `#00D1FF` with no outer shadow.
- **Anatomical Containers:** Use `#161B22` background for 3D model viewers or imaging slots, framed with a hairline `#30363D` border to isolate the imagery from the UI text.
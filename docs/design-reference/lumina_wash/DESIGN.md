---
name: Lumina Wash
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cbbd'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849588'
  outline-variant: '#3b4a40'
  surface-tint: '#00e293'
  primary: '#cdffde'
  on-primary: '#003921'
  primary-container: '#00f5a0'
  on-primary-container: '#006b43'
  inverse-primary: '#006c44'
  secondary: '#ffdb9d'
  on-secondary: '#412d00'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#fff0ef'
  on-tertiary: '#68000b'
  tertiary-container: '#ffcbc7'
  on-tertiary-container: '#b91623'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#50ffaf'
  primary-fixed-dim: '#00e293'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005232'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930014'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1280px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for efficiency, clarity, and reliability within a high-utility environment. It targets tech-savvy urban residents who value real-time data and seamless task management.

The aesthetic follows a **Corporate Modern** style with a heavy lean toward **Dark Mode Minimalism**. By utilizing deep slate backgrounds and high-vibrancy status indicators, the UI mimics a control center or dashboard. The emotional response should be one of "calm control"—turning the mundane chore of laundry into a predictable, data-driven experience.

Visual principles include:
- **High Information Density:** Maximizing visibility of machine status without clutter.
- **Visual Hierachy by Exception:** Using neutral tones for static elements and bright, saturated colors exclusively for state-changes (Free, In Use, Error).
- **Technical Precision:** Crisp borders and systematic alignment to reflect the mechanical nature of the service.

## Colors

The palette is optimized for low-light environments and OLED displays, emphasizing legibility and status recognition.

- **Primary (Success/Free):** A vibrant mint-green. Used for "Available" states and primary action confirmations.
- **Secondary (Warning/In Use):** A warm amber. Indicates active cycles or "Busy" states.
- **Tertiary (Error/Out of Order):** A surgical red. Reserved for hardware failures or unavailable machines.
- **Neutrals:** The background uses a near-black slate to provide maximum contrast for status dots. Surface levels differentiate the global background from individual machine cards.

## Typography

The system uses **Inter** exclusively to maintain a clean, Grotesque, and highly legible interface across all device scales.

- **Headlines:** Use tight letter-spacing and bold weights to establish a strong section hierarchy (e.g., "WASHERS" vs "DRYERS").
- **Machine IDs:** Displayed in `title-lg` or `headline-sm` for immediate recognition during physical navigation of the laundry room.
- **Status Text:** Uses `body-md` with high-contrast colors corresponding to the machine state.
- **Metadata:** Smaller labels (`label-lg`) are used for secondary info like "agent confidence" or "time remaining," set in a muted grey to avoid competing with primary status info.

## Layout & Spacing

The layout employs a **Fluid-to-Fixed Grid System** that ensures usability from handheld mobile devices to large-format wall monitors.

- **Mobile (375px - 785px):** Single column layout. Machine cards span the full width of the container minus 16px side margins.
- **Tablet (786px - 1023px):** 2-column grid. Gutters are fixed at 16px.
- **Desktop (1024px - 1279px):** 3-column grid.
- **Large Desktop (1280px+):** 4-column grid. The main content area is capped at **1280px** and centered on the screen to prevent excessive line lengths and eye strain.

The spacing rhythm is based on a 4px baseline, ensuring all components align perfectly in vertical stacks.

## Elevation & Depth

To maintain a "technological" feel, the system avoids heavy, traditional drop shadows. Instead, it uses **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Background):** Deepest layer (`#0A0A0A`).
- **Level 1 (Cards/Containers):** Raised surface (`#1E1E1E`) with a subtle 1px border (`#2A2A2A`). 
- **Active State:** When a machine is selected or hovered, the border color shifts to the status color (e.g., Green for Free) to create a "glow" effect without using heavy blurs.
- **Interlays:** Modals and dropdowns use a slightly lighter surface (`#2A2A2A`) with a subtle ambient shadow (Black, 25% opacity, 10px blur) to separate them from the main grid.

## Shapes

The design system utilizes **Soft (0.25rem)** roundedness to strike a balance between industrial hardware and modern software.

- **Machine Cards:** 0.5rem (`rounded-lg`) corner radius for a friendly but structured appearance.
- **Buttons & Inputs:** 0.25rem corner radius to maintain the "technical" look.
- **Status Indicators:** Perfect circles (50% radius) for a classic "LED light" metaphor.
- **Filter Chips:** 1rem (`rounded-xl`) to distinguish them clearly from the rectangular machine cards.

## Components

### Equipment Cards
The core component. Features the Machine ID top-left, a status dot top-right, and the primary status text centered or bottom-left. Secondary metadata (e.g., "confirm on arrival") should be 60% opacity.

### Filter Chips
Toggleable elements for "Washers," "Dryers," and "Available Only." Active state: Primary color background with dark text. Inactive state: Surface-variant background with light-grey text.

### Status Bars
Used for global room health (e.g., "13 free • 10 in use"). These appear at the very top of the scroll view. Use dot indicators next to each category to reinforce color meaning.

### Toggle Switches
Used for "Auto-refresh" or "Integrator mode." Use a slim track with a high-contrast thumb. When active, the track should take the Primary color.

### Input Fields
Dark-themed with a 1px border. Focus state should use the Primary color for the border. Labels must be placed outside the field for persistent visibility.

### Action Buttons
Primary buttons use the Primary color (`#00F5A0`) with black text for maximum contrast. Secondary/Ghost buttons use an outline only. Red is reserved strictly for "Delete" or "Report Error" actions.
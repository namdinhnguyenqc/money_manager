---
name: "TrọCare Web Admin"
description: "A dependable operations workspace for Vietnamese boarding-house management."
colors:
  operational-blue: "#2563EB"
  operational-blue-deep: "#1D4ED8"
  operational-blue-soft: "#EFF6FF"
  action-cyan: "#06B6D4"
  success: "#10B981"
  warning: "#F59E0B"
  danger: "#EF4444"
  page: "#F8FAFC"
  surface: "#FFFFFF"
  border: "#E2E8F0"
  ink: "#0F172A"
  muted-ink: "#64748B"
typography:
  headline:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  field: "8px"
  control: "8px"
  card: "12px"
  large-control: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  page: "32px"
components:
  button-primary:
    backgroundColor: "{colors.operational-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.operational-blue-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
---

# Design System: TrọCare Web Admin

## Overview

**Creative North Star: "Bàn điều hành rõ việc"**

TrọCare should feel like a dependable daily operations desk: calm enough for long working sessions, explicit enough for financial and contract decisions, and familiar to Vietnamese boarding-house owners. Design serves the task. Density is comfortable rather than sparse, with strong state visibility and predictable controls across owner and admin workflows.

The system rejects generic AI-generated SaaS dashboards, decorative glassmorphism, neon or gradient-heavy finance interfaces, excessive card nesting, gratuitous animation, and unfamiliar custom controls. Public marketing surfaces may be more expressive, but authenticated product surfaces remain restrained and operational.

**Key Characteristics:**

- Clear Vietnamese labels and action-oriented hierarchy.
- Restrained blue accent on neutral, high-contrast surfaces.
- Consistent state language for occupancy, contracts, invoices, and payments.
- Responsive structure designed for desktop operations and mobile checks.
- Accessible behavior under keyboard navigation, reduced motion, and interrupted networks.

## Colors

The palette uses confident operational blue sparingly, with neutral slate surfaces and semantic colors reserved for real state.

### Primary

- **Operational Blue:** The single primary action, focus, and active-navigation color.
- **Deep Operational Blue:** Hover and pressed treatment for primary actions.
- **Soft Operational Blue:** Selected rows, filters, and informational emphasis.

### Secondary

- **Action Cyan:** Reserved for the public brand gradient and exceptional informational accents; it is not a second primary action color inside the product.

### Tertiary

- **Success, Warning, and Danger:** Communicate confirmed semantic state. Always pair color with a label or icon.

### Neutral

- **Page:** The application canvas behind primary surfaces.
- **Surface:** Forms, tables, dialogs, and explicit content groups.
- **Border:** Structural separation without heavy elevation.
- **Ink and Muted Ink:** Primary and supporting copy. Muted ink is not used for essential instructions.

### Named Rules

**The One Action Color Rule.** Operational Blue is the only primary action color in authenticated product surfaces.

**The State Is Evidence Rule.** Success, warning, and danger colors are forbidden as decoration; they must communicate a real domain state and include a non-color cue.

## Typography

**Display Font:** Be Vietnam Pro with system sans-serif fallback

**Body Font:** Be Vietnam Pro with system sans-serif fallback

**Character:** A single Vietnamese-optimized sans family keeps data, labels, and longer operational copy coherent. Weight and spacing establish hierarchy without introducing a decorative display voice.

### Hierarchy

- **Headline** (800, 24px, 1.25): Page-level titles and major workflow steps.
- **Title** (700, 18px, 1.4): Sections, dialogs, and grouped data headings.
- **Body** (400–500, 14px, 1.5): Instructions, values, and table content; prose stays within 65–75 characters when possible.
- **Label** (600–700, 12px, 1.4): Form labels, metadata, and compact controls; sentence case is the default.

### Named Rules

**The Vietnamese First Rule.** Labels must remain readable with Vietnamese diacritics at their final rendered size; excessive tracking and all-uppercase copy are prohibited for routine labels.

## Elevation

Depth is structural and restrained. Background layers and borders establish most hierarchy; low shadows appear on discrete interactive surfaces, menus, and dialogs rather than on every container.

### Shadow Vocabulary

- **Surface Rest:** `0 1px 2px rgba(0, 0, 0, 0.05)` for controls and compact floating surfaces.
- **Card Rest:** `0 1px 3px rgba(15, 23, 42, 0.08)` for a top-level grouped surface when a border alone is insufficient.

### Named Rules

**The Flat-By-Default Rule.** A surface uses a border or a shadow at rest, not both as decoration; stronger elevation is reserved for a temporary layer or interaction state.

## Components

Components feel restrained and confident: familiar controls, visible focus, compact feedback, and no ornamental choreography.

### Buttons

- **Shape:** Gently curved controls (8px), with 12px limited to large calls to action.
- **Primary:** Operational Blue with white text, 40px default height, and 10px by 16px padding.
- **Hover / Focus:** Deep Operational Blue on hover; a visible two-pixel focus ring with offset. State transitions run 150–200ms and respect reduced motion.
- **Secondary / Ghost:** Neutral bordered or transparent controls. Destructive actions use danger color only after the action is clearly labeled.

### Chips

- **Style:** Full-pill status and filter labels use soft semantic backgrounds, readable text, and a light border.
- **State:** Selected filters combine fill, text weight, and an accessible state attribute; status chips always include text.

### Cards / Containers

- **Corner Style:** Restrained 12px radius.
- **Background:** Surface white on the Page canvas.
- **Shadow Strategy:** Flat by default; one low shadow only when a discrete surface requires separation.
- **Border:** A single neutral structural border when no shadow is used.
- **Internal Padding:** 16px for compact groups, 24px for forms and primary workflow sections.

### Inputs / Fields

- **Style:** White background, neutral border, 8px radius, and 10px by 12px padding.
- **Focus:** Operational Blue border with a subtle focus ring.
- **Error / Disabled:** Errors are announced inline and linked to the field; disabled identity fields remain legible and explain why they cannot be edited.

### Navigation

Navigation uses familiar side and bottom patterns, sentence-case Vietnamese labels, a stable active state, and responsive structural collapse. Icons support labels and never replace them in primary navigation without an accessible name.

## Do's and Don'ts

### Do:

- **Do** make the next operational action obvious while keeping its financial, contract, or occupancy context visible.
- **Do** use Operational Blue for primary actions, active navigation, and focus only.
- **Do** provide default, hover, focus, active, disabled, loading, empty, and error states for interactive components.
- **Do** preserve entered form values after server validation errors and offer a clear retry path after network errors.
- **Do** meet WCAG 2.2 AA contrast and keyboard requirements, including reduced-motion alternatives.

### Don't:

- **Don't** use generic AI-generated SaaS dashboards or repeat identical icon-card grids as the page structure.
- **Don't** use decorative glassmorphism, neon or gradient-heavy finance interfaces, or gradient text.
- **Don't** nest cards or pair a decorative border with a wide soft shadow on the same surface.
- **Don't** add gratuitous animation or reinvent standard form, dialog, navigation, or table controls.
- **Don't** make playful visual choices when users are handling contracts, occupancy, invoices, or money.

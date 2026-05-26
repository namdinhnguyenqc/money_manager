# Design Tokens & UI/UX Standards

This document establishes the official UI/UX design language, custom colors, layout grids, components, and form behaviors for both the TrọCare Next.js web administration dashboard and the Expo React Native mobile application.

---

## 1. Color Palette System

TrọCare adopts a cohesive dark/light mode token architecture to maintain accessibility and visual balance. Generic raw primary colors (e.g. plain red, pure blue) are strictly prohibited.

### 1.1 Web HSL Tailwind Schema
Web components use CSS HSL variables configured within Tailwind:

| Color Token | Variable Name | HSL Value | Visual Representation |
|---|---|---|---|
| **Primary** | `--primary` | `262 83% 58%` | Deep vibrant royal purple (Brand color). |
| **Primary Foreground**| `--primary-foreground` | `210 20% 98%` | Clean off-white. |
| **Secondary** | `--secondary` | `220 14% 96%` | Warm light-gray backing. |
| **Destructive** | `--destructive` | `0 84% 60%` | Curated soft crimson (alerts, validation errors).|
| **Background** | `--background` | `0 0% 100%` | Pure crisp white surface. |
| **Card Backing** | `--card` | `210 20% 98%` | Sleek slate tint background. |
| **Muted Grey** | `--muted` | `210 40% 96.1%` | Low-contrast text and border shading. |

### 1.2 Mobile Hex Color Equivalents
Because React Native does not support Tailwind HSL CSS variables natively, mobile components reference equivalent Hex color tokens located under `mobile/constants/Colors.ts`:

```typescript
export const Colors = {
  light: {
    primary: '#8A3FFC',       // Deep vibrant purple
    primaryLight: '#F3E8FF',  // Very soft purple tint (badges/selections)
    background: '#FFFFFF',    // Crisp white background
    card: '#F8FAFC',          // Light slate gray for cards
    text: '#1E293B',          // Dark slate text
    textMuted: '#64748B',     // Cool gray muted text
    border: '#E2E8F0',        // Border gray line
    destructive: '#FA4B4B',   // Curated crimson error red
    success: '#24A148',       // Custom green (paid invoices)
    warning: '#F1C21B',       // Amber yellow (pending bills)
    maintenance: '#A78BFA',   // Purple/lavender for room repairs
  },
  dark: {
    primary: '#A78BFA',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: '#334155',
    destructive: '#FF6B6B',
    success: '#4ADE80',
    warning: '#FBBF24',
    maintenance: '#C084FC',
  }
};
```

---

## 2. Layout, Grids & Typography Rules

### 2.1 Web Layout & Grid
- **Sidebar Width**: Employs a fixed left-aligned Navigation Sidebar (`260px` width) with a flexible right-hand content viewport.
- **Fluid Grid Scaling**:
  - Mobile viewport (< 768px): Single column.
  - Tablet viewport (768px - 1024px): 2 columns.
  - Desktop viewport (> 1024px): 3 to 4 columns.
- **Max Content Bounds**: Right-side dashboards restrict content bounds to `max-w-7xl` with uniform outer margins (`px-6 py-8`).

### 2.2 Mobile Layout & Spacing
Mobile interfaces must remain spacious and avoid cramped layouts:
- **Consistent Paddings**: All screen containers use a standard spacing scale:
  - Outer margins: `16dp` (standard) or `24dp` (spacious headers).
  - Component gap spacing: `12dp` or `16dp`.
- **Card Margins**: Rounded corners are uniform at `12dp` or `16dp` (`borderRadius: 12`).
- **Input Spacing**: Field paddings are standard at `12dp` vertically and `16dp` horizontally.

### 2.3 Typography Hierarchy
TrọCare utilizes standard premium fonts loaded via Google Fonts (e.g., **Inter** or **Outfit**) to maintain an elegant, modern visual tone.

- **Main Dashboard Title**: Bold H1 at `30px`/`30dp` size (`font-extrabold tracking-tight`).
- **Feature Headers**: H2 at `24px`/`24dp` size (`font-bold`).
- **Section Headers**: H3 at `18px`/`18dp` size (`font-semibold`).
- **Body & Paragraphs**: Regular text at `14px`/`14dp` size (`text-sm` or `fontSize: 14`).

---

## 3. UI Micro-Animations & Interactivity

Static, unreactive interfaces fail to provide a premium feel. We leverage subtle hardware-accelerated micro-animations to enhance responsiveness.

- **Web Hover States**: Interactive links and buttons must smoothly transition properties over `150ms` using standard easing cubic-bezier curves:
  ```css
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  ```
- **Mobile Feedback**: All clickable elements must use native interactive components (`Pressable` or `TouchableOpacity`) with visual touch feedback (e.g. slight opacity reduction to `0.7` or ripple effects).
- **Form Controls Focus**: Inputs and textareas must display an elegant primary focus ring with matching light shadows on selection:
  ```css
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
  ```
  *Mobile implementation*: Input borders change from gray (`#E2E8F0`) to active primary (`#8A3FFC`) on focus with an active outline duration of `100ms`.

---

## 4. Skeletal Loaders & Async State Management

Blocking UI updates during network operations is unacceptable. Developers must implement skeletal outlines to represent content structure during loads.

### 4.1 Skeleton Component Pattern
Skeletal placeholders mimic actual text, image, or card containers, featuring a subtle breathing glow effect:

- **Web (React/Tailwind)**:
  ```tsx
  export function InvoiceCardSkeleton() {
    return (
      <div className="border rounded-xl p-6 bg-card animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
    );
  }
  ```
- **Mobile (React Native/Animated)**:
  Uses an opacity pulse loop utilizing React Native's `Animated` library:
  ```tsx
  import React, { useEffect, useRef } from 'react';
  import { Animated, View } from 'react-native';

  export function SkeletonPlaceholder({ style }) {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }, [pulseAnim]);

    return <Animated.View style={[{ opacity: pulseAnim, backgroundColor: '#E2E8F0', borderRadius: 4 }, style]} />;
  }
  ```

---

## 5. Forms, Validation Alerts, and Fields

Form designs must support logical user flows and present real-time inline errors.

- **Disabled Identity Fields**: Attributes populated from authentication context (such as the landlord's email address) must render in a disabled visual state (gray background, `cursor-not-allowed`) to inform users that they cannot be modified.
- **Inline Field Errors**: Forms must display validation errors immediately below the invalid input using standard destructive red warning text.
- **Preserve User Inputs**: If a backend operation fails (e.g., due to a duplicate phone conflict), the form must preserve all current user-entered data rather than clearing inputs or resetting the form state.

# Design Guidelines: Academic Writing Evaluator

## Design Approach

**Selected System**: Productivity-focused design inspired by **Grammarly**, **Notion**, and **Linear**
**Rationale**: This is a utility-first application where clarity, readability, and efficient information display are paramount. The design should convey professionalism and academic credibility while keeping the interface clean and uncluttered.

**Core Principles**:
- Clarity over decoration
- Information hierarchy through typography and spacing
- Professional, trustworthy aesthetic
- Content-first presentation

---

## Typography

**Font Families** (via Google Fonts):
- **Primary (UI)**: Inter - for interface elements, buttons, labels
- **Reading (Content)**: Source Serif Pro - for long-form feedback text and suggestions

**Scale & Hierarchy**:
- **Page Title**: text-3xl, font-semibold (Inter)
- **Panel Headers**: text-xl, font-semibold (Inter)
- **Section Labels**: text-sm, font-medium, uppercase tracking-wide (Inter)
- **Scores (Large)**: text-5xl, font-bold (Inter) - overall score display
- **Scores (Small)**: text-2xl, font-semibold (Inter) - criterion scores
- **Body Text**: text-base, leading-relaxed (Source Serif Pro) - for suggestions
- **Metadata**: text-sm (Inter) - word count, weights, percentages

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Tight spacing: p-2, gap-2
- Standard spacing: p-4, gap-4, mb-6
- Section spacing: p-8, py-12
- Large breathing room: p-16

**Two-Panel Layout**:
- Desktop: 40/60 split (Input: 40%, Results: 60%)
- Tablet: Single column, stacked
- Mobile: Single column, stacked

**Container Structure**:
- Full viewport height with fixed header
- Scrollable panels independently
- Max-width on content: max-w-7xl centered

---

## Component Library

### Input Panel (Left Side)
**Textarea Component**:
- Large, comfortable input area (min-h-96)
- Subtle border with focus state (ring-2 on focus)
- Monospace font option for pasted content
- Padding: p-6

**Section Selector**:
- Dropdown with clear visual hierarchy
- Show all 8 sections with concise labels
- Active state clearly distinguished

**Metadata Display**:
- Character/word count in muted text (text-sm)
- Position: bottom-right of textarea
- Update live as user types

**Primary Action Button**:
- Prominent "Evaluate" button
- Full-width on mobile, auto-width on desktop
- Disabled state when no text entered

### Results Panel (Right Side)
**Overall Score Display**:
- Hero number: Very large (text-6xl), bold
- Circular progress indicator or simple large numeral with "/10"
- Centered at top of results panel
- Background card with subtle elevation

**Criterion Cards**:
- Grid layout: 1 column on mobile, 2 columns on desktop
- Each card contains:
  - Criterion name (font-semibold)
  - Weight percentage (text-sm, muted)
  - Score with visual indicator (progress bar or number)
  - Expandable suggestion section
- Spacing: gap-4 between cards
- Padding: p-6 per card
- Border or subtle shadow for definition

**Suggestions Section**:
- Expandable accordion pattern
- Rich text formatting for readability
- Use Source Serif Pro for suggestion content
- Clear visual separation from scores

**Action Buttons**:
- "Copy Results" - secondary button style
- Positioned at bottom of results panel

---

## Visual Treatment

**Cards & Containers**:
- Subtle borders (border width: 1px)
- Minimal shadows (shadow-sm only)
- Rounded corners: rounded-lg consistently

**Progress/Score Indicators**:
- Use horizontal bars for criterion scores
- Visual scaling: width represents score out of 10
- Clearly labeled with numeric value

**States**:
- Hover: Subtle background shift
- Focus: Clear ring indicator (ring-2)
- Disabled: Reduced opacity (opacity-50)
- Loading: Spinner or skeleton states for evaluation in progress

---

## Responsive Behavior

**Desktop (lg:)**: Two-panel side-by-side
**Tablet (md:)**: Single column, input above results
**Mobile (base)**: Single column, optimized touch targets (min 44x44px)

---

## Content Density

- Generous line-height for readability (leading-relaxed on feedback text)
- Strategic use of whitespace between criterion cards
- Group related information (criterion name + weight + score)
- Avoid cramming; let content breathe

---

## Professional Polish

- Consistent elevation hierarchy (flat > subtle shadow > cards)
- Restrained use of visual effects
- No animations except subtle transitions (150ms) on state changes
- Professional academic tone throughout UI copy
- Error states clearly communicated with helpful messages

---

## Images

**No hero images needed** - this is a utility application focused on functionality. The interface should be clean and direct, launching immediately into the two-panel workspace without marketing fluff.
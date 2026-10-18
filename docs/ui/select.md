# Custom Select Component & Dropdown Styling

## 1. Overview

The custom `Select` component provides an accessible, tactile dropdown styled to match DSSConfessions' neo-brutalist "Sunny Mixtape / Record Shop" design system (2px ink borders, solid offset drop shadows, pill/rounded corners, bold typography).

Component source: [`client/src/components/ui/Select.jsx`](file:///c:/Coding/JavaScript/Project/dss-confessions/client/src/components/ui/Select.jsx).

---

## 2. Component API

```jsx
import Select from "./components/ui/Select";

<Select
  id="favorite-genre"
  name="genre"
  label="Favorite Genre"
  placeholder="Choose a vibe..."
  options={[
    { value: "indie", label: "Indie Pop", description: "Breezy guitar riffs" },
    { value: "lofi", label: "Lo-Fi Beats", description: "Late-night studying" },
    { value: "rnb", label: "Soul / R&B", description: "Warm and melodic" },
    { value: "rock", label: "Alternative Rock", disabled: true }
  ]}
  value={selectedGenre}
  onChange={(val) => setSelectedGenre(val)}
  required={true}
  error={formError}
/>
```

### Props
| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | auto-generated | Unique element ID (used for ARIA associations) |
| `name` | `string` | `undefined` | Hidden input field name for standard form submission |
| `label` | `string` | `undefined` | Accessible label rendered above the trigger |
| `options` | `Array<{value, label, description?, disabled?}>` | `[]` | List of selectable choices |
| `value` | `string` | `""` | Currently selected value |
| `onChange` | `(value: string) => void` | `noop` | Selection callback |
| `placeholder`| `string` | `"Select an option..."` | Placeholder when value is empty |
| `required` | `boolean` | `false` | Marks field as required with coral asterisk |
| `disabled` | `boolean` | `false` | Disables interaction and reduces opacity |
| `error` | `string` | `""` | Error message displayed beneath control |

---

## 3. Hidden Scrollbars & Fade Hints

In earlier versions, the dropdown list displayed styled native scrollbars. In the current design:
1. Native scrollbars inside the option list are hidden via `.no-scrollbar`.
2. Content remains fully scrollable by mouse wheel, trackpad, touch swipe, and keyboard arrows.
3. CSS-only soft top/bottom fade hints (`.scroll-fade-hints`) indicate when scrollable content extends above or below the viewport:

```css
.scroll-fade-hints {
  background-image:
    linear-gradient(var(--surface) 30%, rgba(255, 255, 255, 0)),
    linear-gradient(rgba(255, 255, 255, 0), var(--surface) 70%),
    radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0)),
    radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0));
  background-repeat: no-repeat;
  background-size: 100% 40px, 100% 40px, 100% 14px, 100% 14px;
  background-attachment: local, local, scroll, scroll;
}
```

The `background-attachment: local, local, scroll, scroll` technique ensures shadows appear dynamically when scrolled away from top/bottom bounds without any JavaScript scroll listeners.

This exact styling pattern is also applied to:
- The **Modal** dialog (`Modal.jsx`)
- The **Spotify Song Search dropdown** in `SubmitView.jsx`

---

## 4. Accessibility & Mobile Optimization

### Desktop / Fine Pointer
- Adheres to the **WAI-ARIA 1.2 Combobox / Listbox** pattern.
- Trigger button: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, `aria-activedescendant`.
- Options: `role="option"`, `aria-selected`, `aria-disabled`.
- Keyboard support:
  - `ArrowDown` / `ArrowUp`: Move focus between enabled options.
  - `Home` / `End`: Jump to first / last enabled option.
  - `Enter` / `Space`: Select highlighted option.
  - `Escape`: Close dropdown and return focus to trigger.
  - `Tab`: Close dropdown without selecting.
  - Character keys: Typeahead buffer (matches option labels with 500ms debounce).

### Mobile / Coarse Pointer (`@media (pointer: coarse)`)
- Automatically switches to an accessible native `<select>` element rendered in place.
- Allows iOS Wheel Picker and Android Material Dialog pickers to handle selection natively, ensuring zero touch lag, native zoom prevention, and familiar mobile UX while preserving identical exterior neo-brutalist styling.

### Portal Rendering & Modal Integration
- When opened on desktop, the popover list is rendered into `document.body` or into the currently active `<dialog>` container via React Portal.
- This prevents `overflow: hidden` parent clipping while preserving modal focus traps.


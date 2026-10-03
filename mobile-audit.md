# Mobile UX Audit — Congo Commerce

**Dimension:** Mobile (Touch targets, safe areas, drawer behavior, bottom nav, viewport handling, pull-to-refresh, swipe gestures, iOS/Android conventions, Apple §2 Direct Manipulation, §8 Hint Direction)

---

## F-01 — Cart icon touch target shrunk by badge overlay

| Field | Value |
|---|---|
| file | `src/components/layout/HeaderActions.jsx` |
| line | 29 |
| dimension | mobile |
| severity | high |
| title | Cart button badge shrinks effective tap area |
| description | The cart button is `h-11 w-11` (44px) but the badge is `absolute -right-1 -top-1 min-w-5`, overlapping the corner. The remaining tap target is ~32×32px, below Apple's 44pt minimum. |
| scenario | User tries to tap the cart badge count on a phone — the badge itself is not the link, so the tap lands on the shrunken corner of the button and misses. |
| recommendation | Enlarge the button to `h-12 w-12` and reposition the badge inward (`-right-0.5 -top-0.5` kept, but parent padded). Code: `className="relative h-12 w-12 ..."` on the Link, badge stays as-is. |
| applePrinciple | §2 Direct Manipulation — touch target must be large enough for the finger |

---

## F-02 — Drawer closes on every route change, including background navigation

| Field | Value |
|---|---|
| file | `src/components/MobileDrawer.jsx` |
| line | 41-43 |
| dimension | mobile |
| severity | medium |
| title | `useEffect` on `location.pathname` closes drawer even for non-user navigation |
| description | `useEffect(() => { onClose(); }, [location.pathname, onClose])` fires on any route change — including push/replace from inside the drawer's own `Link onClick={onClose}`. The drawer animates closed then instantly re-opens if the navigation triggers a re-render cycle. |
| scenario | User taps a drawer link → drawer closes → route change re-renders → drawer opens again briefly (flicker). |
| recommendation | Remove the `useEffect`; rely solely on `onClick={onClose}` on each Link. If closing on external route changes is needed, compare `location.pathname` against a `lastPathRef` and only close when it actually changed from outside. |
| applePrinciple | §1 Response — unexpected re-open feels laggy; §3 Interruptibility — never lock input |

---

## F-03 — No swipe-to-close on drawer, iOS users expect it

| Field | Value |
|---|---|
| file | `src/components/MobileDrawer.jsx` |
| line | 81-87 |
| dimension | mobile |
| severity | high |
| title | Drawer is a custom `<aside>`, no swipe-dismiss gesture |
| description | The drawer renders a raw `<aside>` with `aria-modal`, but there is no swipe-from-right-to-close gesture. iOS users expect to swipe the leading edge to dismiss a modal sheet. The native `vaul` Drawer component (in `src/components/ui/drawer.jsx`) supports this via `DrawerPrimitive.Root`, but MobileDrawer does not use it. |
| scenario | User opens the menu and wants to dismiss it quickly — must tap the X or the overlay, no swipe. |
| recommendation | Replace the custom `<aside>` with the vaul `Drawer` component (already in the codebase) or add a `onPointerDown` / touch handler that tracks horizontal drag distance and closes when dx > 80px. |
| applePrinciple | §2 Direct Manipulation — 1:1 tracking; §10 Gesture details — parallel detection |

---

## F-04 — Bottom nav ignores bottom safe area on iOS

| Field | Value |
|---|---|
| file | `src/components/layout/BottomNav.jsx` |
| line | 22 |
| dimension | mobile |
| severity | high |
| title | Bottom nav overlaps the home indicator on notched iOS devices |
| description | The nav is `fixed bottom-0` with no `pb-[env(safe-area-inset-bottom)]`. On iPhone X+ the home indicator covers the last nav item. |
| scenario | User taps the "Profile" tab but taps the home indicator instead — no navigation fires. |
| recommendation | Add `pb-[env(safe-area-inset-bottom)]` to the `<nav>` and `pt-[env(safe-area-inset-bottom)]` to a wrapper, or add `safe-area-inset-bottom` class. |
| applePrinciple | §2 Direct Manipulation — content must clear the home indicator |

---

## F-05 — Page transition always slides right-to-left, regardless of direction

| Field | Value |
|---|---|
| file | `src/components/layout/AppLayout.jsx` |
| line | 13-35 |
| dimension | mobile |
| severity | medium |
| title | Exit animation is always `x: -8` (left), wrong for forward navigation |
| description | The `exit` variant always slides left (`x: -8`), and `initial` always slides right (`x: 24`). When the user navigates forward, the old page should exit left — that works. But when the user goes back, the old page should exit right, and the new page should enter from the right. The current variants don't distinguish direction. |
| scenario | User taps "back" — the outgoing page slides left (looks like forward motion), confusing spatial consistency. |
| recommendation | Pass a `direction` prop ('forward' | 'back') to AppLayout and swap exit/initial x values: forward → exit x: -width, initial x: +width; back → exit x: +width, initial x: -width. |
| applePrinciple | §7 Spatial consistency — symmetric paths, anchored origins |

---

## F-06 — TopBar header action links have no press feedback on mobile

| Field | Value |
|---|---|
| file | `src/components/layout/TopBar.jsx` |
| line | 94-113 |
| dimension | mobile |
| severity | medium |
| title | Header icon links lack `active:scale` or `active:bg` feedback |
| description | The Heart, MessageCircle, Bell, User, Cart links in the TopBar have no `active:` variant — only `hover:bg-secondary`. On touch devices there is no visual press response, violating §1 Response. |
| scenario | User taps the cart icon — nothing visibly happens until the route transition starts. |
| recommendation | Add `active:scale-90 active:bg-accent transition-all duration-75 ease-out` to those Link className strings. |
| applePrinciple | §1 Response — instant press feedback |

---

## F-07 — Quantity stepper buttons below 44pt on mobile

| Field | Value |
|---|---|
| file | `src/components/QuantityStepper.jsx` |
| line | 5 |
| dimension | mobile |
| severity | medium |
| title | Stepper buttons use `min-h-11` (44px) but no horizontal padding |
| description | `min-h-11 min-w-11` gives 44px but the button is a bare icon with no label — the effective touch target is exactly 44×44px with zero margin. Apple recommends 44×44pt minimum *surrounding* space. |
| scenario | User taps the minus/plus button rapidly on a small screen — mis-taps land on the adjacent step or nothing. |
| recommendation | Use `h-12 w-12` (48px) for the buttons and center the icon, adding `p-3` to give surrounding padding. |
| applePrinciple | §2 Direct Manipulation — 44pt minimum touch target with spacing |

---

## F-08 — `user-select: none` on all `<a>` elements breaks text selection |
| Field | Value |
|---|---|
| file | `src/index.css` |
| line | 21-24 |
| dimension | mobile |
| severity | low |
| title | Global `user-select: none` on links prevents copy |
| description | `button, a, .bottom-nav-item { user-select: none }` prevents users from long-pressing a link to copy its URL or select text inside a nav link. |
| scenario | User wants to copy a product link from a nav item — cannot select the text. |
| recommendation | Remove `a` from the rule; keep `button, .bottom-nav-item`. Or scope to `.bottom-nav-item` only. |
| applePrinciple | §16 Flexibility — user must be able to select/copy |

---

## F-09 — No `inputMode` on search field |
| Field | Value |
|---|---|
| file | `src/components/layout/TopBar.jsx` |
| line | 79 |
| dimension | mobile |
| severity | low |
| title | Search input missing `inputMode` / `enterKeyHint` |
| description | The search `<input>` has no `inputMode` or `enterKeyHint="search"` attribute, so mobile keyboards may not show the search return key. |
| scenario | User types a query and taps return — keyboard may show "Enter" instead of "Search", and the form submission is less obvious. |
| recommendation | Add `inputMode="search" enterKeyHint="search"` to the input element. |
| applePrinciple | §16 Familiarity — platform conventions for keyboard |

---

## F-10 — Cart button hover style useless on touch devices |
| Field | Value |
|---|---|
| file | `src/components/layout/HeaderActions.jsx` |
| line | 29 |
| dimension | mobile |
| severity | low |
| title | `hover:bg-secondary` on cart button never fires on touch |
| description | The cart button has `hover:bg-secondary hover:border-border` but no `active:` variant. On touch the hover state is skipped entirely, so the button has no feedback at all on press. |
| scenario | User taps the cart — no visual response until navigation begins. |
| recommendation | Add `active:scale-90 active:bg-accent transition-all duration-75 ease-out` alongside the hover classes. |
| applePrinciple | §1 Response — instant press feedback |

---

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 3 (F-01 badge shrinks cart target, F-03 no swipe-to-close, F-04 bottom nav overlaps home indicator) |
| Medium | 4 (F-02 drawer flicker, F-05 wrong exit direction, F-06 no press feedback header, F-07 stepper target) |
| Low | 3 (F-08 user-select on links, F-09 search inputMode, F-10 hover-only cart) |

**Top 3 fixes by impact:**
1. Add `pb-[env(safe-area-inset-bottom)]` to BottomNav (F-04) — immediate improvement on all notched iOS devices.
2. Replace custom drawer with vaul Drawer or add swipe handler (F-03) — matches iOS modal dismissal expectation.
3. Add `active:scale-90` / `active:bg-accent` to all header action links (F-06 + F-10) — satisfies §1 Response on touch.

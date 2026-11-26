# 8. Keyboard access to the scene

- Status: accepted
- Date: 2026-11-26

## Context

The standards ask for a scene that is playable with the keyboard alone: walking, stepping from tile to tile, opening and closing the element panel, with no key chords or precise timing. Free walking with WASD and the arrows already exists, but reaching a particular tile that way takes judgement of distance on screen, which a screen-reader user cannot make. The panel opens by itself on every tile, so keyboard users also need a way into it and back out.

## Decision

- **I, J, K and L step one tile up, left, down or right** (`core/tileStep.ts`, by `KeyboardEvent.code`). They are laid out like the arrows, sit beside WASD without overlapping it, and work on any layout. A step skips gaps and empty cells (H → He; Be → B), takes up and down through the gap row into and out of the f-block, and goes to the nearest tile of the next row when a column has nothing further on (Fr → La). A step sets the existing walk target, so the character walks and stops on the tile's centre; presses during a walk chain from the tile it is heading for.
- **The arrows keep walking freely.** Turning them into steps while the scene has focus would make the same key do two things depending on focus.
- **Enter or Space opens the panel and moves focus into it; Esc closes it** and returns focus to the scene. "Closed" is store state (`panelClosed`) for the current tile only: stepping onto another tile opens the panel again, as before. Enter and Space only count when focus is on the scene or nowhere, so they still press focused buttons.
- **The scene is one focus stop**: the canvas wrapper takes `tabIndex=0`, `role="application"` (screen readers pass keys through), a label that names the main keys, and the live tile status as its description. It shows a focus ring when reached by keyboard.
- **`?` opens a key map** in a native modal `<dialog>` in the shell, so it works before the scene has loaded; a "Keys" button beside the explorer opens it by pointer. Every new key ignores presses in text fields and with ⌘, Ctrl or Alt held.

## Consequences

- Steps across a wide gap (Be → B) are long walks of a few seconds; a jump is what the explorer is for.
- Keys added later must stay clear of WASD, IJKL, Enter, Space, Esc, `/` and `?`, and appear in the key map list in `ui/KeyHelp.tsx`.

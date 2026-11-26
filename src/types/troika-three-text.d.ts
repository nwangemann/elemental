// troika-three-text ships no types. This declares only the part elemental uses.
declare module 'troika-three-text' {
  import type { ColorRepresentation, Mesh } from 'three';

  type Anchor = number | `${number}%`;

  export class Text extends Mesh {
    text: string;
    /** URL of a .ttf, .otf, .woff or .woff2 file. */
    font: string | null;
    fontSize: number;
    fontWeight: number | 'normal' | 'bold';
    anchorX: Anchor | 'left' | 'center' | 'right';
    anchorY:
      | Anchor
      | 'top'
      | 'top-baseline'
      | 'top-cap'
      | 'top-ex'
      | 'middle'
      | 'bottom-baseline'
      | 'bottom';
    color: ColorRepresentation | null;
    sdfGlyphSize: number | null;
    /** Lays out the text off the main thread; renders once done. */
    sync(callback?: () => void): void;
    dispose(): void;
  }

  /** Renders every `Text` added to it in a single draw call (WebGL2). */
  export class BatchedText extends Text {
    addText(text: Text): void;
    removeText(text: Text): void;
  }
}

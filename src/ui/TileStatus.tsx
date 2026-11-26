import { useAppStore } from '../state/store.ts';

/**
 * Announces the tile under the character to screen readers ("Standing on Hydrogen"), so what
 * the scene shows is also available as text. On the ground it says how to get back. Visually hidden; the element panel shows the same visually.
 */
export function TileStatus() {
  const tile = useAppStore((s) => s.activeTile);
  const offTable = useAppStore((s) => s.offTable);
  return (
    <p
      id="tile-status"
      className="visually-hidden"
      role="status"
      data-tile={tile?.number ?? ''}
      data-off={offTable}
    >
      {tile ? `Standing on ${tile.name}` : offTable ? 'Off the table. Press R to return.' : ''}
    </p>
  );
}

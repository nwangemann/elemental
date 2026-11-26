import { Leva, button, useControls } from 'leva';
import {
  CONFIG,
  CONFIG_RANGES,
  resetConfig,
  setConfig,
  type Config,
  type ConfigGroup,
  type ConfigValue,
} from '../core/config.ts';

/**
 * Leva inputs for one config group: a slider per number, an x/y/z input per vector. Leva does
 * not export its schema type, so the schema is typed loosely and cast where it is used.
 */
function groupSchema(group: ConfigGroup): Record<string, number> {
  const values = CONFIG[group] as Record<string, ConfigValue>;
  const ranges = CONFIG_RANGES[group] as Record<string, { min: number; max: number; step: number }>;
  const schema: Record<string, object> = {};
  for (const [key, value] of Object.entries(values)) {
    schema[key] = {
      value: Array.isArray(value) ? [...value] : value,
      ...ranges[key],
      // Transient: the panel writes to CONFIG without re-rendering itself.
      onChange: (v: ConfigValue) => setConfig(group, key as never, v as never),
    };
  }
  return schema as unknown as Record<string, number>;
}

function useGroup(group: ConfigGroup) {
  const [, set] = useControls(group, () => groupSchema(group));
  return set as (values: Partial<Config[ConfigGroup]>) => void;
}

/**
 * Dev-only tuning panel (`?tune`), loaded lazily and never part of the production build.
 * "Copy as defaults" puts the current values on the clipboard to paste into `config.ts`.
 */
export default function TunePanel() {
  const setTiles = useGroup('tiles');
  const setLabels = useGroup('labels');
  const setCamera = useGroup('camera');

  useControls('actions', {
    'copy as defaults': button(() => {
      const json = JSON.stringify(CONFIG, null, 2);
      console.info(json);
      void navigator.clipboard?.writeText(json).catch(() => {});
    }),
    reset: button(() => {
      resetConfig();
      setTiles(CONFIG.tiles);
      setLabels(CONFIG.labels);
      setCamera(CONFIG.camera);
    }),
  });

  return <Leva collapsed={false} titleBar={{ title: 'tune' }} />;
}

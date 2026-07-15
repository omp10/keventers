/**
 * Deep-merge plain objects (source overrides target). Arrays are replaced, not
 * merged. Used to apply partial settings updates without clobbering unspecified
 * nested fields.
 */
export function deepMerge(target = {}, source = {}) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export default deepMerge;

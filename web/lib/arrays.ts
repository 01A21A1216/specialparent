/** Toggle a value in an array — used by every chip-picker in the app. */
export function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

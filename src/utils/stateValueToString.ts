type NestedRecord = {
  [key: string]: string | NestedRecord;
};

export function stateValueToString(obj: NestedRecord, prefix = ""): string {
  if (typeof obj === "string") {
    return obj;
  }
  for (const key in obj) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "string") {
      return `${newPrefix}.${value}`; // Include both key path and final value
    } else if (typeof value === "object") {
      return stateValueToString(value, newPrefix); // Recursively process deeper levels
    }
  }
  return prefix; // Fallback in case of an empty object
}

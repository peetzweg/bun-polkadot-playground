import { readdir } from "node:fs/promises";

export const listFiles = async (
  dir: string,
  extension?: string
): Promise<string[]> => {
  const files = await readdir(dir);
  if (extension) {
    return files.filter((file) => file.endsWith(extension));
  }
  return files;
};

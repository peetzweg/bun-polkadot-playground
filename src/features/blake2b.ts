import { blake2bForFile } from "../utils/blake2bForFile";

export const blake2b = async (filePath: string) => {
  const blake2Hex = await blake2bForFile(filePath);
  console.log({
    file: filePath,
    hash: blake2Hex,
  });
};

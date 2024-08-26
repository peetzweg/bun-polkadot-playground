import { cidForFile } from "../utils/cidForFile";

export const cid = async (filePath: string, codec = "raw") => {
  const cid = await cidForFile(filePath, codec);
  console.log({
    file: filePath,

    hashFn: "blake2b-256",
    codec,
    cid: cid.toString(),
  });
};

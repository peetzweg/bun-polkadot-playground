import { blake2bToCid } from "../utils/blake2bToCid";

export const cidFromBlake = async (hash: string) => {
  const cid = blake2bToCid(hash, "raw");
  console.log({
    cid: cid.toString(),
    hash,
  });
};

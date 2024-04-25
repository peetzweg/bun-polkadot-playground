import { blake2bToCid } from "./src/utils/blake2bToCid";

const hexHash = Bun.argv[2];
if (!hexHash) throw Error("Please pass a hash to use");

const cid = blake2bToCid(hexHash, "raw");
console.log(cid.toString());
process.exit(0);

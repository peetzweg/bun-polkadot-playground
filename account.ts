import { hexToU8a } from "@polkadot/util";
import { getApi } from "./src/apis";

const SS58 = "5Di2UNXxRRHrEguXpQY9HUiCNpCbzHrNX5o5snRFxgyQthfr";
const publicKey =
  "0x48b2faa1630b8eb098658ce60ebe90942f9bfb2db4c19d05e70600e906232051";
const bytes = hexToU8a(publicKey);

const people = await getApi("People");

const accountId = people.createType("AccountId", bytes);

console.log({
  SS58,
  publicKey,
  accountIdBytes: accountId.toU8a(),
  accountId: accountId.toString(),
  bytes,
});

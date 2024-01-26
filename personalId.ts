import { u8aToHex } from "@polkadot/util";
import { api } from "./src/apis/people";

const memberKey = Bun.argv[2];
if (!memberKey) throw "No Member Key Passed";

console.log("Member", memberKey);
const bytes = new Uint8Array([
  194, 17, 159, 247, 103, 220, 149, 145, 210, 247, 121, 14, 72, 23, 50, 101,
  135, 0, 70, 209, 67, 190, 161, 242, 196, 89, 5, 228, 202, 90, 139, 60, 0,
]);

const hex = u8aToHex(bytes);
console.log({ bytes, hex });

const personalIdOption = await api.query.people.keys(u8aToHex(bytes));
console.log("personalIdOption", personalIdOption.toHuman());

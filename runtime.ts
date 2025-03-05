import { getApi } from "./src/apis";

const people = await getApi("People");
const candidacyDeposit = await people.call.proofOfInkApi.candidacyDeposit();
console.log({ candidacyDeposit: candidacyDeposit.toHuman() });

const pointsToVoucher = await people.call.mobRuleApi.pointsToVoucher();
console.log({ pointsToVoucher: pointsToVoucher.toHuman() });

const alias = people.createType(
  "Alias",
  "0x7a4a1e1a82afc1af771167bdf728b8d1ff2cd9b1fc7d81f844f58cd91729d115"
);
const votedOn = await people.call.mobRuleApi.votedOn(alias, true);

console.log({ votedOn: votedOn.toHuman() });
process.exit(0);

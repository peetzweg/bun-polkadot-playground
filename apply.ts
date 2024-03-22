import { api as People } from "./src/apis/people";

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { resolveOnInBlock } from "./src/utils/resolveOn";

const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
const alice = keyring.createFromUri("//Alice");

const decimals = People.registry.chainDecimals[0];

const fund = resolveOnInBlock(People.tx.balances.transferKeepAlive);
const [apply, commit, submitEvidence] = [
  People.tx.proofOfInk.apply,
  People.tx.proofOfInk.commit,
  People.tx.proofOfInk.submitEvidence,
].map((fn) => resolveOnInBlock(fn));

const graduateAccount = async (applicant: KeyringPair) => {
  await apply([], applicant);
  console.log("applied", applicant.address);

  await commit(
    [{ DesignedElective: [0, Math.floor(Math.random() * 96)] }, null],
    applicant
  );
  console.log("committed", applicant.address);

  await submitEvidence(
    ["0x6fa5b30653bdf9a9233a497d5c30ae40238732a04a1a9dc7ea97b03b9348ca2c"],
    applicant
  );

  console.log("evidence provided", applicant.address);
};

const prepareAccounts = (mnemonics: string[]) => {
  return mnemonics.map((mnemonic) => {
    const applicant = keyring.createFromUri(mnemonic);
    const ss58Address = People.createType("AccountId", applicant.address);
    console.log("new Account", ss58Address.toString());
    Bun.write(`./accounts/${ss58Address.toHuman()}.txt`, mnemonic);
    return applicant;
  });
};

const fundAccounts = async (addresses: string[]) => {
  const fundCalls = addresses.map((address) =>
    People.tx.balances.transferKeepAlive(
      address,
      Number(0.0105) * 10 ** decimals
    )
  );

  return resolveOnInBlock(People.tx.utility.batch)([fundCalls], alice);
};

const mnemonics = [...Array(3).keys()].map(() => mnemonicGenerate(24));
const applicants = prepareAccounts(mnemonics);

await fundAccounts(applicants.map((a) => a.address));
console.log("All accounts funded");

await Promise.allSettled(
  applicants.map((applicant) => graduateAccount(applicant))
);
console.log("All accounts opened a mob rule case");

// TODO become person as well? Intervene etc.
process.exit(0);

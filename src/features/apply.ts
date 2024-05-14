import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { resolveOnInBlock } from "../utils/resolveOn";
import { resolveOnSome } from "../utils/resolveOnSome";

export const apply = async (amount: number) => {
  const People = await getApi("People");
  const Bulletin = await getApi("Bulletin");

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

  const decimals = People.registry.chainDecimals[0];

  const [apply, commit, submitEvidence] = [
    People.tx.proofOfInk.apply,
    People.tx.proofOfInk.commit,
    People.tx.proofOfInk.submitEvidence,
  ].map((fn) => resolveOnInBlock(fn));

  const authorizations = resolveOnSome(
    Bulletin.query.transactionStorage.authorizations,
    { timeout: 60000, tries: 10 }
  );

  const graduateAccount = async (applicant: KeyringPair) => {
    await apply([], applicant);
    console.log(applicant.address, "applied");

    // ProceduralAccount: 'u16',
    // ProceduralPersonal: 'u16',
    // Procedural: '(u16,u8)',
    // ProceduralDerivative: '(u64,Option<u64>)'
    await commit([{ ProceduralAccount: 5 }, null], applicant);
    console.log(applicant.address, "committed");

    console.log("waiting for authorization...");
    // await authorizations([
    //   {
    //     Account: Bulletin.createType("AccountId", applicant.address),
    //   },
    // ]);
    // console.log(applicant.address, "upload authorization");

    await submitEvidence(
      ["0xe81830c7d3b35e34354d0805498657ef06efa0980bb1e4a9b66197dfdd0883c9"],
      applicant
    );
    console.log(applicant.address, "evidence provided");
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

  const mnemonics = [...Array(Number(amount)).keys()].map(() =>
    mnemonicGenerate(24)
  );
  const applicants = prepareAccounts(mnemonics);

  await fundAccounts(applicants.map((a) => a.address));
  console.log("All accounts funded");

  await Promise.allSettled(
    applicants.map((applicant) => graduateAccount(applicant))
  );
  console.log("All accounts opened a mob rule case");
};

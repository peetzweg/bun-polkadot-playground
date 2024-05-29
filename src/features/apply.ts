import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { resolveOnInBlock } from "../utils/resolveOn";
import { resolveOnSome } from "../utils/resolveOnSome";

const UPLOADED_EVIDENCE_HASHES = [
  "0x039cf2c852d0458552232b335caceb7303ea258869cc684b1ea14c0a927672ef",
  "0xe81830c7d3b35e34354d0805498657ef06efa0980bb1e4a9b66197dfdd0883c9",
  "0xfcad2b754ac4f78b6e808e4afdcd8300a073995a862a8ee21bd737189dec60c0",
  "0x78597cf7170d9330c3326b9efba95a7f4f2d91e9d48f7211f7e2fbbf0a4970dd",
  "0x2c1a85a79750622bcb4ad38ebb993ea792fdd310e765a65975b03a327cbd9441",
  "0xf39c293d7f138130409bd9aaed2d8b1c41b792154052a1d086161561c491c3ea",
];

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
    await commit([{ ProceduralAccount: 8 }, null], applicant);
    console.log(applicant.address, "committed");

    // console.log("waiting for authorization...");
    // await authorizations([
    //   {
    //     Account: Bulletin.createType("AccountId", applicant.address),
    //   },
    // ]);
    // console.log(applicant.address, "upload authorization");

    const randomIndex = Math.floor(
      Math.random() * UPLOADED_EVIDENCE_HASHES.length
    );
    const randomHash = UPLOADED_EVIDENCE_HASHES[randomIndex];
    await submitEvidence([randomHash], applicant);

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

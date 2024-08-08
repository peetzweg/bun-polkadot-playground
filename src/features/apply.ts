import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import { mnemonicGenerate } from "@polkadot/util-crypto";
import { resolveOnInBlock } from "../utils/resolveOn";
import { resolveOnSome } from "../utils/resolveOnSome";
import { PalletProofOfInkCandidate } from "@polkadot/types/lookup";
import { PHOTO_EVIDENCE_HASHES, VIDEO_EVIDENCE_HASHES } from "./evidence";

export const apply = async (amount: number) => {
  const People = await getApi("People");

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

  const decimals = People.registry.chainDecimals[0];

  const [apply, commit, submitEvidence] = [
    People.tx.proofOfInk.apply,
    People.tx.proofOfInk.commit,
    People.tx.proofOfInk.submitEvidence,
  ].map((fn) => resolveOnInBlock(fn));

  const graduateAccount = async (applicant: KeyringPair) => {
    await apply([], applicant);
    console.log(applicant.address, "applied");

    await commit([{ ProceduralAccount: 8 }, null], applicant);
    console.log(applicant.address, "committed");

    const candidacyOption = await People.query.proofOfInk.candidates(
      applicant.address
    );
    if (candidacyOption.isNone)
      throw new Error(`No candidacy found for '${applicant.address}'`);

    const candidacy: PalletProofOfInkCandidate = candidacyOption.unwrap();
    if (!candidacy.isSelected)
      throw new Error(`Candidacy for '${applicant.address}' is not selected`);

    console.log(candidacy.asSelected.toHuman());

    if (candidacy.asSelected.allocation.isInitial) {
      const randomIndex = Math.floor(
        Math.random() * PHOTO_EVIDENCE_HASHES.length
      );
      const randomHash = PHOTO_EVIDENCE_HASHES[randomIndex];
      await submitEvidence([randomHash], applicant);
      console.log(applicant.address, "photo evidence provided");
    } else if (candidacy.asSelected.allocation.isFull) {
      const randomIndex = Math.floor(
        Math.random() * VIDEO_EVIDENCE_HASHES.length
      );
      const randomHash = VIDEO_EVIDENCE_HASHES[randomIndex];
      await submitEvidence([randomHash], applicant);
      console.log(applicant.address, "video evidence provided");
    }
  };

  const prepareAccounts = (mnemonics: string[]) => {
    return mnemonics.map((mnemonic) => {
      const applicant = keyring.createFromUri(mnemonic);
      const ss58Address = People.createType("AccountId", applicant.address);
      console.log("new Account", ss58Address.toString());
      Bun.write(`./accounts/${ss58Address.toHuman()}`, mnemonic);
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

  for await (const applicant of applicants) {
    await graduateAccount(applicant);
  }

  console.log("All accounts opened a mob rule case");
};

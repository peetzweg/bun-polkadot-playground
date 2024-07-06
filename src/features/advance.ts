import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import {
  FrameSystemAccountInfo,
  PalletProofOfInkCandidate,
} from "@polkadot/types/lookup";
import { readdir } from "node:fs/promises";
import { resolveOnInBlock } from "../utils/resolveOn";
import { PHOTO_EVIDENCE_HASHES, VIDEO_EVIDENCE_HASHES } from "./evidence";

import { u8aToHex } from "@polkadot/util";
import { mnemonicToEntropy } from "@polkadot/util-crypto";
import initVerifiable, { member_from_entropy } from "../verifiable/verifiable";

export const advance = async () => {
  const People = await getApi("People");
  const decimals = People.registry.chainDecimals[0];

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

  const [
    apply,
    commit,
    submitEvidence,
    allocateFull,
    transferKeepAlive,
    register,
  ] = [
    People.tx.proofOfInk.apply,
    People.tx.proofOfInk.commit,
    People.tx.proofOfInk.submitEvidence,
    People.tx.proofOfInk.allocateFull,
    People.tx.balances.transferKeepAlive,
    People.tx.proofOfInk.register,
  ].map((fn) => resolveOnInBlock(fn));

  const advanceAccount = async (applicant: KeyringPair, member: Uint8Array) => {
    const accountId = People.createType(
      "AccountId",
      applicant.address
    ).toHuman();
    // Check if the account is already a person
    const personalIdOption = await People.query.people.keys(u8aToHex(member));
    if (personalIdOption.isSome) {
      console.log(accountId, `already a person: ${personalIdOption.unwrap()}`);
      return;
    }

    // Check if the account has balance
    const balance: FrameSystemAccountInfo = await People.query.system.account(
      applicant.address
    );
    if (balance.data.free.isZero()) {
      await transferKeepAlive(
        [applicant.address, Number(0.0105) * 10 ** decimals],
        alice
      );
      console.log(accountId, "funded");
      await advanceAccount(applicant, member);
      return;
    }

    const candidacyOption = await People.query.proofOfInk.candidates(
      applicant.address
    );

    if (candidacyOption.isNone) {
      console.log(accountId, "Not a candidate yet");
      await apply([], applicant);
      console.log(accountId, "applied");
      await commit([{ ProceduralAccount: 8 }, null], applicant);
      console.log(accountId, "committed");
      await advanceAccount(applicant, member);
      return;
    }

    const candidacy: PalletProofOfInkCandidate = candidacyOption.unwrap();

    if (candidacy.isProven) {
      const encodedMember = People.createType("[u8;33]", member);
      await register([encodedMember.toHex()], applicant);
      console.log(accountId, "registered");
      return;
    }

    if (candidacy.isSelected) {
      if (candidacy.asSelected.judging.isSome) {
        console.log(
          applicant.address,
          `has active mobrule case: ${candidacy.asSelected.judging
            .unwrap()
            .toNumber()}`
        );
        return;
      }

      // Submit Photo Evidence
      if (candidacy.asSelected.allocation.isInitial) {
        const randomIndex = Math.floor(
          Math.random() * PHOTO_EVIDENCE_HASHES.length
        );
        const randomHash = PHOTO_EVIDENCE_HASHES[randomIndex];
        await submitEvidence([randomHash], applicant);
        console.log(accountId, "photo evidence provided");
        return;
      }

      // Submit Video Evidence
      if (candidacy.asSelected.allocation.isFull) {
        const randomIndex = Math.floor(
          Math.random() * VIDEO_EVIDENCE_HASHES.length
        );
        const randomHash = VIDEO_EVIDENCE_HASHES[randomIndex];
        await submitEvidence([randomHash], applicant);
        console.log(accountId, "video evidence provided");
        return;
      }

      // Request more Storage
      if (candidacy.asSelected.allocation.isInitDone) {
        await allocateFull([], applicant);
        console.log(accountId, "allocate full");
        return;
      }
    }

    console.log(accountId, "no action taken");
  };

  await initVerifiable();

  const files = await readdir("./accounts");
  const applicants = await Promise.all(
    files.map(async (filename) => {
      const file = Bun.file(`./accounts/${filename}`);
      const mnemonic = await file.text();
      const member = member_from_entropy(mnemonicToEntropy(mnemonic));
      return [keyring.createFromUri(mnemonic), member] as [
        KeyringPair,
        Uint8Array
      ];
    })
  );

  for await (const [applicant, member] of applicants) {
    try {
      await advanceAccount(applicant, member);
    } catch (error: unknown) {
      console.log(applicant.address, "An Error Occurred");
      if (error instanceof Error) {
        console.error(applicant.address, error.message);
      }
      // } else {
      //   console.error(applicant.address, error);
      // }
    }
  }
};

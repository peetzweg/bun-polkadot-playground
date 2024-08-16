import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import {
  FrameSystemAccountInfo,
  PalletIdentityPersonalIdentity,
  PalletIdentityRegistration,
  PalletProofOfInkCandidate,
} from "@polkadot/types/lookup";
import { readdir } from "node:fs/promises";
import { resolveOn } from "../utils/resolveOn";
import {
  PHOTO_EVIDENCE_HASHES,
  PLATFORM_PROFILES,
  TATTOO_OPTIONS,
  VIDEO_EVIDENCE_HASHES,
} from "./evidence";

import { u8aToHex } from "@polkadot/util";
import { mnemonicToEntropy } from "@polkadot/util-crypto";
import { pickRandomElement } from "../utils/pickRandomElement";
import initVerifiable, {
  member_from_entropy,
  sign,
} from "../verifiable/verifiable";

interface AdvanceOptions {
  onlyAccounts: string[];
  amount: number;
  parallel: number;
}

export const advance = async (options: Partial<AdvanceOptions> = {}) => {
  const { onlyAccounts = [], amount = undefined, parallel = 1 } = options;

  const People = await getApi("People");
  const decimals = People.registry.chainDecimals[0];

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");
  const eve = keyring.createFromUri("//Eve");

  const [
    apply,
    commit,
    submitEvidence,
    allocateFull,
    register,
    asPersonalIdentity,
  ] = [
    People.tx.proofOfInk.apply,
    People.tx.proofOfInk.commit,
    People.tx.proofOfInk.submitEvidence,
    People.tx.proofOfInk.allocateFull,
    People.tx.proofOfInk.register,
    People.tx.people.asPersonalIdentity,
  ].map((fn) => resolveOn(fn, "InBlock"));

  const [transferKeepAlive, setUsernameFor] = [
    People.tx.balances.transferKeepAlive,
    People.tx.identity.setUsernameFor,
  ].map((fn) => resolveOn(fn, "Finalized"));

  const advanceAccount = async (
    applicant: KeyringPair,
    entropy: Uint8Array
  ): Promise<boolean> => {
    const accountId = People.createType(
      "AccountId",
      applicant.address
    ).toHuman();
    const member = member_from_entropy(entropy);

    // Check if the account is already a person
    const personalIdOption = await People.query.people.keys(u8aToHex(member));
    if (personalIdOption.isSome) {
      const personalId = personalIdOption.unwrap();
      console.log(accountId, `is a person: ${personalId}`);

      // Set username
      const username = accountId.slice(0, 10).toLowerCase();
      const fullUsername = `${username}.easy`;
      const accountOfUsername = await People.query.identity.accountOfUsername(
        fullUsername
      );
      if (accountOfUsername.isNone) {
        console.log(accountId, `setting username`);

        await setUsernameFor(
          [
            applicant.address,
            username,
            {
              Sr25519: applicant.sign(fullUsername),
            },
          ],
          eve,
          { nonce: -1 }
        );
        return true;
      } else {
        console.log(accountId, "has a username: " + username);
      }

      // Link identity and personhood
      const personalIdentityOption =
        await People.query.identity.personIdentities(personalId);
      if (personalIdentityOption.isNone) {
        console.log(
          accountId,
          `linking identity and personhood: ${personalIdOption.unwrap()}`
        );

        const setPersonalIdentity = People.tx.identity.setPersonIdentity(
          applicant.address
        );
        const message = setPersonalIdentity.method.toU8a();
        const signature = await sign(entropy, message);
        await asPersonalIdentity(
          [personalId, setPersonalIdentity, signature],
          applicant
        );
        return true;
      } else {
        const personalIdentity: PalletIdentityPersonalIdentity =
          personalIdentityOption.unwrap();

        if (personalIdentity.pendingJudgements.length === 0) {
          console.log(accountId, `submitting IdentityCredential`);

          const credential = People.createType(
            "FrameSupportRealityIdentitySocial",
            pickRandomElement([
              ...PLATFORM_PROFILES,
              // TODO Somehow crashes when using the account id here, tests for individuality repo?
              // { Twitter: { username: accountId } },
              // { GitHub: { username: accountId } },
            ])
          );

          const submitPersonalCredentialEvidence =
            People.tx.identity.submitPersonalCredentialEvidence(credential);
          const message = submitPersonalCredentialEvidence.method.toU8a();
          const signature = sign(entropy, message);

          await asPersonalIdentity(
            [personalId, submitPersonalCredentialEvidence, signature],
            applicant
          );
          return true;
        } else {
          console.log(
            accountId,
            `has pending judgments ${personalIdentity.pendingJudgements
              .map(([, caseIndex]) => caseIndex)
              .join(", ")}`
          );
          return false;
        }
      }
    }

    // Check if the account has balance
    const balance: FrameSystemAccountInfo = await People.query.system.account(
      applicant.address
    );
    if (balance.data.free.isZero()) {
      await transferKeepAlive(
        [applicant.address, Number(0.0205) * 10 ** decimals],
        alice,
        { nonce: -1 }
      );
      console.log(accountId, "funded");
      await advanceAccount(applicant, member);
      return true;
    }

    const candidacyOption = await People.query.proofOfInk.candidates(
      applicant.address
    );

    if (candidacyOption.isNone) {
      console.log(accountId, "Not a candidate yet");
      await apply([], applicant);
      console.log(accountId, "applied");
      const tattooChoice = pickRandomElement(TATTOO_OPTIONS);
      await commit([tattooChoice, null], applicant);

      console.log(accountId, "committed");
      await advanceAccount(applicant, member);
      return true;
    }

    const candidacy: PalletProofOfInkCandidate = candidacyOption.unwrap();

    if (candidacy.isApplied) {
      await commit([{ ProceduralPersonal: 11 }, null], applicant);
      console.log(accountId, "committed");
      await advanceAccount(applicant, member);
    }

    if (candidacy.isProven) {
      const encodedMember = People.createType("[u8;33]", member);
      await register([encodedMember.toHex()], applicant);
      console.log(accountId, "registered");
      return true;
    }

    if (candidacy.isSelected) {
      if (candidacy.asSelected.judging.isSome) {
        console.log(
          accountId,
          `has active mobrule case: ${candidacy.asSelected.judging
            .unwrap()
            .toNumber()}`
        );
        return false;
      }

      // Submit Photo Evidence
      if (candidacy.asSelected.allocation.isInitial) {
        const randomHash = pickRandomElement(PHOTO_EVIDENCE_HASHES);

        await submitEvidence([randomHash], applicant);
        console.log(accountId, "photo evidence provided");
        return true;
      }

      // Submit Video Evidence
      if (candidacy.asSelected.allocation.isFull) {
        const randomHash = pickRandomElement(VIDEO_EVIDENCE_HASHES);

        await submitEvidence([randomHash], applicant);
        console.log(accountId, "video evidence provided");
        return true;
      }

      // Request more Storage
      if (candidacy.asSelected.allocation.isInitDone) {
        await allocateFull([], applicant);
        console.log(accountId, "allocate full");
        return true;
      }
    }

    console.log(accountId, "no action taken");
    return false;
  };

  await initVerifiable();

  const files = await readdir("./accounts");
  let applicants = await Promise.all(
    files.map(async (filename) => {
      const file = Bun.file(`./accounts/${filename}`);
      const mnemonic = await file.text();
      const keyPair = keyring.createFromUri(mnemonic);
      return [keyPair, mnemonicToEntropy(mnemonic)] as [
        KeyringPair,
        Uint8Array
      ];
    })
  );

  if (onlyAccounts.length > 0) {
    applicants = applicants.filter((applicant) =>
      onlyAccounts.includes(
        People.createType("AccountId", applicant[0].address).toHuman()
      )
    );
    if (applicants.length === 0) {
      console.info("No accounts found to advance");
    }
  }

  let advancedCount = 0;
  for (let i = 0; i < applicants.length; i += parallel) {
    const batch = applicants.slice(i, i + parallel);
    const results = await Promise.allSettled(
      batch.map(async ([applicant, entropy]) => {
        return advanceAccount(applicant, entropy);
      })
    );

    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        advancedCount++;
      } else if (result.status === "rejected") {
        console.error(result.reason);
      }
    });
    if (amount && advancedCount >= amount) {
      break;
    }
  }
};

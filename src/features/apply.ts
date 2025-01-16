import { getTypedApi } from "../apis";

import { generateMnemonic } from "@polkadot-labs/hdkd-helpers";

import {
  AccountId,
  Enum,
  PolkadotSigner,
  SS58String,
  Transaction,
  TxFinalizedPayload,
} from "polkadot-api";
import {
  Applicant,
  getDevPolkadotSigner,
  mnemonicToApplicant,
} from "../keyring";
import { storeMnemonic } from "./new";
import { MultiAddress, people } from "@polkadot-api/descriptors";
import { one_shot } from "../verifiable/verifiable";

async function signAndSubmit<
  Pallet extends string,
  Name extends string,
  Asset,
  Args extends {} | undefined,
  T extends Transaction<Args, Pallet, Name, Asset>
>(tx: T, signer: PolkadotSigner) {
  return new Promise((resolve, reject) => {
    tx.signSubmitAndWatch(signer, {
      customSignedExtensions: {
        VerifyMultiSignature: { value: Enum("Disabled") },
        AsPerson: { value: undefined },
        ProvideForReferral: { value: undefined },
      },
    } as any).subscribe({
      next: (e) => {
        // console.log(e.type);

        if (e.type === "finalized") {
          console.log(
            `-> https://dev.papi.how/explorer/${e.block.hash}#networkId=custom&endpoint=wss%3A%2F%2Fpop-testnet.parity-lab.parity.io%3A443%2F9910`
          );
          resolve(e);
        }
      },
      error: (e) => {
        console.error(e);
        reject(e);
      },
      complete() {
        console.log("Completed!");
      },
    });
  });
}

export const apply = async (amount: number) => {
  const People = await getTypedApi("People");

  const logFunds = async (name: string, address: SS58String) => {
    const account = await People.query.System.Account.getValue(address);
    console.log(` ${address} has ${account.data.free} ${name}`);
    return account.data;
  };

  const alice = getDevPolkadotSigner("//Alice");

  const graduateAccount = async (applicant: Applicant) => {
    console.log("applying");
    try {
      await signAndSubmit(People.tx.ProofOfInk.apply(), applicant.signer);

      console.log(applicant.address, "applied");
    } catch (e) {
      console.dir(e);
    }

    const commitTx = People.tx.ProofOfInk.commit({
      choice: Enum("ProceduralAccount", 8),
      require_id: undefined,
    });
    await signAndSubmit(commitTx, applicant.signer);
    // await commit([{ ProceduralAccount: 8 }, null], applicant);
    // console.log(applicant.address, "committed");

    // const candidacyOption = await People.query.proofOfInk.candidates(
    //   applicant.address
    // );
    // if (candidacyOption.isNone)
    //   throw new Error(`No candidacy found for '${applicant.address}'`);

    // const candidacy: PalletProofOfInkCandidate = candidacyOption.unwrap();
    // if (!candidacy.isSelected)
    //   throw new Error(`Candidacy for '${applicant.address}' is not selected`);

    // console.log(candidacy.asSelected.toHuman());

    // if (candidacy.asSelected.allocation.isInitial) {
    //   const randomIndex = Math.floor(
    //     Math.random() * PHOTO_EVIDENCE_HASHES.length
    //   );
    //   const randomHash = PHOTO_EVIDENCE_HASHES[randomIndex];
    //   await submitEvidence([randomHash], applicant);
    //   console.log(applicant.address, "photo evidence provided");
    // } else if (candidacy.asSelected.allocation.isFull) {
    //   const randomIndex = Math.floor(
    //     Math.random() * VIDEO_EVIDENCE_HASHES.length
    //   );
    //   const randomHash = VIDEO_EVIDENCE_HASHES[randomIndex];
    //   await submitEvidence([randomHash], applicant);
    //   console.log(applicant.address, "video evidence provided");
    // }
  };

  const fundAccounts = async (applicants: Applicant[]) => {
    const transfers = applicants.map((applicant) =>
      People.tx.Balances.transfer_allow_death({
        dest: MultiAddress.Id(applicant.address),
        value: 100_000_000_000n,
      })
    );

    const batchTx = People.tx.Utility.batch({
      calls: transfers.map((t) => t.decodedCall),
    });

    await signAndSubmit(batchTx, alice.signer);
  };

  const mnemonics = [...Array(Number(amount)).keys()].map(
    () => generateMnemonic(24 * 8) // 24 words
  );

  const applicants = mnemonics
    .map((m) => storeMnemonic(m))
    .map((m) => mnemonicToApplicant(m));

  await fundAccounts(applicants);
  console.log("All accounts funded");

  for await (const applicant of applicants) {
    await logFunds("Applicant:", applicant.address);
  }

  for await (const applicant of applicants) {
    await graduateAccount(applicant);
  }

  // console.log("All accounts opened a mob rule case");
};

const debugOutcome = (outcome: TxFinalizedPayload) => {
  console.log(outcome.events.map((e) => `${e.type}.${e.value.type}`));
  console.log(
    `https://dev.papi.how/explorer/${outcome.block.hash}#networkId=custom&endpoint=wss%3A%2F%2Fpop-testnet.parity-lab.parity.io%3A443%2F9910`
  );
};

import { getBulletinApi, getPeopleApi } from "../apis";

import { MultiAddress } from "@polkadot-api/descriptors";
import { generateMnemonic } from "@polkadot-labs/hdkd-helpers";
import { createActor, waitFor } from "xstate";
import { getDevPolkadotSigner, mnemonicToApplicant } from "../keyring";
import { log } from "../utils/applicantLog";
import { signAndSubmit } from "../utils/resolveOnPapi";
import { machine } from "../statemachines/IndividualityApplicant";
import { storeMnemonic } from "./new";
import { stateValueToString } from "../utils/stateValueToString";

export const apply = async (amount: number) => {
  const People = await getPeopleApi();
  const Bulletin = await getBulletinApi();

  const alice = getDevPolkadotSigner("//Alice");

  const mnemonics = [...Array(Number(amount)).keys()].map(
    () => generateMnemonic(24 * 8) // 24 words
  );

  const applicants = mnemonics
    .map((m) => storeMnemonic(m))
    .map((m) => mnemonicToApplicant(m));

  const fundingTransfers = applicants.map((applicant) =>
    People.tx.Balances.transfer_allow_death({
      dest: MultiAddress.Id(applicant.address),
      value: 100_000_000_000n,
    })
  );

  const finalizedEvent = await signAndSubmit(
    People.tx.Utility.batch_all({
      calls: fundingTransfers.map((t) => t.decodedCall),
    }),
    alice.signer
  );
  console.log(
    "Funding transfers completed, starting actors...",
    finalizedEvent.block.hash
  );

  const actors = applicants.map((applicant) => {
    return createActor(machine, {
      input: {
        applicant: applicant,
        api: People,
        alice: alice.signer,
        bulletin: Bulletin,
        log: console.log,
      },
    });
  });
  console.log("Actors created", actors.length);

  while (actors.length > 0) {
    const batch = actors.splice(0, 7);

    const subscriptions = batch.map((actor) =>
      actor.subscribe(({ value, context, status }) => {
        log(context.applicant.address, stateValueToString(value));
      })
    );
    batch.forEach((actor) => actor.start());
    batch.forEach((actor) => actor.send({ type: "HAS_FUNDS" }));

    await Promise.all(
      batch.map((actor) =>
        waitFor(actor, (snapshot) => {
          if (
            stateValueToString(snapshot.value) ===
            "ProofOfInk.Committed.Judging"
          ) {
            return true;
          }
          return false;
        })
      )
    );
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    batch.forEach((actor) => actor.stop());
  }
};

import { getTypedApi } from "../apis";

import { MultiAddress } from "@polkadot-api/descriptors";
import { generateMnemonic } from "@polkadot-labs/hdkd-helpers";
import { createActor, waitFor } from "xstate";
import { getDevPolkadotSigner, mnemonicToApplicant } from "../keyring";
import { log } from "../utils/applicantLog";
import { signAndSubmit } from "../utils/resolveOnPapi";
import { applyMachine } from "../utils/statemachines";
import { storeMnemonic } from "./new";

export const apply = async (amount: number) => {
  const People = await getTypedApi("People");

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
    return createActor(applyMachine, {
      input: { applicant: applicant, api: People, alice: alice.signer },
    });
  });
  console.log("Actors created", actors.length);

  while (actors.length > 0) {
    const batch = actors.splice(0, 7);
    console.log("Starting actors...", batch.length);
    batch.forEach((actor) => actor.start());

    console.log("Subscribing to actors...");
    const subscriptions = batch.map((actor) =>
      actor.subscribe(({ value, context, status }) => {
        log(context.applicant.address, value);
      })
    );

    console.log("Sending APPLY_WITH_DEPOSIT to actors...");
    batch.forEach((actor) => actor.send({ type: "APPLY_WITH_DEPOSIT" }));

    console.log("Waiting for actors to finish...");

    await Promise.all(
      batch.map((actor) =>
        waitFor(actor, (snapshot) => snapshot.matches("Judging"))
      )
    );
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    batch.forEach((actor) => actor.stop());
  }

  // for await (const applicant of applicants) {
  //   const actor = createActor(applyMachine, {
  //     input: { applicant: applicant, api: People, alice: alice.signer },
  //   });

  //   actor.start();

  //   const subscription = actor.subscribe(({ value, context, status }) => {
  //     log(context.applicant.address, value);
  //   });

  //   await waitFor(actor, (snapshot) => snapshot.matches("Judging"));

  //   subscription.unsubscribe();
  //   actor.stop();
  // }
};

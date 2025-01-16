import { getTypedApi } from "../apis";

import { generateMnemonic } from "@polkadot-labs/hdkd-helpers";
import { createActor, waitFor } from "xstate";
import { getDevPolkadotSigner, mnemonicToApplicant } from "../keyring";
import { log } from "../utils/applicantLog";
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

  for await (const applicant of applicants) {
    const actor = createActor(applyMachine, {
      input: { applicant: applicants[0], api: People, alice: alice.signer },
    });

    const subscription = actor.subscribe(({ value, context, status }) => {
      log(context.applicant.address, value);
    });

    actor.start();

    await waitFor(actor, (snapshot) => snapshot.matches("Judging"));

    subscription.unsubscribe();
    actor.stop();
  }
};

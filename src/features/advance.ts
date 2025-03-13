import { readdir } from "node:fs/promises";

import { Actor, createActor, toPromise, waitFor } from "xstate";
import { getTypedApi, getTypedApiBulletin } from "../apis";
import { getDevPolkadotSigner, mnemonicToApplicant } from "../keyring";
import { machine } from "../statemachines/IndividualityApplicant";
import initVerifiable from "../verifiable/verifiable";
import { stateValueToString } from "../utils/stateValueToString";
import { log } from "../utils/applicantLog";

interface AdvanceOptions {
  onlyAccounts: string[];
  amount: number;
  parallel: number;
}

export const advance = async (options: Partial<AdvanceOptions> = {}) => {
  const { onlyAccounts = [], amount = undefined, parallel = 1 } = options;

  const People = await getTypedApi();
  const Bulletin = await getTypedApiBulletin();

  const alice = getDevPolkadotSigner("//Alice");
  const eve = getDevPolkadotSigner("//Eve");

  await initVerifiable();

  const files = await readdir("./accounts");
  let applicants = await Promise.all(
    files.map(async (filename) => {
      const file = Bun.file(`./accounts/${filename}`);
      const mnemonic = await file.text();
      return mnemonicToApplicant(mnemonic);
    })
  );

  console.log({ onlyAccounts });
  if (onlyAccounts.length > 0) {
    applicants = applicants.filter((applicant) =>
      onlyAccounts.includes(applicant.address)
    );
  }
  if (applicants.length === 0) {
    console.info("No accounts found to advance");
    return;
  }
  const actors = applicants.map((applicant) => {
    return createActor(machine, {
      input: {
        applicant: applicant,
        api: People,
        bulletin: Bulletin,
        alice: alice.signer,
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
    batch.forEach((actor) => actor.send({ type: "RESTORE_STATE" }));

    await Promise.all(batch.map((actor) => toPromise(actor)));

    subscriptions.forEach((subscription) => subscription.unsubscribe());
    // batch.forEach((actor) => actor.stop());
  }
};

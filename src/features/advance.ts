import { readdir } from "node:fs/promises";

import { Actor, createActor, toPromise, waitFor } from "xstate";
import { getTypedApi, getTypedApiBulletin } from "../apis";
import {
  getDevPolkadotSigner,
  mnemonicToApplicant,
  Applicant,
} from "../keyring";
import { machine } from "../statemachines/IndividualityApplicant";
import initVerifiable from "../verifiable/verifiable";
import { stateValueToString } from "../utils/stateValueToString";
import { log } from "../utils/applicantLog";

interface AdvanceOptions {
  onlyAccounts: string[];
  amount: number;
  parallel: number;
}

class WorkerPool {
  private activeWorkers: Map<string, Actor<typeof machine>> = new Map();
  private pendingApplicants: Applicant[] = [];
  private readonly maxWorkers: number;
  private readonly apis: {
    people: Awaited<ReturnType<typeof getTypedApi>>;
    bulletin: Awaited<ReturnType<typeof getTypedApiBulletin>>;
    alice: ReturnType<typeof getDevPolkadotSigner>;
  };

  constructor(
    maxWorkers: number,
    apis: {
      people: Awaited<ReturnType<typeof getTypedApi>>;
      bulletin: Awaited<ReturnType<typeof getTypedApiBulletin>>;
      alice: ReturnType<typeof getDevPolkadotSigner>;
    }
  ) {
    this.maxWorkers = maxWorkers;
    this.apis = apis;
  }

  addApplicants(applicants: Applicant[]) {
    this.pendingApplicants.push(...applicants);
    this.tryStartNewWorkers();
  }

  private createWorker(applicant: Applicant) {
    const actor = createActor(machine, {
      input: {
        applicant,
        api: this.apis.people,
        bulletin: this.apis.bulletin,
        alice: this.apis.alice.signer,
        log: (...args: Parameters<typeof console.log>) =>
          log(applicant.address, "[INFO]", ...args),
      },
    });

    const subscription = actor.subscribe(({ value, context, status }) => {
      log(context.applicant.address, stateValueToString(value));
    });

    actor.start();
    actor.send({ type: "RESTORE_STATE" });

    this.activeWorkers.set(applicant.address, actor);

    // Handle worker completion
    toPromise(actor).then(() => {
      subscription.unsubscribe();
      this.activeWorkers.delete(applicant.address);
      this.tryStartNewWorkers();
    });
  }

  private tryStartNewWorkers() {
    while (
      this.activeWorkers.size < this.maxWorkers &&
      this.pendingApplicants.length > 0
    ) {
      const applicant = this.pendingApplicants.shift()!;
      this.createWorker(applicant);
    }
  }

  async waitForCompletion() {
    if (this.activeWorkers.size === 0 && this.pendingApplicants.length === 0) {
      return;
    }

    await Promise.all(Array.from(this.activeWorkers.values()).map(toPromise));
    await this.waitForCompletion(); // Recursively wait for any new workers that might have started
  }
}

export const advance = async (options: Partial<AdvanceOptions> = {}) => {
  const { onlyAccounts = [], parallel = 7 } = options;

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

  if (onlyAccounts.length > 0) {
    applicants = applicants.filter((applicant) =>
      onlyAccounts.includes(applicant.address)
    );
  }

  if (applicants.length === 0) {
    console.info("No accounts found to advance");
    return;
  }

  const workerPool = new WorkerPool(parallel, {
    people: People,
    bulletin: Bulletin,
    alice,
  });

  workerPool.addApplicants(applicants);
  await workerPool.waitForCompletion();
};

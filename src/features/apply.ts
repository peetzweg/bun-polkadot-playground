import { getTypedApi } from "../apis";

import { MultiAddress } from "@polkadot-api/descriptors";
import { generateMnemonic } from "@polkadot-labs/hdkd-helpers";
import { Enum, PolkadotSigner, SS58String, Transaction } from "polkadot-api";
import { createActor, waitFor } from "xstate";
import {
  Applicant,
  getDevPolkadotSigner,
  mnemonicToApplicant,
} from "../keyring";
import { applyMachine } from "../utils/statemachines";
import { storeMnemonic } from "./new";

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
        console.log(e.type);

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

    actor.start();

    const subscription = actor.subscribe(({ value, context }) => {
      log(context.applicant.address, value);
    });

    await waitFor(actor, (snapshot) => snapshot.matches("Judging"));

    subscription.unsubscribe();
    actor.stop();
  }
};

const getColorFromAccount = (account: string): string => {
  // Simple hash function to generate a number from the account string
  const hash = account.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Convert to HSL to ensure good contrast and saturation
  const hue = Math.abs(hash) % 360;
  return `\x1b[38;2;${HSLToRGB(hue, 70, 50).join(";")}m`;
};

// Convert HSL to RGB values
const HSLToRGB = (
  h: number,
  s: number,
  l: number
): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
};

const log = (account: string, ...args: Parameters<typeof console.log>) =>
  console.log(`${getColorFromAccount(account)}${account}\x1b[0m`, ...args);

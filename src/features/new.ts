import { generateMnemonic } from "@polkadot-labs/hdkd-helpers";

import { AccountId } from "polkadot-api";
import { mnemonicToKeyPair } from "../keyring";

export const storeMnemonic = (mnemonic: string) => {
  const { keyPair } = mnemonicToKeyPair(mnemonic);

  const ss58Address = AccountId(42, 32).dec(keyPair.publicKey);

  console.log("new Account", ss58Address);
  Bun.write(`./accounts/${ss58Address}`, mnemonic);
  return mnemonic;
};

export const newAccounts = async (amount: number) => {
  [...Array(Number(amount)).keys()]
    .map(() => generateMnemonic(24 * 8))
    .map((mnemonic) => storeMnemonic(mnemonic));

  console.info(`Created ${amount} new accounts in ./accounts`);
};

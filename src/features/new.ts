import { generateMnemonic, ss58Encode } from "@polkadot-labs/hdkd-helpers";

import { mnemonicToKeyPair } from "../keyring";

export const newAccounts = async (amount: number) => {
  [...Array(Number(amount)).keys()]
    .map(() => generateMnemonic(24 * 8))
    .map((mnemonic) => {
      const { keyPair } = mnemonicToKeyPair(mnemonic);

      const ss58Address = ss58Encode(keyPair.publicKey, 0);

      console.log("new Account", ss58Address);
      Bun.write(`./accounts/${ss58Address}`, mnemonic);
    });

  console.info(`Created ${amount} new accounts in ./accounts`);
};

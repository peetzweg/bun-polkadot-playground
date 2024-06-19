import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { mnemonicGenerate } from "@polkadot/util-crypto";

export const newAccounts = async (amount: number) => {
  const People = await getApi("People");
  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });

  const applicants = [...Array(Number(amount)).keys()]
    .map(() => mnemonicGenerate(24))
    .map((mnemonic) => {
      const applicant = keyring.createFromUri(mnemonic);
      const ss58Address = People.createType("AccountId", applicant.address);
      console.log("new Account", ss58Address.toString());
      Bun.write(`./accounts/${ss58Address.toHuman()}.txt`, mnemonic);
      return applicant;
    });

  console.info(`Created ${amount} new accounts in ./accounts`);
};

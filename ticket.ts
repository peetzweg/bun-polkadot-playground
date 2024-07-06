import Keyring from "@polkadot/keyring";
import { getApi } from "./src/apis";
import { hexToU8a, u8aToHex } from "@polkadot/util";

// ?ticket=0xefcdb1421047c24a7e0f0b41fc0ab0d3fab886352e3df90192b2d5b0a4bca095&person=3
const keyring = new Keyring({ type: "sr25519" });
const People = await getApi("People");
const accountId = "5ELf5Ft466U1nDENZt8ooLdJUHyKqMW8wYdU3hE1BwMp8Dcg";
// const encodedAccountId = People.createType("AccountId", accountId);
const encodedAccountIdBytes = keyring.decodeAddress(accountId);
const encodedAccountId = People.createType("AccountId", encodedAccountIdBytes);
const mnemonic =
  "nephew ocean earn peanut topic silly option rule lens divorce gadget upgrade";
const ticketSigner = keyring.addFromUri(mnemonic);
// const ticketSigner = keyring.addFromSeed(
//   hexToU8a("0xefcdb1421047c24a7e0f0b41fc0ab0d3fab886352e3df90192b2d5b0a4bca095")
// );
const ticketAccount = People.createType("AccountId", ticketSigner.address);

const signature = ticketSigner.sign(encodedAccountId);
console.log({
  accountId,
  encodedAccountId,
  ticketAccount: ticketAccount.toHuman(),
  message: encodedAccountId,
  signature,
  signatureHex: u8aToHex(signature),
});

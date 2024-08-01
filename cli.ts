import Keyring from "@polkadot/keyring";
import cac from "cac";
import { apply } from "./src/features/apply";
import { asPersonalIdentity } from "./src/features/asPersonalIdentity";
import { blake2ForFile } from "./src/features/blake2";
import { cidForFile } from "./src/features/cid";
import { cidFromBlake } from "./src/features/cidFromBlake";
import { refresh } from "./src/features/refresh";
import { ripe } from "./src/features/ripe";
import { storeEvidence } from "./src/features/store";
import { sudoXcm } from "./src/features/sudoxcm";
import { advance } from "./src/features/advance";
import { newAccounts } from "./src/features/new";
import { hexToU8a, u8aToHex } from "@polkadot/util";

const cli = cac("pop");

cli
  .command("new <amount>", "create new accounts")
  .action(async (amount, options) => {
    await newAccounts(Number(amount));
  });

cli
  .command(
    "apply <amount>",
    "create new accounts and apply for Proof of Personhood"
  )
  .action(async (amount, options) => {
    console.log({ amount, options });
    await apply(Number(amount));
  });

cli
  .command(
    "advance [...accounts]",
    "advance candidacy of all already created accounts"
  )
  .option(
    "--amount <amount>",
    "amount of account to advance, if not specified advances all"
  )
  .action(async (accounts, option) => {
    await advance(accounts as string[], Number(option.amount));
  });

cli
  .command("u8a <hex>", "Convert given hex string into Uint8Array")
  .action(async (hex) => {
    console.log({ hex });
    console.log(hexToU8a(hex));
  });

cli
  .command(
    "asPersonalAlias <call> <...mnemonic>",
    "submit call as personal alias"
  )
  .action(async (call, mnemonic) => {
    await asPersonalIdentity(mnemonic.join(" "), call);
  });

cli
  .command("blake2 <file_path>", "returns the blake2 hash of given file")
  .action(async (filePath) => {
    await blake2ForFile(filePath);
  });
cli
  .command("cid [...files]", "returns the CID of given file")
  .option("--codec [codec]", "Codec to use in the CID, default is 'raw'")
  .action(async (files, options) => {
    for await (const file of files) {
      await cidForFile(file, options?.codec);
    }
  });

cli
  .command("cidFromBlake <hash>", "returns the CID of given blake2 hash")
  .action(async (hash) => {
    await cidFromBlake(hash);
  });

cli
  .command(
    "sudoxcm <encoded_call>",
    "sends sudo xcm to people with given encoded call"
  )
  .action(async (encodedCall) => {
    await sudoXcm(encodedCall);
  });

cli
  .command(
    "refresh",
    "checks if the people root needs refreshing and refreshes if needed"
  )
  .action(async (encodedCall) => {
    await refresh();
  });

cli
  .command("ripe", "close all ripe cases if available")
  .action(async (encodedCall) => {
    await ripe();
  });

cli
  .command(
    "store <file_path> <mnemonic>",
    "stores given file on chain with given account mnemonic"
  )
  .action(async (filePath, mnemonic) => {
    const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
    const account = keyring.createFromUri(mnemonic);

    await storeEvidence(filePath, account);
  });

cli.help();

try {
  // Parse CLI args without running the command
  cli.parse(process.argv, { run: false });
  // Run the command yourself
  // You only need `await` when your command action returns a Promise
  await cli.runMatchedCommand();
  process.exit(0);
} catch (error) {
  if (error instanceof Error) console.error(error.message);
  else {
    console.error(error);
  }

  process.exit(1);
}

import Keyring from "@polkadot/keyring";
import cac from "cac";
import { apply } from "./src/features/apply";
import { cidForFile } from "./src/features/cid";
import { refresh } from "./src/features/refresh";
import { storeEvidence } from "./src/features/store";
import { sudoXcm } from "./src/features/sudoxcm";

const cli = cac("pop");

// apply
cli
  .command(
    "apply <amount>",
    "create new accounts and apply for Proof of Personhood"
  )
  // TODO evidence hash
  // .option("-a, --amount <amount>", "number of accounts to create")
  .action(async (amount, options) => {
    console.log({ amount, options });
    await apply(Number(amount));
  });

// cid
cli
  .command("cid <file_path>", "returns the CID of given file")
  .action(async (filePath) => {
    await cidForFile(filePath);
  });

// sudoxcm
cli
  .command(
    "sudoxcm <encoded_call>",
    "sends sudo xcm to people with given encoded call"
  )
  .action(async (encodedCall) => {
    await sudoXcm(encodedCall);
  });

// refresh
cli
  .command(
    "refresh",
    "checks if the people root needs refreshing and refreshes if needed"
  )
  .action(async (encodedCall) => {
    await refresh();
  });

// store
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

// Setup help
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

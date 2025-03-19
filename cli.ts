import cac from "cac";
import { advance } from "./src/features/advance";
import { apply } from "./src/features/apply";
import { asPersonalIdentity } from "./src/features/asPersonalIdentity";
import { blake2b } from "./src/features/blake2b";
import { cid } from "./src/features/cid";
import { cidFromBlake } from "./src/features/cidFromBlake";
import { intervene } from "./src/features/intervene";
import { newAccounts } from "./src/features/new";
import { publish } from "./src/features/publish";
import { refresh } from "./src/features/refresh";
import { ripe } from "./src/features/ripe";
import { storeEvidence } from "./src/features/store";
import { sudoXcm } from "./src/features/sudoxcm";

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
  .option(
    "--parallel <amount>",
    "amount of account to advance, if not specified advances all"
  )
  .action(async (accounts, options) => {
    await advance({
      onlyAccounts: accounts ? (accounts as string[]) : [],
      amount: options.amount ? Number(options.amount) : undefined,
      parallel: options.parallel ? Number(options.parallel) : undefined,
    });
  });

// cli
//   .command("u8a <hex>", "Convert given hex string into Uint8Array")
//   .action(async (hex) => {
//     console.log({ hex });
//     console.log(hexToU8a(hex));
//   });

// cli
//   .command(
//     "asPersonalAlias <call> <...mnemonic>",
//     "submit call as personal alias"
//   )
//   .action(async (call, mnemonic) => {
//     await asPersonalIdentity(mnemonic.join(" "), call);
//   });

// cli
//   .command("intervene [...cases]", "intervene given cases")
//   .option("--truth <truth>", "Truth value to intervene with")
//   .option("--all", "Intervene all open cases", {})
//   .action(async (cases, options) => {
//     console.log({ cases, options });
//     await intervene(cases, options);
//   });

// cli
//   .command("publish <script>", "publish given tattoo script on testnet")
//   .option("--index <index>", "require family index")
//   .option("--description <description>", "description of the tattoo family")
//   .option("--name <name>", "name of the tattoo design")
//   .action(async (script, options) => {
//     console.log(options);
//     await publish(script, options);
//   });

cli
  .command("blake2b [...files]", "returns the blake2 hash of given file")
  .action(async (files) => {
    for await (const file of files) {
      await blake2b(file);
    }
  });
// cli
//   .command("cid [...files]", "returns the CID of given file")
//   .option("--codec [codec]", "Codec to use in the CID, default is 'raw'")
//   .action(async (files, options) => {
//     for await (const file of files) {
//       await cid(file, options?.codec);
//     }
//   });

cli
  .command("cidFromBlake <hash>", "returns the CID of given blake2 hash")
  .action(async (hash) => {
    await cidFromBlake(hash);
  });

// cli
//   .command(
//     "sudoxcm <encoded_call>",
//     "sends sudo xcm to people with given encoded call"
//   )
//   .action(async (encodedCall) => {
//     await sudoXcm(encodedCall);
//   });

// cli
//   .command(
//     "refresh",
//     "checks if the people root needs refreshing and refreshes if needed"
//   )
//   .action(async (encodedCall) => {
//     await refresh();
//   });

// cli
//   .command("ripe", "close all ripe cases if available")
//   .action(async (encodedCall) => {
//     await ripe();
//   });

// cli
//   .command(
//     "store <file_path> <mnemonic>",
//     "stores given file on chain with given account mnemonic"
//   )
//   .action(async (filePath, mnemonic) => {
//     const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
//     const account = keyring.createFromUri(mnemonic);

//     await storeEvidence(filePath, account);
//   });

cli.help();

try {
  // Parse CLI args without running the command
  console.log(process.argv);
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

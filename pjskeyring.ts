// Import the keyring as required
import { Keyring } from "@polkadot/api";

// Create a keyring instance
const keyring = new Keyring({ type: "sr25519" });
// Some mnemonic phrase
const PHRASE =
  "entire material egg meadow latin bargain dutch coral blood melt acoustic thought";

// Add an account, straight mnemonic
const newPair = keyring.addFromUri(PHRASE);

// (Advanced) add an account with a derivation path (hard & soft)
const newDeri = keyring.addFromUri(`${PHRASE}//hard-derived/soft-derived`);

// (Advanced, development-only) add with an implied dev seed and hard derivation
const alice = keyring.addFromUri("//Alice", { name: "Alice default" });

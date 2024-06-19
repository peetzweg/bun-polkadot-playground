import { mnemonicGenerate, mnemonicToEntropy } from "@polkadot/util-crypto";
import init, { member_from_entropy } from "./src/verifiable/verifiable";

const mnemonic = mnemonicGenerate(24);
const entropy = mnemonicToEntropy(mnemonic);

await init();
const member = member_from_entropy(entropy);
console.log({ mnemonic, entropy, member });

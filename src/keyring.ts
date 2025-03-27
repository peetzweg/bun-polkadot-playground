import { MultiAddress } from "@polkadot-api/descriptors";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  KeyPair,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { AccountId, FixedSizeBinary, SS58String } from "polkadot-api";
import { getPolkadotSigner, PolkadotSigner } from "polkadot-api/signer";

const miniSecret = entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE));
const derive = sr25519CreateDerive(miniSecret);

export const getDevPolkadotSigner = (path: string) => {
  const keyPair = derive(path);
  const signer = getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign);
  return {
    signer,
    keyPair,
    address: AccountId(42, 32).dec(keyPair.publicKey),
    multiAddress: MultiAddress.Address32(
      new FixedSizeBinary(keyPair.publicKey)
    ),
  };
};

export const mnemonicToKeyPair = (mnemonic: string) => {
  const entropy = entropyToMiniSecret(mnemonicToEntropy(mnemonic));
  const derive = sr25519CreateDerive(entropy);
  const keyPair = derive("//");
  const signer = getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign);
  return { keyPair, signer };
};

export interface Applicant {
  keyPair: KeyPair;
  signer: PolkadotSigner;
  address: SS58String;
  multiAddress: MultiAddress;
  mnemonic: string;
  entropy: Uint8Array;
  entropy_person: Uint8Array;
  entropy_voucher: Uint8Array;
}
export const mnemonicToApplicant = (mnemonic: string): Applicant => {
  const entropy = entropyToMiniSecret(mnemonicToEntropy(mnemonic));
  const entropy_person = entropyToMiniSecret(mnemonicToEntropy(mnemonic));
  const entropy_voucher = entropyToMiniSecret(mnemonicToEntropy(mnemonic));
  const derive = sr25519CreateDerive(entropy);
  const keyPair = derive("");

  const signer = getPolkadotSigner(keyPair.publicKey, "Sr25519", keyPair.sign);
  const address = AccountId(42, 32).dec(keyPair.publicKey);
  const multiAddress = MultiAddress.Address32(
    new FixedSizeBinary(keyPair.publicKey)
  );
  return {
    keyPair,
    signer,
    address,
    multiAddress,
    mnemonic,
    entropy,
    entropy_voucher,
    entropy_person,
  };
};

import { Enum, PolkadotSigner, Transaction, TxFinalized } from "polkadot-api";

// type PalletKey = keyof typeof People.tx;

// type CallKey = keyof (typeof People.tx)[PalletKey];

// type TxType = (typeof People.tx)[PalletKey][CallKey];

// const t = People.tx.Balances.burn;

export async function signAndSubmit<
  Pallet extends string,
  Name extends string,
  Asset,
  Args extends {} | undefined,
  T extends Transaction<Args, Pallet, Name, Asset>
>(tx: T, signer: PolkadotSigner): Promise<TxFinalized> {
  return new Promise((resolve, reject) => {
    tx.signSubmitAndWatch(signer, {
      customSignedExtensions: {
        VerifyMultiSignature: { value: Enum("Disabled") },
        AsPerson: { value: undefined },
        ProvideForReferral: { value: undefined },
      },
    } as any).subscribe({
      next: (e) => {
        // console.log(e.type);

        if (e.type === "finalized") {
          // console.log("Block Hash", e.block.hash);
          resolve(e);
        }
      },
      error: (e) => {
        console.error(e);
        reject(e);
      },
    });
  });
}

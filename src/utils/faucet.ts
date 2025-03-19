import { MultiAddress, people } from "@polkadot-api/descriptors";
import { PolkadotSigner, SS58String, TypedApi } from "polkadot-api";
import { getDevPolkadotSigner } from "../keyring";
import { signAndSubmit } from "./resolveOnPapi";

class Faucet {
  private todo: Set<SS58String>;
  private isProcessing: boolean;

  private promiseResolvers: Map<string, () => void>;
  private signer: PolkadotSigner;

  constructor() {
    this.todo = new Set<string>();
    this.isProcessing = false;
    this.promiseResolvers = new Map();
    this.signer = getDevPolkadotSigner("//Alice").signer;
  }

  private async _fund(
    api: TypedApi<typeof people>,
    address: SS58String
  ): Promise<void> {
    await signAndSubmit(
      api.tx.Balances.transfer_allow_death({
        dest: MultiAddress.Id(address),
        value: 100_000_000_000n,
      }),
      this.signer
    );
  }

  private async processQueue(api: TypedApi<typeof people>): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.todo.size > 0) {
        const address = this.todo.values().next().value;
        await this._fund(api, address);
        this.todo.delete(address);

        const resolver = this.promiseResolvers.get(address);
        if (resolver) {
          resolver();
          this.promiseResolvers.delete(address);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  fund = async (
    api: TypedApi<typeof people>,
    address: SS58String
  ): Promise<void> => {
    this.todo.add(address);

    // Create a promise that will resolve when this address is funded
    const promise = new Promise<void>((resolve) => {
      this.promiseResolvers.set(address, resolve);
    });

    // Start processing the queue
    this.processQueue(api);

    // Return the promise that will resolve when this address is funded
    return promise;
  };
}
export const faucet = new Faucet();

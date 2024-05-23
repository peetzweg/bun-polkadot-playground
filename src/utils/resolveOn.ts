import { ApiPromise } from "@polkadot/api";
import { ContractTx } from "@polkadot/api-contract/base/types";
import { ContractOptions } from "@polkadot/api-contract/types";
import {
  AddressOrPair,
  SubmittableExtrinsicFunction,
} from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

export const resolveOn =
  <TExtrinsicFn extends SubmittableExtrinsicFunction<"promise">>(
    extrinsicFn: TExtrinsicFn,
    state: ISubmittableResult["status"]["type"]
  ) =>
  (parameters: Parameters<TExtrinsicFn>, addressOrPair: AddressOrPair) =>
    new Promise<void>((resolve, reject) => {
      extrinsicFn(...parameters).signAndSend(
        addressOrPair,
        ({ status, dispatchError }) => {
          // console.info(status.type);
          if (dispatchError) {
            if (dispatchError.isModule) {
              const { docs, method, section } =
                extrinsicFn.meta.registry.findMetaError(dispatchError.asModule);
              reject(new Error(`${section}.${method}: ${docs.join(" ")}`));
            } else {
              console.error("Unhandled dispatchError", dispatchError);
              reject(dispatchError);
            }
          }

          if (status.type === state) {
            resolve();
          }
        }
      );
    });

export const resolveOnFinalized = <
  TExtrinsicFn extends SubmittableExtrinsicFunction<"promise">
>(
  extrinsicFn: TExtrinsicFn
) => resolveOn(extrinsicFn, "Finalized");

export const resolveOnInBlock = <
  TExtrinsicFn extends SubmittableExtrinsicFunction<"promise">
>(
  extrinsicFn: TExtrinsicFn
) => resolveOn(extrinsicFn, "InBlock");

export const resolveContractTxOn =
  <TExtrinsicFn extends ContractTx<"promise">>(
    extrinsicFn: TExtrinsicFn,
    state: ISubmittableResult["status"]["type"],
    api?: ApiPromise
  ) =>
  (addressOrPair: AddressOrPair, options: ContractOptions, ...params: any) =>
    new Promise<void>((resolve, reject) => {
      extrinsicFn(options, ...params).signAndSend(
        addressOrPair,
        ({ status, dispatchError }) => {
          if (dispatchError) {
            if (dispatchError.isModule) {
              if (api) {
                const { docs, method, section } = api.registry.findMetaError(
                  dispatchError.asModule
                );
                console.log(dispatchError.asModule.toHuman());
                reject(new Error(`${section}.${method}: ${docs.join(" ")}`));
              }
              reject(
                new Error(
                  "dispatchError, isModule",
                  dispatchError.asModule.toHuman()
                )
              );
            } else {
              console.error("Unhandled dispatchError", dispatchError);
              reject(dispatchError);
            }
          }

          if (status.type === state) {
            if (state === "InBlock") {
              console.info(
                `https://polkadot.js.org/apps/?rpc=wss://pop-testnet.parity-lab.parity.io:443/9910#/explorer/query/${status.asInBlock.toHex()}`
              );
            }
            resolve();
          }
        }
      );
    });

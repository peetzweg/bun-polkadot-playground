import {
  AddressOrPair,
  SignerOptions,
  SubmittableExtrinsicFunction,
} from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { PolkadotSigner, Transaction, TxOptions } from "polkadot-api";

export const resolveOnPapi =
  <T extends Transaction<any, any, any, any>>(call: T) =>
  (parameters: Parameters<T>, signer: PolkadotSigner, options: TxOptions) => {
    call.signAndSubmit(signer, parameters);
  };

// export const resolveOn =
//   <TExtrinsicFn extends SubmittableExtrinsicFunction<"promise">>(
//     extrinsicFn: TExtrinsicFn,
//     state: ISubmittableResult["status"]["type"]
//   ) =>
//   (
//     parameters: Parameters<TExtrinsicFn>,
//     addressOrPair: AddressOrPair,
//     options: Partial<SignerOptions> = {}
//   ) =>
//     new Promise<void>((resolve, reject) => {
//       extrinsicFn(...parameters).signAndSend(
//         addressOrPair,
//         options,
//         ({ status, dispatchError }) => {
//           // console.info(status.type);
//           if (dispatchError) {
//             if (dispatchError.isModule) {
//               const { docs, method, section } =
//                 extrinsicFn.meta.registry.findMetaError(dispatchError.asModule);
//               reject(new Error(`${section}.${method}: ${docs.join(" ")}`));
//             } else {
//               console.error("Unhandled dispatchError", dispatchError.type);
//               reject(dispatchError);
//             }
//           }

//           if (status.type === state) {
//             resolve();
//           }
//         }
//       );
//     });

// export const resolveOnFinalized = <
//   TExtrinsicFn extends SubmittableExtrinsicFunction<"promise">
// >(
//   extrinsicFn: TExtrinsicFn
// ) => resolveOn(extrinsicFn, "Finalized");

// export const resolveOnInBlock = <
//   TExtrinsicFn extends SubmittableExtrinsicFunction<"promise">
// >(
//   extrinsicFn: TExtrinsicFn
// ) => resolveOn(extrinsicFn, "InBlock");

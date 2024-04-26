import { ApiPromise } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import { WeightV2 } from "@polkadot/types/interfaces";

export const resolveSlug = async (
  slug: string,
  contract: ContractPromise,
  gasLimit: WeightV2,
  api?: ApiPromise
): Promise<any> => {
  const result = await contract.query.resolve(
    "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    { gasLimit },
    slug
  );

  if (result.result.isErr && result.result.asErr.isModule) {
    if (api) {
      const { docs, method, section } = api.registry.findMetaError(
        result.result.asErr.asModule
      );
      throw new Error(`Error calling contract: ${section}.${method} ${docs}`);
    } else {
      throw new Error(
        `Error calling contract: ${result.result.asErr.toString()}`
      );
    }
  }

  return result.output;
};

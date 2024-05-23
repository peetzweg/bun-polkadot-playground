import { QueryableStorageEntry } from "@polkadot/api/types";

type Options = {
  tries?: number;
  timeout?: number;
};
export const resolveOnSome =
  <TQueryFn extends QueryableStorageEntry<"promise">>(
    queryFn: TQueryFn,
    options?: Options
  ) =>
  // (parameters: Parameters<TQueryFn>) => // not sure why this is not working as expected
  (parameters: any[]) =>
    new Promise<void>((resolve, reject) => {
      let tries = 0;

      const query = () => {
        queryFn(...parameters)
          .then((result) => {
            console.log("try:", tries);
            if (tries > (options?.tries ?? 5)) reject("Too many tries");
            console.log("result", !!result);
            if (result.isEmpty) {
              tries++;
              setTimeout(query, options?.timeout ?? 10000);
            } else {
              resolve();
            }
          })
          .catch(reject);
      };

      query();
    });

import { QueryableStorageEntry } from "@polkadot/api/types";

export const resolveOnSome =
  <TQueryFn extends QueryableStorageEntry<"promise">>(queryFn: TQueryFn) =>
  // (parameters: Parameters<TQueryFn>) => // not sure why this is not working as expected
  (parameters: any[]) =>
    new Promise<void>((resolve, reject) => {
      let tries = 0;

      const query = () => {
        queryFn(...parameters)
          .then((result) => {
            console.log("try:", tries);
            if (tries > 5) reject("Too many tries");
            console.log({ result });
            if (result.isEmpty) {
              tries++;
              setTimeout(query, 10000);
            } else {
              console.log(result.toHuman());
              resolve();
            }
          })
          .catch(reject);
      };

      query();
    });

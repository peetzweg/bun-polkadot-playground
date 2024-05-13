import { api as Bulletin } from "./src/apis/bulletin";
import { resolveOnSome } from "./src/utils/resolveOnSome";

const authorizations = resolveOnSome(
  Bulletin.query.transactionStorage.authorizations
);
await authorizations([
  {
    Account: Bulletin.createType(
      "AccountId",
      "5ENqxNVeUZByNPb22ouB6GwYfZ25gzCMYrKveUzb5Rmb9M6r"
    ),
  },
]);

// const value = await Bulletin.query.transactionStorage.authorizations({
//   Account: Bulletin.createType(
//     "AccountId",
//     "5Gp6GNqst2KG51DKaDKAebNygB1ZECBq92bWnuvGZTRu3onN"
//   ),
// });

process.exit(0);

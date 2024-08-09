import type { DefinitionsCall } from "@polkadot/types/types";

export const runtime: DefinitionsCall = {
  ProofOfInkApi: [
    {
      version: 1,
      methods: {
        candidacy_deposit: {
          description: "",
          params: [],
          type: "Balance",
        },
      },
    },
  ],
  MobRuleApi: [
    {
      version: 1,
      methods: {
        points_to_voucher: {
          description: "",
          params: [],
          type: "u32",
        },
        voted_on: {
          description: "",
          params: [
            {
              name: "voter",
              type: "Alias",
            },
            {
              name: "only_done",
              type: "bool",
            },
          ],
          type: "Vec<u32>",
        },
      },
    },
  ],
};

import { MultiAddress, people } from "@polkadot-api/descriptors";
import { Enum, FixedSizeBinary, PolkadotSigner, TypedApi } from "polkadot-api";
import { ActionFunction, setup } from "xstate";
import { Applicant } from "../keyring";
import { signAndSubmit } from "./resolveOnPapi";
import {
  PHOTO_EVIDENCE_HASHES,
  VIDEO_EVIDENCE_HASHES,
} from "../features/evidence";
import { log } from "./applicantLog";
import { pickRandomElement } from "./pickRandomElement";

type MachineInput = {
  applicant: Applicant;
  api: TypedApi<typeof people>;
  alice: PolkadotSigner;
};
type MachineContext = {
  applicant: Applicant;
  api: TypedApi<typeof people>;
  alice: PolkadotSigner;
};

type MachineEvents =
  | { type: "FUNDED" }
  | { type: "NOT_PROVEN" }
  | { type: "PROVEN" }
  | { type: "HAS_FUNDS" }
  | { type: "IS_APPLIED" }
  | { type: "HAS_JUDGING" }
  | { type: "IS_PROVEN" }
  | { type: "HAS_NO_FUNDS" }
  | { type: "APPLIED_WITH_DEPOSIT" }
  | { type: "COMMITTED" }
  | { type: "HAS_FULL_ALLOCATION" }
  | { type: "HAS_INITIAL_ALLOCATION" }
  | { type: "IS_COMMITTED" }
  | { type: "EVIDENCE_SUBMITTED" };

export const machine = setup({
  types: {
    input: {} as MachineInput,
    context: {} as MachineContext,
    events: {} as MachineEvents,
  },
  actions: {
    applyWithDeposit: async function ({ context, event, self }, params) {
      await signAndSubmit(
        context.api.tx.ProofOfInk.apply(),
        context.applicant.signer
      );
      self.send({ type: "APPLIED_WITH_DEPOSIT" });
    },
    commit: async function ({ context, event, self }, params) {
      // TODO need to make sure index 10 is ProceduralAccount design type!!!
      const designFamilies =
        await context.api.query.ProofOfInk.DesignFamilies.getEntries();
      const proceduralAccountFamily = designFamilies.find(
        ({ value }) => value.kind.type === "ProceduralAccount"
      );
      if (!proceduralAccountFamily) {
        throw new Error("ProceduralAccount family available");
      }
      const familyIndex = proceduralAccountFamily?.keyArgs[0];

      // Actual Commit
      await signAndSubmit(
        context.api.tx.ProofOfInk.commit({
          choice: Enum("ProceduralAccount", familyIndex),
          require_id: undefined,
        }),
        context.applicant.signer
      );
      self.send({ type: "COMMITTED" });
    },
    checkAllocation: async function ({ context, event, self }, params) {
      const candidacy = await context.api.query.ProofOfInk.Candidates.getValue(
        context.applicant.address
      );

      if (candidacy?.type !== "Selected") {
        throw new Error(
          ` '${context.applicant.address}' is not able provide Evidence. Illegal state, not a selected candidate.`
        );
      }

      switch (candidacy.value.allocation.type) {
        case "Initial":
          self.send({ type: "HAS_INITIAL_ALLOCATION" });
          break;
        case "Full":
          self.send({ type: "HAS_FULL_ALLOCATION" });
          break;
      }
    },
    submitVideoEvidence: async function ({ context, event, self }, params) {
      const evidenceHash = pickRandomElement(VIDEO_EVIDENCE_HASHES);
      try {
        await signAndSubmit(
          context.api.tx.ProofOfInk.submit_evidence({
            evidence: FixedSizeBinary.fromHex(evidenceHash),
          }),
          context.applicant.signer
        );
        self.send({ type: "EVIDENCE_SUBMITTED" });
      } catch (e) {
        console.error(e);
      }
    },
    submitPhotoEvidence: async function ({ context, event, self }, params) {
      const evidenceHash = pickRandomElement(PHOTO_EVIDENCE_HASHES);
      try {
        await signAndSubmit(
          context.api.tx.ProofOfInk.submit_evidence({
            evidence: FixedSizeBinary.fromHex(evidenceHash),
          }),
          context.applicant.signer
        );
        self.send({ type: "EVIDENCE_SUBMITTED" });
      } catch (e) {
        console.error(e);
      }
    },
    checkJudging: async function ({ context, event }, params) {
      const candidacy = await context.api.query.ProofOfInk.Candidates.getValue(context.applicant.address);

      if(candidacy?.type === "Selected"){
        if (candidacy.value.judging){
          console.log("Judging", candidacy.value.judging);
        }
      }else{
        console.log("In Judging State but no open Judging!!!")
      }
    },
    allocateFull: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    fund: async function ({ context, event, self }, params) {
      log(context.applicant.address, "funding...");
      try {
        await signAndSubmit(
          context.api.tx.Balances.transfer_allow_death({
            dest: MultiAddress.Id(context.applicant.address),
            value: 100_000_000_000n,
          }),
          context.alice
        );
        self.send({ type: "FUNDED" });
      } catch (e) {
        console.error(e);
      }
    },
  },
}).createMachine({
  context: ({ input }) => ({
    applicant: input.applicant,
    api: input.api,
    alice: input.alice,
  }),
  id: "IndividualityApplicant",
  initial: "Waiting",
  states: {
    Waiting: {
      on: {
        HAS_NO_FUNDS: {
          target: "#IndividualityApplicant.Pristine.Unfunded",
        },
        HAS_FUNDS: {
          target: "#IndividualityApplicant.Pristine.Funded",
        },
        IS_APPLIED: {
          target: "#IndividualityApplicant.ProofOfInk.Applied",
        },
        IS_COMMITTED: {
          target:
            "#IndividualityApplicant.ProofOfInk.Committed.UnknownAllocation",
        },
        HAS_JUDGING: {
          target: "#IndividualityApplicant.ProofOfInk.Committed.Judging",
        },
        IS_PROVEN: {
          target: "Proven",
        },
      },
    },
    Proven: {
      type: "final",
    },
    Pristine: {
      initial: "Unfunded",
      states: {
        Unfunded: {
          on: {
            FUNDED: {
              target: "Funded",
              actions: {
                type: "fund",
              },
            },
          },
        },
        Funded: {
          on: {
            APPLIED_WITH_DEPOSIT: {
              target: "#IndividualityApplicant.ProofOfInk.Applied",
            },
          },
          entry: {
            type: "applyWithDeposit",
          },
        },
      },
    },
    ProofOfInk: {
      initial: "Applied",
      states: {
        Applied: {
          on: {
            COMMITTED: {
              target: "Committed",
            },
          },
          entry: {
            type: "commit",
          },
        },
        Committed: {
          initial: "UnknownAllocation",
          states: {
            UnknownAllocation: {
              on: {
                HAS_FULL_ALLOCATION: {
                  target: "FullAllocation",
                },
                HAS_INITIAL_ALLOCATION: {
                  target: "InitialAllocation",
                },
              },
              entry: {
                type: "checkAllocation",
              },
            },
            FullAllocation: {
              on: {
                EVIDENCE_SUBMITTED: {
                  target: "Judging",
                },
              },
              entry: {
                type: "submitVideoEvidence",
              },
            },
            InitialAllocation: {
              on: {
                EVIDENCE_SUBMITTED: {
                  target: "Judging",
                },
              },
              entry: {
                type: "submitPhotoEvidence",
              },
            },
            Judging: {
              on: {
                NOT_PROVEN: {
                  target: "AllocateFull",
                },
                PROVEN: {
                  target: "#IndividualityApplicant.Proven",
                },
              },
              entry: {
                type: "checkJudging",
              },
            },
            AllocateFull: {
              on: {
                HAS_FULL_ALLOCATION: {
                  target: "FullAllocation",
                },
              },
              entry: {
                type: "allocateFull",
              },
            },
          },
        },
      },
    },
  },
});

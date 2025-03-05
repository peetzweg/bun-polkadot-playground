import { people } from "@polkadot-api/descriptors";
import { Enum, FixedSizeBinary, PolkadotSigner, TypedApi } from "polkadot-api";
import { setup } from "xstate";
import {
  PHOTO_EVIDENCE_HASHES,
  VIDEO_EVIDENCE_HASHES,
} from "../features/evidence";
import { Applicant } from "../keyring";
import { faucet } from "../utils/faucet";
import { pickRandomElement } from "../utils/pickRandomElement";
import { signAndSubmit } from "../utils/resolveOnPapi";

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
  | { type: "APPLIED_WITH_DEPOSIT" }
  | { type: "COMMITTED" }
  | { type: "EVIDENCE_SUBMITTED" }
  | { type: "FUNDED" }
  | { type: "HAS_FULL_ALLOCATION" }
  | { type: "HAS_FUNDS" }
  | { type: "HAS_INITIAL_ALLOCATION" }
  | { type: "HAS_INVITE_VOUCHER" }
  | { type: "HAS_JUDGING" }
  | { type: "HAS_NO_FUNDS" }
  | { type: "INIT_DONE" }
  | { type: "IS_APPLIED" }
  | { type: "IS_COMMITTED" }
  | { type: "IS_PROVEN" }
  | { type: "NOT_PROVEN" }
  | { type: "PROVEN" }
  | { type: "WAIT" }
  | { type: "RESTORE_STATE" }
  | { type: "CHECK_JUDGING" };

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
        case "InitDone":
          self.send({ type: "INIT_DONE" });
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
    checkJudging: async function ({ context, event, self }, params) {
      const candidacy = await context.api.query.ProofOfInk.Candidates.getValue(
        context.applicant.address
      );

      switch (candidacy?.type) {
        case "Proven":
          self.send({ type: "PROVEN" });
          break;
        case "Selected":
          if (candidacy.value.judging) {
            console.log("Judging", candidacy.value.judging);
          } else if (candidacy.value.allocation.type === "InitDone") {
            self.send({ type: "INIT_DONE" });
          } else {
            console.log(
              context.applicant.address,
              "Unhandled case not sure what todo"
            );
          }
          break;
      }

      self.send({ type: "WAIT" });
    },
    allocateFull: async function ({ context, event, self }, params) {
      await signAndSubmit(
        context.api.tx.ProofOfInk.allocate_full(),
        context.applicant.signer
      );
      self.send({ type: "HAS_FULL_ALLOCATION" });
    },
    fund: async function ({ context, event, self }, params) {
      await faucet.fund(context.api, context.applicant.address);
      self.send({ type: "FUNDED" });
    },
    restoreState: async function ({ context, event, self }, params) {
      const candidacy = await context.api.query.ProofOfInk.Candidates.getValue(
        context.applicant.address
      );

      // End early as we don't want to start funding here.
      if (!candidacy) {
        const accountData = await context.api.query.System.Account.getValue(
          context.applicant.address
        );
        if (accountData?.data.free !== 0n) {
          self.send({ type: "HAS_FUNDS" });
        } else {
          self.send({ type: "HAS_NO_FUNDS" });
        }
        return;
      }
      switch (candidacy?.type) {
        case "Applied":
          self.send({ type: "IS_APPLIED" });
          break;
        case "Selected":
          if (candidacy.value.judging !== undefined) {
            self.send({ type: "HAS_JUDGING" });
          } else {
            self.send({ type: "IS_COMMITTED" });
          }
          break;
        case "Proven":
          self.send({ type: "IS_PROVEN" });
          break;
      }
    },
    waitForJudgement: async function ({ context, event, self }, params) {
      await new Promise((resolve) => setTimeout(resolve, 30000));
      self.send({ type: "CHECK_JUDGING" });
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
        HAS_INVITE_VOUCHER: {
          target: "#IndividualityApplicant.Pristine.Invited",
        },
        RESTORE_STATE: {
          target: "UnknownState",
        },
      },
    },
    UnknownState: {
      on: {
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
        HAS_FUNDS: {
          target: "#IndividualityApplicant.Pristine.Funded",
        },
        HAS_NO_FUNDS: {
          target: "#IndividualityApplicant.Pristine.Unfunded",
        },
      },
      entry: {
        type: "restoreState",
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
            },
          },
          entry: {
            type: "fund",
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
        Invited: {
          type: "final",
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
                INIT_DONE: {
                  target: "AllocateFull",
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
            Judging: {
              on: {
                INIT_DONE: {
                  target: "AllocateFull",
                },
                PROVEN: {
                  target: "#IndividualityApplicant.Proven",
                },
                WAIT: {
                  target: "WaitingForJudgement",
                },
              },
              entry: {
                type: "checkJudging",
              },
            },
            WaitingForJudgement: {
              on: {
                CHECK_JUDGING: {
                  target: "Judging",
                },
              },
              entry: {
                type: "waitForJudgement",
              },
            },
          },
        },
      },
    },
  },
});

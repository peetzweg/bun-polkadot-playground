import { bulletin, people } from "@polkadot-api/descriptors";
import { blake2AsHex, mnemonicToEntropy } from "@polkadot/util-crypto";
import { join } from "node:path";
import {
  AccountId,
  Binary,
  Enum,
  FixedSizeBinary,
  PolkadotSigner,
  SS58String,
  TypedApi,
} from "polkadot-api";
import { setup } from "xstate";
import { Applicant } from "../keyring";
import { faucet } from "../utils/faucet";
import { listFiles } from "../utils/listFiles";
import { pickRandomElement } from "../utils/pickRandomElement";
import { prepareEvidence } from "../utils/prepareEvidence";
import { signAndSubmit } from "../utils/resolveOnPapi";
import { member_from_entropy, one_shot } from "../verifiable/verifiable";

type MachineInput = {
  applicant: Applicant;
  api: TypedApi<typeof people>;
  bulletin: TypedApi<typeof bulletin>;
  alice: PolkadotSigner;
  log: (...args: Parameters<typeof console.log>) => void;
};
type MachineContext = {
  applicant: Applicant;
  api: TypedApi<typeof people>;
  bulletin: TypedApi<typeof bulletin>;
  alice: PolkadotSigner;
  log: (...args: Parameters<typeof console.log>) => void;
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
  | { type: "CHECK_JUDGING" }
  | { type: "HAS_NO_ALLOCATION" }
  | { type: "HAS_TOO_LITTLE_ALLOCATION" }
  | { type: "REGISTERED_PERSON" }
  | { type: "REGISTERED_ALIAS" };

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

      const authorizations =
        await context.bulletin.query.TransactionStorage.Authorizations.getValue(
          {
            type: "Account",
            value: context.applicant.address,
          }
        );

      switch (candidacy.value.allocation.type) {
        case "Initial":
          if (!authorizations) {
            self.send({ type: "HAS_NO_ALLOCATION" });
            return;
          }
          self.send({ type: "HAS_INITIAL_ALLOCATION" });
          break;
        case "Full":
          if (!authorizations) {
            self.send({ type: "HAS_NO_ALLOCATION" });
            return;
          } else if (authorizations.extent.bytes < 2_100_000n) {
            self.send({ type: "HAS_TOO_LITTLE_ALLOCATION" });
            return;
          }
          self.send({ type: "HAS_FULL_ALLOCATION" });
          break;
        case "InitDone":
          self.send({ type: "INIT_DONE" });
          break;
      }
    },
    submitVideoEvidence: async function ({ context, event, self }, params) {
      try {
        const folder = Bun.env.VIDEO_EVIDENCE_FOLDER;
        if (!folder) {
          throw new Error("VIDEO_EVIDENCE_FOLDER environment variable not set");
        }

        const files = await listFiles(folder, ".mp4");

        if (files.length === 0) {
          throw new Error("No MP4 files found in VIDEO_EVIDENCE_FOLDER");
        }

        // Pick a random MP4 file
        const randomFile = pickRandomElement(files);
        const filePath = join(folder, randomFile);

        // Prepare the evidence
        const [instructions, chunks] = await prepareEvidence(filePath);

        let chunksStored = 0;
        for await (const chunk of chunks) {
          const encodedChunk = Binary.fromBytes(chunk);
          const store = context.bulletin.tx.TransactionStorage.store({
            data: encodedChunk,
          });
          await signAndSubmit(store, context.applicant.signer);
          chunksStored++;
          context.log(`chunksStored: ${chunksStored}/${chunks.length}`);
        }

        const instructionBytes = Binary.fromText(JSON.stringify(instructions));
        context.log("Storing Instructions...");
        const storeInstructions = context.bulletin.tx.TransactionStorage.store({
          data: instructionBytes,
        });
        await signAndSubmit(storeInstructions, context.applicant.signer);
        context.log("Instructions stored!");
        const instructionsHash = blake2AsHex(instructionBytes.asBytes());
        context.log("instructionsHash", instructionsHash);
        await signAndSubmit(
          context.api.tx.ProofOfInk.submit_evidence({
            evidence: FixedSizeBinary.fromHex(instructionsHash),
          }),
          context.applicant.signer
        );
        self.send({ type: "EVIDENCE_SUBMITTED" });
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
    submitPhotoEvidence: async function ({ context, event, self }, params) {
      try {
        const folder = Bun.env.PHOTO_EVIDENCE_FOLDER;
        if (!folder) {
          throw new Error("PHOTO_EVIDENCE_FOLDER environment variable not set");
        }

        const files = await listFiles(folder, ".jpg");

        if (files.length === 0) {
          throw new Error("No JPG files found in PHOTO_EVIDENCE_FOLDER");
        }

        // Pick a random MP4 file
        const randomFile = pickRandomElement(files);
        const filePath = join(folder, randomFile);

        // Prepare the evidence
        const [instructions, chunks] = await prepareEvidence(filePath);

        let chunksStored = 0;
        for await (const chunk of chunks) {
          const encodedChunk = Binary.fromBytes(chunk);
          context.log("Storing chunk...");
          const store = context.bulletin.tx.TransactionStorage.store({
            data: encodedChunk,
          });
          await signAndSubmit(store, context.applicant.signer);
          chunksStored++;
          context.log(`chunksStored: ${chunksStored}/${chunks.length}`);
        }

        const instructionBytes = Binary.fromText(JSON.stringify(instructions));
        context.log("Storing Instructions...");
        const storeInstructions = context.bulletin.tx.TransactionStorage.store({
          data: instructionBytes,
        });
        await signAndSubmit(storeInstructions, context.applicant.signer);
        context.log("Instructions stored!");
        const instructionsHash = blake2AsHex(instructionBytes.asBytes());
        context.log("instructionsHash", instructionsHash);
        await signAndSubmit(
          context.api.tx.ProofOfInk.submit_evidence({
            evidence: FixedSizeBinary.fromHex(instructionsHash),
          }),
          context.applicant.signer
        );
        self.send({ type: "EVIDENCE_SUBMITTED" });
      } catch (e) {
        console.error(e);
        throw e;
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
            context.log("Judging", candidacy.value.judging);
            self.send({ type: "HAS_JUDGING" });
          } else if (candidacy.value.allocation.type === "InitDone") {
            self.send({ type: "INIT_DONE" });
          } else {
            context.log(
              context.applicant.address,
              "Unhandled case not sure what todo"
            );
            // Complete here as we need external intervention
            return;
          }
          break;
      }

      // Only send WAIT if we haven't returned early due to needing intervention
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
      const member_key = member_from_entropy(context.applicant.entropy_person);

      const member_key_fixed_binary = FixedSizeBinary.fromBytes(member_key);

      const personalId = await context.api.query.People.Keys.getValue(
        member_key_fixed_binary
      );
      if (personalId) {
        context.log("Registered Person: ", personalId);
        const myInfo = await context.api.query.People.People.getValue(
          personalId
        );
        if (!myInfo) {
          throw new Error(
            "People.People(${personalId}) not found, something is wrong in the pallet. NOT IN RING YET?"
          );
        }
        const ringIndex = myInfo.ring_index;

        const ring = await context.api.query.People.RingKeys.getValue(
          ringIndex
        );
        // ring.keys;

        // const alias = ();

        self.send({ type: "REGISTERED_PERSON" });
        return;
      }

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
    registerMemberKey: async function ({ context, event, self }, params) {
      const pub_key = member_from_entropy(context.applicant.entropy);
      const voucher_pub_key = member_from_entropy(
        context.applicant.entropy_voucher
      );
      const self_ref_voucher_pub_key = member_from_entropy(
        context.applicant.entropy_voucher
      );

      context.log("registering Person key");

      const registerTx = context.api.tx.ProofOfInk.register_non_referred({
        key: FixedSizeBinary.fromBytes(pub_key),
        voucher_key: FixedSizeBinary.fromBytes(voucher_pub_key),
        self_ref_voucher_key: FixedSizeBinary.fromBytes(
          self_ref_voucher_pub_key
        ),
      });

      await signAndSubmit(registerTx, context.applicant.signer);
      self.send({ type: "REGISTERED_PERSON" });
    },
    registerAliasAccount: async function ({ context, event, self }, params) {
      context.log("Want to register Alias Account");
      const member_key = member_from_entropy(context.applicant.entropy_person);

      const member_key_fixed_binary = FixedSizeBinary.fromBytes(member_key);

      const personalId = await context.api.query.People.Keys.getValue(
        member_key_fixed_binary
      );
      if (personalId) {
        context.log("Registered Person: ", personalId);
        const myInfo = await context.api.query.People.People.getValue(
          personalId
        );
        if (!myInfo) {
          throw new Error(
            "People.People(${personalId}) not found, something is wrong in the pallet. NOT IN RING YET?"
          );
        }
        const ringIndex = myInfo.ring_index;

        const ring = await context.api.query.People.RingKeys.getValue(
          ringIndex
        );
        const members = ring.keys;
        const proofContext = new Uint8Array([1, 2, 3, 4]);
        const message = new Uint8Array([1, 2, 3, 4]);
        const result = one_shot(
          context.applicant.entropy_person,
          members,
          proofContext,
          message
        );

        return;
      }
    },
  },
}).createMachine({
  context: ({ input }) => ({
    applicant: input.applicant,
    api: input.api,
    bulletin: input.bulletin,
    alice: input.alice,
    log: input.log,
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
          target: "#IndividualityApplicant.Person.Proven",
        },
        HAS_FUNDS: {
          target: "#IndividualityApplicant.Pristine.Funded",
        },
        HAS_NO_FUNDS: {
          target: "#IndividualityApplicant.Pristine.Unfunded",
        },
        REGISTERED_PERSON: {
          target: "#IndividualityApplicant.Person.NoAlias",
        },
        REGISTERED_ALIAS: {
          target: "#IndividualityApplicant.Person.WithAlias",
        },
      },
      entry: {
        type: "restoreState",
      },
    },
    Blocked: {
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
                HAS_NO_ALLOCATION: {
                  target: "#IndividualityApplicant.Blocked",
                },
                HAS_TOO_LITTLE_ALLOCATION: {
                  target: "#IndividualityApplicant.Blocked",
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
                  target: "UnknownAllocation",
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
                  target: "#IndividualityApplicant.Person.Proven",
                },
                HAS_JUDGING: {
                  target: "#IndividualityApplicant.Blocked",
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
    Person: {
      initial: "Proven",
      states: {
        WithAlias: {
          type: "final",
        },
        NoAlias: {
          on: {
            REGISTERED_ALIAS: {
              target: "#IndividualityApplicant.Person.WithAlias",
            },
          },
          entry: {
            type: "registerAliasAccount",
          },
        },
        Proven: {
          on: {
            REGISTERED_PERSON: {
              target: "#IndividualityApplicant.Person.NoAlias",
            },
          },
          entry: {
            type: "registerMemberKey",
          },
        },
      },
    },
  },
});

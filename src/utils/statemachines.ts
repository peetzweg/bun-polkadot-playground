import { MultiAddress, people } from "@polkadot-api/descriptors";
import { Enum, FixedSizeBinary, PolkadotSigner, TypedApi } from "polkadot-api";
import { setup } from "xstate";
import { Applicant } from "../keyring";
import { signAndSubmit } from "./resolveOnPapi";
import {
  PHOTO_EVIDENCE_HASHES,
  VIDEO_EVIDENCE_HASHES,
} from "../features/evidence";

type MachineContext = {
  applicant: Applicant;
  api: TypedApi<typeof people>;
  alice: PolkadotSigner;
};

type MachineEvents =
  | { type: "FUNDED" }
  | { type: "APPLIED" }
  | { type: "COMMITTED" }
  | { type: "EVIDENCE_SUBMITTED" };

export const applyMachine = setup({
  types: {
    input: {} as MachineContext,
    context: {} as MachineContext,
    events: {} as MachineEvents,
  },
  actions: {
    fundAction: async ({ context: { applicant, api, alice }, self }) => {
      console.log(` ${applicant.address} funding...`);
      try {
        await signAndSubmit(
          api.tx.Balances.transfer_allow_death({
            dest: MultiAddress.Id(applicant.address),
            value: 100_000_000_000n,
          }),
          alice
        );
        self.send({ type: "FUNDED" });
      } catch (e) {
        console.error(e);
      }
    },
    applyAction: async ({ context: { applicant, api }, self }) => {
      console.log(` ${applicant.address} applying...`);
      try {
        await signAndSubmit(api.tx.ProofOfInk.apply(), applicant.signer);
        self.send({ type: "APPLIED" });
      } catch (e) {
        console.error(e);
      }
    },
    commitAction: async ({ context: { applicant, api }, self }) => {
      try {
        console.log(` ${applicant.address} committing...`);

        // TODO need to make sure index 10 is ProceduralAccount design type!!!
        const designFamilies =
          await api.query.ProofOfInk.DesignFamilies.getEntries();
        const proceduralAccountFamily = designFamilies.find(
          ({ value }) => value.kind.type === "ProceduralAccount"
        );
        if (!proceduralAccountFamily) {
          throw new Error("ProceduralAccount family available");
        }
        const familyIndex = proceduralAccountFamily?.keyArgs[0];

        await signAndSubmit(
          api.tx.ProofOfInk.commit({
            choice: Enum("ProceduralAccount", familyIndex),
            require_id: undefined,
          }),
          applicant.signer
        );
        self.send({ type: "COMMITTED" });
      } catch (e) {
        console.error(e);
      }
    },
    submitEvidenceAction: async ({ context: { applicant, api }, self }) => {
      console.log(` ${applicant.address} submitting evidence...`);
      const candidacy = await api.query.ProofOfInk.Candidates.getValue(
        applicant.address
      );

      if (candidacy?.type !== "Selected") {
        throw new Error(` '${applicant.address}' is not able provide Evidence`);
      }

      const randomIndex = Math.floor(
        Math.random() * PHOTO_EVIDENCE_HASHES.length
      );
      let evidenceHash = PHOTO_EVIDENCE_HASHES[randomIndex];

      if (candidacy.value.allocation.type === "Full") {
        const randomIndex = Math.floor(
          Math.random() * VIDEO_EVIDENCE_HASHES.length
        );
        evidenceHash = VIDEO_EVIDENCE_HASHES[randomIndex];
      }

      try {
        await signAndSubmit(
          api.tx.ProofOfInk.submit_evidence({
            evidence: FixedSizeBinary.fromHex(evidenceHash),
          }),
          applicant.signer
        );
        self.send({ type: "EVIDENCE_SUBMITTED" });
      } catch (e) {
        console.error(e);
      }
    },
  },
}).createMachine({
  id: "Apply",
  initial: "Unfunded",
  context: ({ input }) => ({
    applicant: input.applicant,
    api: input.api,
    alice: input.alice,
  }),
  states: {
    Unfunded: {
      entry: [{ type: "fundAction" }],
      on: {
        FUNDED: {
          target: "Funded",
        },
      },
    },
    Funded: {
      entry: [{ type: "applyAction" }],
      on: {
        APPLIED: {
          target: "Applied",
        },
      },
    },
    Applied: {
      entry: [{ type: "commitAction" }],
      on: {
        COMMITTED: {
          target: "Committed",
        },
      },
    },
    Committed: {
      entry: [{ type: "submitEvidenceAction" }],
      on: {
        EVIDENCE_SUBMITTED: {
          target: "Judging",
        },
      },
    },
    Judging: {
      type: "final",
    },
  },
});

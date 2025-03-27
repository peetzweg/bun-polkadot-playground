import {
  XcmV2OriginKind,
  XcmV3Instruction,
  XcmV3WeightLimit,
} from "@polkadot-api/descriptors";
import { getPeopleUnstable, getRelayUnstable } from "../apis";
import { getDevPolkadotSigner } from "../keyring";
import { signAndSubmit } from "../utils/resolveOnPapi";

interface NewGameOptions {
  onlyAccounts: string[];
  amount: number;
  parallel: number;
}

export const newGame = async (options: Partial<NewGameOptions> = {}) => {
  const People = await getPeopleUnstable();
  const Relay = await getRelayUnstable();
  const alice = getDevPolkadotSigner("//Alice");

  const [five, ten, fifteen] = [5, 10, 15]
    .map((minutes) => new Date().getTime() + minutes * 60 * 1000)
    .map((millis) => millis / 1000)
    .map((seconds) => Math.round(seconds));

  const newGameTx = await People.tx.Game.new_game({
    registration_ends: five,
    game_date: ten,
    report_ends: fifteen,
    rounds: 1,
    max_group_size: 2,
  });
  const encodedTx = await newGameTx.getEncodedData();

  console.log({ new_game: encodedTx.asHex() });

  const xcmTx = await Relay.tx.XcmPallet.send({
    dest: {
      type: "V3",
      value: {
        parents: 0,
        interior: {
          type: "X1",
          value: {
            type: "Parachain",
            value: 1004,
          },
        },
      },
    },
    message: {
      type: "V3",
      value: [
        XcmV3Instruction.UnpaidExecution({
          weight_limit: XcmV3WeightLimit.Unlimited(),
          check_origin: undefined,
        }),

        XcmV3Instruction.Transact({
          origin_kind: XcmV2OriginKind.Superuser(),
          require_weight_at_most: {
            ref_time: 40000000000n,
            proof_size: 900000n,
          },
          call: encodedTx,
        }),
      ],
    },
  });

  const sudoTx = await Relay.tx.Sudo.sudo({
    call: xcmTx.decodedCall,
  });

  const encodedSudoTx = await sudoTx.getEncodedData();
  console.log(encodedSudoTx.asHex());

  const block = await signAndSubmit(sudoTx, alice.signer);
  console.log(block.block.hash);
};

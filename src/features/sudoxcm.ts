import { Keyring } from "@polkadot/api";
import { getApi } from "../apis";
import { resolveOnFinalized } from "../utils/resolveOn";
export const sudoXcm = async (encodedCall: string, parachainId = 1004) => {
  const Relay = await getApi("Relay");

  const destination = {
    V3: { parents: 0, interior: { X1: { Parachain: parachainId } } },
  };

  const message = {
    V3: [
      { UnpaidExecution: { weightLimit: "Unlimited" } },
      {
        Transact: {
          originKind: "Superuser",
          requireWeightAtMost: { refTime: 40000000000n, proofSize: 900000n },
          call: {
            encoded: encodedCall,
          },
        },
      },
    ],
  };

  const xcmSend = Relay.tx.xcmPallet.send(destination, message);
  const sudo = resolveOnFinalized(Relay.tx.sudo.sudo);

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const keyPair = keyring.createFromUri("//Alice");

  await sudo([xcmSend], keyPair);
};

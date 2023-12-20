import { argv } from "bun";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import "./generated/interfaces/augment-api";
import "./generated/interfaces/augment-types";

let encodedCall = argv[2];
if (!encodedCall) throw "No Encoded Call Passed";

const wsProvider = new WsProvider(`wss://${Bun.env.PLAYGROUND_RPC}`);

const api = await ApiPromise.create({
  provider: wsProvider,
});

const destination = {
  V3: { parents: 0, interior: { X1: { Parachain: 1004 } } },
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

const xcmSend = api.tx.xcmPallet.send(destination, message);
const sudo = api.tx.sudo.sudo(xcmSend);

const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });

const result = await sudo.signAndSend(keyring.createFromUri("//Alice"));
console.log(result.toHex());

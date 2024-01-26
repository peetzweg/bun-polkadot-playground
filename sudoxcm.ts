import { argv } from "bun";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import "./src/interfaces/relay/augment-api";
import "./src/interfaces/relay/augment-types";

let encodedCall = argv[2];
if (!encodedCall) throw "No Encoded Call Passed";
const RPC = Bun.env.RELAY_RPC;

console.log("RPC: ", RPC);

const wsProvider = new WsProvider(`wss://${RPC}`);

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
const keypair = keyring.createFromUri("///Alice");
const ss58Address = api.createType("AccountId", keypair.address);
console.log(keypair.address);
console.log(ss58Address.toString());

const result = await sudo.signAndSend(keyring.createFromUri("//Alice"));
console.log(result.toHex());

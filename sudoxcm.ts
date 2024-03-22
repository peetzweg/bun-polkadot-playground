import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { argv } from "bun";
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

const unsubscribe = await sudo.signAndSend(
  keyring.createFromUri("//Alice"),
  ({ status, events }) => {
    switch (status.type) {
      case "Finalized":
      case "InBlock": {
        events.forEach((record) => {
          if (api.events.sudo.Sudid.is(record.event)) {
            // NEW PART:
            if (record.event.data.sudoResult.isErr) {
              // SAME PART AS IN DOCS:
              let error = record.event.data.sudoResult.asErr;
              if (error.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = api.registry.findMetaError(error.asModule);
                const { docs, name, section } = decoded;

                console.log(`${section}.${name}: ${docs.join(" ")}`);
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                console.log(error.toString());
              }
            }
            return record.event;
          }
        });
        unsubscribe();
        process.exit(0);
      }
      default:
        break;
    }
  }
);

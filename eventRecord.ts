import { ApiPromise, WsProvider } from "@polkadot/api";
import { Abi } from "@polkadot/api-contract";
import Erc20Metadata from "./erc20.json";
import METADATA from "./metadata/json/contracts-node.json";
import { Metadata, TypeRegistry } from "@polkadot/types";
const wsProvider = new WsProvider(`ws://127.0.0.01:9944`);

// const api = await ApiPromise.create({
//   provider: wsProvider,
// });

const m = new Metadata(new TypeRegistry(), METADATA);

const api = await ApiPromise.create({
  metadata: METADATA as any,
});

const evenRecordBytes = new Uint8Array([
  0, 1, 0, 0, 0, 8, 3, 218, 23, 21, 14, 150, 179, 149, 90, 77, 182, 173, 53,
  221, 235, 73, 95, 114, 47, 156, 29, 132, 104, 49, 19, 191, 176, 150, 191, 63,
  170, 48, 242, 73, 1, 1, 212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189,
  4, 169, 159, 214, 130, 44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165,
  109, 162, 125, 1, 212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4,
  169, 159, 214, 130, 44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165,
  109, 162, 125, 0, 240, 228, 136, 143, 68, 99, 1, 0, 0, 0, 0, 0, 0, 0, 0, 12,
  181, 182, 26, 62, 106, 33, 161, 107, 228, 240, 68, 181, 23, 194, 138, 198,
  146, 73, 47, 115, 197, 191, 211, 246, 1, 120, 173, 152, 199, 103, 244, 203,
  212, 53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130,
  44, 133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125, 212,
  53, 147, 199, 21, 253, 211, 28, 97, 20, 26, 189, 4, 169, 159, 214, 130, 44,
  133, 88, 133, 76, 205, 227, 154, 86, 132, 231, 165, 109, 162, 125,
]);

const eventRecordJson = {
  phase: {
    applyExtrinsic: 1,
  },
  event: {
    index: "0x0803",
    data: [
      "5Gzf9pZsGj3SztG48Qxo7gdgCarAvuQfyyZXcGr8Nd7jA9Pm",
      "0x01d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d01d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d00f0e4888f4463010000000000000000",
    ],
  },
  topics: [],
};

const eventRecordHexV4 =
  "0x0001000000080360951b8baf569bca905a279c12d6ce17db7cdce23a42563870ef585129ce5dc64d010001d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d018eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4800505a4f7e9f4eb106000000000000000c0045726332303a3a5472616e7366657200000000000000000000000000000000da2d695d3b5a304e0039e7fc4419c34fa0c1f239189c99bb72a6484f1634782b2b00c7d40fe6d84d660f3e6bed90f218e022a0909f7e1a7ea35ada8b6e003564";
const eventRecordHexV5 =
  "0x00010000000803da17150e96b3955a4db6ad35ddeb495f722f9c1d84683113bfb096bf3faa30f2490101d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d01d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d00f0e4888f44630100000000000000000cb5b61a3e6a21a16be4f044b517c28ac692492f73c5bfd3f60178ad98c767f4cbd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27dd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";

const anonEventRecordHexV5 =
  "0x00010000000803538e726248a9c155911e7d99f4f474c3408630a2f6275dd501d4471c7067ad2c490101d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d018eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4800505a4f7e9f4eb1060000000000000008d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48";
// const abi = new Abi(Erc20Metadata);
const record = api.registry.createType("EventRecord", eventRecordHexV4);
console.log({ recordV4: record.toJSON() });

const recordV5 = api.registry.createType("EventRecord", eventRecordHexV5);
console.log({ recordV5: recordV5.toJSON() });

const anonRecordV5 = api.registry.createType(
  "EventRecord",
  anonEventRecordHexV5
);
console.log({ anonRecordV5: anonRecordV5.toJSON() });

const eventJSON = {
  phase: {
    applyExtrinsic: 1,
  },
  event: {
    index: "0x0803",
    data: [
      "5DxG9VD3UepN5GDkL5Jqyc8dum7NACfu7aFPAqYBuSNw6hq7",
      "0x01d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d018eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a4800505a4f7e9f4eb10600000000000000",
    ],
  },
  topics: [],
};

const recordFromJSON = api.registry.createTypeUnsafe("EventRecord", [
  eventJSON,
]);

console.log({ recordFromJSON: recordFromJSON.toJSON() });
process.exit(0);

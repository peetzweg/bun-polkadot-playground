import { getApi } from "../apis";

import { Keyring } from "@polkadot/keyring";
import { resolveOnInBlock } from "../utils/resolveOn";
import {
  createXCMTransactSuperuser,
  XCM_PEOPLE_DESTINATION,
} from "../utils/xcm";
import { PalletMobRuleCase } from "@polkadot/types/lookup";

interface InterveneOptions {
  truth: "ConfidentTrue";
  all: boolean;
}

export const intervene = async (cases: string[], options: InterveneOptions) => {
  const People = await getApi("People");
  const Relay = await getApi("Relay");

  let caseIndices: number[] = [];
  if (options.all) {
    caseIndices = (await People.query.mobRule.cases.entries())
      .map(([key, value]) => {
        const data: PalletMobRuleCase = value.unwrap();
        if (data.isOpen) return key.args[0].toNumber();
      })
      .filter((x) => x !== undefined);
  } else {
    caseIndices = cases.map((c) => parseInt(c));
  }

  const interveneCalls = caseIndices.map((caseIndex) => {
    return People.tx.mobRule.intervene(caseIndex, {
      Truth: options.truth || "ConfidentTrue",
    });
  });

  const keyring = new Keyring({ type: "sr25519", ss58Format: 0 });
  const alice = keyring.createFromUri("//Alice");

  const sudo = resolveOnInBlock(Relay.tx.sudo.sudo);
  for (const call of interveneCalls) {
    const message = createXCMTransactSuperuser(call.method.toHex());
    const sendXcm = Relay.tx.xcmPallet.send(XCM_PEOPLE_DESTINATION, message);
    await sudo([sendXcm], alice);
    console.log(
      "XCM sent to intervene case",
      call.method.args[0].toPrimitive()
    );
  }
};

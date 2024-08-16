export const XCM_PEOPLE_DESTINATION = {
  V3: { parents: 0, interior: { X1: { Parachain: 1004 } } },
};

export const createXCMTransactSuperuser = (
  encodedCall: string,
  requireWeightAtMost = { refTime: 40000000000n, proofSize: 900000n }
) => ({
  V3: [
    { UnpaidExecution: { weightLimit: "Unlimited" } },
    {
      Transact: {
        originKind: "Superuser",
        requireWeightAtMost,
        call: {
          encoded: encodedCall,
        },
      },
    },
  ],
});

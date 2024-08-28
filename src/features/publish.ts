import { prompt, PromptObject } from "prompts";
import { basename } from "node:path";
import { cidForFile } from "../utils/cidForFile";
import { blake2bForFile } from "../utils/blake2bForFile";
import { getApi } from "../apis";
import { $ } from "bun";
import { sudoXcm } from "./sudoxcm";

const validateName = (name: string) =>
  name.length >= 4 ? true : "Name should be at least 4 characters";

const validateDescription = (description: string) => {
  if (!description.includes(".")) {
    return "Please end the description with a period.";
  }
  if (description.split(" ").length <= 3) {
    return "Please write at least one proper sentence.";
  }
  return true;
};

interface DesignFamilyMetadata {
  version: 1;
  metadata: {
    size: "Fixed";
    mime: "text/javascript";
    media: string;
    name: string;
    description: string;
    kind: string;
  };
}

export const publish = async (filePath: string, familyIndex?: number) => {
  // get latest family id
  const people = await getApi("People");

  let requireFamilyIndex = familyIndex;
  let isFamilyIndexAvailable = true;
  if (requireFamilyIndex) {
    const family = await people.query.proofOfInk.designFamilies(
      requireFamilyIndex
    );
    if (family.isSome) {
      isFamilyIndexAvailable = false;
    }
  } else {
    const amountOfFamilies = (
      await people.query.proofOfInk.designFamilies.entries()
    ).length;
    let checkIndex = amountOfFamilies + 1;
    let family = await people.query.proofOfInk.designFamilies(checkIndex);
    while (family.isSome) {
      checkIndex++;
      family = await people.query.proofOfInk.designFamilies(checkIndex);
    }
    requireFamilyIndex = checkIndex;
  }

  const fileName = basename(filePath).split(".")[0];

  let result: prompts.Answers<
    "useFamilyIndex" | "name" | "description" | "kind"
  >;
  try {
    result = [
      isFamilyIndexAvailable
        ? {
            type: "confirm",
            name: "useFamilyIndex",
            message: `Creating new family with family index: ${requireFamilyIndex}`,
          }
        : {
            type: "confirm",
            name: "useFamilyIndex",
            message: `Family index '${requireFamilyIndex}' already in use, overwrite?`,
          },
      {
        type: "text",
        name: "name",
        message: "What is should be the tattoos display name?",
        validate: validateName,
        initial: fileName,
      },
      {
        type: "text",
        name: "description",
        message: "Write a short description of the tattoo script",
        // validate: validateDescription,
      },
      {
        type: "select",
        name: "kind",
        message: "What kind of tattoo is it you want to publish?",
        choices: [
          {
            title: "Procedural -  Seed is 4 Bytes of Entropy",
            value: "Procedural",
          },
          {
            title: "Procedural Account - Seed is Public Key as Bytes",
            value: "ProceduralAccount",
          },
          {
            title: "Procedural Personal -  Seed is Personal Id Number as Bytes",
            value: "ProceduralPersonal",
          },
        ],
      },
    ];
  } catch (error) {
    console.log((error as Error).message);
    return;
  }

  const scriptCid = await cidForFile(filePath);

  const metadata: DesignFamilyMetadata = {
    version: 1,
    metadata: {
      size: "Fixed",
      mime: "text/javascript",
      media: scriptCid,
      name: result.name,
      description: result.description,
      kind: result.kind,
    },
  };

  // upload script
  console.info("Uploading script to IPFS");
  await $`ipfs add --chunker size-1000000 ${filePath} --raw-leaves --hash blake2b-256`;

  // upload metadata
  console.info("Uploading tattoo family metadata to IPFS");
  const metadataFilePath = `./tmp/metadata.json`;
  await Bun.write(metadataFilePath, JSON.stringify(metadata));
  await $`ipfs add ${metadataFilePath} --hash blake2b-256`;

  // add_design_family
  console.info("Submitting extrinsic to add design family");
  const hashOfMetadata = await blake2bForFile(metadataFilePath);

  const addDesignFamilyCall = people.tx.proofOfInk.addDesignFamily(
    requireFamilyIndex,
    {
      Procedural: { range: 50 },
    },
    hashOfMetadata
  );

  await sudoXcm(addDesignFamilyCall.method.toHex());

  console.log({
    metadata,
    hashOfMetadata,
    call: addDesignFamilyCall.method.toHex(),
  });
};

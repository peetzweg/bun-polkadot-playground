import { api as People } from "./src/apis/people";

const [caseTimeoutSecs, maxVotes, minVotes] = await Promise.all([
  People.consts.mobRule.caseTimeoutSecs,
  People.consts.mobRule.maxVotes,
  People.consts.mobRule.minVotes,
]);

console.log({
  caseTimeoutSecs,
  maxVotes,
  minVotes,
});

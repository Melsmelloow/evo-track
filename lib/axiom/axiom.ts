import { Axiom } from "@axiomhq/js";

const axiomClient = new Axiom({
  token: process.env.NEXT_AXIOM_TOKEN!,
});

export default axiomClient;

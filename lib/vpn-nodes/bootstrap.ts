import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function createBootstrapCommand(controlUrl: string, enrollmentToken: string) {
  const scriptPath = path.join(process.cwd(), "public", "most-node-bootstrap.sh");
  const digest = createHash("sha256").update(await readFile(scriptPath)).digest("hex");
  const scriptUrl = `${controlUrl}/most-node-bootstrap.sh`;
  return `curl -fsSLo /tmp/most-node-bootstrap.sh '${scriptUrl}' && echo '${digest}  /tmp/most-node-bootstrap.sh' | sha256sum -c - && sudo env MOST_CONTROL_URL='${controlUrl}' MOST_ENROLL_TOKEN='${enrollmentToken}' bash /tmp/most-node-bootstrap.sh`;
}

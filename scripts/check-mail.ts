import nextEnv from "@next/env";
import { mailTransport } from "../src/lib/mail";
nextEnv.loadEnvConfig(process.cwd());
const transport = (() => {
  try {
    return mailTransport();
  } catch {
    console.error("SMTP_USER and SMTP_PASS must be configured in .env.");
    process.exitCode = 1;
    return null;
  }
})();
if (transport) {
  try {
    await transport.verify();
    console.log(
      "SMTP connection and authentication verified. No email was sent.",
    );
  } catch {
    console.error(
      "SMTP verification failed. Check host, port, Gmail 2-Step Verification and App Password. No secret details were logged.",
    );
    process.exitCode = 1;
  } finally {
    transport.close();
  }
}

// Local SMTP sink for browser tests. No email ever leaves this process.
import { SMTPServer } from "smtp-server";
import { createServer } from "node:http";
if (!process.env.MONGODB_DB?.startsWith("report_desk_test_"))
  throw new Error("Test database required.");
const messages = new Map<string, { code: string; count: number }>();
const smtp = new SMTPServer({
  disabledCommands: ["STARTTLS"],
  disableReverseLookup: true,
  logger: false,
  onRcptTo(address, _session, callback) {
    if (address.address === "fail-delivery@example.com")
      return callback(new Error("Test delivery failure"));
    callback();
  },
  onAuth(auth, _session, callback) {
    if (
      auth.username !== "mailbox@example.test" ||
      auth.password !== "local-test-only"
    )
      return callback(new Error("Denied"));
    callback(null, { user: "tests" });
  },
  onData(stream, session, callback) {
    let text = "";
    stream.on("data", (chunk) => {
      text += chunk.toString();
    });
    stream.on("end", () => {
      const code = text.match(/\b(\d{6})\b/)?.[1];
      if (!code) return callback(new Error("Missing test code"));
      for (const recipient of session.envelope.rcptTo) {
        const email = recipient.address.toLowerCase();
        messages.set(email, {
          code,
          count: (messages.get(email)?.count || 0) + 1,
        });
      }
      callback();
    });
  },
});
smtp.listen(3102, "127.0.0.1");
createServer((request, response) => {
  const email = new URL(
    request.url || "/",
    "http://localhost",
  ).searchParams.get("email");
  response.setHeader("Content-Type", "application/json");
  response.end(
    JSON.stringify(email ? messages.get(email) || null : { ready: true }),
  );
}).listen(3103, "127.0.0.1");

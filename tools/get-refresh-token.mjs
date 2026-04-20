import http from "node:http";
import { URL } from "node:url";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://127.0.0.1:3000/oauth2callback";

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in your environment.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("Open this URL in your browser and approve access:\n");
console.log(authUrl);
console.log("\nWaiting for callback on:", redirectUri);

const redirect = new URL(redirectUri);
const rl = readline.createInterface({ input, output });

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || "/", redirectUri);
  const code = reqUrl.searchParams.get("code");

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing code parameter.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Success. You can close this tab and return to your terminal.\n");

    console.log("\nGOOGLE_REFRESH_TOKEN=");
    console.log(tokens.refresh_token || "<none returned>");
    console.log("\nIf you saw <none returned>, revoke the app and retry with prompt=consent.");
  } catch (error) {
    console.error("Failed to exchange code:", error.message || error);
  } finally {
    server.close();
    rl.close();
  }
});

server.listen(Number(redirect.port || 3000), redirect.hostname, () => {
  console.log("\nLocal callback server ready.");
});

process.on("SIGINT", () => {
  server.close();
  rl.close();
  process.exit(0);
});

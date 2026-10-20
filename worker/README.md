# QCLens sync service

A tiny Cloudflare Worker that lets every device use QCLens with its own username and password, without anyone needing a GitHub token. The worker holds the token as a secret and reads/writes one JSON file in a **private** GitHub repository.

## What it does
- Checks each worker's username/email and password on the server before sending any data.
- Never sends password hashes to devices.
- Accepts access requests (name and email) from people who are not signed in yet.
- Enforces roles on the server: technologists can only add QC results and change their own password; supervisory technologists cannot change users, rules or requests; only administrators can change users and approve requests.

## Set up (about 10 minutes, free tier is enough)
1. On GitHub create a **private** repository, e.g. `qclens-data`, with a README.
2. Create a fine-grained personal access token limited to that repository, permission **Contents: Read and write**.
3. In Cloudflare (dash.cloudflare.com) go to Workers & Pages → Create → Worker. Name it `qclens-sync`, deploy, then Edit code and replace everything with the contents of `worker.mjs`. Deploy.
4. Worker → Settings → Variables and Secrets. Add:
   - `GH_TOKEN` (type **Secret**): the token from step 2
   - `GH_OWNER`: your GitHub user or organisation
   - `GH_REPO`: `qclens-data`
   - optional `GH_PATH` (default `qclens-data.json`) and `GH_BRANCH` (default `main`)
5. Copy the worker address (`https://qclens-sync.<you>.workers.dev`).
6. In QCLens, sign in as administrator → Setup → Cloud storage → Option A → paste the address → Connect and upload data.
7. Use **Copy link for new devices** and send it to staff. Opening it connects their device; they then press Request access.

## Limits to know about
- Email is not sent automatically. When you approve a request QCLens opens a ready-written email in your mail app with the temporary password.
- Rate limiting of sign-in attempts is not built in. Add a Cloudflare rate-limiting rule on the worker if you want one.
- Free Workers allow limited CPU time per request. If the data file grows very large (many years of results) consider the paid plan.
- If the administrator forgets their password and has no other administrator, the account must be reset by editing the data file in the private repository.

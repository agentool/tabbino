# Tabbino

Phone-friendly receipt splitting for friends. Built with Next.js, React, TypeScript, and Gemini 3.8 Flash.

## MVP

- Phone camera, image upload, compressed images, structured receipt extraction, and manual review.
- Equal or item-based splitting with deterministic cent allocation. Charges follow item subtotals.
- Short live split links for WhatsApp. Friends join, select items, and see shared payment proof. Receipt photos are stored privately and shown on the split.
- Native Circle USDC on Base, Stellar, and Solana: compatible payment URIs, QR codes, wallet signing, explorer links, and matching-transfer verification.
- PayPal handoff with recipient email and USD amount. No automatic PayPal verification.
- Browser-local drafts and IndexedDB photo previews. Optional Firebase Google sign-in enables private account drafts and remembered friends across devices. Use Save draft before leaving. Private Vercel Blob stores bill state and photos.
- Search all current ISO 4217 currencies by name, code, or country, including KZT. Gemini chooses the currency from the receipt. Supported non-USD reference rates load automatically; the organizer can review or override them. Currencies without a quote allow a manual rate. Zero-, two-, three-, and four-decimal precision is preserved.
- Receipt links and transaction hashes are saved before optional verification. Failed verification keeps the proof and records a separate failure status.

## Payment setup

New and example bills start with empty receiving wallets and PayPal email. The organizer supplies payment details for each bill before sharing. No personal payment defaults or credentials are bundled.

## Development

Use Node 24 and npm. Run `npm ci`, set environment variables from `.env.example`, and run `npm run dev` (port 3034). Run `npm test`, `npm run typecheck`, and `npm run build` for checks.

`GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and `SHARE_SECRET` are server-only. Never expose them using NEXT_PUBLIC variables. Connect a private Vercel Blob store to the project. Keep SHARE_SECRET stable to preserve older encrypted snapshot links. Live links use a random capability token and private server-side storage. Conditional writes and retries prevent simultaneous contributions from overwriting each other.

## Deployment

App: https://tabbino.vercel.app · Repository: https://github.com/agentool/tabbino

The previous randomized domain remains attached for existing split links and device-local drafts. Sign in and save a draft there to access it on the new domain. Internal storage keys retain their original names to preserve existing drafts.

See `deployment.json` for public project IDs and the stable domain. `.github/workflows/vercel.yml` deploys same-repository pull requests as previews; both `main` and `prod` push to this project's production environment. Vercel native Git integration is not used. Required GitHub secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID. Runtime secrets are managed in Vercel.

## MVP boundaries

Live links synchronize participants, item selections, and payment proof. Anyone with the link can view the photo, join, choose a name, and update contributions; names are not authenticated. Organizers can update receipt amounts and receiving details at the same link using a private editor token or their authenticated owner account. Optimistic revision checks prevent overwriting friends’ updates; reload the shared copy to resolve a conflict. Existing payment proof stays visible, and previously verified proof is marked for review after an organizer edit. Legacy links without editor credentials need a new editable copy. Existing encrypted links remain readable, but need a new live link for collaboration. Photos are kept in private storage and delivered only after checking the link token. Drafts stay on the device until explicitly saved to an account; publishing while signed in also saves an account copy. Account writes check revisions to prevent cross-device overwrites. Transfer verification matches the requested asset, amount and recipient on-chain; it does not establish the identity of a payer or globally prevent the reuse of a transfer receipt. Stellar and Solana requests include a bill/person memo. PayPal transfers are confirmed directly between friends.

The scanner has input limits and per-instance rate limiting. For broad public use, add a durable shared rate limiter and Vercel Firewall rules. Public RPC endpoints may throttle; BASE_RPC_URL and SOLANA_RPC_URL support dedicated endpoints. Stellar requires funded accounts and an authorized Circle USDC trustline; Solana may need associated token account rent; wallets need their network's native asset for fees.

Receipt recognition can be wrong. Review all amounts, currency, charges, and printed total before sharing. Non-USD reference rates load automatically and remain editable for review. ExchangeRate-API supplies daily reference USD FX rates; the application uses the group's agreed USDC rate. PayPal requests are in USD.

## Firebase setup

Create or select a Firebase project on the Spark plan and enable the Google provider. For CLI setup, copy `firebase.example.json` to the ignored `firebase.json`, replace its example support email with your own, and run `firebase deploy --only auth --project YOUR_PROJECT_ID`. Do not commit your local Firebase configuration. The default Firebase authentication callback is provisioned automatically; do not repeat it in `authorizedRedirectUris`.

Set `FIREBASE_PROJECT_ID` and JSON `FIREBASE_WEB_CONFIG` in your local environment and Vercel. The web config contains `apiKey`, `authDomain`, `projectId`, and `appId` from your Firebase web app. Add the app's stable domain and any localhost, preview, or custom domains you use to Firebase Authentication's authorized domains. Firebase handles authentication; private Vercel Blob stores account drafts, remembered friends, and receipt images. Firebase Cloud Storage is not required.

Google sign-in requests only profile/email. Contact import is not enabled. Google People API supports optional `contacts.readonly`; Workspace directory lookup is a separate scope and requires organization sharing settings. No Gmail mail scope is needed.

## Integration checks

The scripts in `scripts/` create clearly labeled test data in the configured storage. Run them only against the environment you intend to test. `test-account-storage.ts` requires a path to a JPEG test image as its first argument; no receipts are bundled. Test payment destinations use reserved example addresses, and the scripts never send payments.

## Protocol references

- https://ai.google.dev/gemini-api/docs/models
- https://developers.circle.com/stablecoins/usdc-contract-addresses
- https://eips.ethereum.org/EIPS/eip-681
- https://docs.solanapay.com/spec
- https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md
- https://www.paypal.com/us/cshelp/article/how-do-i-send-money-help293

- https://www.exchangerate-api.com/docs/free
- https://www.six-group.com/en/products-services/financial-information/data-standards.html
- https://firebase.google.com/docs/auth/configure-providers-cli
- https://developers.google.com/people/v1/contacts
- https://developers.google.com/people/v1/directory

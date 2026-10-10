# n8n authentication integration status

## Discovery

The supplied n8n URL, `https://harshi-kumar.app.n8n.cloud/form/sign-in`, currently renders a page titled **Create your account**. It asks for full name, email, phone number, and password, and says it will email a six-digit verification code. The page is an n8n-hosted form: its browser code submits form data to the form URL and handles a form response or redirect. It does not publish a documented JSON API, login endpoint, verification endpoint, Occupie session, or trusted role response.

The supplied Google Sheets URL redirects to Google sign-in in the available browser session. Its sheet tabs and column headers could not be inspected. No sheet values were accessed.

There is no n8n integration in the repository. Occupie's current auth API is Flask at `/api/auth`: registration creates a customer account, login issues an HTTP-only access cookie with CSRF protection, `/me` restores the session, and logout revokes it. The server resolves staff roles from restaurant memberships. The React auth service is in `frontend/src/services/api.js`; protected dashboard routes are in `frontend/src/routes/AppRoutes.jsx`. The current Flask registration/login flow does not call n8n and does not require the n8n email code.

The hosted form can collect a registration, but a successful form submission alone cannot authenticate a React session or establish a trusted Occupie identity. Embedding it would still submit the user's credentials to n8n and would not, by itself, produce an Occupie session. No frontend or backend behavior has been switched to it.

## Details needed from the workflow owner

Please provide the following from the existing n8n workflow, without sending real user rows, passwords, verification codes, or API secrets in chat:

1. The production API/webhook URL and HTTP method for each supported operation: customer registration, request/send code, verify code, password sign-in (if supported), password reset (if supported), and logout (if supported). Confirm which URLs are production URLs and whether the hosted form is the only public interface.
2. Exact request content type, field names, required fields, and safe example requests using dummy values. Confirm how the hosted form fields map to workflow fields, including phone number.
3. Exact success and failure status codes and response bodies for each operation, again using dummy values. Include behavior for invalid, expired, reused, and rate-limited codes, plus code expiry and attempt limits.
4. How successful verification gives Flask a server-verifiable proof of identity. A `200` response, `success: true`, email address, or matching spreadsheet row alone is not sufficient. Provide the existing signature/token format, verification key location, issuer/audience/expiry rules, or the existing callback mechanism that Flask can validate. If the workflow has no such mechanism, that is the missing server-side component to add to the existing workflow.
5. The sheet's header row or a field/data dictionary, the purpose of each column, and confirmation that passwords and verification codes are stored only as appropriate one-way hashes and are never stored in plaintext. Do not provide account values.
6. The authoritative role source and mapping. Confirm whether this workflow creates customers only. Occupie staff roles must continue to come from trusted Flask-side restaurant memberships; public signup cannot assign manager, host, or floor-staff access.
7. Any server-to-server authentication required by the webhook and its rotation/configuration method. Share the mechanism, not the secret itself. Secrets belong in backend environment or n8n credentials, never in `VITE_*` variables.

Once that contract is available, the integration can be added through the Flask server, where n8n credentials and response verification remain private. Flask can then issue Occupie's existing secure cookie only after validating the workflow's proof and resolving the account and role server-side. The current dashboard paths remain `/dashboard/customer`, `/dashboard/host`, `/dashboard/manager`, and `/dashboard/floor-staff`.

## Configuration status

No n8n URL or secret variables have been added to either `.env.example`: the production webhook URLs and server authentication contract are not known, so adding guessed names or endpoints would imply a non-existent API. The frontend now derives the `/api/auth` path from `VITE_API_BASE_URL`, while `VITE_API_PROXY_TARGET` remains the local development proxy target; existing Flask cookie, database, CORS, and rate-limit settings are documented in `docs/SETUP.md`.

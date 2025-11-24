# BookmarkAI Security Guidelines

This document outlines security best practices and actionable recommendations tailored to the BookmarkAI codebase. It aligns with core security principles—Security by Design, Least Privilege, Defense in Depth, and Secure Defaults—and addresses the specific technologies used (Next.js, Convex, Clerk, Tailwind CSS).

---

## 1. Secure Architecture & Design

- **Security by Design:** Embed threat modeling early. Review each feature (metadata extraction, video transcription, real-time updates) for security risks (e.g., SSRF, injection, DoS).  
- **Least Privilege:** Grant Convex functions and Clerk roles only the permissions they require (e.g., database tables, server actions).  
- **Defense in Depth:** Layer protections across the frontend (CSP, input sanitization), API (rate limiting, authentication), and infrastructure (network controls, secure defaults).

---

## 2. Authentication & Access Control

- **Clerk Configuration:**  
  • Enforce strong password rules via Clerk’s policy settings (min length ≥ 12, complexity).  
  • Enable Multi-Factor Authentication (MFA) for all users or at least for elevated roles.  
  • Restrict endpoints with Clerk middleware (`middleware.ts`)—ensure all API and server actions validate `auth.userId()`.

- **Role-Based Access Control (RBAC):**  
  • Define roles (e.g., `user`, `admin`) in Clerk metadata.  
  • In Convex `.can` rules, allow reads/writes only when `request.auth.userId() === bookmark.ownerId` or user has an `admin` role.

- **Session Security:**  
  • Rely on Clerk’s secure session cookies with `HttpOnly`, `Secure`, and `SameSite=Lax` or `Strict`.  
  • Enforce idle and absolute timeouts in Clerk settings.  
  • Mitigate session fixation by rotating session identifiers on privilege change.

---

## 3. Input Handling & Processing

- **URL & Metadata Extraction:**  
  • Sanitize and validate all user-submitted URLs against a whitelist of schemes (`https://`).  
  • Use a safe HTTP client with timeouts and size limits to fetch pages. Reject large payloads or infinite redirects.  
  • Prevent SSRF by disallowing private IPs (e.g., `127.0.0.1`, `10.0.0.0/8`).

- **SQL/NoSQL Injection:**  
  • Convex abstracts queries—still validate and type-check all inputs before passing to mutations.  
  • Sanitize tag and collection names to strip control characters.

- **XSS Mitigation:**  
  • Escape user-provided data in React components by default. Avoid `dangerouslySetInnerHTML`.  
  • Implement a Content Security Policy (CSP) in `next.config.js` headers to restrict sources for scripts, styles, and images.

- **File Uploads (if added):**  
  • Validate MIME types and file extensions.  
  • Store uploads (e.g., transcripts) outside the webroot or on managed object storage with restrictive ACLs.  
  • Scan for malware.

---

## 4. Data Protection & Privacy

- **Encryption in Transit:**  
  • Enforce HTTPS (TLS 1.2+) across all Next.js and Convex endpoints.  
  • Redirect HTTP to HTTPS via `next.config.js` rewrites or Vercel settings.

- **Encryption at Rest:**  
  • Confirm Convex storage is encrypted by the provider (most managed DBs are).  
  • For added PII (e.g., user preferences), consider field-level encryption before storage.

- **Secrets Management:**  
  • Store API keys (e.g., transcription service) in environment variables with Convex secrets manager or a vault.  
  • Never check secrets into Git or commit them to `next.config.js`.

- **PII Minimization:**  
  • Only collect user metadata essential for functionality.  
  • Mask or omit PII in logs and error messages.

---

## 5. API & Service Security

- **Rate Limiting & Throttling:**  
  • In Next.js Server Actions (metadata extraction, transcription), enforce request quotas per user/IP to prevent abuse and DoS.

- **CORS Policy:**  
  • Configure strict CORS in any custom API routes: allow only the official frontend origin.  
  • Use `Access-Control-Allow-Credentials` and avoid `*` in production.

- **API Versioning:**  
  • If exposing custom API endpoints in the future, prefix with `/api/v1/` and deprecate old versions gracefully.

---

## 6. Web Application Security Hygiene

- **CSRF Protection:**  
  • For any non-GET routes not covered by Convex, implement anti-CSRF tokens or leverage Next.js built-in CSRF protection.

- **Security HTTP Headers:**  
  • `Content-Security-Policy`: restrict scripts/styles/images.  
  • `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.  
  • `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.  
  • `Referrer-Policy: no-referrer-when-downgrade`.

- **Secure Cookies:**  
  • Ensure Clerk and any custom cookies use `HttpOnly`, `Secure`, `SameSite=Strict` (or `Lax` for federated flows).

- **Subresource Integrity (SRI):**  
  • If loading remote scripts or styles, include integrity hashes and set `crossorigin="anonymous"`.

---

## 7. Infrastructure & Configuration Management

- **Harden Hosting Environment:**  
  • Disable developer/debug modes in production (`next.config.js`: `reactStrictMode: false`).  
  • Remove or guard secret debug endpoints.

- **Dependency Updates:**  
  • Regularly upgrade Next.js, Convex SDK, Clerk SDK, and Tailwind CSS.  
  • Monitor CVE databases and enable Dependabot or Snyk alerts.

- **Network Controls:**  
  • If self-hosting Convex backend, restrict database access to known IPs or VPC.  
  • Limit open ports to HTTPS (443) and SSH (22) from trusted networks.

---

## 8. Dependency Management

- **Lockfiles:**  
  • Commit `package-lock.json` to ensure reproducible builds.  
  • Audit transitive dependencies for vulnerabilities.

- **Minimal Footprint:**  
  • Remove unused packages (e.g., unused UI libraries).  
  • Vet all third-party modules for active maintenance and known security issues.

---

## 9. BookmarkAI-Specific Recommendations

- **Metadata Extraction Security:**  
  • Move HTML parsing into a sandboxed environment or serverless isolation to mitigate malicious scripts.  
  • Validate extracted images and iframes to prevent embedded malicious content.

- **Video Transcription Integration:**  
  • Use time-limited, scoped API keys for transcription services.  
  • Offload long-running transcription to Convex background functions with retry and circuit-breaker patterns.

- **Real-Time Updates:**  
  • Monitor real-time channels for flooding. Implement rate limits on subscriptions or leverage server-side filters.

---

## 10. Continuous Security Practices

- **Automated Testing:**  
  • Build unit tests and integration tests for critical paths (metadata extractor, Convex mutations).  
  • Include security-focused tests (e.g., testing XSS vectors, invalid URLs).

- **Code Reviews & Audits:**  
  • Enforce PR reviews with a security checklist.  
  • Periodically perform third-party security audits or penetration tests.

- **Monitoring & Alerting:**  
  • Log and alert on anomalous API usage, high error rates, or authentication failures.  
  • Protect logs from tampering and ensure PII is redacted.

---

By following these guidelines, the BookmarkAI team can ensure a robust security posture, protect user data, and foster trust in the application. Regularly revisit these practices as new features are added and technologies evolve.
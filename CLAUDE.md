# ecwidApps — rules for Claude

Storefront JavaScript/CSS that runs on the live grasssticks.com and grasssticks.ca checkout and
product pages (Ecwid). The `v2/` folder is published to apps.grasssticks.com via Cloudflare Pages;
the older `GS*` folders are Cabot's original apps, still served via jsDelivr until retired.

**This repository is PUBLIC.** Never put API keys, tokens, store secrets, or customer data in it.

## Security (required)
Run a security review (`/security-review`) before any deploy. For changes touching customer data, money, logins, or the database, Andrew runs the review himself in a fresh session (not the session that wrote the code).

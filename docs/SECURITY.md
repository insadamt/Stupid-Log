# Security Policy

## Supported Versions

Security fixes are provided for the latest released `1.2.x` version. Pre-release branches are supported only while they are under active development.

## Deployment Boundary

Stupid Log v1.2.0 is designed for a trusted LAN or private VPN. It has no public-internet authentication boundary and must not be directly exposed through a public IP, public reverse proxy, or open tunnel.

Use a firewall and private network controls. Keep `.env.production`, `APP_KEY`, database credentials, infrastructure backups, and IGDB credentials private.

## Reporting

Report vulnerabilities privately through GitHub Security Advisories for the repository. Do not open a public issue containing exploit details, credentials, personal library data, or backup archives.

Include:

- Affected version or commit
- Reproduction steps
- Expected and observed behavior
- Security impact
- Suggested mitigation, if known

Do not access data that is not yours or disrupt another installation while researching a report.

## Backup Safety

Portable restores replace application data. Verify the archive source and create a current backup before restoring. Provider credentials are intentionally excluded from portable backups and must be re-entered after a fresh-install restore.

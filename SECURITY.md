# Security

## Reporting

Please report suspected vulnerabilities through GitHub Security Advisories
("Report a vulnerability") on this repository. Do not open a public issue for a
security-sensitive report.

## Security model

- Both plugins run in the DSH Host and register model-facing tools only.
- Compatibility analysis is read-only: no network requests, no `!!js` execution,
  no importing unloaded plugin modules, no profile patch edits, and no automatic
  version exemptions.
- `trim_apply_profile` changes plugin enablement only after `confirm: true`; it
  skips protected items and writes a rollback snapshot before each change.
- Local data uses `$DSH_HOME/experience-optimizer/` with directory mode `0700`
  and file mode `0600`. Audit and usage records contain tool names, package
  names, counts, and summaries only — never conversation text or tool arguments.
- `trackUsage: false` disables the usage observer and historical usage reads.
- The packages do not collect telemetry and do not contact third-party services.

## Dependencies

The plugin bundles depend on DSH host packages as peers and on `yaml`, `semver`,
and `@deepseek-ai/dsh-app-boot` at runtime. `dsh-shared-meta` is private and is
inlined into the published bundles.

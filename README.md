# n8n-nodes-gh-project-promoter

[![npm version](https://img.shields.io/npm/v/n8n-nodes-gh-project-promoter.svg)](https://www.npmjs.com/package/n8n-nodes-gh-project-promoter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

**n8n-nodes-gh-project-promoter** is an n8n community node that runs [ghpp](https://github.com/douhashi/ghpp) (GitHub Project Promoter) from within n8n workflows.

ghpp automates status transitions in GitHub Projects V2 by promoting items through a defined flow:

```
inbox -> plan -> ready -> doing
```

| Phase | Transition         | Constraint                                                                    |
| ----- | ------------------ | ----------------------------------------------------------------------------- |
| Plan  | `inbox` -> `plan`  | Up to the configured plan limit (default: 3)                                  |
| Ready | `plan` -> `ready`  | Opt-in; only items carrying the configured planned label (default: `planned`) |
| Doing | `ready` -> `doing` | Skipped if the repository already has a doing item                            |

> The `plan` -> `ready` transition is opt-in (disabled by default). Enable it with **Promote Ready Enabled** and attach the configured **Planned Label** to items that are ready to move on.

## Installation

### Via n8n Community Nodes (recommended)

1. Open **Settings > Community Nodes** in your n8n instance.
2. Search for `n8n-nodes-gh-project-promoter`.
3. Click **Install**.

### Manual installation

```bash
cd ~/.n8n/custom
npm install n8n-nodes-gh-project-promoter
```

The `postinstall` script automatically downloads the appropriate `ghpp` binary from GitHub Releases. No additional setup is needed.

## Prerequisites

- **n8n** self-hosted instance (Docker recommended)
- **GitHub Personal Access Token** with the following scopes:
  - `repo`
  - `project`
- **Supported platforms**:
  - linux/amd64
  - linux/arm64
  - darwin/arm64

## Credentials

1. In n8n, go to **Credentials > New Credential**.
2. Search for **GHPP API**.
3. Enter your GitHub Personal Access Token in the **Token** field.

The credential is automatically verified against the GitHub API (`GET /user`) upon saving.

### Required token scopes

| Scope     | Purpose                                 |
| --------- | --------------------------------------- |
| `repo`    | Access repository data and issues       |
| `project` | Read and write GitHub Projects V2 items |

## Node Parameters

### Required

| Parameter          | Type   | Description                         |
| ------------------ | ------ | ----------------------------------- |
| **Owner**          | string | GitHub owner (user or organization) |
| **Project Number** | number | GitHub Project number (min: 1)      |

### Optional

| Parameter                 | Type    | Default   | Description                                                                                       |
| ------------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------- |
| **Plan Limit**            | number  | `3`       | Maximum number of items to promote to Plan                                                        |
| **Promote Ready Enabled** | boolean | `false`   | Enable automatic `plan` -> `ready` promotion for items carrying the planned label (promote only)  |
| **Planned Label**         | string  | `planned` | Label name that triggers the `plan` -> `ready` promotion (shown when Promote Ready Enabled is on) |

### Status Settings (collection)

Override the default status names to match your project board configuration.

| Parameter        | Type   | Default       | CLI flag         |
| ---------------- | ------ | ------------- | ---------------- |
| **Status Inbox** | string | `Backlog`     | `--status-inbox` |
| **Status Plan**  | string | `Plan`        | `--status-plan`  |
| **Status Ready** | string | `Ready`       | `--status-ready` |
| **Status Doing** | string | `In progress` | `--status-doing` |

## Output

The node outputs the JSON result of `ghpp promote`. Structure:

```json
{
	"summary": { "promoted": 4, "skipped": 2, "total": 6 },
	"phases": {
		"plan": {
			"summary": { "promoted": 3, "skipped": 1, "total": 4 },
			"results": [
				{
					"item": {
						"id": "PVTI_xxx",
						"title": "Issue title",
						"url": "https://github.com/owner/repo/issues/1",
						"status": "Backlog"
					},
					"action": "promoted",
					"to_status": "Plan"
				}
			]
		},
		"ready": {
			"summary": { "promoted": 0, "skipped": 0, "total": 0 },
			"results": []
		},
		"doing": {
			"summary": { "promoted": 1, "skipped": 1, "total": 2 },
			"results": [
				{
					"item": {
						"id": "PVTI_yyy",
						"title": "Another issue",
						"url": "https://github.com/owner/repo/issues/2",
						"status": "Ready"
					},
					"action": "skipped",
					"reason": "repository already has doing issue"
				}
			]
		}
	}
}
```

**Guarantees:**

- `phases.plan`, `phases.ready`, and `phases.doing` are always present (even when empty).
- `phases.ready` results are empty unless **Promote Ready Enabled** is on.
- `results` is `[]` when there are no items (never `null`).
- `action` is either `"promoted"` or `"skipped"`.
- `"promoted"` includes `to_status`; `"skipped"` includes `reason`.

If the output cannot be parsed as JSON, the node falls back to `{ "raw": "<stdout>" }`.

## Example Workflow

A typical setup uses a Cron trigger to run ghpp on a schedule:

```
[Schedule Trigger] -> [GHPP] -> [Slack / Email / etc.]
```

1. **Schedule Trigger** -- fires at your preferred interval (e.g., every hour).
2. **GHPP** -- runs `ghpp promote` with your project settings.
3. **Notification** -- sends the promotion summary to Slack, email, or any other service.

## Compatibility

| Requirement | Version   |
| ----------- | --------- |
| n8n         | >= 1.0.0  |
| Node.js     | >= 18.0.0 |

**Tested platforms:**

- linux/amd64
- linux/arm64
- darwin/arm64

## License

[MIT](https://opensource.org/licenses/MIT)

The ghpp binary is distributed under its own license. See [douhashi/ghpp](https://github.com/douhashi/ghpp) for details.

## Resources

- [ghpp repository](https://github.com/douhashi/ghpp) -- the underlying CLI tool
- [n8n-nodes-gh-project-promoter repository](https://github.com/douhashi/n8n-nodes-gh-project-promoter) -- this package
- [n8n Community Nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

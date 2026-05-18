# Source-repo setup

To make this repo update automatically when a README in a source repo changes,
add the following workflow to **each source repo**.

## 1. Create a Personal Access Token (PAT)

Create a fine-grained PAT with `Contents: read & write` access to the
`Bring-Web3-LTD/docs` repository.

In each source repo, add it as a secret named `DOCS_DISPATCH_TOKEN`
(Settings → Secrets and variables → Actions → New repository secret).

## 2. Add this workflow to the source repo

### `cashbackPortal` — `.github/workflows/notify-docs.yml`

```yaml
name: Notify docs repo

on:
  push:
    branches: [main]
    paths:
      - 'README.md'

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger docs sync
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.DOCS_DISPATCH_TOKEN }}" \
            https://api.github.com/repos/Bring-Web3-LTD/docs/dispatches \
            -d '{"event_type":"readme-updated","client_payload":{"repo":"cashbackPortal"}}'
```

### `chromeExtension` — `.github/workflows/notify-docs.yml`

```yaml
name: Notify docs repo

on:
  push:
    branches: [main]
    paths:
      - 'extension-files/bringweb3-sdk/README.md'

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger docs sync
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.DOCS_DISPATCH_TOKEN }}" \
            https://api.github.com/repos/Bring-Web3-LTD/docs/dispatches \
            -d '{"event_type":"readme-updated","client_payload":{"repo":"chromeExtension"}}'
```

## How it works

1. Someone edits a README in a source repo and pushes to `main`.
2. The source-repo workflow fires a `repository_dispatch` event at this repo.
3. This repo's `sync-readmes.yml` workflow runs, fetches the latest README,
   and commits the updated file to `docs/`.

The daily cron + manual `workflow_dispatch` are safety nets in case a
dispatch is ever missed.

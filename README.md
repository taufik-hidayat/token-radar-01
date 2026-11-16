# token-radar-01 — Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/taufik-hidayat/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/taufik-hidayat/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: 758 protocols from a sealed DefiLlama snapshot (14 Nov 2026), ranked by what a token would be worth if each protocol's record stayed as it is — with a farm plan for every row.

## What it is

A protocol's launch is the token it may issue one day. This radar asks what that token would be worth, and what a reader should do to farm the protocol before or after it issues one. It does **not** predict whether or when a token is issued, and a board's implied value is this entry's own claim, never one make.fun makes.

## The model — radar-2

```
implied = TVL × category multiple × growth × maturity × breadth
```

- **Category multiple** — the median market-cap / TVL of the tokenized protocols in the same category (3+ peers required, winsorized to [0.02, 1.50]); a thin category falls back to the global median. Market cap is circulating value, not fully-diluted value, so the multiples — and the implied values — read as conservative, lower-bound style estimates.
- **Growth** — `1 + clamp(7d change, −60%, +120%) × 0.5`.
- **Maturity** — `0.6 + min(age, 1095d) / 1095 × 0.4` (unknown age: 365d).
- **Breadth** — `1 + 0.02 × min(chains − 1, 5)` for multi-chain reach.
- **Confidence (0–100)** — what the row's own record supports: age known, 7d change reported, enough category comps, several chains, TVL at or above the floor. The **value band** is ±15% plus 50% × (1 − confidence/100).

No protocol name is ever special-cased: the same function scores every row. A protocol on the board **records no token** in its DefiLlama record — that is not proof it has none.

## The board

- **40 watchlist protocols** (TVL ≥ $50M, no token recorded, not a wrapped/staked/bridged product) plus **160 early finds** below the floor, ranked by implied value.
- **24 live-token protocols** shown separately at their market's own value — they are the comps the multiples are built from.
- Every row carries an 8-step farm plan derived from its own category, chains, TVL and age.

## The dashboard

A static page, no framework and no network. Open `dashboard/index.html` with `data.js` beside it:

- **Board** — sortable, searchable, filterable by category, chain, momentum and watchlist; click a row for the detail view (model breakdown, comps, farm plan, risk notes).
- **Live tokens** — the market's own values.
- **Model & comps** — the full model, the category comps table, and a sandbox: move the sliders and the board re-ranks live.

## Running it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Reads `/input/snapshot.json` (or `--input`), writes `/output/board.json`, `/output/data.js`, copies `dashboard/` and `screenshots/` to `/output`, and writes `/output/dossier.json` with the vendored make.fun library.

## Layout

- `main.ts` — the entrypoint: read the snapshot, score the board, write the outputs.
- `lib/model.ts` — the radar-2 model, the board, the farm plans, the snapshot parser and the board gate.
- `dashboard/` — the static dashboard (`index.html`, `app.css`, `app.js`).
- `screenshots/` — the board, a detail view and a filtered view.
- `vendor/makefun-board.ts` — make.fun's dashboard-dossier library, copied from the kit.

## License

MIT — see [LICENSE](LICENSE).

---

Built for the [token-radar-01 bounty](https://make.fun/bounty/token-radar-01?ref=2z9vc20p) on [make.fun](https://make.fun/r/2z9vc20p).

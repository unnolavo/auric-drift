# Auric Drift

A phone-first static arcade heist game. Drag anywhere to steer, clear staged
objectives, choose upgrades, and crack the vault core.

The current build adds a three-stage roguelite run, upgrade choices, a pulse
ability, moving hazards, near-miss bonuses, prism pickups, a vault finale,
particle bursts, and a drift trail for a richer mobile demo.

## Run Locally

From this folder:

```sh
python3 -m http.server 8097 --bind 0.0.0.0
```

Then open:

```text
http://127.0.0.1:8097/
```

If your phone is on the same network and the host is reachable, use the host IP
instead of `127.0.0.1`.

## Static Hosting

This folder can be deployed as-is to any static host:

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

No build step is required.

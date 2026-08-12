# Auric Drift

A phone-first static arcade game. Drag anywhere to steer, collect gold and gates,
avoid mines, and keep the shield meter alive.

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

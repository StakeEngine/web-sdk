# Forest Gang mock RGS

Path:
- `/Users/simeonhristov/Documents/GitHub/web-sdk/mock-rgs`

Run:
```bash
cd /Users/simeonhristov/Documents/GitHub/web-sdk/mock-rgs
node server.mjs
```

Health:
- `https://localhost:8787/health`

Important:
- server is HTTPS with self-signed cert
- open `https://localhost:8787/health` in browser first
- accept cert warning once

Then run UI:
```bash
cd /Users/simeonhristov/Documents/GitHub/web-sdk
pnpm run dev --filter=forest-gang
```

Open UI:
```txt
http://localhost:3001/?sessionID=test&rgs_url=localhost:8787&lang=en&device=desktop
```

Modes:
- BASE = normal spins
- BONUS = Deal It buy
- SUPER = All In buy

Replay example:
```txt
http://localhost:3001/?replay=true&rgs_url=localhost:8787&game=0_0_forest_gang&version=1&mode=BONUS&event=1&amount=1000000
```

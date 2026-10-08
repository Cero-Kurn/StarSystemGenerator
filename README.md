# StarSystemGenerator

A lightweight browser-based procedural star system generator. It creates randomized stars and orbiting planets, renders them on a canvas, and summarizes system data in the sidebar.

## Run it locally

Open the project in a browser by serving the folder with a static web server:

```bash
cd /workspaces/StarSystemGenerator
python3 -m http.server 8000
```

Then browse to http://localhost:8000

## Controls

- Seed: set a deterministic numeric seed
- Planet count: adjust from 3 to 10 planets
- Generate System: regenerate using the current seed and count
- Random Seed: choose a fresh random seed
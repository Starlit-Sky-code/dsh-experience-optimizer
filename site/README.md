# Promo site

Static, dependency-free promotional page for DSH Experience Optimizer.

## Preview

```bash
python3 -m http.server 4173 -d site
# open http://127.0.0.1:4173/
```

## Notes

- This directory lives on the `promo-site` branch and is not merged to `main`.
- Assets are local copies; no external fonts or CDNs.
- The banner is `assets/banner.svg` with a PNG fallback.
- QQ group and donation links are intentionally marked “待补充” until real values are provided.
- Language toggle: `中文 / EN`; preference is stored in localStorage.

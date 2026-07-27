# Analytics

## Yandex.Metrika

Counter ID: **30810146**

Added to `index.html`:
- Counter script — end of `<head>`
- `<noscript>` fallback pixel — right after the opening `<body>` tag

Options enabled: `webvisor`, `clickmap`, `ecommerce: dataLayer`, `trackLinks`,
`accurateTrackBounce`, referrer/URL passthrough. This covers standard visit
tracking plus UTM-tagged campaign traffic (UTM params are captured
automatically by Metrika from the page URL, no extra code needed).

Dashboard: https://metrika.yandex.ru/dashboard?id=30810146

### Rollback

The whole integration is a single self-contained commit. To remove it:

```bash
git revert <this-commit-sha>
```

or manually delete the two blocks marked `<!-- Yandex.Metrika counter -->`
/ `<!-- /Yandex.Metrika counter -->` in `index.html`.

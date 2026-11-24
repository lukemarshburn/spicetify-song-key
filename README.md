# Song Key

A [Spicetify](https://spicetify.app) extension that shows the musical key of the current song in Spotify's now-playing bar.

- Shows the key and BPM, like `♪ A minor  128 BPM`
- Click the badge to switch to Camelot notation (`8A`) for harmonic mixing. Your choice is saved.
- Hover for the key, Camelot code and BPM together
- Hidden for podcasts and local files

## Install

1. Copy `songKey.js` into your Spicetify `Extensions` folder (run `spicetify config-dir` to find it).
2. Run:

```
spicetify config extensions songKey.js
spicetify apply
```

## Uninstall

```
spicetify config extensions songKey.js-
spicetify apply
```

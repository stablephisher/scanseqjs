# ScanSeq — AI Camera Music Sequencer

> Transform your webcam into a real-time music instrument. ScanSeq uses computer vision to detect light and motion, converting them into melodies in real-time.

**Live Demo**: [https://stablephisher.github.io/scanseqjs/](https://stablephisher.github.io/scanseqjs/)

---

## Features

- **Real-time Camera Scanning** — Webcam captures light/color changes and triggers musical notes
- **8 Musical Scales** — Pentatonic, Major, Minor, Blues, Chromatic, Japanese (In), Arabic, Harmonic Minor
- **12 Root Notes** — Transpose to any key (C through B)
- **6 Synth Types** — Sine, Triangle, Sawtooth, Square, AM Synth, FM Synth
- **5 Audio Effects** — Reverb, Delay, Chorus, Distortion, Dry
- **6 Visual Themes** — Neon Glow, Pastel Dream, Monochrome, Fire, Ocean, Matrix
- **Particle Effects** — Burst animations when notes trigger
- **Adjustable Sensitivity** — Fine-tune motion detection threshold
- **Adjustable Speed** — Control scan line velocity
- **Dynamic Line Count** — 5 to 40 scan lines
- **Screenshot Export** — Save canvas as PNG
- **Fullscreen Mode** — Immersive performance experience
- **Responsive Design** — Works on various screen sizes
- **10+ Keyboard Shortcuts** — Full keyboard control
- **Real-time Note Display** — See which notes are playing
- **FPS Counter** — Performance monitoring
- **Zero Data Collection** — All processing happens locally in browser

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `H` | Toggle Help |
| `F` | Fullscreen |
| `S` | Screenshot |
| `R` | Randomize Scale & Root |
| `T` | Cycle Theme |
| `1-8` | Switch Scale |
| `↑ / ↓` | Sensitivity ± |
| `← / →` | Speed ± |

## Tech Stack

- **[p5.js](https://p5js.org/)** — Creative coding & camera capture
- **[Tone.js](https://tonejs.github.io/)** — Web Audio synthesis & effects
- **[Lucide Icons](https://lucide.dev/)** — UI iconography
- **Vanilla CSS** — Glassmorphism & modern UI

## How It Works

1. Your webcam captures video frames
2. The image is divided into horizontal scan lines
3. Each line's pixel brightness is sampled in real-time
4. When brightness changes exceed the sensitivity threshold, a scan dot is launched
5. When the dot crosses the center wave line, a musical note is triggered
6. The note is determined by the line's position mapped to the selected scale
7. A particle burst and wave animation provide visual feedback

## Setup

```bash
# Clone the repo
git clone https://github.com/stablephisher/scanseqjs.git
cd scanseqjs

# Serve locally (any static server works)
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` (or the port shown) in Chrome/Firefox.

> **Note**: Camera access requires HTTPS or localhost. The app needs camera & microphone permissions.

## Credits

- Original concept inspired by [Scan Sequencer](https://experiments.withgoogle.com/chrome/scan-sequencer) (Chrome Experiment)
- Built by [@stablephisher](https://github.com/stablephisher)

## License

MIT                    
# HarmoniCode

A browser-based music programming environment for creating music and sound with code

https://horrelltech.github.io/HarmoniCode/

## Overview

HarmoniCode is a creative coding environment that lets you generate music using a simple, intuitive programming language called SoundScript. Write a few lines of code and instantly hear your musical creations come to life with real-time audio synthesis.

## ✨ Features

- **SoundScript Language** - Write music with an easy-to-learn syntax designed specifically for sound generation
- **Real-time Audio** - Hear your compositions instantly as you code them
- **Audio Visualizers** - See your sound with waveform and frequency spectrum displays
- **Professional Audio Processing** - Shape your sound with built-in compressor and limiter
- **Sample Support** - Incorporate your own audio samples into compositions
- **Interactive Visualizers** - Click to change colors and customize your experience
- **Examples Library** - Learn from pre-built examples covering various techniques
- **WAV Export** - Download your creations as high-quality WAV files *(WIP)*

> **Note:** Some features like WAV export, sample management, and certain audio effects are still works in progress and may have limited functionality in the current version.

## 🎵 How It Works

HarmoniCode leverages Web Audio API and Tone.js to handle audio synthesis directly in your browser. The custom SoundScript language provides a simplified interface for:

- Creating synth instruments with custom parameters
- Sequencing notes and rhythms with precise timing
- Adding effects like reverb, delay, and filtering
- Creating dynamic movement with auto-panning and modulation
- Loading and transforming audio samples

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies
3. Start the server
4. Or use the included batch files:

Open your browser to http://localhost:3000

## 💻 Example Code

```javascript
// Define a bass synth
bass: 
  volume 80 
  pan -0.4 
  tone c2 0.5 
  wait 0.5 
  tone g2 0.5 
  wait 0.5 
  tone c2 0.5 
  wait 0.5 
end bass

// Define a melody with reverb
melody: 
  volume 70 
  reverb 0.6 0.7 0.8 1.0 
  tone c4 0.25 
  wait 0.25 
  tone e4 0.25 
  wait 0.25 
  tone g4 0.25 
  wait 0.25 
  tone c5 0.5 
end melody

// Main program
main: 
  bpm 120 
  play together bass melody 
end main
```

## 🛠️ Technology Stack

- **JavaScript** - Core application logic
- **Tone.js** - Audio synthesis engine
- **CodeMirror** - Code editor with syntax highlighting
- **Express.js** - Local development server
- **Web Audio API** - Low-level audio processing

## 🎨 Color Scheme

HarmoniCode uses a beautiful purple-themed color palette:

- Primary: #8a2be2 (BlueViolet)
- Primary Light: #ae74ec
- Background: #121212
- Surface: #1e1e1e
- Surface Light: #2d2d2d
- Text: #e1e1e1
- Text Secondary: #b0b0b0

## 📝 License

MIT License

Happy music coding! 🎹🎸🎧
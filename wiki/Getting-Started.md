# Getting Started with HarmoniCode

This guide will help you get up and running with HarmoniCode, from installation to creating your first musical composition.

## Installation

### Method 1: Using the Web Version

The easiest way to get started is to use the online version of HarmoniCode:

1. Visit [https://horrelltech.github.io/HarmoniCode/](https://horrelltech.github.io/HarmoniCode/)
2. No installation required - start coding immediately!

### Method 2: Local Installation

To run HarmoniCode locally:

1. Clone the repository:
   ```
   git clone https://github.com/horrelltech/HarmoniCode.git
   ```

2. Navigate to the project directory:
   ```
   cd HarmoniCode
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the server:
   ```
   npm start
   ```

5. Alternatively, use the included batch files to simplify startup.

6. Open your browser and navigate to `http://localhost:3000`

## The HarmoniCode Interface

![HarmoniCode Interface](images/interface.png)

The HarmoniCode interface consists of several areas:

1. **Code Editor** - Where you'll write your SoundScript code
2. **Controls** - Run, stop, and save your compositions
3. **Visualizers** - Display real-time audio waveforms and frequency spectra
4. **Console** - Shows program output and error messages
5. **Examples** - Quick access to example code

## Your First Composition

Let's create a simple melody to get started:

1. Clear the editor if there's any existing code
2. Enter the following code:

```
main:
    bpm 120
    
    melody:
        volume 80
        tone c4 0.5
        wait 0.5
        tone e4 0.5
        wait 0.5
        tone g4 0.5
        wait 0.5
        tone c5 1
    end melody
    
    play melody
    waitforfinish
end main
```

3. Click the "Run" button to hear your creation
4. Experiment by changing notes, durations, or adding effects

## Understanding the Basics

Let's break down the code example:

- `main:` and `end main` define the main block, which is where execution begins
- `bpm 120` sets the tempo to 120 beats per minute
- `melody:` and `end melody` define a block named "melody"
- `volume 80` sets the volume to 80% of maximum
- `tone c4 0.5` plays middle C for half a beat
- `wait 0.5` waits for half a beat
- `play melody` plays the melody block
- `waitforfinish` waits until all sounds have finished playing

## Adding Effects

Let's enhance our melody with some effects:

```
main:
    bpm 120
    
    melody:
        volume 80
        reverb 0.5 0.5 0.8 0.7
        tone c4 0.5
        wait 0.5
        tone e4 0.5
        wait 0.5
        tone g4 0.5
        wait 0.5
        tone c5 1
    end melody
    
    play melody
    waitforfinish
end main
```

The `reverb 0.5 0.5 0.8 0.7` line adds a reverb effect with:
- 0.5 wet mix (how much reverb is applied)
- 0.5 dry mix (how much of the original sound remains)
- 0.8 space (size of the virtual room)
- 0.7 strength (amount of reflections)

## Creating Multiple Instruments

Let's add a bass line to our composition:

```
main:
    bpm 120
    
    melody:
        volume 80
        reverb 0.5 0.5 0.8 0.7
        tone c4 0.5
        wait 0.5
        tone e4 0.5
        wait 0.5
        tone g4 0.5
        wait 0.5
        tone c5 1
    end melody
    
    bass:
        volume 70
        pan -0.3
        tone c2 1
        wait 1
        tone g2 1
        wait 1
        tone c2 1
    end bass
    
    play together melody bass
    waitforfinish
end main
```

We've added:
- A new `bass` block with its own notes
- `pan -0.3` to position the bass slightly to the left
- `play together melody bass` to play both instruments simultaneously

## Next Steps

Now that you've created your first composition, try:

1. Adding more instruments
2. Experimenting with different effects
3. Creating loops for repetitive patterns
4. Exploring the [Examples and Tutorials](Examples-and-Tutorials) for more advanced techniques
5. Reading the [SoundScript Reference](SoundScript-Reference) for a complete language guide

Happy music coding! 🎵

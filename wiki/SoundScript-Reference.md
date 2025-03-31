# SoundScript Language Reference

SoundScript is a domain-specific language designed for music and sound creation. It features a simple, intuitive syntax that allows you to create complex musical compositions with minimal code.

## Basics

SoundScript programs are organized into blocks. Each block represents an instrument or a sequence of instructions. The `main` block is the entry point of your program.

### Block Structure

```
blockname:
    // Instructions go here
end blockname
```

The most important block is the `main` block, which is executed when you run your program:

```
main:
    // Your main code goes here
end main
```

## Commands Reference

### Core Commands

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| `tone` | `tone <note> <duration>` | Plays a musical note for a specific duration in beats | `tone c4 1` |
| `tones` | `tones <note1> <note2> ... <duration>` | Plays multiple notes together (a chord) | `tones c4 e4 g4 1` |
| `wait` | `wait <duration>` | Waits for a specific duration in beats | `wait 0.5` |
| `waitforfinish` | `waitforfinish` | Waits until all currently playing sounds have finished | `waitforfinish` |
| `volume` | `volume <level>` | Sets the volume level (0-100) | `volume 80` |
| `bpm` | `bpm <tempo>` | Sets the tempo in beats per minute | `bpm 120` |

### Instrument & Block Management

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| `begin` | `begin <blockname>` | Starts a new block | `begin melody` |
| `end` | `end [blockname]` | Ends the current block | `end melody` |
| `play` | `play <blockname>` | Plays a named block | `play melody` |
| `play together` | `play together <block1> <block2> ...` | Plays multiple blocks simultaneously | `play together bass melody` |

### Control Flow

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| `loop` | `loop <count> ... end` | Repeats instructions a specific number of times | `loop 4 tone c4 0.5 wait 0.5 end` |
| `loopvar` | `loopvar <var> <start> <end> ... end` | Loop with a variable counter | `loopvar i 1 4 tone c$i 0.5 wait 0.5 end` |

### Audio Effects

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| `pan` | `pan <position>` | Sets stereo position (-1.0 to 1.0) | `pan -0.5` |
| `reverb` | `reverb <wet> <dry> <space> <strength>` | Adds reverb effect | `reverb 0.5 0.5 0.8 0.9` |
| `delay` | `delay <time> <life> <pingpong> <width> <strength>` | Adds delay/echo effect | `delay 0.25 2.0 1 0.7 0.5` |
| `filter` | `filter <type> <frequency> <resonance>` | Applies filter effect | `filter lowpass 800 2` |
| `autopan` | `autopan <speed> <width>` | Creates automatic panning effect | `autopan 0.5 0.8` |
| `autovolume` | `autovolume <min> <max> <speed>` | Creates volume modulation | `autovolume 50 80 4` |
| `distortion` | `distortion <amount>` | Adds distortion effect | `distortion 0.3` |
| `envelope` | `envelope <attack> <decay> <sustain> <release>` | Sets ADSR envelope | `envelope 0.1 0.2 0.7 0.5` |

### Sample Playback

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| `sample` | `sample <name> <duration>` | Plays a loaded audio sample | `sample kick 0.5` |
| `samplerange` | `samplerange <name> <start%> <end%> <duration>` | Plays a portion of a sample | `samplerange vocal 0 50 2` |

## Musical Notes

Notes in SoundScript follow standard musical notation:

- Basic notes: `c`, `d`, `e`, `f`, `g`, `a`, `b`
- Sharps: Add `#` (e.g., `c#`, `f#`)
- Flats: Add `b` (e.g., `bb`, `eb`)
- Octave: Add a number (e.g., `c4`, `g#3`, `bb5`)

Middle C is represented as `c4`.

## Predefined Block Types

SoundScript provides several predefined block types to help organize your code:

- `main`: The main program entry point
- `sub`: A subroutine that can be called from other blocks
- `melody`: Typically used for melody lines
- `bass`: Used for bass lines
- `rhythm`: Used for rhythmic patterns
- `drums`: Used for percussion
- `synth`: Used for synthesizer sounds
- `pad`: Used for sustained ambient sounds
- `kick`, `snare`, `hihat`: Used for specific drum sounds
- `lead`: Used for lead melody lines

These are optional conventions to help organize your code. You can create custom block names as needed.

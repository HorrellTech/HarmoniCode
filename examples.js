/**
 * HarmoniCode Examples
 * 
 * This file contains a collection of example scripts that demonstrate
 * different features and capabilities of the SoundScript language.
 */

// Define SoundScriptExamples only if it doesn't already exist
if (typeof window.SoundScriptExamples === 'undefined') {
  window.SoundScriptExamples = {
      // Each example is an object with name, filename, description, and content properties
      examples: [
          {
              name: "Happy Birthday",
              filename: "happy_birthday.ss",
              description: "A musical rendition of the Happy Birthday song with melody, bass, and chords.",
              content: `// Happy Birthday in SoundScript
// A musical arrangement with melody, bass, and chords

// Define the main melody synth
melody:
volume 85
// Add slight reverb for a nicer tone
reverb 0.3 0.7 1.2 0.01
// Add very subtle delay
delay 0.2 0.3 1 0.5 0.1
// Main melody line for Happy Birthday

// Happy
tone c4 0.25b
wait 0.25b

// Birth-
tone c4 0.25b
wait 0.25b

// -day
tone d4 0.5b
wait 0.5b

// to
tone c4 0.5b
wait 0.5b

// you
tone f4 0.5b
wait 0.5b

// Happy
tone e4 1b
wait 1b

// Happy
tone c4 0.25b
wait 0.25b

// Birth-
tone c4 0.25b
wait 0.25b

// -day
tone d4 0.5b
wait 0.5b

// to
tone c4 0.5b
wait 0.5b

// you
tone g4 0.5b
wait 0.5b

// Happy
tone f4 1b
wait 1b

// Happy
tone c4 0.25b
wait 0.25b

// Birth-
tone c4 0.25b
wait 0.25b

// -day
tone c5 0.5b
wait 0.5b

// to
tone a4 0.5b
wait 0.5b

// Dear
tone f4 0.5b
wait 0.5b

// [Name]
tone e4 0.5b
wait 0.5b

// Happy
tone d4 0.5b
wait 0.5b

// Happy
tone b4 0.25b
wait 0.25b

// Birth-
tone b4 0.25b
wait 0.25b

// -day
tone a4 0.5b
wait 0.5b

// to
tone f4 0.5b
wait 0.5b

// you
tone g4 0.5b
wait 0.5b

// Final note
tone f4 1b
end melody

// Bass line to add depth
bass:
volume 75
pan -0.3

// First phrase
tone f2 1b
wait 1b
tone f2 1b
wait 1b
tone f2 1b
wait 1b
tone f2 1b
wait 1b

// Second phrase
tone f2 1b
wait 1b
tone f2 1b
wait 1b
tone f2 1b
wait 1b
tone f2 1b
wait 1b

// Third phrase
tone f2 1b
wait 1b
tone c3 1b
wait 1b
tone f2 1b
wait 1b
tone c3 1b
wait 1b

// Fourth phrase
tone d3 1b
wait 1b
tone g2 1b
wait 1b
tone c3 1b
wait 1b
tone f2 1b
end bass

// Simple chord accompaniment
chords:
volume 60
reverb 0.4 0.6 1.5 0.01
pan 0.3

// F major
loop 2
  tone f3 0.25b
  tone a3 0.25b
  tone c4 0.25b
  wait 0.75b
  tone f3 0.25b
  tone a3 0.25b
  tone c4 0.25b
  wait 0.75b
end

// C7
loop 2
  tone c3 0.25b
  tone e3 0.25b
  tone g3 0.25b
  tone b3 0.25b
  wait 0.75b
  tone c3 0.25b
  tone e3 0.25b
  tone g3 0.25b
  tone b3 0.25b
  wait 0.75b
end

// F major and C7
tone f3 0.25b
tone a3 0.25b
tone c4 0.25b
wait 0.75b
tone f3 0.25b
tone a3 0.25b
tone c4 0.25b
wait 0.75b

tone c3 0.25b
tone e3 0.25b
tone g3 0.25b
tone b3 0.25b
wait 0.75b
tone c3 0.25b
tone e3 0.25b
tone g3 0.25b
tone b3 0.25b
wait 0.75b

// Dm, G7, C7, F
tone d3 0.25b
tone f3 0.25b
tone a3 0.25b
wait 0.75b

tone g3 0.25b
tone b3 0.25b
tone d4 0.25b
wait 0.75b

tone c3 0.25b
tone e3 0.25b
tone g3 0.25b
wait 0.75b

tone f3 0.25b
tone a3 0.25b
tone c4 0.25b
wait 0.75b
end chords

// Rhythmic percussion using autovolume for dynamics
percussion:
volume 65
autovolume 40 70 8
pan 0.1

loop 8
  tone c6 0.0625b
  wait 0.25b
  tone c6 0.0625b
  wait 0.25b
  tone c6 0.0625b
  wait 0.25b
  tone c6 0.0625b
  wait 0.25b
end
end percussion

// Main program
main:
// Set a nice moderate tempo
bpm 90

// Introduction: just bass and chords first
play together bass chords
wait 4b

// Now add melody
play together melody bass chords
wait 16b

// Add percussion for final celebration
play together melody bass chords percussion

// Let effects tails complete naturally
waitforfinish
end main`
          },
          {
              name: "Simple Beat",
              filename: "simple_beat.ss",
              description: "A basic rhythmic pattern with drums and bass.",
              content: `// Simple Beat Example
// A basic rhythmic pattern with drums and bass

// Basic kick drum pattern
kick:
volume 90

loop 8
  tone 60 0.1
  wait 0.5b
  tone 60 0.1
  wait 0.5b
end
end kick

// Snare pattern
snare:
volume 70

loop 8
  wait 0.5b
  tone 300 0.1
  wait 0.5b
end
end snare

// Simple bass line
bass:
volume 75

loop 4
  tone c2 0.25b
  wait 0.25b
  tone c2 0.25b
  wait 0.25b
  tone g2 0.25b
  wait 0.25b
  tone c2 0.25b
  wait 0.25b
end
end bass

// Hi-hat pattern
hihat:
volume 50
pan 0.3

loop 32
  tone 800 0.05
  wait 0.125b
end
end hihat

// Main program
main:
bpm 120

// Start with just kick and snare
play together kick snare
wait 2b

// Add bass
play together kick snare bass
wait 2b

// Add hi-hat for full beat
play together kick snare bass hihat

waitforfinish
end main`
          },
          {
              name: "Chord progression example",
              filename: "chord_progression.ss",
              description: "A basic example of using multiple tones at once to simulate chords.",
              content: `// Chord progression example
chords:
  volume 80
  reverb 0.3 0.7 1.0 0.01
  
  // C major chord
  tones c4 e4 g4 1b
  wait 1b
  
  // F major chord
  tones f4 a4 c5 1b
  wait 1b
  
  // G major chord
  tones g4 b4 d5 1b
  wait 1b
  
  // C major chord again
  tones c4 e4 g4 1b
end chords

main:
  bpm 120
  play chords
  waitforfinish
end main`
          },
          {
              name: "Ambient Pad",
              filename: "ambient_pad.ss",
              description: "Relaxing ambient sounds with reverb and delay effects.",
              content: `// Ambient Pad
// Relaxing ambient sounds with reverb and delay effects

// Main ambient pad
pad:
volume 75
// Heavy reverb for ambient effect
reverb 0.8 0.3 5.0 0.5

// Drone chord (C major)
tone c3 3
tone e3 3
tone g3 3
wait 1

// Slow movement
tone g3 3
tone b3 3
tone d4 3
wait 2

// Back to tonic
tone c3 3
tone e3 3
tone g3 3
wait 3
end pad

// Atmospheric textures
texture:
volume 50
pan 0.3
// Ping-pong delay for spatial effect
delay 0.7 0.6 1 0.8 0.6

// Random high notes
loop 5
  tone e5 0.5
  wait 1.5
  tone g5 0.3
  wait 2.2
  tone b5 0.4
  wait 1.8
  tone c6 0.2
  wait 1.3
end
end texture

// Bass drone
bass:
volume 65
pan -0.3
reverb 0.4 0.6 3.0 0.2

// Low drone
loop 3
  tone c2 4
  wait 0.5
  tone g2 3
  wait 1.5
end
end bass

// Main program
main:
bpm 70  // Slow tempo for ambient feel

// Start with just pad
play pad
wait 3

// Add texture
play together pad texture
wait 3

// Add bass for full ambient soundscape
play together pad texture bass

waitforfinish
end main`
          },
          {
              name: "Scale Explorer",
              filename: "scale_explorer.ss",
              description: "Demonstrates different musical scales and progressions.",
              content: `// Scale Explorer
// Demonstrates different musical scales and progressions

// Major scale (C major)
major_scale:
volume 80

// C Major Scale: C D E F G A B C
tone c4 0.3
wait 0.3
tone d4 0.3
wait 0.3
tone e4 0.3
wait 0.3
tone f4 0.3
wait 0.3
tone g4 0.3
wait 0.3
tone a4 0.3
wait 0.3
tone b4 0.3
wait 0.3
tone c5 0.5
wait 0.5

// Descending
tone c5 0.3
wait 0.3
tone b4 0.3
wait 0.3
tone a4 0.3
wait 0.3
tone g4 0.3
wait 0.3
tone f4 0.3
wait 0.3
tone e4 0.3
wait 0.3
tone d4 0.3
wait 0.3
tone c4 0.5
wait 0.5
end major_scale

// Minor scale (A minor)
minor_scale:
volume 80

// A Minor Scale: A B C D E F G A
tone a4 0.3
wait 0.3
tone b4 0.3
wait 0.3
tone c5 0.3
wait 0.3
tone d5 0.3
wait 0.3
tone e5 0.3
wait 0.3
tone f5 0.3
wait 0.3
tone g5 0.3
wait 0.3
tone a5 0.5
wait 0.5

// Descending
tone a5 0.3
wait 0.3
tone g5 0.3
wait 0.3
tone f5 0.3
wait 0.3
tone e5 0.3
wait 0.3
tone d5 0.3
wait 0.3
tone c5 0.3
wait 0.3
tone b4 0.3
wait 0.3
tone a4 0.5
wait 0.5
end minor_scale

// Major chord progression (I-IV-V-I)
major_progression:
volume 70
reverb 0.3 0.7 1.5 0.1

// I - C Major (C-E-G)
tone c4 0.3
tone e4 0.3
tone g4 0.3
wait 1

// IV - F Major (F-A-C)
tone f4 0.3
tone a4 0.3
tone c5 0.3
wait 1

// V - G Major (G-B-D)
tone g4 0.3
tone b4 0.3
tone d5 0.3
wait 1

// I - C Major (C-E-G)
tone c4 0.3
tone e4 0.3
tone g4 0.3
wait 1
end major_progression

// Main program
main:
bpm 100

// Play C major scale
play major_scale
wait 0.5

// Play A minor scale
play minor_scale
wait 0.5

// Play chord progression
play major_progression

waitforfinish
end main`
          },
          {
              name: "Techno Beat",
              filename: "techno_beat.ss",
              description: "A high-energy techno beat with pulsing synths and heavy bass.",
              content: `// Techno Beat
// High-energy dance music with autopan and autovolume effects

// Kick drum
kick:
volume 90

loop 32
  tone 60 0.05
  wait 0.25b
end
end kick

// Bass synth with delay for that techno feel
bass:
volume 85
delay 0.125 0.5 1 0.5 0.3

loop 4
  tone c1 0.25b
  wait 0.25b
  tone c1 0.25b
  wait 0.25b
  tone c1 0.25b
  wait 0.25b
  tone c1 0.25b
  wait 0.25b
  
  tone g1 0.25b
  wait 0.25b
  tone g1 0.25b
  wait 0.25b
  tone f1 0.25b
  wait 0.25b
  tone f1 0.25b
  wait 0.25b
end
end bass

// Lead synth with auto-panning
lead:
volume 70
autopan 8 0.6
reverb 0.3 0.7 1.0 0.01

loop 8
  tone c4 0.125b
  wait 0.125b
  tone c4 0.125b
  wait 0.125b
  tone d4 0.125b
  wait 0.125b
  tone e4 0.125b
  wait 0.125b
  
  tone c4 0.125b
  wait 0.125b
  tone c4 0.125b
  wait 0.125b
  tone d4 0.125b
  wait 0.125b
  tone e4 0.125b
  wait 0.125b
end
end lead

// Hi-hat with autopan
hihat:
volume 60
autopan 4 0.9

loop 64
  tone 1200 0.05
  wait 0.125b
end
end hihat

// Synth pad with auto-volume for that pulsing feel
pad:
volume 50
autovolume 30 70 4
reverb 0.5 0.5 2.0 0.5

loop 2
  // C minor chord
  tone c3 4b
  tone eb3 4b
  tone g3 4b
  wait 4b
  
  // G minor chord
  tone g3 4b
  tone bb3 4b
  tone d4 4b
  wait 4b
end
end pad

// Main program
main:
bpm 130

// Start with kick and hihat
play together kick hihat
wait 2b

// Add bass
play together kick hihat bass
wait 2b

// Add pad for background
play together kick hihat bass pad
wait 4b

// Now bring in the lead synth for the full track
play together kick hihat bass pad lead

waitforfinish
end main`
          },
          {
              name: "Orchestra Demo",
              filename: "orchestra_demo.ss",
              description: "A classical-inspired piece with multiple orchestral parts.",
              content: `// Orchestra Demo
// A classical-inspired arrangement with multiple orchestral parts

// Strings section
strings:
volume 75
reverb 0.6 0.4 2.0 0.5
pan 0.3

loop 2
  // G major chord
  tone g3 2b
  tone b3 2b
  tone d4 2b
  wait 2b
  
  // C major chord
  tone c4 2b
  tone e4 2b
  tone g4 2b
  wait 2b
  
  // D major chord
  tone d4 2b
  tone f#4 2b
  tone a4 2b
  wait 2b
  
  // G major chord
  tone g3 2b
  tone b3 2b
  tone d4 2b
  wait 2b
end
end strings

// Woodwinds (flute)
flute:
volume 65
pan -0.4

wait 4b  // Wait for strings to establish

// Melody
tone g5 0.5b
wait 0.5b
tone a5 0.5b
wait 0.5b
tone b5 1b
wait 1b

tone a5 0.5b
wait 0.5b
tone g5 0.5b
wait 0.5b
tone a5 1b
wait 1b

tone g5 0.5b
wait 0.5b
tone e5 0.5b
wait 0.5b
tone d5 1b
wait 1b

tone g5 0.5b
wait 0.5b
tone a5 0.5b
wait 0.5b
tone b5 1b
wait 1b

// Repeat with variation
tone c6 0.5b
wait 0.5b
tone b5 0.5b
wait 0.5b
tone a5 1b
wait 1b

tone g5 0.5b
wait 0.5b
tone a5 0.5b
wait 0.5b
tone b5 1b
wait 1b

tone a5 0.5b
wait 0.5b
tone g5 0.5b
wait 0.5b
tone e5 1b
wait 1b

tone d5 2b
wait 2b
end flute

// Brass (trumpet)
brass:
volume 70
pan 0

wait 8b  // Wait for strings and flute

// Fanfare
tone d5 0.25b
wait 0.25b
tone d5 0.25b
wait 0.25b
tone g5 0.5b
wait 0.5b

tone g5 0.25b
wait 0.25b
tone g5 0.25b
wait 0.25b
tone a5 0.5b
wait 0.5b

tone b5 1b
wait 1b

tone a5 0.5b
wait 0.5b
tone g5 0.5b
wait 0.5b

tone a5 1b
wait 1b

tone g5 1b
wait 1b

// Final phrase
tone d5 0.25b
wait 0.25b
tone d5 0.25b
wait 0.25b
tone g5 0.5b
wait 0.5b

tone a5 0.25b
wait 0.25b
tone a5 0.25b
wait 0.25b
tone b5 0.5b
wait 0.5b

tone c6 1b
wait 1b

tone b5 0.5b
wait 0.5b
tone a5 0.5b
wait 0.5b

tone g5 2b
wait 2b
end brass

// Double bass
bass:
volume 80
pan -0.2

loop 4
  tone g2 0.5b
  wait 0.5b
  tone g2 0.5b
  wait 0.5b
  tone d3 0.5b
  wait 0.5b
  tone g2 0.5b
  wait 0.5b
  
  tone c3 0.5b
  wait 0.5b
  tone c3 0.5b
  wait 0.5b
  tone g2 0.5b
  wait 0.5b
  tone c3 0.5b
  wait 0.5b
  
  tone d3 0.5b
  wait 0.5b
  tone d3 0.5b
  wait 0.5b
  tone a3 0.5b
  wait 0.5b
  tone d3 0.5b
  wait 0.5b
  
  tone g2 0.5b
  wait 0.5b
  tone g2 0.5b
  wait 0.5b
  tone d3 0.5b
  wait 0.5b
  tone g2 0.5b
  wait 0.5b
end
end bass

// Timpani
timpani:
volume 90

// Start quiet, then get louder towards end
wait 12b

loop 4
  tone g2 0.25b
  wait 0.75b
  tone g2 0.25b
  wait 0.75b
  tone d3 0.25b
  wait 1.0b
end

// Dramatic ending
tone g2 0.25b
wait 0.25b
tone g2 0.25b
wait 0.25b
tone g2 0.25b
wait 0.25b
tone g2 0.25b
wait 0.25b

tone g2 1b
end timpani

// Main program
main:
bpm 90

// Start with strings and bass for foundation
play together strings bass
wait 4b

// Add flute melody
play together strings bass flute
wait 4b

// Add brass for fanfare
play together strings bass flute brass
wait 8b

// Add timpani for dramatic ending
play together strings bass flute brass timpani

waitforfinish
end main`
          }
      ],
      
      // Method to get all examples
      getAll() {
          return this.examples;
      },
      
      // Method to get a specific example by filename
      getByFilename(filename) {
          return this.examples.find(example => example.filename === filename);
      }
  };
  
  // Log that we have initialized
  console.log("SoundScriptExamples initialized with", window.SoundScriptExamples.examples.length, "examples");
}

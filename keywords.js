/**
 * MelodiCode(SS) syntax keywords for highlighting and documentation
 * 
 * This module defines keywords used in SoundScript, a simple scripting language for sound synthesis.
 * It includes command keywords, block definitions, and documentation for each command.
 * 
 * EXAMPLE SS script:
 * * bass:
 * *     volume 80
 * *     tone c4 0.5
 * *     wait 0.5
 * *     tone g4 0.5
 * *     wait 0.5
 * *     tone c4 0.5
 * *     wait 0.5
 * * end bass
 * *     
 * * melody:
 * *     volume 70
 * *     tone e4 0.5
 * *     wait 0.5
 * *     tone d4 0.5
 * *     wait 0.5
 * *     tone c4 0.5
 * *     wait 0.5
 * * end melody
 * *
 * * main:
 * *     bpm 120
 * *     play together bass melody
 * *     waitforfinish
 * *
 * *     loop 4
 * *         tone g4 0.25
 * *         wait 0.25
 * *     end
 * *     waitforfinish
 * *
 * *     play bass
 * *     wait 1
 * *
 * *     play melody
 * *     wait 1
 * * end main
 */

// Use an IIFE to avoid global namespace pollution
(function() {
    const keywords = {
        // Command keywords
        commands: [
            "tone", "tones", "wait", "waitforfinish", "volume", "bpm", "play",
            "loop", "loopvar", "end", "pan", "reverb", "delay", "filter", "autopan",
            "autovolume", "distortion", "sample", "samplerange", "envelope", "begin",
        ],
        
        // Block definition keywords
        blocks: ["main", "sub", "bass", "melody", "rhythm", "drums", "synth", "pad", "kick", "snare", "hihat", "bassline", "lead"],
        
        // Documentation for each command
        documentation: {
            "tone": {
                syntax: "tone <note> <duration>",
                description: "Plays a musical note for a specific duration in beats.",
                examples: ["tone c4 1", "tone e3 0.5", "tone g#5 2"]
            },
            "tones": {
                syntax: "tones <note1> <note2> ... <duration>",
                description: "Plays multiple notes together (a chord) for a specific duration in beats.",
                examples: ["tones c4 e4 g4 1", "tones c3 g3 c4 e4 2"]
            },
            "wait": {
                syntax: "wait <duration>",
                description: "Waits for a specific duration in beats before continuing.",
                examples: ["wait 1", "wait 0.5"]
            },
            "waitforfinish": {
                syntax: "waitforfinish",
                description: "Waits until all currently playing sounds have finished before continuing.",
                examples: ["play melody", "waitforfinish"]
            },
            "envelope": {
                syntax: "envelope <attack> <decay> <sustain> <release>",
                description: "Sets the ADSR envelope for the current block. Attack, decay, sustain, release times in seconds.",
                examples: ["envelope 0.1 0.2 0.7 0.5"]
            },
            "begin": {
                syntax: "begin <blockname>",
                description: "Starts a new block with the specified name.",
                examples: ["begin melody", "begin bass"]
            },
            "end": {
                syntax: "end [blockname]",
                description: "Ends the current block. The blockname is optional but recommended for clarity.",
                examples: ["end melody", "end bass", "end main"]
            },
            "main": {
                syntax: "main:",
                description: "Defines the main block of the script.",
                examples: ["main:"]
            },
            "volume": {
                syntax: "volume <level>",
                description: "Sets the volume level (0-100) for the current block.",
                examples: ["volume 80", "volume 50"]
            },
            "bpm": {
                syntax: "bpm <tempo>",
                description: "Sets the tempo in beats per minute.",
                examples: ["bpm 120", "bpm 90"]
            },
            "play": {
                syntax: "play <blockname>",
                alternativeSyntax: "play together <blockname1> <blockname2> ...",
                description: "Plays a named block. Use 'together' to play multiple blocks simultaneously.",
                examples: ["play melody", "play together bass melody drums"]
            },
            "together": {
                syntax: "play together <blockname1> <blockname2> ...",
                description: "Plays multiple blocks simultaneously.",
                examples: ["play together bass melody", "play together drums synth"]
            },
            "loop": {
                syntax: "loop <count> ... end",
                description: "Repeats the commands inside the loop a specific number of times.",
                examples: ["loop 4\n  tone c4 0.5\n  wait 0.5\nend"]
            },
            "loopvar": {
                syntax: "loopvar <variable> <start> <end> ... end",
                description: "Repeats the commands, with a variable counting from start to end.",
                examples: ["loopvar i 1 4\n  tone c$i 0.5\n  wait 0.5\nend"]
            },
            "end": {
                syntax: "end [blockname]",
                description: "Marks the end of a block or loop. The blockname is optional but recommended for clarity.",
                examples: ["end loop", "end melody"]
            },
            "pan": {
                syntax: "pan <position>",
                description: "Sets the stereo position (-1.0 to 1.0, where -1 is full left, 0 is center, 1 is full right).",
                examples: ["pan -0.5", "pan 0.7"]
            },
            "reverb": {
                syntax: "reverb <wet> <dry> <space> <strength>",
                description: "Adds reverb effect. Parameters: wet mix (0-1), dry mix (0-1), space (0-1), strength (0-1).",
                examples: ["reverb 0.5 0.5 0.8 0.9"]
            },
            "delay": {
                syntax: "delay <time> <life> <pingpong> <pingpongwidth> <strength>",
                description: "Adds delay/echo effect. Time (beats), life (decay), pingpong mode (0/1), pingpong width (0-1), strength (0-1).",
                examples: ["delay 0.25 2.0 1 0.7 0.5"]
            },
            "filter": {
                syntax: "filter <type> <frequency> <resonance>",
                description: "Applies filter effect. Type (lowpass, highpass, bandpass), frequency (Hz), resonance (0-10).",
                examples: ["filter lowpass 800 2", "filter highpass 500 1"]
            },
            "autopan": {
                syntax: "autopan <speed> <width>",
                description: "Creates automatic panning effect. Speed (Hz), width (0-1).",
                examples: ["autopan 0.5 0.8"]
            },
            "autovolume": {
                syntax: "autovolume <min> <max> <speed>",
                description: "Creates volume modulation. Min volume (%), max volume (%), speed (Hz).",
                examples: ["autovolume 50 80 4"]
            },
            "distortion": {
                syntax: "distortion <amount>",
                description: "Adds distortion effect. Amount (0-1).",
                examples: ["distortion 0.3"]
            },
            "sample": {
                syntax: "sample <name> <duration>",
                description: "Plays a previously loaded audio sample for the specified duration in beats.",
                examples: ["sample kick 0.5", "sample snare 1"]
            },
            "samplerange": {
                syntax: "samplerange <name> <startpct> <endpct> <duration>",
                description: "Plays a portion of a sample. Start percent (0-100), end percent (0-100), duration (beats).",
                examples: ["samplerange vocal 0 50 2", "samplerange drum 25 75 1"]
            }
        },
        
        // Get all keywords for syntax highlighting
        getAllKeywords() {
            return [...this.commands, ...this.blocks];
        }
    };

    // Export to window object if in browser
    if (typeof window !== 'undefined') {
        window.SoundScriptKeywords = keywords;
    }

    // Export for Node.js
    if (typeof module !== 'undefined') {
        module.exports = keywords;
    }
})();

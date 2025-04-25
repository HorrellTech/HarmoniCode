/**
 * SoundScript Interpreter
 * A music programming language interpreter based on Tone.js
 */

class SoundScript {
    constructor() {
        this.lastParsedCode = null; // Store the last parsed code for WAV export

        // Initialize Tone.js
        this.audioContext = Tone.context;
        this.synths = {};
        this.samples = {};
        
        this.masterVolume = new Tone.Volume(0).toDestination();
        
        // Add analyzers for visualizers
        this.masterAnalyser = new Tone.Analyser('waveform', 1024);
        this.frequencyAnalyser = new Tone.Analyser('fft', 1024);
        
        // Connect analyzers
        this.masterVolume.connect(this.masterAnalyser);
        this.masterVolume.connect(this.frequencyAnalyser);

        try {
            // Add master effects (compressor, limiter)
            this.masterCompressor = new Tone.Compressor({
                threshold: -24,
                ratio: 4,
                attack: 0.003,
                release: 0.25
            });
        
            this.masterLimiter = new Tone.Limiter(-3);
        
            // Connect effects chain - be more defensive with connections
            this.masterCompressor.connect(this.masterLimiter);
            this.masterLimiter.connect(this.masterVolume);
            
            // Add anti-crackling hard limiter
            this.antiCracklingLimiter = new Tone.Limiter(-0.5);
            this.masterLimiter.connect(this.antiCracklingLimiter);
            this.antiCracklingLimiter.connect(this.masterVolume);
            
        } catch (err) {
            console.error("Error setting up audio chain:", err);
            
            // Fallback to a simplified chain
            try {
                this.masterCompressor = new Tone.Compressor();
                this.masterLimiter = new Tone.Limiter();
                
                // Simple straight chain
                this.masterCompressor.connect(this.masterVolume);
                this.masterLimiter.connect(this.masterVolume);
                
                this.log("Using simplified audio chain due to setup error", "warn");
            } catch (fallbackError) {
                console.error("Even fallback audio chain failed:", fallbackError);
                this.masterCompressor = null;
                this.masterLimiter = null;
                this.log("Audio effects disabled due to errors", "error");
            }
        }

        // Optimize audio processing for better performance
        this.optimizeAudioPerformance();

        // Set default output destination for all synths
        //Tone.Destination.mute = true; // Mute default destination

        // State variables
        this.blockDefinitions = {};
        this.isPlaying = false;
        this.currentBlockName = null;
        this.currentBlockCode = [];
        this.currentLine = 0;
        this.loops = []; // Stack for tracking loops
        this.waitingUntil = 0; // For wait and waitforfinish commands
        this.activeBlocksRunning = 0; // Counter for waitforfinish command

        // Console logging
        this.consoleCallback = null;

        // Default BPM
        this.bpm = 120;
        Tone.Transport.bpm.value = this.bpm;

        // Check if the audio chain is properly connected
        this.validateAudioChain();

        
        // Add effects stack
        this.effectsStack = {};
    }

    // Pre-render the script to a buffer for smooth playback
    async renderToBuffer() {
        try {
            this.log("Pre-rendering script to audio buffer...", "info");
            
            // Calculate total duration from script plus extra time for reverb/delay tails
            const estimatedDuration = await this.calculateTotalDuration();
            const duration = Math.max(estimatedDuration * 1.2 + 3, 10); // At least 10 seconds
            this.log(`Estimated duration: ${duration.toFixed(1)}s`, "info");
            
            // Create an offline context with higher sample rate for better quality
            const offlineCtx = new Tone.OfflineContext(2, duration, 48000);
            const originalContext = Tone.getContext();
            
            try {
                // Save original references
                const originalSynths = this.synths;
                const originalSamples = this.samples;
                const originalMasterVolume = this.masterVolume;
                const originalMasterCompressor = this.masterCompressor;
                const originalMasterLimiter = this.masterLimiter;
                const originalIsPlaying = this.isPlaying;
                const originalBpm = this.bpm;
                
                // Reset state for clean rendering
                this.synths = {};
                this.samples = {};
                this.isPlaying = false;
                this.activeBlocksRunning = 0;
                
                // Switch to offline context
                Tone.setContext(offlineCtx);
                
                // Create new effects chain in offline context
                this.masterCompressor = new Tone.Compressor({
                    threshold: -24,
                    ratio: 4,
                    attack: 0.003,
                    release: 0.25
                }).toDestination();
                
                this.masterLimiter = new Tone.Limiter(-1);
                this.masterLimiter.connect(this.masterCompressor);
                
                this.masterVolume = new Tone.Volume(0);
                this.masterVolume.connect(this.masterLimiter);
                
                // Re-create samples for offline context
                for (const sampleName in originalSamples) {
                    if (originalSamples[sampleName].buffer) {
                        try {
                            // Create new player in the offline context
                            const player = new Tone.Player({
                                url: originalSamples[sampleName].buffer,
                                onload: () => {}
                            }).connect(this.masterVolume);
                            
                            this.samples[sampleName] = { 
                                player, 
                                buffer: originalSamples[sampleName].buffer
                            };
                        } catch (sampleError) {
                            console.error(`Error recreating sample ${sampleName}:`, sampleError);
                        }
                    }
                }
                
                // Parse the script in offline context
                await this.parseScript(this.lastParsedCode);
                
                // Reset BPM to ensure consistent timing
                this.bpm = originalBpm;
                if (Tone.Transport) {
                    Tone.Transport.bpm.value = this.bpm;
                }
                
                // Execute the script in offline context with higher quality settings
                this.log("Starting offline rendering process...", "info");
                this.isPlaying = true; // Set to true to allow execution
                
                // Execute the main block
                if (this.blockDefinitions.main) {
                    await new Promise(resolve => {
                        this.executeBlock('main', resolve);
                    });
                    
                    // Add a short delay after execution to capture effect tails
                    await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                    throw new Error("No main block found in script");
                }
                
                // Render the audio
                this.log("Processing audio buffer...", "info");
                const renderedBuffer = await offlineCtx.render();
                this.log(`Rendering complete - ${renderedBuffer.duration.toFixed(1)}s audio generated`, "success");
                
                // Store the rendered buffer
                this.renderedBuffer = renderedBuffer;
                
                // Restore original context
                Tone.setContext(originalContext);
                
                // Restore original properties
                this.synths = originalSynths;
                this.samples = originalSamples;
                this.masterVolume = originalMasterVolume;
                this.masterCompressor = originalMasterCompressor;
                this.masterLimiter = originalMasterLimiter;
                this.isPlaying = originalIsPlaying;
                
                return renderedBuffer;
            } catch (error) {
                // Restore original context if something goes wrong
                Tone.setContext(originalContext);
                throw error;
            }
        } catch (error) {
            console.error('Error during audio rendering:', error);
            this.log(`Rendering failed: ${error.message}`, "error");
            throw error;
        }
    }
    
    // Play the rendered buffer with high quality
    async playRenderedBuffer() {
        if (!this.renderedBuffer) {
            this.log("No rendered audio available. Generate the music first.", "error");
            return false;
        }
        
        try {
            // Ensure audio context is started
            await this.ensureAudioContextStarted();
            
            // Clean up previous player if exists
            if (this.bufferPlayer) {
                this.bufferPlayer.stop();
                this.bufferPlayer.dispose();
                this.bufferPlayer = null;
            }
            
            // Ensure we're using the main context
            const context = Tone.getContext();
            if (context.constructor.name !== 'Context') {
                this.log("Playback requires main audio context. Restoring...", "info");
                Tone.setContext(new Tone.Context());
            }
            
            // Create a new AudioBuffer in the current context
            const currentCtx = Tone.getContext().rawContext;
            const newBuffer = currentCtx.createBuffer(
                this.renderedBuffer.numberOfChannels,
                this.renderedBuffer.length,
                this.renderedBuffer.sampleRate
            );
            
            // Copy data from rendered buffer to the new buffer
            for (let channel = 0; channel < this.renderedBuffer.numberOfChannels; channel++) {
                const channelData = this.renderedBuffer.getChannelData(channel);
                const newChannelData = newBuffer.getChannelData(channel);
                newChannelData.set(channelData);
            }
            
            // Create a new player with the current context and properly transferred buffer
            this.bufferPlayer = new Tone.Player({
                url: newBuffer,
                loop: false,
                fadeIn: 0.01,
                fadeOut: 0.1
            });
            
            // Connect to the audio chain if it exists, otherwise direct to master volume
            if (this.masterCompressor) {
                this.bufferPlayer.connect(this.masterCompressor);
            } else {
                this.bufferPlayer.connect(this.masterVolume);
            }
            
            // Wait for player to be ready
            await Tone.loaded();
            
            // Start playback
            this.bufferPlayer.start();
            this.isPlaying = true;
            
            this.log("Playing rendered audio buffer", "success");
            return true;
        } catch (error) {
            console.error("Error playing rendered buffer:", error);
            this.log(`Playback error: ${error.message}`, "error");
            return false;
        }
    }
    
    // Stop the buffer playback
    stopRenderedBuffer() {
        if (this.bufferPlayer) {
            try {
                this.bufferPlayer.stop();
                this.isPlaying = false;
                this.log("Playback stopped", "info");
                return true;
            } catch (error) {
                console.error("Error stopping playback:", error);
                this.log(`Error stopping playback: ${error.message}`, "error");
                return false;
            }
        }
        return false;
    }

    // Add methods to manage effect states
    pushEffectState(blockName) {
        if (!this.effectsStack[blockName]) {
            this.effectsStack[blockName] = [];
        }
        
        const currentState = {
            filter: { ...this.synths[blockName].params.filter },
            distortion: { ...this.synths[blockName].params.distortion },
            reverb: { ...this.synths[blockName].params.reverb },
            delay: { ...this.synths[blockName].params.delay },
            envelope: { ...this.synths[blockName].params.envelope }
        };
        
        this.effectsStack[blockName].push(currentState);
    }

    popEffectState(blockName) {
        if (!this.effectsStack[blockName] || !this.effectsStack[blockName].length) return;
        
        const previousState = this.effectsStack[blockName].pop();
        const synth = this.synths[blockName];
        
        // Restore previous state
        if (previousState.filter) this.executeCommand_filter(blockName, [previousState.filter.type, previousState.filter.frequency, previousState.filter.resonance]);
        if (previousState.distortion) this.executeCommand_distortion(blockName, [previousState.distortion.amount]);
        if (previousState.reverb) this.executeCommand_reverb(blockName, [previousState.reverb.wet, previousState.reverb.dry, previousState.reverb.decay, previousState.reverb.preDelay]);
        if (previousState.delay) this.executeCommand_delay(blockName, [previousState.delay.time, previousState.delay.feedback, previousState.delay.pingpong, previousState.delay.pingpongWidth, previousState.delay.wet]);
        if (previousState.envelope) this.executeCommand_envelope(blockName, [previousState.envelope.attack, previousState.envelope.decay, previousState.envelope.sustain, previousState.envelope.release]);
    }

    validateAudioChain() {
        try {
            // Create a temporary test node
            const testOsc = new Tone.Oscillator().start();
            
            // Test connecting to our main input
            if (this.masterCompressor && typeof this.masterCompressor.input !== 'undefined') {
                testOsc.connect(this.masterCompressor);
                this.log("Audio chain validation: masterCompressor OK", "info");
            } else {
                this.log("Audio chain validation: masterCompressor unavailable", "warn");
            }
            
            // Clean up
            testOsc.disconnect();
            testOsc.dispose();
            
            return true;
        } catch (err) {
            this.log("Audio chain validation failed: " + err.message, "error");
            console.error("Audio chain validation error:", err);
            return false;
        }
    }

    optimizeAudioPerformance() {
        // Increase buffer size to reduce chances of buffer underruns
        if (Tone.context) {
            // Check if we can access and modify the underlying AudioContext
            const audioContext = Tone.context.rawContext;
            
            // Only try to change buffer size on WebAudio API contexts that support it
            if (audioContext && typeof audioContext.close === 'function') {
                // We can't change buffer size directly, but we can log current settings
                this.log(`Audio latency: ${(audioContext.baseLatency || 0) * 1000}ms`, 'info');
                
                // Modern browsers automatically adjust buffer size based on system performance
                // We can at least make sure the audio worklet is prioritized
                if (typeof audioContext.audioWorklet !== 'undefined') {
                    this.log('Using AudioWorklet for better performance', 'info');
                }
            }
        }
        
        // Optimize Tone.js settings
        Tone.context.lookAhead = 0.2; // Increase look-ahead time for scheduling
        Tone.context.updateInterval = 0.03; // Less frequent updates, more stable
        
        // Use a dedicated offline context for CPU-intensive operations
        this.offlineContext = new Tone.OfflineContext(2, 1, 44100);
    }

    // Manage active voices to prevent excessive polyphony
    managePolyphony(blockName) {
        // Get total active synths across all blocks
        let totalActiveSynths = 0;
        for (const name in this.synths) {
            if (this.synths[name] && this.synths[name].synth) {
                totalActiveSynths++;
            }
        }
        
        // If we have too many active synths, limit polyphony to prevent crackling
        if (totalActiveSynths > 8) {
            // Reduce polyphony for this synth
            if (this.synths[blockName] && this.synths[blockName].synth) {
                // If it's a PolySynth, limit voices
                if (this.synths[blockName].synth.maxPolyphony) {
                    const currentMax = this.synths[blockName].synth.maxPolyphony;
                    const newMax = Math.max(4, Math.min(currentMax, 16 - totalActiveSynths));
                    
                    if (newMax < currentMax) {
                        this.synths[blockName].synth.maxPolyphony = newMax;
                        this.log(`Reduced polyphony for ${blockName} to ${newMax} voices`, 'info');
                    }
                }
            }
        }
    }

    // Parse and execute SoundScript code
    async parseScript(code) {
        // Save the code for export purposes
        this.lastParsedCode = code;
        
        // Reset state
        this.blockDefinitions = {};
        this.currentBlockName = null;
        this.currentBlockCode = [];

        // First pass: collect all block definitions
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines and comments
            if (line === '' || line.startsWith('//')) continue;

            // Check for block definition start
            const blockMatch = line.match(/^(\w+):/);
            if (blockMatch) {
                this.currentBlockName = blockMatch[1];
                this.currentBlockCode = [];
                continue;
            }

            // Check for block definition end
            const endMatch = line.match(/^end\s+(\w+)/);
            if (endMatch && endMatch[1] === this.currentBlockName) {
                this.blockDefinitions[this.currentBlockName] = this.currentBlockCode.slice();
                this.currentBlockName = null;
                continue;
            }

            // Add line to current block if inside a block definition
            if (this.currentBlockName) {
                this.currentBlockCode.push(line);
            }
        }

        this.log(`Parsed ${Object.keys(this.blockDefinitions).length} blocks`);
        return this.blockDefinitions;
    }

    // Execute a block by its name
    async executeBlock(blockName, onFinish = null) {
        if (!this.blockDefinitions[blockName]) {
            this.log(`Block ${blockName} not found`, 'error');
            return;
        }

        this.log(`Executing block: ${blockName}`);
        this.activeBlocksRunning++;

        // Create a synth for this block if it doesn't exist
        if (!this.synths[blockName] && blockName !== 'main') {
            // Dispose existing synth if it exists
            if (this.synths[blockName]) {
                this.synths[blockName].synth.dispose();
                Object.values(this.synths[blockName].effects).forEach(effect => {
                    if (effect && typeof effect.dispose === 'function') {
                        effect.dispose();
                    }
                });
            }

            // Inside executeBlock method, reorganize the synth and effects creation:

            // Create a new PolySynth with 6 voices for better performance
            const synth = new Tone.PolySynth({
                maxPolyphony: 6,
                voice: Tone.Synth
            });

            // Configure basic envelope for cleaner sound
            synth.set({
                envelope: {
                    attack: 0.01,
                    decay: 0.1,
                    sustain: 0.8,
                    release: 0.1
                }
            });

            // Create all effects first
            const panner = new Tone.Panner(0);
            const filter = new Tone.Filter({
                type: "lowpass",
                frequency: 20000,
                Q: 1
            });
            const distortion = new Tone.Distortion({
                distortion: 0,
                wet: 0
            });
            const reverb = new Tone.Reverb({
                decay: 1.5,
                wet: 0,
                preDelay: 0.01
            });
            const delay = new Tone.PingPongDelay({
                delayTime: 0.25, 
                feedback: 0.2,
                wet: 0
            });
            const autoPanner = new Tone.AutoPanner(0).start();
            const autoFilter = new Tone.AutoFilter(0).start();

            // Generate reverb impulse response
            reverb.generate();

            // Then connect everything in chain
            synth.connect(filter);
            filter.connect(distortion);
            distortion.connect(panner);
            panner.connect(reverb);
            reverb.connect(delay);
            delay.connect(autoPanner);
            autoPanner.connect(autoFilter);

            // Store all in the synths object
            this.synths[blockName] = {
                synth: synth,
                effects: {
                    filter,
                    distortion,
                    panner,
                    reverb,
                    delay,
                    autoPanner,
                    autoFilter
                },
                params: {
                    volume: 80,
                    pan: 0,
                    autopan: { rate: 0, depth: 0 },
                    autovolume: { min: 0, max: 0, rate: 0 },
                    reverb: { wet: 0, dry: 1, decay: 1.5, preDelay: 0.01 },
                    delay: { time: 0, feedback: 0, wet: 0 },
                    envelope: {
                        attack: 0.01,
                        decay: 0.1,
                        sustain: 0.5,
                        release: 0.1
                    },
                    effectStack: [], // Add this for tracking nested effects
                    currentEffects: {} // Add this for current effect state
                }
            };

            try {
                // Connect the final effect to either masterCompressor or masterVolume
                if (this.masterCompressor && typeof this.masterCompressor.input !== 'undefined') {
                    autoFilter.connect(this.masterCompressor);
                } else {
                    autoFilter.connect(this.masterVolume);
                }
                
                // Set initial volume
                synth.volume.value = this.linearToDb(0.8);
                
                this.log(`Created synth for block: ${blockName}`, 'success');
            } catch (err) {
                this.log(`Error connecting audio for ${blockName}: ${err.message}`, 'error');
                console.error(err);
                
                // Attempt direct connection as fallback - simplify the chain completely
                try {
                    // Reset all connections
                    synth.disconnect();
                    
                    // Try the simplest possible connection
                    synth.connect(this.masterVolume);
                    this.log(`Using direct connection for ${blockName} (fallback)`, 'warn');
                } catch (fallbackErr) {
                    this.log(`Critical audio error: ${fallbackErr.message}`, 'error');
                    
                    // Last resort fallback: connect directly to Tone.Destination
                    try {
                        synth.connect(Tone.getDestination());
                        this.log(`Emergency connection to Tone.Destination for ${blockName}`, 'warn');
                    } catch (emergencyErr) {
                        this.log(`Complete audio failure for ${blockName}`, 'error');
                    }
                }
            }
        }

        // Execute each line in the block
        const lines = this.blockDefinitions[blockName];
        let lineIndex = 0;
        let loopStack = [];

        let waitingForFinish = false;

        const processLine = async () => {
            if (!this.isPlaying) return;

            if (lineIndex >= lines.length) {
                this.activeBlocksRunning--;
                if (onFinish) onFinish();
                return;
            }

            const line = lines[lineIndex].trim();
            lineIndex++;

            // Skip empty lines and comments
            if (line === '' || line.startsWith('//')) {
                return processLine();
            }

            // Process commands
            try {
                const [command, ...args] = line.split(/\s+/);

                switch (command) {
                    case 'tone':
                        await this.executeCommand_tone(blockName, args);
                        break;
                    case 'tones':
                        await this.executeCommand_tones(blockName, args);
                        break;
                    case 'wait':
                        await this.executeCommand_wait(blockName, args);
                        break;
                    case 'waitsec':
                        await this.executeCommand_waitSeconds(parseFloat(args[0]));
                        break;
                    case 'waitforfinish':
                        // Enhanced waitforfinish with timeout for effect tails
                        waitingForFinish = true;
                        let waitStartTime = Date.now();
                        
                        const checkFinished = () => {
                            // Check if other blocks are still running
                            if (this.activeBlocksRunning > 1) {
                                // Still running, check if we've been waiting too long (fail-safe)
                                if (Date.now() - waitStartTime > 10000) { // 10 seconds max wait
                                    this.log(`waitforfinish timed out after 10 seconds, continuing execution`, 'warn');
                                    waitingForFinish = false;
                                    processLine();
                                } else {
                                    // Check again in 100ms
                                    setTimeout(checkFinished, 100);
                                }
                            } else {
                                // Add an additional delay for effect tails to finish
                                setTimeout(() => {
                                    waitingForFinish = false;
                                    processLine();
                                }, 500); // 500ms extra to let delay/reverb tails complete
                            }
                        };
                        
                        checkFinished();
                        return;
                        break;

                    case 'filter':
                        this.executeCommand_filter(blockName, [
                            settings.type || 'lowpass',
                            settings.frequency || 20000,
                            settings.Q || 1
                        ]);
                        break;
                    case 'distortion':
                        this.executeCommand_distortion(blockName, [settings.amount || 0]);
                        break;
                    case 'envelope':
                        this.executeCommand_envelope(blockName, [
                            settings.attack || 0.01,
                            settings.decay || 0.1,
                            settings.sustain || 0.5,
                            settings.release || 0.1
                        ]);
                        break;

                    case 'play':
                        await this.executeCommand_play(args, blockName);
                        break;
                    case 'volume':
                        this.executeCommand_volume(blockName, args);
                        break;
                    case 'pan':
                        this.executeCommand_pan(blockName, args);
                        break;
                    case 'autopan':
                        this.executeCommand_autopan(blockName, args);
                        break;
                    case 'autovolume':
                        this.executeCommand_autovolume(blockName, args);
                        break;
                    case 'reverb':
                        this.executeCommand_reverb(blockName, args);
                        break;
                    case 'delay':
                        this.executeCommand_delay(blockName, args);
                        break;
                    case 'bpm':
                        this.executeCommand_bpm(blockName, args);
                        this.log(`BPM set to ${this.bpm}`);
                        break;
                    case 'tempo':
                        this.bpm = parseInt(args[0]) || 120;
                        Tone.Transport.bpm.value = this.bpm;
                        this.log(`Tempo set to ${this.bpm}`);
                        break;
                    case 'loop':
                        // Start a loop
                        const loopCount = parseInt(args[0]) || 1;
                        loopStack.push({ count: loopCount, startLine: lineIndex, iterationsLeft: loopCount });
                        break;
                    case 'end':
                        // End of a loop
                        if (loopStack.length > 0) {
                            const currentLoop = loopStack[loopStack.length - 1];
                            currentLoop.iterationsLeft--;

                            if (currentLoop.iterationsLeft > 0) {
                                // Jump back to the beginning of the loop
                                lineIndex = currentLoop.startLine;
                            } else {
                                // Loop is done, pop it from the stack
                                loopStack.pop();
                            }
                        }
                        break;
                    case 'sample':
                        await this.executeCommand_sample(blockName, args);
                        break;
                    default:
                        this.log(`Unknown command: ${command}`, 'error');
                }
            } catch (error) {
                this.log(`Error executing line ${lineIndex}: ${line}`, 'error');
                console.error(error);
            }

            // Process next line
            if (!waitingForFinish) {
                processLine();
            }
        };

        // Start processing lines
        processLine();
    }

    // Play the entire script starting from main block
    async play(masterVolume = 0.7) {
        // Ensure we're using the main audio context, not an offline one
        /*const originalContext = Tone.getContext();
        if (originalContext.constructor.name !== 'Context') {
            console.log("Play was called with wrong context type. Restoring main context first.");
            // Find the original web audio context
            const mainContext = new Tone.Context();
            Tone.setContext(mainContext);
        }*/

        // Ensure BPM is set to a reasonable default if not already specified
        if (!this.bpm || this.bpm <= 0) {
            this.bpm = 120;
        }
        
        // Set BPM for this playback session
        if (Tone.Transport) {
            Tone.Transport.bpm.value = this.bpm;
        }

        // Start cleanup task
        this.startAudioCleanupTask();

        // Apply unmute directly to Destination in case it was muted
        Tone.Destination.mute = false;

        // Force volume to an audible level
        Tone.Destination.volume.value = 0; // 0 dB = unity gain
        this.masterVolume.volume.value = this.linearToDb(masterVolume);
        
        // Ensure master limiter is set to prevent clipping
        this.masterLimiter.threshold.value = -1;

        // Log audio setup info
        this.log(`Master volume: ${Math.round(masterVolume * 100)}%, Destination: ${Tone.Destination.volume.value}dB`, 'info');

        // Reset state
        if (this.isPlaying) {
            // If already playing, stop first
            await this.forceStop();
            
            // Wait a bit to ensure everything is cleaned up
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Set volume
        //this.masterVolume.volume.value = this.linearToDb(masterVolume);
        this.setupVolumeNormalization(masterVolume);

        // Reset state variables
        this.isPlaying = true;
        this.activeBlocksRunning = 0;
        
        // Reset the transport
        Tone.Transport.stop();
        Tone.Transport.cancel();
        Tone.Transport.position = 0;
        
        // Start the main block
        if (this.blockDefinitions.main) {
            this.log('Starting main block');
            try {
                await this.executeBlock('main');
                this.log('Main block execution completed');
            } catch (error) {
                this.log(`Error in main block: ${error.message}`, 'error');
                throw error;
            }
        } else {
            this.log('No main block found!', 'error');
            throw new Error('No main block found in script');
        }
    }

    // Stop all playback
    async stop() {
        // Set state variables
        this.isPlaying = false;
        
        // Stop Transport - this stops scheduling new events
        Tone.Transport.stop();
        Tone.Transport.cancel();
        
        // Release all notes and allow effects to decay naturally
        for (const blockName in this.synths) {
            const synth = this.synths[blockName];
            
            // Release all notes - this will trigger natural release phase
            synth.synth.releaseAll();
            
            // Stop any oscillating effects but don't disconnect them
            if (synth.effects) {
                if (synth.effects.autoPanner) {
                    synth.effects.autoPanner.stop();
                }
                if (synth.effects.autoFilter) {
                    synth.effects.autoFilter.stop();
                }
            }
            
            // Gently stop any volume LFO
            if (synth.volumeLfo) {
                synth.volumeLfo.stop();
            }
        }
        
        // Handle samples - stop any currently playing samples but allow effects to taper
        for (const sampleName in this.samples) {
            if (this.samples[sampleName].player) {
                this.samples[sampleName].player.stop();
            }
        }
        
        // Clear any timeouts from Tone.js to prevent future events
        Tone.context.clearTimeout();
        
        // Clear all scheduled events
        Tone.Transport.cancel(0);
        
        // Decrement block counter but don't immediately set to zero to allow cleanup
        // This will allow natural delay/reverb tails to complete
        const activeCount = this.activeBlocksRunning;
        
        // Set a timeout to properly reset the active blocks counter after effects have decayed
        setTimeout(() => {
            this.activeBlocksRunning = 0;
        }, 2000); // 2 seconds should cover most delay/reverb tails
        
        this.log('Playback stopped (allowing delay/reverb tails to complete)');
        
        // Return a promise that resolves after a short delay
        // This gives immediate control back to the user while effects continue to process
        return new Promise(resolve => setTimeout(resolve, 100));
    }

    async forceStop() {
        // Set state variables
        this.isPlaying = false;
        this.activeBlocksRunning = 0;
    
        // Stop Transport and cancel all events
        Tone.Transport.stop();
        Tone.Transport.cancel();
    
        // Aggressively handle synths
        for (const blockName in this.synths) {
            const synth = this.synths[blockName];
    
            // Immediately dispose all active notes
            synth.synth.releaseAll();
            
            // Completely silence the synth
            synth.synth.volume.value = -Infinity;
            
            // Disconnect and stop all effects
            if (synth.effects) {
                if (synth.effects.autoPanner) {
                    synth.effects.autoPanner.stop();
                }
                if (synth.effects.autoFilter) {
                    synth.effects.autoFilter.stop();
                }
                
                // Set all effect wet values to zero to immediately cut tails
                if (synth.effects.reverb) synth.effects.reverb.wet.value = 0;
                if (synth.effects.delay) synth.effects.delay.wet.value = 0;
            }
            
            // Stop any LFOs
            if (synth.volumeLfo) {
                synth.volumeLfo.stop();
            }
        }
    
        // Immediately stop all samples
        for (const sampleName in this.samples) {
            if (this.samples[sampleName].player) {
                this.samples[sampleName].player.stop();
                this.samples[sampleName].player.volume.value = -Infinity;
            }
        }
    
        // Clear any timeouts or scheduled events
        Tone.context.clearTimeout();
        Tone.Transport.cancel(0);
        
        // Temporarily silence the master volume to cut all sound
        const originalVolume = this.masterVolume.volume.value;
        this.masterVolume.volume.value = -Infinity;
        
        // Short delay to ensure silence
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Restore the volume for future playback
        this.masterVolume.volume.value = originalVolume;
        
        this.log('Playback force stopped');
    }

    // Periodically clean up unused audio resources
    startAudioCleanupTask() {
        if (this.cleanupTaskId) {
            clearInterval(this.cleanupTaskId);
        }
        
        this.cleanupTaskId = setInterval(() => {
            if (!this.isPlaying) {
                return; // Don't clean up while actively playing
            }
            
            // Force JavaScript garbage collection (indirectly)
            for (const blockName in this.synths) {
                const synth = this.synths[blockName];
                if (synth && synth.synth && !synth.isPlaying) {
                    // Release any hanging notes
                    synth.synth.releaseAll();
                }
            }
            
            // Log memory usage if available
            if (window.performance && window.performance.memory) {
                const memoryInfo = window.performance.memory;
                const usedHeapMB = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
                const totalHeapMB = Math.round(memoryInfo.totalJSHeapSize / (1024 * 1024));
                
                if (usedHeapMB > totalHeapMB * 0.8) {
                    // Memory usage is high, do more aggressive cleanup
                    this.log(`High memory usage: ${usedHeapMB}MB / ${totalHeapMB}MB`, 'warn');
                    
                    // Suggest browser GC (though browsers ultimately decide when to run it)
                    if (window.gc) {
                        try {
                            window.gc();
                        } catch (e) {
                            // GC not available or not permitted
                        }
                    }
                }
            }
        }, 5000); // Run cleanup every 5 seconds
    }

    getFrequency() {
        return this.frequencyAnalyser.getValue();
    }

    setupVolumeNormalization(masterVolume) {
        // Apply base master volume
        this.masterVolume.volume.value = this.linearToDb(masterVolume);
        
        // Add a limiter with 0dB threshold to prevent clipping
        this.masterLimiter.threshold.value = 0;
        
        // Set reasonable defaults for all sounds
        for (const blockName in this.synths) {
            const synth = this.synths[blockName];
            
            // Apply a slight volume boost for synths to make them more audible if at default
            if (synth.params.volume === 80) {
                synth.params.volume = 85; // Boost a bit
            }
            
            // Calculate appropriate volume setting based on effects
            let volumeAdjustment = 0;
            
            // Analyze effects and apply compensation:
            
            // 1. Delay effect compensation
            if (synth.params.delay.wet > 0.2) {
                // Reduce volume when delay is active to prevent buildup
                const delayCompensation = -2 * synth.params.delay.wet * synth.params.delay.feedback;
                volumeAdjustment += delayCompensation;
            }
            
            // 2. Reverb compensation
            if (synth.params.reverb.wet > 0.2) {
                // Reduce volume when reverb is active
                const reverbCompensation = -1.5 * synth.params.reverb.wet;
                volumeAdjustment += reverbCompensation;
            }
            
            // Apply the compensated volume
            synth.synth.volume.value = this.linearToDb(synth.params.volume / 100) + volumeAdjustment;
        }
        
        // Apply volume normalization to samples if they're too quiet
        for (const sampleName in this.samples) {
            if (this.samples[sampleName].player) {
                if (this.samples[sampleName].player.volume.value < -12) {
                    // Boost quieter samples
                    this.samples[sampleName].player.volume.value = -6;
                }
            }
        }
        
        // Apply a global protection limiter to prevent unexpected peaks
        this.masterLimiter.threshold.value = -1;
        
        // Log volume setup
        this.log(`Master volume set to ${Math.round(masterVolume * 100)}% with adaptive normalization`, 'info');
    }

    // Get the current gain reduction from the compressor
    getCompressorReduction() {
        if (this.masterCompressor && typeof this.masterCompressor.reduction !== 'undefined') {
            return Math.abs(this.masterCompressor.reduction.value || 0);
        }
        return 0;
    }

    // Get the current gain reduction from the limiter
    getLimiterReduction() {
        if (this.masterLimiter && typeof this.masterLimiter.reduction !== 'undefined') {
            return Math.abs(this.masterLimiter.reduction.value || 0);
        }
        return 0;
    }

    // Command implementations

    // Play a tone
    async executeCommand_tone(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) {
            return;
        }
    
        const [note, duration] = args;
        
        try {
            // Check if the duration is in bars (ends with 'b')
            let seconds = parseFloat(duration) || 0.5;
            if (typeof duration === 'string' && duration.endsWith('b')) {
                // Extract the number of bars
                const bars = parseFloat(duration);
                if (!isNaN(bars)) {
                    // Calculate seconds based on BPM
                    const beatsPerBar = 4; // Assuming 4/4 time
                    const secondsPerBeat = 60 / this.bpm;
                    seconds = bars * beatsPerBar * secondsPerBeat;
                }
            }
    
            // Apply anti-crackling measures
            this.managePolyphony(blockName);
    
            // Convert from note name (e.g., 'c4') to frequency if needed
            let frequency = note;
            if (isNaN(parseFloat(note))) {
                try {
                    frequency = note; // Keep as string for Tone.js (e.g. "C4")
                } catch (e) {
                    this.log(`Invalid note: ${note}, using default`, 'warn');
                    frequency = "C4"; // Default note if conversion fails
                }
            }
    
            // Verify the synth exists
            if (!this.synths[blockName] || !this.synths[blockName].synth) {
                this.log(`No synth available for ${blockName}`, 'error');
                return;
            }
    
            // Try to play the note safely
            this.synths[blockName].synth.triggerAttackRelease(
                frequency, 
                seconds, 
                Tone.now()
            );
            
            this.log(`Playing ${note} for ${seconds.toFixed(2)}s in ${blockName}`);
        } catch (err) {
            this.log(`Error playing tone in ${blockName}: ${err.message}`, 'error');
            console.error('Tone generation error:', err);
        }
    }

    async executeCommand_tones(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) {
            this.log(`Cannot play tones in ${blockName} block - no synth defined`, 'error');
            return;
        }
        
        // Last argument is duration, all others are frequencies/notes
        if (args.length < 2) {
            this.log('tones command requires at least one frequency and a duration', 'error');
            return;
        }
        
        const duration = args[args.length - 1];
        const frequencies = args.slice(0, args.length - 1);
        
        // Check if duration has 'b' suffix for bars
        let seconds = 0;
        if (typeof duration === 'string' && duration.endsWith('b')) {
            // Convert from bars to seconds
            const bars = parseFloat(duration) || 0.5;
            seconds = bars * (60 / this.bpm) * 4; // Convert bars to seconds based on BPM
        } else {
            seconds = parseFloat(duration) || 0.5;
        }
        
        try {
            // Convert any note names to frequencies
            const processedFrequencies = frequencies.map(freq => {
                if (isNaN(parseFloat(freq))) {
                    // This is likely a note name (e.g., 'c4')
                    return Tone.Frequency(freq).toFrequency();
                }
                return freq;
            });
            
            // Play all frequencies simultaneously
            this.synths[blockName].synth.triggerAttackRelease(processedFrequencies, seconds);
            this.log(`Playing ${processedFrequencies.length} tones for ${seconds}s in ${blockName}`, 'info');
        } catch (err) {
            console.error('Error playing tones:', err);
            this.log(`Error playing tones: ${err.message}`, 'error');
        }
    }

    async executeCommand_toneSeconds(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;

        const [note, duration] = args;
        const seconds = parseFloat(duration) || 0.5;

        // Convert from note name (e.g., 'c4') to frequency if needed
        let frequency = note;
        if (isNaN(parseFloat(note))) {
            frequency = Tone.Frequency(note).toFrequency();
        }

        // Play the note
        this.synths[blockName].synth.triggerAttackRelease(frequency, seconds);
        this.log(`Playing ${note} for ${seconds}s in ${blockName}`);
    }

    // Set the tempo in beats per minute
    executeCommand_bpm(blockName, args) {
        const bpm = parseFloat(args[0]);
        
        if (isNaN(bpm) || bpm <= 0) {
            this.log(`Invalid BPM value: ${args[0]}`, 'error');
            return;
        }
        
        this.bpm = bpm;
        
        // Update Tone.js Transport BPM as well (for features that might use it)
        if (Tone.Transport) {
            Tone.Transport.bpm.value = bpm;
        }
        
        this.log(`Tempo set to ${bpm} BPM`);
    }

    executeCommand_filter(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;
    
        const [type, frequency, resonance] = args;
        const filter = this.synths[blockName].effects.filter;
    
        // Parse filter type (lowpass, highpass, bandpass)
        filter.type = type.toLowerCase();
        filter.frequency.value = parseFloat(frequency) || 1000;
        filter.Q.value = parseFloat(resonance) || 1;
    
        this.synths[blockName].params.filter = { type, frequency, resonance };
        this.log(`Set ${type} filter at ${frequency}Hz, Q=${resonance} for ${blockName}`);
    }
    
    executeCommand_distortion(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;
    
        const [amount] = args;
        const distortion = this.synths[blockName].effects.distortion;
        
        // Set distortion amount (0-1)
        distortion.wet.value = Math.min(Math.max(parseFloat(amount) || 0, 0), 1);
        distortion.distortion = Math.min(parseFloat(amount) * 10 || 0, 100);
    
        this.synths[blockName].params.distortion = { amount };
        this.log(`Set distortion amount ${amount} for ${blockName}`);
    }
    
    executeCommand_envelope(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;
    
        const [attack, decay, sustain, release] = args.map(v => parseFloat(v) || 0);
        const synth = this.synths[blockName].synth;
    
        synth.envelope.attack = attack;
        synth.envelope.decay = decay;
        synth.envelope.sustain = sustain;
        synth.envelope.release = release;
    
        this.synths[blockName].params.envelope = { attack, decay, sustain, release };
        this.log(`Set envelope A=${attack}s D=${decay}s S=${sustain} R=${release}s for ${blockName}`);
    }

    executeCommand_begin(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;
        
        const [effectType] = args;
        const synth = this.synths[blockName];
        
        // Save current effect state
        synth.params.effectStack.push({
            type: effectType,
            state: {...synth.params.currentEffects[effectType]}
        });
    }
    
    executeCommand_end(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;
        
        const [effectType] = args;
        const synth = this.synths[blockName];
        
        // Restore previous state
        const previousState = synth.params.effectStack.pop();
        if (previousState && previousState.type === effectType) {
            synth.params.currentEffects[effectType] = {...previousState.state};
            this.applyEffect(blockName, effectType, previousState.state);
        }
    }

    // Play a sample
    async executeCommand_sample(blockName, args) {
        const sampleName = args[0];
        const volume = parseFloat(args[1]) || 1.0; // Default volume to 1.0 if not specified
    
        if (!this.samples[sampleName]) {
            this.log(`Sample ${sampleName} not found`, 'error');
            return;
        }
    
        try {
            // Get the player from samples
            const player = this.samples[sampleName].player;
            
            // Set volume
            player.volume.value = this.linearToDb(volume);
            
            // Stop the player if it's already playing
            if (player.state === 'started') {
                player.stop();
            }
            
            // Play the sample
            player.start();
            this.log(`Playing sample ${sampleName} at volume ${volume}`, 'info');
        } catch (error) {
            this.log(`Error playing sample ${sampleName}: ${error.message}`, 'error');
            console.error('Sample playback error:', error);
        }
    }

    // Wait for a specified time
    async executeCommand_waitSeconds(seconds) {
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    async executeCommand_wait(blockName, args) {
        const beats = parseFloat(args[0]);
        
        if (isNaN(beats) || beats < 0) {
            this.log(`Invalid wait duration: ${args[0]}`, 'error');
            return;
        }
        
        // Calculate seconds based on current BPM
        const seconds = (beats * 60) / this.bpm;
        
        // Use a simple Promise with setTimeout instead of Transport
        // This is more reliable for our execution model
        await new Promise(resolve => {
            setTimeout(resolve, seconds * 1000);
        });
        
        this.log(`Waited ${beats} beats (${seconds.toFixed(2)}s at ${this.bpm} BPM)`);
    }

    // Play another block
    async executeCommand_play(args, parentBlock) {
        if (args[0] === 'together') {
            // Play multiple blocks simultaneously
            const blockNames = args.slice(1);
            const promises = blockNames.map(blockName => {
                return new Promise(resolve => {
                    this.executeBlock(blockName, resolve);
                });
            });

            await Promise.all(promises);
        } else {
            // Play a single block
            const blockName = args[0];
            await new Promise(resolve => {
                this.executeBlock(blockName, resolve);
            });
        }
    }

    // Set volume
    executeCommand_volume(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;
    
        const volume = parseFloat(args[0]) || 80;
        this.synths[blockName].params.volume = volume;
        
        // Store basic volume in the params
        const synth = this.synths[blockName];
        
        // Check if delay is active and apply compensation if needed
        const delaySettings = synth.params.delay;
        if (delaySettings && delaySettings.time > 0 && delaySettings.wet > 0.3) {
            // Calculate compensation factor
            const compensationDb = -3 * (delaySettings.wet * 0.7) * (delaySettings.feedback * 0.8);
            
            // Apply compensated volume
            synth.synth.volume.value = this.linearToDb(volume / 100) + compensationDb;
        } else {
            // Apply normal volume
            synth.synth.volume.value = this.linearToDb(volume / 100);
        }
    
        // Check if auto volume is being configured
        if (args.length >= 3) {
            const min = parseFloat(args[0]) || 0;
            const max = parseFloat(args[1]) || 100;
            const rate = parseFloat(args[2]) || 0;
    
            this.executeCommand_autovolume(blockName, [min, max, rate]);
        }
    }

    // Set pan position
    executeCommand_pan(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;

        const pan = parseFloat(args[0]) || 0;
        this.synths[blockName].params.pan = pan;
        this.synths[blockName].effects.panner.pan.value = pan;
    }

    // Set auto-panning
    executeCommand_autopan(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;

        const rate = parseFloat(args[0]) || 0;
        const depth = parseFloat(args[1]) || 0;

        const autoPanner = this.synths[blockName].effects.autoPanner;
        autoPanner.frequency.value = rate;
        autoPanner.depth.value = depth;

        this.synths[blockName].params.autopan = { rate, depth };
    }

    // Set auto-volume
    executeCommand_autovolume(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;

        const min = parseFloat(args[0]) / 100 || 0;
        const max = parseFloat(args[1]) / 100 || 0;
        const rate = parseFloat(args[2]) || 0;

        // Use an LFO connected to the volume
        if (rate > 0 && max > min) {
            const lfo = new Tone.LFO({
                frequency: rate,
                min: this.linearToDb(min),
                max: this.linearToDb(max)
            }).connect(this.synths[blockName].synth.volume);

            lfo.start();

            // Store reference to disconnect later
            this.synths[blockName].volumeLfo = lfo;
        } else if (this.synths[blockName].volumeLfo) {
            // Turn off auto-volume
            this.synths[blockName].volumeLfo.stop();
            this.synths[blockName].volumeLfo.disconnect();
            this.synths[blockName].volumeLfo = null;

            // Reset to static volume
            this.synths[blockName].synth.volume.value = this.linearToDb(this.synths[blockName].params.volume / 100);
        }

        this.synths[blockName].params.autovolume = { min, max, rate };
    }

    // Set reverb
    executeCommand_reverb(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;

        const wet = parseFloat(args[0]) || 0;
        const dry = parseFloat(args[1]) || 1;
        const decay = parseFloat(args[2]) || 1.5;
        const preDelay = parseFloat(args[3]) || 0.01;

        const reverb = this.synths[blockName].effects.reverb;

        // Regenerate reverb if decay time changed significantly
        if (Math.abs(reverb.decay - decay) > 0.1) {
            reverb.decay = decay;
            reverb.preDelay = preDelay;
            reverb.generate(); // This might be CPU intensive, so only do when needed
        }

        reverb.wet.value = wet;

        this.synths[blockName].params.reverb = { wet, dry, decay, preDelay };
    }

    // Set delay/echo
    executeCommand_delay(blockName, args) {
        if (blockName === 'main' || !this.synths[blockName]) return;

        // Parse parameters with more consistent volume handling
        const time = parseFloat(args[0]) || 0;
        const feedback = Math.min(parseFloat(args[1]) || 0, 0.9);
        const pingpong = parseInt(args[2]) || 0;
        const pingpongWidth = parseFloat(args[3]) || 0.5;
        const wet = Math.min(parseFloat(args[4]) || 0, 0.8);

        const delay = this.synths[blockName].effects.delay;
        const synth = this.synths[blockName].synth;
        
        // Configure delay parameters
        delay.delayTime.value = time;
        delay.feedback.value = feedback;
        delay.wet.value = wet;
        
        // Apply volume compensation based on delay settings
        // When delay is active with high feedback or wet values, reduce direct signal volume to avoid clipping
        if (time > 0 && wet > 0.3) {
            // Calculate compensation factor based on feedback and wet values
            // Higher feedback and wet values require more compensation
            const compensationDb = -3 * (wet * 0.7) * (feedback * 0.8);
            
            // Apply compensation to synth volume (preserving user's original volume setting)
            const originalVolume = this.synths[blockName].params.volume;
            const compensatedDb = this.linearToDb(originalVolume / 100) + compensationDb;
            
            // Apply the compensated volume but don't update the user-facing value
            synth.volume.value = compensatedDb;
            
            // Log volume compensation for debugging
            this.log(`Applied ${compensationDb.toFixed(1)}dB compensation for delay effect`, 'info');
        } else {
            // Restore original volume if delay is disabled or minimal
            const originalVolume = this.synths[blockName].params.volume;
            synth.volume.value = this.linearToDb(originalVolume / 100);
        }
        
        // Monitor high feedback values
        if (feedback > 0.7) {
            this.log(`High delay feedback (${feedback}) detected - volume compensated`, 'info');
        }

        // Store current settings
        this.synths[blockName].params.delay = { time, feedback, pingpong, pingpongWidth, wet };
    }

    // Utility functions

    // Convert linear volume (0-1) to dB
    linearToDb(linear) {
        return 20 * Math.log10(Math.max(0.00001, linear));
    }

    // Add a sample to the available samples
    addSample(name, audioBuffer) {
        const player = new Tone.Player(audioBuffer).connect(this.masterCompressor);
        this.samples[name] = { player, buffer: audioBuffer };
        this.log(`Sample '${name}' loaded`, 'success');
        return this.samples[name];
    }

    // Get the waveform data for visualization
    getWaveform() {
        return this.masterAnalyser.getValue();
    }

    // Set compressor parameters
    setCompressorParams(threshold, ratio, attack, release, enabled) {
        if (!enabled) {
            // When disabled, set ratio to 1:1 which is effectively no compression
            this.masterCompressor.ratio.value = 1;
            // Use a very low threshold to ensure it never triggers
            this.masterCompressor.threshold.value = -100;
            return;
        }

        this.masterCompressor.threshold.value = threshold;
        this.masterCompressor.ratio.value = ratio;
        this.masterCompressor.attack.value = attack;
        this.masterCompressor.release.value = release;
        
        // Log settings for debugging
        console.log(`Compressor set: threshold=${threshold}dB, ratio=${ratio}:1, attack=${attack}s, release=${release}s`);
    }

    // Set limiter parameters
    setLimiterParams(threshold, release, enabled) {
        // Check if masterLimiter exists before trying to set properties
        if (!this.masterLimiter) {
            console.warn("Limiter not initialized, can't set parameters");
            return;
        }
        
        if (!enabled) {
            // When disabled, set threshold very high so it never triggers
            this.masterLimiter.threshold.value = 20; // Well above 0dB
            return;
        }
    
        this.masterLimiter.threshold.value = threshold;
        this.masterLimiter.release.value = release;
        
        // Log settings for debugging
        console.log(`Limiter set: threshold=${threshold}dB, release=${release}s`);
    }

    async ensureAudioContextStarted() {
        if (Tone.context.state !== 'running') {
            try {
                // Try to start the Tone.js context
                await Tone.start();
                this.log("Audio context started successfully", "success");
                return true;
            } catch (error) {
                // Fall back to other methods if the first attempt fails
                try {
                    await Tone.context.resume();
                    this.log("Audio context resumed successfully", "success");
                    return true;
                } catch (resumeError) {
                    // Last resort - create a silent buffer and play it
                    const silentBuffer = Tone.context.createBuffer(1, 1, 22050);
                    const source = Tone.context.createBufferSource();
                    source.buffer = silentBuffer;
                    source.connect(Tone.context.destination);
                    source.start();
                    
                    this.log("Attempted to start audio with silent buffer", "warn");
                    return false;
                }
            }
        }
        return true;
    }

    // Register console callback
    setConsoleCallback(callback) {
        this.consoleCallback = callback;
    }

    // Log to console
    log(message, type = 'info') {
        console.log(`[SoundScript] ${message}`);
        if (this.consoleCallback) {
            this.consoleCallback(message, type);
        }
    }

    async exportToWav() {
        try {
            const duration = await this.calculateTotalDuration();
            const offlineCtx = new Tone.OfflineContext(2, duration, 44100);
            const originalContext = Tone.getContext();
            
            try {
                // Switch to offline context
                Tone.setContext(offlineCtx);
                
                // Create master effects chain
                const offlineMasterCompressor = new Tone.Compressor({
                    threshold: -24,
                    ratio: 4,
                    attack: 0.003,
                    release: 0.25
                }).toDestination();
                
                const offlineMasterVolume = new Tone.Volume(0).connect(offlineMasterCompressor);
                
                // Re-create all synths and effects in offline context
                const offlineSynths = {};
                
                for (const blockName in this.blockDefinitions) {
                    if (blockName === 'main') continue;
                    
                    // Create synth with initial envelope
                    const synth = new Tone.PolySynth(Tone.Synth).set({
                        envelope: {
                            attack: 0.01,
                            decay: 0.1,
                            sustain: 0.8,
                            release: 0.1
                        }
                    });
    
                    // Initialize effects with default values first
                    const filter = new Tone.Filter({
                        type: "lowpass",
                        frequency: 20000,
                        Q: 1
                    });
    
                    const distortion = new Tone.Distortion({
                        distortion: 0,
                        wet: 0
                    });
    
                    const panner = new Tone.Panner(0);
    
                    const reverb = new Tone.Reverb({
                        decay: 1.5,
                        wet: 0,
                        preDelay: 0.01
                    }).generate();
    
                    const delay = new Tone.PingPongDelay({
                        delayTime: 0.25,
                        feedback: 0.2,
                        wet: 0
                    });
    
                    const autoPanner = new Tone.AutoPanner(0).start();
                    const autoFilter = new Tone.AutoFilter(0).start();
    
                    // Connect the chain
                    synth.connect(filter);
                    filter.connect(distortion);
                    distortion.connect(panner);
                    panner.connect(reverb);
                    reverb.connect(delay);
                    delay.connect(autoPanner);
                    autoPanner.connect(autoFilter);
                    autoFilter.connect(offlineMasterVolume);
    
                    // Copy settings from original synth if it exists
                    if (this.synths[blockName]) {
                        const originalParams = this.synths[blockName].params;
                        
                        // Apply volume and envelope
                        synth.volume.value = this.linearToDb(originalParams.volume / 100);
                        if (originalParams.envelope) {
                            synth.set({ envelope: originalParams.envelope });
                        }
                        
                        // Apply effect settings
                        if (originalParams.filter) {
                            filter.frequency.value = originalParams.filter.frequency || 20000;
                            filter.Q.value = originalParams.filter.Q || 1;
                            filter.type = originalParams.filter.type || "lowpass";
                        }
                        
                        if (originalParams.distortion) {
                            distortion.wet.value = originalParams.distortion.wet || 0;
                            distortion.distortion = originalParams.distortion.amount || 0;
                        }
                        
                        if (originalParams.reverb) {
                            reverb.wet.value = originalParams.reverb.wet || 0;
                            reverb.decay = originalParams.reverb.decay || 1.5;
                            reverb.preDelay = originalParams.reverb.preDelay || 0.01;
                        }
                        
                        if (originalParams.delay) {
                            delay.wet.value = originalParams.delay.wet || 0;
                            delay.delayTime.value = originalParams.delay.time || 0;
                            delay.feedback.value = originalParams.delay.feedback || 0;
                        }
                    }
    
                    // Store in offline synths
                    offlineSynths[blockName] = {
                        synth,
                        effects: {
                            filter,
                            distortion,
                            panner,
                            reverb,
                            delay,
                            autoPanner,
                            autoFilter
                        },
                        params: { ...this.synths[blockName]?.params }
                    };
                }
                
                // Temporarily replace synths with offline versions
                const originalSynths = this.synths;
                this.synths = offlineSynths;
                
                // Parse and execute the script
                await this.parseScript(this.lastParsedCode);
                await this.play(0.8);
                
                // Generate the audio buffer
                const buffer = await offlineCtx.render();
                
                // Convert to WAV
                const wavBlob = new Blob([audioBufferToWav(buffer)], { type: 'audio/wav' });
                
                // Restore original context and synths
                Tone.setContext(originalContext);
                this.synths = originalSynths;
                
                return wavBlob;
            } catch (error) {
                Tone.setContext(originalContext);
                throw error;
            }
        } catch (error) {
            console.error('Error during WAV export:', error);
            throw error;
        }
    }

    interleave(left, right) {
        const length = left.length + right.length;
        const result = new Float32Array(length);
    
        let inputIndex = 0;
        let outputIndex = 0;
    
        while (outputIndex < length) {
            result[outputIndex++] = left[inputIndex];
            result[outputIndex++] = right[inputIndex];
            inputIndex++;
        }
        
        return result;
    }
    
    encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
    
        const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
        const view = new DataView(buffer);
    
        // Write WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * bytesPerSample, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * bytesPerSample, true);
    
        // Write the actual audio data
        if (format === 1) { // PCM
            floatTo16BitPCM(view, 44, samples);
        } else {
            writeFloat32(view, 44, samples);
        }
    
        return buffer;
    }
    
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    floatTo16BitPCM(view, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }
    
    writeFloat32(view, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 4) {
            view.setFloat32(offset, input[i], true);
        }
    }

    async calculateTotalDuration() {
        try {
            let totalDuration = 0;
            const processedBlocks = new Set();
            
            // Function to recursively estimate block duration
            const estimateBlockDuration = (blockName) => {
                if (processedBlocks.has(blockName)) return 0; // Prevent infinite recursion
                processedBlocks.add(blockName);
                
                if (!this.blockDefinitions[blockName]) return 0;
                
                let blockDuration = 0;
                const lines = this.blockDefinitions[blockName];
                
                for (const line of lines) {
                    if (!line.trim() || line.trim().startsWith('//')) continue;
                    
                    const [command, ...args] = line.trim().split(/\s+/);
                    
                    switch (command) {
                        case 'wait':
                            // Convert beats to seconds based on BPM
                            const beats = parseFloat(args[0]) || 0;
                            blockDuration += (beats * 60) / (this.bpm || 120);
                            break;
                        case 'waitsec':
                            blockDuration += parseFloat(args[0]) || 0;
                            break;
                        case 'tone':
                        case 'tones':
                            // Get duration from args
                            const lastArg = args[args.length - 1];
                            if (lastArg.endsWith('b')) {
                                // Duration in beats
                                const barBeats = parseFloat(lastArg) || 0.5;
                                blockDuration += (barBeats * 4 * 60) / (this.bpm || 120);
                            } else {
                                // Duration in seconds
                                blockDuration += parseFloat(lastArg) || 0.5;
                            }
                            break;
                        case 'play':
                            if (args[0] === 'together') {
                                // For parallel blocks, take the duration of the longest one
                                const blockNames = args.slice(1);
                                let maxSubDuration = 0;
                                for (const subBlock of blockNames) {
                                    const subDuration = estimateBlockDuration(subBlock);
                                    maxSubDuration = Math.max(maxSubDuration, subDuration);
                                }
                                blockDuration += maxSubDuration;
                            } else {
                                // Sequential block
                                const subBlockName = args[0];
                                blockDuration += estimateBlockDuration(subBlockName);
                            }
                            break;
                        case 'loop':
                            // Find matching end and estimate loop body duration
                            const iterations = parseInt(args[0]) || 1;
                            const loopBodyLines = [];
                            let loopDepth = 0;
                            let foundEnd = false;
                            
                            for (let i = lines.indexOf(line) + 1; i < lines.length; i++) {
                                const loopLine = lines[i];
                                const [loopCommand] = loopLine.trim().split(/\s+/);
                                
                                if (loopCommand === 'loop') {
                                    loopDepth++;
                                } else if (loopCommand === 'end' && loopDepth === 0) {
                                    foundEnd = true;
                                    break;
                                } else if (loopCommand === 'end') {
                                    loopDepth--;
                                }
                                
                                loopBodyLines.push(loopLine);
                            }
                            
                            if (foundEnd) {
                                // Estimate loop body duration
                                let loopBodyDuration = 0;
                                for (const loopLine of loopBodyLines) {
                                    const [loopCommand, ...loopArgs] = loopLine.trim().split(/\s+/);
                                    switch (loopCommand) {
                                        case 'wait':
                                            const loopBeats = parseFloat(loopArgs[0]) || 0;
                                            loopBodyDuration += (loopBeats * 60) / (this.bpm || 120);
                                            break;
                                        case 'waitsec':
                                            loopBodyDuration += parseFloat(loopArgs[0]) || 0;
                                            break;
                                        case 'tone':
                                        case 'tones':
                                            const loopLastArg = loopArgs[loopArgs.length - 1];
                                            loopBodyDuration += parseFloat(loopLastArg) || 0.5;
                                            break;
                                    }
                                }
                                
                                // Add total loop duration
                                blockDuration += loopBodyDuration * iterations;
                            } else {
                                // If end not found, add a conservative estimate
                                blockDuration += iterations * 2;
                            }
                            break;
                        case 'waitforfinish':
                            // Add 1 second for potential active blocks to finish
                            blockDuration += 1;
                            break;
                    }
                }
                
                // Account for potential effect tails (reverb, delay)
                return blockDuration + 1.5; // Add 1.5 seconds for effect tails
            };
            
            // Start with main block
            if (this.blockDefinitions.main) {
                totalDuration = estimateBlockDuration('main');
            }
            
            // Ensure minimum duration and add some padding
            return Math.max(10, totalDuration * 1.1);
        } catch (error) {
            console.error('Error calculating duration:', error);
            return 30; // Default to 30 seconds if calculation fails
        }
    }

    drawExportWaveform(audioBuffer, canvas, ctx) {
        const width = canvas.width;
        const height = canvas.height;
        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'var(--surface-light)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.beginPath();
        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            
            // Get min/max for this slice of data
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j] || 0;
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            
            const y1 = ((1 + min) * height) / 2;
            const y2 = ((1 + max) * height) / 2;
            
            ctx.moveTo(i, y1);
            ctx.lineTo(i, y2);
        }
        
        ctx.stroke();
    }
}

function audioBufferToWav(buffer, opt) {
    opt = opt || {};

    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var format = opt.float32 ? 3 : 1;
    var bitDepth = format === 3 ? 32 : 16;

    var result;
    if (numChannels === 2) {
        result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
        result = buffer.getChannelData(0);
    }

    return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

// Load a sample into the SoundScript interpreter
function loadSampleIntoSoundScript(item) {
    if (!soundScript) return;
    
    // Extract the sample name for use in SoundScript
    const sampleName = getSampleNameFromPath(item.path);
    
    // Check if sample is already loaded
    if (soundScript.samples[sampleName]) {
        logToConsole(`Sample ${sampleName} already loaded`, "info");
        return;
    }
    
    // Show loading indicator
    logToConsole(`Loading sample: ${sampleName}...`, "info");
    
    // Load the sample file
    fetch(item.path)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load sample: ${item.path}`);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => Tone.context.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            // Add the sample to SoundScript
            soundScript.addSample(sampleName, audioBuffer);
            logToConsole(`Sample ${sampleName} loaded and ready to use with: sample ${sampleName}`, "success");
            
            // Add to samples list for preview
            addSampleToList(sampleName, { buffer: audioBuffer });
        })
        .catch(error => {
            console.error(`Error loading sample ${item.path}:`, error);
            logToConsole(`Failed to load sample: ${sampleName}`, "error");
        });
}

// Preload all samples in a directory and its subdirectories
function preloadSamples(items) {
    logToConsole("Starting to preload all samples...", "info");
    
    let sampleCount = 0;
    let loadedCount = 0;
    
    // First count total samples
    function countSampleFiles(items) {
        let count = 0;
        items.forEach(item => {
            if (item.type === 'file' && (item.path.endsWith('.wav') || item.path.endsWith('.mp3'))) {
                count++;
            } else if (item.type === 'directory' && item.children) {
                count += countSampleFiles(item.children);
            }
        });
        return count;
    }
    
    sampleCount = countSampleFiles(items);
    logToConsole(`Found ${sampleCount} samples to preload`, "info");
    
    // Then load each sample
    function loadAllSamples(items) {
        items.forEach(item => {
            if (item.type === 'file' && (item.path.endsWith('.wav') || item.path.endsWith('.mp3'))) {
                // Extract the sample name for use in SoundScript
                const sampleName = getSampleNameFromPath(item.path);
                
                // Load the sample
                fetch(item.path)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load sample: ${item.path}`);
                        }
                        return response.arrayBuffer();
                    })
                    .then(arrayBuffer => Tone.context.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        // Add the sample to SoundScript
                        soundScript.addSample(sampleName, audioBuffer);
                        loadedCount++;
                        
                        logToConsole(`Loaded sample: ${sampleName} (${loadedCount}/${sampleCount})`, 
                            loadedCount === sampleCount ? "success" : "info");
                    })
                    .catch(error => {
                        console.error(`Error loading sample ${item.path}:`, error);
                        logToConsole(`Failed to load sample: ${sampleName}`, "error");
                    });
            } else if (item.type === 'directory' && item.children) {
                loadAllSamples(item.children);
            }
        });
    }
    
    loadAllSamples(items);
}
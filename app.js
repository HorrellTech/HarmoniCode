/**
 * HarmoniCode - Main Application
 * A code-based music generator using the SoundScript language
 */

document.addEventListener('DOMContentLoaded', function () {
    // Make the audio buffer conversion function available globally
    window.audioBufferToWav = function(buffer, opt) {
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
    };

    function encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
        var bytesPerSample = bitDepth / 8;
        var blockAlign = numChannels * bytesPerSample;

        var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
        var view = new DataView(buffer);

        // RIFF identifier
        writeString(view, 0, 'RIFF');
        // file length
        view.setUint32(4, 36 + samples.length * bytesPerSample, true);
        // RIFF type
        writeString(view, 8, 'WAVE');
        // format chunk identifier
        writeString(view, 12, 'fmt ');
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw)
        view.setUint16(20, format, true);
        // channel count
        view.setUint16(22, numChannels, true);
        // sample rate
        view.setUint32(24, sampleRate, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, sampleRate * blockAlign, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, blockAlign, true);
        // bits per sample
        view.setUint16(34, bitDepth, true);
        // data chunk identifier
        writeString(view, 36, 'data');
        // data chunk length
        view.setUint32(40, samples.length * bytesPerSample, true);

        if (format === 1) { // Raw PCM
            floatTo16BitPCM(view, 44, samples);
        } else {
            writeFloat32(view, 44, samples);
        }

        return buffer;
    }

    function interleave(inputL, inputR) {
        var length = inputL.length + inputR.length;
        var result = new Float32Array(length);

        var index = 0;
        var inputIndex = 0;

        while (index < length) {
            result[index++] = inputL[inputIndex];
            result[index++] = inputR[inputIndex];
            inputIndex++;
        }
        return result;
    }

    function writeFloat32(output, offset, input) {
        for (var i = 0; i < input.length; i++, offset += 4) {
            output.setFloat32(offset, input[i], true);
        }
    }

    function floatTo16BitPCM(output, offset, input) {
        for (var i = 0; i < input.length; i++, offset += 2) {
            var s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    function writeString(view, offset, string) {
        for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // Make these functions available globally
    window.encodeWAV = encodeWAV;
    window.interleave = interleave;
    window.writeFloat32 = writeFloat32;
    window.floatTo16BitPCM = floatTo16BitPCM;
    window.writeString = writeString;

    // Initialize Tone.js
    if (!window.Tone) {
        console.error("Tone.js not loaded! Adding it dynamically...");
        const toneScript = document.createElement('script');
        toneScript.src = "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js";
        document.head.appendChild(toneScript);

        toneScript.onload = initializeApp;
    } else {
        initializeApp();
    }

    function initializeApp() {
        // Check if Tone.js is fully loaded and initialized
        if (!window.Tone || !window.Tone.context) {
            console.warn("Waiting for Tone.js to fully initialize...");
            setTimeout(initializeApp, 100); // Try again in 100ms
            return;
        }

        // Load keywords if not already loaded
        if (!window.SoundScriptKeywords) {
            console.warn("Keywords not loaded yet, loading from keywords.js");
            loadKeywords().then(() => {
                setupEditor();
                initializeEditor();
            }).catch(err => {
                console.error("Error loading keywords:", err);
                // Continue with basic functionality
                setupEditor();
                initializeEditor();
            });
        } else {
            setupEditor();
            initializeEditor();
        }
    }

    // Add this new function to handle keywords loading
    async function loadKeywords() {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            if (document.querySelector('script[src="keywords.js"]')) {
                resolve();
                return;
            }

            const keywordsScript = document.createElement('script');
            keywordsScript.src = "keywords.js";
            keywordsScript.onload = () => resolve();
            keywordsScript.onerror = (err) => reject(err);
            document.head.appendChild(keywordsScript);
        });
    }

    function setupEditor() {
        // Load custom SoundScript mode for CodeMirror
        if (typeof CodeMirror.modes.soundscript === 'undefined') {
            console.warn("SoundScript mode not loaded, falling back to plain text");
            CodeMirror.defineMode('soundscript', () => CodeMirror.getMode({}, 'text/plain'));
        }
    }

    function initializeEditor() {
        // Initialize CodeMirror editor with SoundScript mode
        const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
            mode: 'soundscript',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            tabSize: 2,
            indentWithTabs: true,
            autofocus: true
        });

        // Initialize keyword help system
        initKeywordHelp(editor);

        // Init SoundScript interpreter
        const soundScript = new SoundScript();

        // Set initial master volume right away
        const initialVolume = parseInt(document.getElementById('master-volume').value) / 100;
        soundScript.masterVolume.volume.value = soundScript.linearToDb(initialVolume);
        document.getElementById('volume-value').textContent = `${initialVolume * 100}%`;

        // Canvas for visualizers
        const waveformCanvas = document.getElementById('waveform-visualizer');
        const frequencyCanvas = document.getElementById('frequency-visualizer');
        const waveformCtx = waveformCanvas.getContext('2d');
        const frequencyCtx = frequencyCanvas.getContext('2d');
        resizeCanvases();

        // Console output
        const consoleOutput = document.getElementById('console-output');

        // Register console callback
        soundScript.setConsoleCallback(logToConsole);

        // UI Elements
        const generateBtn = document.getElementById('generate-btn');
        const stopBtn = document.getElementById('stop-btn');
        const forceStopBtn = document.getElementById('force-stop-btn');
        const downloadBtn = document.getElementById('download-btn');
        const masterVolumeSlider = document.getElementById('master-volume');
        const volumeValue = document.getElementById('volume-value');

        // Compressor controls
        const compressorThreshold = document.getElementById('compressor-threshold');
        const compressorRatio = document.getElementById('compressor-ratio');
        const compressorAttack = document.getElementById('compressor-attack');
        const compressorRelease = document.getElementById('compressor-release');
        const compressorEnabled = document.getElementById('compressor-enabled');

        // Limiter controls
        const limiterThreshold = document.getElementById('limiter-threshold');
        const limiterRelease = document.getElementById('limiter-release');
        const limiterEnabled = document.getElementById('limiter-enabled');

        // Sample upload
        const sampleUpload = document.getElementById('sample-upload');
        const samplesList = document.getElementById('samples-list');

        // Tab system
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // File operations UI elements
        const saveScriptBtn = document.getElementById('save-script-btn');
        const loadScriptBtn = document.getElementById('load-script-btn');
        const loadScriptInput = document.getElementById('load-script-input');
        const fileInfo = document.getElementById('file-info');
        const examplesList = document.getElementById('examples-list');

        // Keep track of the current file
        let currentFile = {
            name: null,
            path: null,
            saved: true
        };

        // Update the file info display
        function updateFileInfo() {
            if (currentFile.name) {
                fileInfo.innerHTML = `
                    <span class="current-file">Current file: ${currentFile.name}</span>
                    ${!currentFile.saved ? '<span class="unsaved-indicator"> (unsaved changes)</span>' : ''}
                `;
            } else {
                fileInfo.innerHTML = 'No file loaded';
            }
        }

        // Save script as .ss file
        saveScriptBtn.addEventListener('click', () => {
            try {
                const code = editor.getValue();
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                
                // Create download link
                const a = document.createElement('a');
                a.href = url;
                
                // Use current file name or default to "soundscript"
                const fileName = currentFile.name || 'soundscript.ss';
                a.download = fileName.endsWith('.ss') ? fileName : `${fileName}.ss`;
                
                // Trigger download
                a.click();
                
                // Clean up
                URL.revokeObjectURL(url);
                
                // Update file info
                currentFile.saved = true;
                updateFileInfo();
                
                logToConsole(`Script saved as ${a.download}`, 'success');
            } catch (error) {
                logToConsole(`Error saving script: ${error.message}`, 'error');
                console.error(error);
            }
        });

        // Load script from file
        loadScriptBtn.addEventListener('click', () => {
            loadScriptInput.click();
        });

        loadScriptInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const code = e.target.result;
                    editor.setValue(code);
                    
                    // Update current file info
                    currentFile.name = file.name;
                    currentFile.path = URL.createObjectURL(file);
                    currentFile.saved = true;
                    updateFileInfo();
                    
                    logToConsole(`Loaded script: ${file.name}`, 'success');
                } catch (error) {
                    logToConsole(`Error loading script: ${error.message}`, 'error');
                    console.error(error);
                }
            };
            
            reader.onerror = () => {
                logToConsole(`Error reading file: ${file.name}`, 'error');
            };
            
            reader.readAsText(file);
            
            // Reset the input for future file selections
            event.target.value = '';
        });

        // Detect changes in the editor to mark file as unsaved
        editor.on('change', () => {
            if (currentFile.name) {
                currentFile.saved = false;
                updateFileInfo();
            }
        });

        // Initial file info update
        updateFileInfo();

        // Event Listeners
        generateBtn.addEventListener('click', async () => {
            try {
                try {
                    // Call the enhanced stop method
                    await soundScript.stop();
                    
                    // Cancel any pending animation frames for the visualizer
                    if (window.visualizerAnimationFrame) {
                        cancelAnimationFrame(window.visualizerAnimationFrame);
                        window.visualizerAnimationFrame = null;
                    }
                    
                    // Clear both visualizer canvases
                    waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
                    frequencyCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
        
                    // Reset processor visualizers
                    document.querySelectorAll('.processor-signal').forEach(el => el.classList.remove('active'));
                    document.querySelectorAll('.reduction-bar').forEach(el => el.style.width = '0%');
                    document.querySelectorAll('.reduction-value').forEach(el => el.textContent = '0 dB');
                    
                    // Log success message
                    logToConsole('Previous playback stopped', 'success');
                } catch (error) {
                    logToConsole(`Error stopping playback: ${error.message}`, 'error');
                    console.error(error);
                }
        
                // Show rendering progress indicator
                const generateBtnOriginalText = generateBtn.textContent;
                generateBtn.textContent = "Rendering...";
                generateBtn.disabled = true;
                
                logToConsole('Starting audio rendering process...', 'info');
        
                // Ensure Tone.js is started with user interaction
                if (Tone.context.state !== 'running') {
                    logToConsole('Starting audio context...', 'info');
                    
                    try {
                        await Tone.start();
                        logToConsole('Audio context started', 'info');
                    } catch (startError) {
                        logToConsole('Trying alternative audio context start method...', 'warn');
                        
                        try {
                            // Try to resume the context
                            await Tone.context.resume();
                            logToConsole('Audio context resumed', 'info');
                        } catch (resumeError) {
                            logToConsole('Audio context resume failed, trying fallback method...', 'warn');
                            
                            // Create a silent buffer as a last resort
                            const silentBuffer = Tone.context.createBuffer(1, 1, 22050);
                            const source = Tone.context.createBufferSource();
                            source.buffer = silentBuffer;
                            source.connect(Tone.context.destination);
                            source.start();
                            
                            await new Promise(resolve => setTimeout(resolve, 100));
                            logToConsole('Audio context initialized with fallback method', 'info');
                        }
                    }
                }
                
                // Parse the code
                const code = editor.getValue();
                logToConsole('Parsing script...', 'info');
                await soundScript.parseScript(code);
                
                // Update button status
                generateBtn.textContent = "Processing...";
                
                // Pre-render the music to a buffer (with a small delay to update UI)
                await new Promise(resolve => setTimeout(resolve, 50)); // Let UI update
                logToConsole('Pre-rendering audio for smooth playback...', 'info');
                
                const buffer = await soundScript.renderToBuffer();
                
                // Apply volume setting from slider
                const volume = parseInt(masterVolumeSlider.value) / 100;
                logToConsole(`Setting playback volume: ${volume * 100}%`, 'info');
                soundScript.masterVolume.volume.value = soundScript.linearToDb(volume);
                
                // Update button status
                generateBtn.textContent = "Starting playback...";
                
                // Another short delay to update UI
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Play the rendered buffer
                await soundScript.playRenderedBuffer();
                
                // Start visualizer
                requestAnimationFrame(drawVisualizer);
                updateProcessorVisualizers();
                
                // Enable WAV download now that we have a rendered buffer
                downloadBtn.disabled = false;
                
                // Reset button
                generateBtn.textContent = generateBtnOriginalText;
                generateBtn.disabled = false;
                
            } catch (error) {
                logToConsole(`Error: ${error.message}`, 'error');
                console.error(error);
                
                // Reset button state
                generateBtn.textContent = "Generate & Play";
                generateBtn.disabled = false;
            }
        });

        stopBtn.addEventListener('click', async () => {
            try {
                // Stop rendered buffer if it's playing
                if (soundScript.bufferPlayer) {
                    soundScript.stopRenderedBuffer();
                } else {
                    // Fall back to the original stop method
                    await soundScript.stop();
                }
        
                // Stop all preview players
                stopAllPreviews();
                
                // Cancel any pending animation frames for the visualizer
                if (window.visualizerAnimationFrame) {
                    cancelAnimationFrame(window.visualizerAnimationFrame);
                    window.visualizerAnimationFrame = null;
                }
                
                // Clear both visualizer canvases
                waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
                frequencyCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
        
                // Reset processor visualizers
                document.querySelectorAll('.processor-signal').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.reduction-bar').forEach(el => el.style.width = '0%');
                document.querySelectorAll('.reduction-value').forEach(el => el.textContent = '0 dB');
                
                // Log success message
                logToConsole('Playback stopped', 'success');
            } catch (error) {
                logToConsole(`Error stopping playback: ${error.message}`, 'error');
                console.error(error);
            }
        });

        // Force Stop Button
        forceStopBtn.addEventListener('click', async () => {
            try {
                // Call the force stop method
                await soundScript.forceStop();

                // Stop all preview players
                stopAllPreviews();
                
                // Cancel any pending animation frames for the visualizer
                if (window.visualizerAnimationFrame) {
                    cancelAnimationFrame(window.visualizerAnimationFrame);
                    window.visualizerAnimationFrame = null;
                }
                
                // Clear both visualizer canvases
                waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
                frequencyCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);

                // Reset processor visualizers
                document.querySelectorAll('.processor-signal').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.reduction-bar').forEach(el => el.style.width = '0%');
                document.querySelectorAll('.reduction-value').forEach(el => el.textContent = '0 dB');
                
                // Log success message
                logToConsole('Playback force stopped (all audio terminated)', 'success');
            } catch (error) {
                logToConsole(`Error force stopping playback: ${error.message}`, 'error');
                console.error(error);
            }
        });

        downloadBtn.addEventListener('click', async () => {
            try {
                // If we already have a rendered buffer, use that directly
                if (!soundScript.renderedBuffer) {
                    logToConsole('No rendered audio available. Generate the music first.', 'error');
                    return;
                }
                
                logToConsole('Preparing WAV file from rendered audio...', 'info');
                
                // Create WAV from the rendered buffer
                const wavBlob = new Blob([audioBufferToWav(soundScript.renderedBuffer)], { type: 'audio/wav' });
                
                // Create download link
                const url = URL.createObjectURL(wavBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (currentFile.name || 'soundscript').replace(/\.ss$/, '') + '.wav';
                
                // Trigger download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up
                URL.revokeObjectURL(url);
                
                logToConsole('WAV export complete!', 'success');
            } catch (error) {
                logToConsole(`Error exporting WAV: ${error.message}`, 'error');
                console.error("Error during WAV export:", error);
            }
        });

        // Volume control
        masterVolumeSlider.addEventListener('input', () => {
            const volume = parseInt(masterVolumeSlider.value);
            volumeValue.textContent = `${volume}%`;

            // Update Tone.js master volume
            if (soundScript && soundScript.masterVolume) {
                soundScript.masterVolume.volume.value = soundScript.linearToDb(volume / 100);
            }
        });

        // Compressor controls
        compressorThreshold.addEventListener('input', updateCompressor);
        compressorRatio.addEventListener('input', updateCompressor);
        compressorAttack.addEventListener('input', updateCompressor);
        compressorRelease.addEventListener('input', updateCompressor);
        compressorEnabled.addEventListener('change', updateCompressor);

        function updateCompressor() {
            const threshold = parseFloat(compressorThreshold.value);
            const ratio = parseFloat(compressorRatio.value);
            const attack = parseFloat(compressorAttack.value);
            const release = parseFloat(compressorRelease.value);
            const enabled = compressorEnabled.checked;

            // Update display values
            document.getElementById('compressor-threshold-value').textContent = `${threshold} dB`;
            document.getElementById('compressor-ratio-value').textContent = `${ratio}:1`;
            document.getElementById('compressor-attack-value').textContent = `${attack}s`;
            document.getElementById('compressor-release-value').textContent = `${release}s`;

            // Update compressor
            if (soundScript) {
                soundScript.setCompressorParams(threshold, ratio, attack, release, enabled);
            }
        }

        // Limiter controls
        limiterThreshold.addEventListener('input', updateLimiter);
        limiterRelease.addEventListener('input', updateLimiter);
        limiterEnabled.addEventListener('change', updateLimiter);

        function updateLimiter() {
            const threshold = parseFloat(limiterThreshold.value);
            const release = parseFloat(limiterRelease.value);
            const enabled = limiterEnabled.checked;

            // Update display values
            document.getElementById('limiter-threshold-value').textContent = `${threshold} dB`;
            document.getElementById('limiter-release-value').textContent = `${release}s`;

            // Update limiter
            if (soundScript) {
                soundScript.setLimiterParams(threshold, release, enabled);
            }
        }

        // Sample upload handler
        sampleUpload.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            for (const file of files) {
                try {
                    logToConsole(`Loading sample: ${file.name}...`, 'info');

                    // Create a FileReader to read the file
                    const reader = new FileReader();

                    reader.onload = async function (e) {
                        try {
                            // Decode the audio data
                            const audioBuffer = await Tone.context.decodeAudioData(e.target.result);

                            // Get sample name (use filename without extension)
                            const sampleName = file.name.replace(/\.[^.]+$/, '');

                            // Add to SoundScript samples
                            const sample = soundScript.addSample(sampleName, audioBuffer);

                            // Add to UI list
                            addSampleToList(sampleName, sample);

                            logToConsole(`Sample loaded: ${sampleName}`, 'success');
                        } catch (error) {
                            logToConsole(`Error decoding audio: ${error.message}`, 'error');
                            console.error(error);
                        }
                    };

                    reader.onerror = function () {
                        logToConsole(`Error reading file: ${file.name}`, 'error');
                    };

                    // Read the file as an array buffer
                    reader.readAsArrayBuffer(file);
                } catch (error) {
                    logToConsole(`Error loading sample: ${error.message}`, 'error');
                    console.error(error);
                }
            }

            // Load samples on page load
            function loadSamplesOnStartup() {
                logToConsole("Loading samples directory...", "info");
                
                fetch('/api/samples')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Render samples tree
                        const samplesTree = document.querySelector('.samples-tree');
                        if (samplesTree) {
                            samplesTree.innerHTML = ''; // Clear loading message
                            renderSamplesTree(data, samplesTree);
                            const count = countSamples(data);
                            logToConsole(`Found ${count} samples in directory`, "success");
                        }
                    })
                    .catch(error => {
                        logToConsole(`Error loading samples directory: ${error.message}`, "error");
                        console.error('Error loading samples:', error);
                        
                        const samplesTree = document.querySelector('.samples-tree');
                        if (samplesTree) {
                            samplesTree.innerHTML = `<div class="error-message">Error loading samples: ${error.message}</div>`;
                        }
                    });
            }

            // Preload all samples in a directory structure
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

            let samplesCache = null;

            async function loadSamplesDirectory() {
                try {
                    const response = await fetch('/samples');
                    if (!response.ok) throw new Error('Failed to load samples');
                    samplesCache = await response.json();
                    renderSamplesTree(samplesCache);
                } catch (error) {
                    console.error('Error loading samples:', error);
                    document.querySelector('.samples-tree').innerHTML = 
                        '<div class="error-message">Error loading samples directory</div>';
                }
            }

            // Count the total number of sample files
            function countSamples(items) {
                let count = 0;
                items.forEach(item => {
                    if (item.type === 'file') {
                        count++;
                    } else if (item.type === 'directory' && item.children) {
                        count += countSamples(item.children);
                    }
                });
                return count;
            }

            function renderSamplesTree(items, container) {
                items.forEach(item => {
                    if (item.type === 'directory') {
                        const dirElement = document.createElement('div');
                        dirElement.className = 'directory-item';
                        dirElement.innerHTML = `
                            <div class="directory-name">
                                <span class="directory-icon">📁</span>
                                <span>${item.name}</span>
                            </div>
                            <div class="directory-children"></div>
                        `;
                        
                        const nameEl = dirElement.querySelector('.directory-name');
                        const childrenEl = dirElement.querySelector('.directory-children');
                        
                        nameEl.addEventListener('click', () => {
                            childrenEl.classList.toggle('open');
                            if (childrenEl.classList.contains('open') && item.children && !childrenEl.children.length) {
                                renderSamplesTree(item.children, childrenEl);
                            }
                        });
                        
                        container.appendChild(dirElement);
                    } else {
                        const fileElement = document.createElement('div');
                        fileElement.className = 'file-item';
                        fileElement.innerHTML = `
                            <span class="file-icon">${item.extension === '.wav' ? '🔊' : '🎵'}</span>
                            <span>${item.name}</span>
                        `;
                        
                        fileElement.addEventListener('click', () => {
                            loadSampleForPreview(item);
                        });
                        
                        container.appendChild(fileElement);
                    }
                });
            }

            function loadSampleForPreview(item) {
                const samplesPreview = document.querySelector('.samples-preview');
                if (!samplesPreview) return;
            
                // Create preview elements if they don't exist
                if (!samplesPreview.querySelector('#sample-preview')) {
                    samplesPreview.innerHTML = `
                        <div class="sample-info">
                            <span class="sample-path"></span>
                            <button class="copy-path-btn" title="Copy sample name to clipboard">📋</button>
                        </div>
                        <audio id="sample-preview" controls></audio>
                    `;
                    
                    // Add copy button functionality
                    samplesPreview.querySelector('.copy-path-btn').addEventListener('click', () => {
                        const path = samplesPreview.querySelector('.sample-path').textContent;
                        if (path) {
                            // Extract just the filename without extension for use with the sample command
                            const sampleName = path.split('/').pop().replace(/\.[^.]+$/, '');
                            navigator.clipboard.writeText(sampleName);
                            logToConsole(`Copied sample name: ${sampleName}`, "info");
                        }
                    });
                }

                // Function to get a clean sample name from a path
                function getSampleNameFromPath(path) {
                    // Remove the extension
                    const nameWithoutExt = path.split('/').pop().replace(/\.[^.]+$/, '');
                    
                    // Return just the base file name, no path
                    return nameWithoutExt;
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
            
                const preview = samplesPreview.querySelector('#sample-preview');
                const pathDisplay = samplesPreview.querySelector('.sample-path');
                
                if (preview && pathDisplay) {
                    preview.src = item.path;
                    pathDisplay.textContent = item.path;
                    
                    // Also load this sample into the SoundScript interpreter
                    loadSampleIntoSoundScript(item);
                }
            }

            // Add copy button functionality
            document.querySelector('.copy-path-btn')?.addEventListener('click', () => {
                const path = document.querySelector('.sample-path').textContent;
                if (path) {
                    navigator.clipboard.writeText(path)
                        .then(() => {
                            logToConsole('Sample path copied to clipboard', 'success');
                        })
                        .catch(err => {
                            logToConsole('Failed to copy path', 'error');
                        });
                }
            });

            // Load samples when the samples tab is clicked
            // Add this function to load samples when the tab is clicked
            document.querySelector('[data-tab="samples"]').addEventListener('click', async () => {
                try {
                    console.log('Loading samples...');
                    const response = await fetch('/api/samples');
                    
                    if (!response.ok) {
                        throw new Error('Failed to load samples');
                    }
                    
                    const structure = await response.json();
                    console.log('Samples structure:', structure);
                    
                    const samplesTree = document.querySelector('.samples-tree');
                    if (!samplesTree) {
                        console.error('Samples tree element not found');
                        return;
                    }
                    
                    renderSamplesTree(structure);
                    logToConsole('Samples loaded successfully', 'success');
                } catch (error) {
                    console.error('Error loading samples:', error);
                    const samplesTree = document.querySelector('.samples-tree');
                    if (samplesTree) {
                        samplesTree.innerHTML = `<div class="error-message">Error loading samples: ${error.message}</div>`;
                    }
                    logToConsole(`Error loading samples: ${error.message}`, 'error');
                }
            });

            
            // Call the function on startup
            loadSamplesOnStartup();

            // Reset the file input for future uploads
            event.target.value = '';
        });

        // Tab system
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to current tab
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });

        // Add a preload button to the samples tab
        const samplesTab = document.querySelector('.tab-content#samples-tab');
        if (samplesTab) {
            const preloadButton = document.createElement('button');
            preloadButton.textContent = '🔄 Preload All Samples';
            preloadButton.className = 'primary-btn';
            preloadButton.style.marginTop = '10px';
            preloadButton.addEventListener('click', () => {
                fetch('/api/samples')
                    .then(response => response.json())
                    .then(data => {
                        logToConsole("Preloading all samples...", "info");
                        preloadSamples(data);
                    })
                    .catch(error => {
                        logToConsole(`Error preloading samples: ${error.message}`, "error");
                    });
            });
            samplesTab.querySelector('.samples-container').appendChild(preloadButton);
        }

        // Functions

        function addSampleToList(name, sample) {
            const sampleItem = document.createElement('div');
            sampleItem.className = 'sample-item';
            sampleItem.innerHTML = `
                <span>${name}</span>
                <button class="play-sample" data-sample="${name}" data-playing="false">▶</button>
            `;
        
            // Add to list
            samplesList.appendChild(sampleItem);
        
            // Track active players
            if (!window.activePreviewPlayers) {
                window.activePreviewPlayers = new Map();
            }
        
            // Add event listener to play button
            const playButton = sampleItem.querySelector('.play-sample');
            playButton.addEventListener('click', () => {
                const isPlaying = playButton.getAttribute('data-playing') === 'true';
        
                // Stop all other playing samples first
                stopAllPreviews(name);
        
                if (isPlaying) {
                    // Stop this sample
                    if (window.activePreviewPlayers.has(name)) {
                        const player = window.activePreviewPlayers.get(name);
                        player.stop();
                        window.activePreviewPlayers.delete(name);
                    }
                    playButton.textContent = '▶';
                    playButton.setAttribute('data-playing', 'false');
                } else {
                    // Play this sample
                    if (soundScript.samples[name] && soundScript.samples[name].buffer) {
                        const player = new Tone.Player(soundScript.samples[name].buffer);
                        player.connect(soundScript.masterCompressor);
                        
                        // Store the player reference
                        window.activePreviewPlayers.set(name, player);
                        
                        // Start playback
                        player.start();
                        playButton.textContent = '■';
                        playButton.setAttribute('data-playing', 'true');
        
                        // Auto-stop when finished
                        player.onstop = () => {
                            window.activePreviewPlayers.delete(name);
                            playButton.textContent = '▶';
                            playButton.setAttribute('data-playing', 'false');
                        };
                    }
                }
            });
        }

        function stopAllPreviews(exceptName = null) {
            if (!window.activePreviewPlayers) return;
        
            for (const [name, player] of window.activePreviewPlayers.entries()) {
                if (name !== exceptName) {
                    player.stop();
                    window.activePreviewPlayers.delete(name);
                    
                    // Reset the button state
                    const button = document.querySelector(`.play-sample[data-sample="${name}"]`);
                    if (button) {
                        button.textContent = '▶';
                        button.setAttribute('data-playing', 'false');
                    }
                }
            }
        }

        // Log to console with color coding
        function logToConsole(message, type = 'info') {
            const logItem = document.createElement('div');
            logItem.className = `log log-${type}`;
            logItem.textContent = message;

            consoleOutput.appendChild(logItem);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;

            // Limit number of log items to prevent memory issues
            if (consoleOutput.children.length > 100) {
                consoleOutput.removeChild(consoleOutput.firstChild);
            }
        }

        // Resize both canvases
        function resizeCanvases() {
            waveformCanvas.width = waveformCanvas.offsetWidth;
            waveformCanvas.height = waveformCanvas.offsetHeight;
            frequencyCanvas.width = frequencyCanvas.offsetWidth;
            frequencyCanvas.height = frequencyCanvas.offsetHeight;
        }

        // Draw visualizers
        function drawVisualizer() {
            if (soundScript && soundScript.isPlaying) {
                window.visualizerAnimationFrame = requestAnimationFrame(drawVisualizer);
                
                // Draw waveform
                const waveform = soundScript.getWaveform();
                if (waveform && waveform.length) {
                    drawWaveform(waveform, waveformCanvas, waveformCtx);
                }
                
                // Draw frequency
                const frequency = soundScript.getFrequency();
                if (frequency && frequency.length) {
                    drawFrequency(frequency, frequencyCanvas, frequencyCtx);
                }
            } else {
                // Clear the canvases when not playing
                waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
                frequencyCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
                
                // Stop animation loop
                if (window.visualizerAnimationFrame) {
                    cancelAnimationFrame(window.visualizerAnimationFrame);
                    window.visualizerAnimationFrame = null;
                }
            }
        }

        // Random color generator
        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }

        waveformCanvas.dataset.color = getRandomColor();
        frequencyCanvas.dataset.color = getRandomColor();

        // Add click handlers for visualizers
        waveformCanvas.addEventListener('click', () => {
            waveformCanvas.dataset.color = getRandomColor();
        });

        frequencyCanvas.addEventListener('click', () => {
            frequencyCanvas.dataset.color = getRandomColor();
        });

        // Waveform drawing function
        function drawWaveform(waveform, canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = canvas.dataset.color || 'var(--primary)';
            ctx.beginPath();
            
            const sliceWidth = canvas.width / waveform.length;
            let x = 0;
            
            for (let i = 0; i < waveform.length; i++) {
                const v = waveform[i] / 2 + 0.5;
                const y = (1 - v) * canvas.height;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }

        // Frequency spectrum drawing function
        function drawFrequency(frequency, canvas, ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = canvas.width / frequency.length;
            const heightScale = canvas.height / 255;
            
            ctx.fillStyle = canvas.dataset.color || 'var(--primary)';
            
            for (let i = 0; i < frequency.length; i++) {
                const value = frequency[i] + 140;
                const percent = value / 255;
                const height = percent * canvas.height;
                const offset = canvas.height - height;
                
                const barHeight = Math.max(height * Math.log10((i + 1) / frequency.length * 9 + 1), 1);
                
                ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
            }
        }

        // Processor visualizer functions
        function updateProcessorVisualizers() {
            if (!soundScript || !soundScript.isPlaying) return;
            
            // Update compressor visualizer
            if (compressorEnabled.checked) {
                // Get the actual reduction value from the compressor
                const reduction = soundScript.getCompressorReduction();
                updateReductionMeter('compressor', reduction);
                
                // Update compressor graph visualization
                const threshold = parseFloat(compressorThreshold.value);
                const ratio = parseFloat(compressorRatio.value);
                
                // Position threshold line based on current setting
                const thresholdPosition = (1 - (Math.abs(threshold) / 60)) * 100; // Scale -60 to 0 dB to 100-0%
                document.querySelector('#compressor-graph .threshold-line').style.top = `${thresholdPosition}%`;
                
                // Update ratio line angle
                const angle = -Math.atan(1/ratio) * (180/Math.PI);
                document.querySelector('#compressor-graph .ratio-line').style.transform = 
                    `rotate(${angle}deg) translateY(-50%)`;
                
                // Visualize signal level based on actual activity
                const signalEl = document.querySelector('#compressor-graph .processor-signal');
                signalEl.classList.add('active');
                
                // Set the signal height - more reduction = higher apparent signal level
                // since reduction means there was a high signal that triggered the compressor
                if (reduction > 0.5) {
                    // Calculate height - at least 30%, at most 95%, and scales with reduction value
                    const randomHeight = Math.max(30, Math.min(95, 50 + Math.random() * 10 + reduction * 5));
                    signalEl.style.height = `${randomHeight}%`;
                } else {
                    // Random movement when there's little reduction for visual interest
                    const lowActivityHeight = 30 + Math.random() * 15;
                    signalEl.style.height = `${lowActivityHeight}%`;
                }
            } else {
                // Reset when disabled
                document.querySelector('#compressor-meter .reduction-bar').style.width = '0%';
                document.querySelector('#compressor-meter .reduction-value').textContent = '0 dB';
                document.querySelector('#compressor-graph .processor-signal').classList.remove('active');
            }
            
            // Update limiter visualizer
            if (limiterEnabled.checked) {
                // Get the actual reduction value from the limiter
                const reduction = soundScript.getLimiterReduction();
                updateReductionMeter('limiter', reduction);
                
                // Update limiter graph visualization
                const threshold = parseFloat(limiterThreshold.value);
                
                // Position threshold line based on current setting
                const thresholdPosition = (1 - (Math.abs(threshold) / 60)) * 100; // Scale -60 to 0 dB to 100-0%
                document.querySelector('#limiter-graph .threshold-line').style.top = `${thresholdPosition}%`;
                
                // Visualize signal level based on actual limiting activity
                const signalEl = document.querySelector('#limiter-graph .processor-signal');
                signalEl.classList.add('active');
                
                // Set the signal height - more reduction = higher apparent signal level
                // with a sharper response as the limiter is more aggressive
                if (reduction > 0.1) {
                    // Calculate height - at least 30%, at most 95%, and scales more aggressively with reduction
                    const limitedHeight = Math.max(30, Math.min(95, 60 + reduction * 15));
                    signalEl.style.height = `${limitedHeight}%`;
                } else {
                    // Random movement when there's little reduction for visual interest
                    const lowActivityHeight = 30 + Math.random() * 15;
                    signalEl.style.height = `${lowActivityHeight}%`;
                }
            } else {
                // Reset when disabled
                document.querySelector('#limiter-meter .reduction-bar').style.width = '0%';
                document.querySelector('#limiter-meter .reduction-value').textContent = '0 dB';
                document.querySelector('#limiter-graph .processor-signal').classList.remove('active');
            }
            
            // Schedule next update
            setTimeout(updateProcessorVisualizers, 50); // Update more frequently for smoother animation
        }

        // Update a reduction meter with the current reduction value
        function updateReductionMeter(type, reduction) {
            // Normalize reduction to percentage (usually 0-20dB range)
            const percentage = Math.min(100, (reduction / 20) * 100);
            
            // Update the meter
            document.querySelector(`#${type}-meter .reduction-bar`).style.width = `${percentage}%`;
            document.querySelector(`#${type}-meter .reduction-value`).textContent = 
                `${reduction.toFixed(1)} dB`;
        }

        // Function to populate the examples list from examples.js
        function populateExamples() {
            try {
                console.log("Attempting to populate examples...");
                
                // Debug: Check if SoundScriptExamples is available and in what form
                console.log("SoundScriptExamples in global scope:", typeof window.SoundScriptExamples);
                console.log("Examples collection:", window.SoundScriptExamples?.examples);
                
                if (!window.SoundScriptExamples || !window.SoundScriptExamples.examples) {
                    console.error("SoundScriptExamples not found or missing examples");
                    
                    // Create a simple placeholder example if missing
                    window.SoundScriptExamples = {
                        examples: [{
                            name: "Basic Example",
                            filename: "basic.ss",
                            description: "A simple example to get started with SoundScript.",
                            content: `// Basic SoundScript Example
                                
        melody:
        volume 80
        reverb 0.3 0.7 1.0 0.1
        
        tone c4 0.5
        wait 0.5
        tone e4 0.5
        wait 0.5
        tone g4 0.5
        wait 0.5
        tone c5 1
        wait 1
        end melody

        main:
        bpm 120
        play melody
        
        waitforfinish
        end main`
                        }],
                        getAll() {
                            return this.examples;
                        },
                        getByFilename(filename) {
                            return this.examples.find(example => example.filename === filename);
                        }
                    };
                    
                    logToConsole("Using fallback example", "warn");
                }
                
                // Get all examples from SoundScriptExamples
                const examples = window.SoundScriptExamples.getAll();
                
                // Log the number of examples for debugging
                console.log(`Found ${examples.length} examples`);
                
                // Clear loading message
                examplesList.innerHTML = '';
                
                // Add each example to the list
                examples.forEach(example => {
                    const exampleItem = document.createElement('div');
                    exampleItem.className = 'example-item';
                    exampleItem.innerHTML = `
                        <div class="example-info">
                            <span class="example-name">${example.name}</span>
                            <span class="example-description">${example.description}</span>
                        </div>
                        <button class="load-example-btn" data-filename="${example.filename}">Load</button>
                    `;
                    
                    examplesList.appendChild(exampleItem);
                    
                    // Add click handler for the load button
                    exampleItem.querySelector('.load-example-btn').addEventListener('click', () => {
                        loadExampleByFilename(example.filename);
                    });
                });
                
                logToConsole(`Loaded ${examples.length} examples successfully`, "success");
                
            } catch (error) {
                logToConsole(`Error loading examples: ${error.message}`, "error");
                console.error("Full error:", error);
                examplesList.innerHTML = '<div class="loading-message">Error loading examples: ' + error.message + '</div>';
            }
        }

        // Function to load an example by filename
        function loadExampleByFilename(filename) {
            try {
                // Get the example from SoundScriptExamples
                const example = SoundScriptExamples.getByFilename(filename);
                
                if (!example) {
                    logToConsole(`Example '${filename}' not found`, "error");
                    return;
                }
                
                // Set the editor content
                editor.setValue(example.content);
                
                // Update the current file info
                currentFile.name = example.filename;
                currentFile.saved = true;
                updateFileInfo();
                
                logToConsole(`Loaded example: ${example.name}`, "success");
            } catch (error) {
                logToConsole(`Error loading example: ${error.message}`, "error");
                console.error(error);
            }
        }

        // Initialize the examples list when the examples tab is clicked
        document.querySelector('[data-tab="examples"]').addEventListener('click', () => {
            logToConsole("Examples tab clicked", "info");
            
            // Clear any previous error message
            if (examplesList.innerHTML.includes('Error loading examples')) {
                examplesList.innerHTML = '<div class="loading-message">Loading examples...</div>';
            }
            
            // Try to populate the examples list
            setTimeout(() => {
                populateExamples();
            }, 100);
        });

        // Handle window resize
        window.addEventListener('resize', resizeCanvases);

        // Initialize with default values
        updateCompressor();
        updateLimiter();

        // Log startup message
        logToConsole('SoundScript ready! Click "Generate & Play" to start.', 'success');

        try {
            // Attempt to populate examples list on startup
            if (window.SoundScriptExamples) {
                populateExamples();
                logToConsole("Examples loaded on startup", "info");
            }

            // Initialize the full documentation modal
            initDocumentationModal();
        } catch (e) {
            console.error("Error pre-loading examples:", e);
        }
    }

    // Initialize keyword help
    function initKeywordHelp(editor) {
        // Debug if keywords are loaded
        debugKeywordsLoading();

        // Get reference to help elements
        const helpContent = document.getElementById('help-content');
        const helpBox = document.getElementById('keyword-help');
        
        // Check if help elements exist
        if (!helpContent || !helpBox) {
            console.error('Help elements not found in DOM!');
            return;
        }
        
        // Track cursor position
        editor.on('cursorActivity', () => {
            // Get current position
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line) || '';
            
            // Skip if line is empty or starts with comment
            if (!line || line.trim().startsWith('//')) {
                helpContent.innerHTML = '<p class="help-placeholder">Type a command to see its documentation</p>';
                return;
            }
        
            // Get the first word on the line for command context
            const firstWord = line.trim().split(/\s+/)[0] || '';
            
            // Get the current word under cursor
            const currentWord = getCurrentWord(editor, cursor);
        
            // Try to find matching command for current word first
            const currentWordMatch = findMatchingCommand(currentWord);
            
            if (currentWordMatch) {
                // Show help for current word if it matches a command
                showKeywordHelp(currentWordMatch, helpContent);
            } else {
                // If current word doesn't match, try the first word on the line
                const firstWordMatch = findMatchingCommand(firstWord);
                if (firstWordMatch) {
                    showKeywordHelp(firstWordMatch, helpContent);
                } else {
                    helpContent.innerHTML = '<p class="help-placeholder">No matching command found</p>';
                }
            }
        });
        
        // Initialize help button and modal
        const helpButton = document.getElementById('help-button');
        const helpModal = document.getElementById('help-modal');
        const closeModal = document.querySelector('.close-modal');
        
        // Check if modal elements exist
        if (!helpButton || !helpModal || !closeModal) {
            console.error('Modal elements not found in DOM!');
            console.log('helpButton:', helpButton);
            console.log('helpModal:', helpModal);
            console.log('closeModal:', closeModal);
            return;
        }
        
        // Show modal when help button is clicked
        helpButton.addEventListener('click', () => {
            helpModal.style.display = 'block';
        });
        
        // Close modal when X is clicked
        closeModal.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
        
        // Close modal when clicking outside the content
        window.addEventListener('click', (event) => {
            if (event.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }

    function getCurrentWord(editor, cursor) {
        const line = editor.getLine(cursor.line);
        let start = cursor.ch;
        let end = cursor.ch;
    
        // Find start of word
        while (start > 0 && /[\w]/.test(line.charAt(start - 1))) {
            start--;
        }
    
        // Find end of word
        while (end < line.length && /[\w]/.test(line.charAt(end))) {
            end++;
        }
    
        return line.slice(start, end);
    }

    function findMatchingCommand(partial) {
        if (!window.SoundScriptKeywords) return null;
    
        const allKeywords = [
            ...SoundScriptKeywords.commands,
            ...SoundScriptKeywords.blocks
        ];
    
        // Find first command that starts with the partial word
        return allKeywords.find(keyword => 
            keyword.toLowerCase().startsWith(partial.toLowerCase())
        );
    }

    // Debug function to check keyword loading
    function debugKeywordsLoading() {
        console.log('SoundScriptKeywords loaded:', !!window.SoundScriptKeywords);
        
        if (window.SoundScriptKeywords) {
            console.log('Documentation properties:', Object.keys(window.SoundScriptKeywords.documentation || {}));
            console.log('Block keywords:', window.SoundScriptKeywords.blocks || []);
        } else {
            console.warn('SoundScriptKeywords not loaded yet, attempting to reload');
            
            // Try to load keywords.js again if needed
            const keywordsScript = document.createElement('script');
            keywordsScript.src = "keywords.js";
            keywordsScript.onload = () => {
                console.log('Keywords loaded:', !!window.SoundScriptKeywords);
                if (window.SoundScriptKeywords) {
                    console.log('Documentation loaded with properties:', 
                        Object.keys(window.SoundScriptKeywords.documentation || {}));
                }
            };
            document.head.appendChild(keywordsScript);
        }
    }

    // Show help for a specific keyword
    function showKeywordHelp(keyword, helpContent) {
        // Handle the case when helpContent doesn't exist
        if (!helpContent) {
            console.error('Help content element not found!');
            return;
        }
        
        // If we don't have SoundScriptKeywords loaded, show a message
        if (!window.SoundScriptKeywords) {
            helpContent.innerHTML = '<p>Loading keyword documentation...</p>';
            return;
        }
        
        try {
            // Check if this is a documented command
            if (SoundScriptKeywords.documentation && SoundScriptKeywords.documentation[keyword]) {
                const doc = SoundScriptKeywords.documentation[keyword];
                
                let html = `<div class="help-keyword">${keyword}</div>`;
                
                // Add syntax
                html += `<div class="help-syntax">${doc.syntax}</div>`;
                
                // Add alternative syntax if available
                if (doc.alternativeSyntax) {
                    html += `<div class="help-syntax">${doc.alternativeSyntax}</div>`;
                }
                
                // Add description
                html += `<div class="help-description">${doc.description}</div>`;
                
                // Add examples if available
                if (doc.examples && doc.examples.length > 0) {
                    html += `<div class="help-examples">Examples:</div>`;
                    doc.examples.forEach(example => {
                        html += `<div class="help-example">${example}</div>`;
                    });
                    
                    html += '</div>';
                }
                
                helpContent.innerHTML = html;
            } 
            // Check if it's a block keyword
            else if (SoundScriptKeywords.blocks && SoundScriptKeywords.blocks.includes(keyword)) {
                helpContent.innerHTML = `
                    <div class="help-keyword">${keyword}</div>
                    <div class="help-syntax">${keyword}:</div>
                    <div class="help-description">Defines a sound block that can contain commands and be played.</div>
                    <div class="help-example">${keyword}:
    volume 80
    tone c4 0.5
    wait 0.5
    end ${keyword}</div>
                </div>
                `;
            } else {
                // Not a documented keyword
                helpContent.innerHTML = `<p>No documentation available for "${keyword}"</p>`;
            }
        } catch (error) {
            console.error('Error showing keyword help:', error);
            helpContent.innerHTML = '<p>Error loading help content</p>';
        }
    }

    // Initialize the full documentation modal
    function initDocumentationModal() {
        // Get references to DOM elements
        const commandList = document.getElementById('command-list');
        const searchInput = document.getElementById('command-search');
        
        // Check if elements exist
        if (!commandList || !searchInput) {
            console.error('Documentation modal elements not found!', {
                commandList: !!commandList,
                searchInput: !!searchInput
            });
            return;
        }
        
        // Check if we have SoundScriptKeywords loaded
        if (!window.SoundScriptKeywords || !window.SoundScriptKeywords.documentation) {
            console.error('SoundScriptKeywords not loaded or missing documentation!');
            commandList.innerHTML = '<p>Documentation not available. Please reload the page.</p>';
            return;
        }
        
        // Generate the command cards for all documented commands
        function generateCommandCards(filter = '') {
            try {
                commandList.innerHTML = '';
                
                // Get all command names
                const commands = Object.keys(SoundScriptKeywords.documentation);
                
                // Filter commands if a search term is provided
                const filteredCommands = filter 
                    ? commands.filter(cmd => cmd.toLowerCase().includes(filter.toLowerCase()))
                    : commands;
                
                // Generate a card for each command
                filteredCommands.forEach(cmd => {
                    const doc = SoundScriptKeywords.documentation[cmd];
                    
                    const card = document.createElement('div');
                    card.className = 'command-card';
                    
                    let cardHTML = `<div class="command-name">${cmd}</div>`;
                    
                    // Add syntax
                    cardHTML += `<div class="help-syntax">${doc.syntax}</div>`;
                    
                    // Add alternative syntax if available
                    if (doc.alternativeSyntax) {
                        cardHTML += `<div class="help-syntax">${doc.alternativeSyntax}</div>`;
                    }
                    
                    // Add description
                    cardHTML += `<div class="command-description">${doc.description}</div>`;
                    
                    // Add examples if available
                    if (doc.examples && doc.examples.length > 0) {
                        cardHTML += `<div class="help-examples">Examples:</div>`;
                        doc.examples.forEach(example => {
                            cardHTML += `<div class="help-example">${example}</div>`;
                        });
                    }
                    
                    card.innerHTML = cardHTML;
                    commandList.appendChild(card);
                });
                
                // Add block definitions
                if (!filter || 'block'.includes(filter.toLowerCase())) {
                    const blockCard = document.createElement('div');
                    blockCard.className = 'command-card';
                    
                    blockCard.innerHTML = `
                        <div class="command-name">Block Definitions</div>
                        <div class="help-syntax">blockname:</div>
                        <div class="command-description">Defines a sound block that can contain commands and be played.</div>
                        <div class="help-examples">Examples:</div>
                        <div class="help-example">bass:
    volume 80
    tone c4 0.5
    wait 0.5
    end bass</div>
                    `;
                    
                    commandList.appendChild(blockCard);
                }
                
                // Show a message if no commands match the filter
                if (filteredCommands.length === 0 && (!filter || !'block'.includes(filter.toLowerCase()))) {
                    commandList.innerHTML = '<p>No commands found matching your search.</p>';
                }
            } catch (error) {
                console.error('Error generating command cards:', error);
                commandList.innerHTML = '<p>Error generating documentation. Please check the console for details.</p>';
            }
        }
        
        // Initialize with all commands
        generateCommandCards();
        
        // Update when search input changes
        searchInput.addEventListener('input', () => {
            generateCommandCards(searchInput.value);
        });
        
        console.log('Documentation modal initialized successfully!');
    }
});

// WAV file export utility function
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

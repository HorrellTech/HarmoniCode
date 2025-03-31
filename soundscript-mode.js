// Custom mode for CodeMirror to highlight SoundScript syntax
(function (mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function (CodeMirror) {
    "use strict";

    // Import keywords from keywords.js if available
    let keywords = [];
    let blockKeywords = [];

    if (typeof SoundScriptKeywords !== 'undefined') {
        keywords = SoundScriptKeywords.commands || [];
        blockKeywords = SoundScriptKeywords.blocks || [];
    }

    CodeMirror.defineMode("soundscript", function () {
        return {
            startState: function () {
                return {
                    inComment: false,
                    inBlockHeader: false,
                    inBlockBody: false,
                    currentBlock: null
                };
            },

            token: function (stream, state) {
                // Handle comments
                if (stream.match("//")) {
                    stream.skipToEnd();
                    return "comment";
                }

                // Skip whitespace
                if (stream.eatSpace()) return null;

                // Check for block definition (e.g., "bass:")
                if (stream.match(/\w+\s*:/, false)) {
                    let blockName = stream.match(/\w+/)[0];
                    stream.match(/\s*:/);
                    state.inBlockHeader = true;
                    state.currentBlock = blockName;

                    if (blockKeywords.includes(blockName)) {
                        return "def";
                    }
                    return "variable-2";
                }

                // Check for end block statement
                if (stream.match(/end\s+\w+/, false)) {
                    stream.match("end");
                    stream.eatSpace();
                    let blockName = stream.match(/\w+/)[0];
                    state.inBlockBody = false;
                    state.currentBlock = null;

                    if (blockKeywords.includes(blockName)) {
                        return "keyword";
                    }
                    return "variable";
                }

                // Check for commands
                let word = stream.match(/\w+/);
                if (word) {
                    word = word[0];
                    if (keywords.includes(word)) {
                        return "keyword";
                    }

                    // Check for note names (e.g., c4, a#3, etc.)
                    if (word.match(/^[a-gA-G][#b]?[0-9]$/)) {
                        return "string-2";
                    }

                    return "variable";
                }

                // Handle numbers (frequencies, durations, etc.)
                if (stream.match(/\d+(\.\d+)?/)) {
                    return "number";
                }

                // Move forward one character if nothing else matched
                stream.next();
                return null;
            }
        };
    });

    CodeMirror.defineMIME("text/x-soundscript", "soundscript");
});

/**
 * Text-to-Speech Utility
 * Auto-attaches to any element with class "tts-target" and renders
 * controls into the nearest ".tts-controls" container.
 *
 * Usage in HTML:
 *   <div id="my-output" class="tts-target">Some text...</div>
 *   <div class="tts-controls" data-target="my-output"></div>
 *   <script src="js/tts.js"></script>
 */
(function () {
    'use strict';

    const synth = window.speechSynthesis;

    if (!synth) {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.tts-controls').forEach(el => {
                el.innerHTML = '<p class="tts-unavailable">Text-to-speech is not supported in this browser.</p>';
            });
        });
        return;
    }

    let voices = [];
    let currentUtterance = null;
    let isPaused = false;

    function loadVoices() {
        voices = synth.getVoices().filter(v => v.lang.startsWith('en'));
        // Some browsers fire onvoiceschanged asynchronously
        document.querySelectorAll('.tts-voice-select').forEach(sel => populateVoiceSelect(sel));
    }

    synth.addEventListener('voiceschanged', loadVoices);

    function populateVoiceSelect(sel) {
        const current = sel.value;
        sel.innerHTML = '';
        const allVoices = synth.getVoices().filter(v => v.lang.startsWith('en'));
        allVoices.forEach((v, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${v.name} (${v.lang})`;
            if (v.default) opt.selected = true;
            sel.appendChild(opt);
        });
        if (current) sel.value = current;
    }

    function getTargetText(targetId) {
        const el = document.getElementById(targetId);
        if (!el) return '';
        return (el.innerText || el.textContent || '').trim();
    }

    function buildControls(container) {
        const targetId = container.dataset.target;

        container.innerHTML = `
            <div class="tts-bar" role="group" aria-label="Text-to-speech controls">
                <button class="tts-play-btn" aria-label="Read text aloud" title="Read Aloud">
                    &#9654; Read Aloud
                </button>
                <button class="tts-pause-btn" aria-label="Pause reading" title="Pause" disabled>
                    &#9646;&#9646; Pause
                </button>
                <button class="tts-stop-btn" aria-label="Stop reading" title="Stop" disabled>
                    &#9632; Stop
                </button>
                <div class="tts-rate-group">
                    <label for="tts-rate-${targetId}" class="tts-label">Speed:</label>
                    <select id="tts-rate-${targetId}" class="tts-rate-select" aria-label="Reading speed">
                        <option value="0.6">Slow</option>
                        <option value="0.85">Slower</option>
                        <option value="1" selected>Normal</option>
                        <option value="1.3">Faster</option>
                        <option value="1.6">Fast</option>
                    </select>
                </div>
                <div class="tts-voice-group">
                    <label for="tts-voice-${targetId}" class="tts-label">Voice:</label>
                    <select id="tts-voice-${targetId}" class="tts-voice-select" aria-label="Select voice"></select>
                </div>
            </div>`;

        const playBtn = container.querySelector('.tts-play-btn');
        const pauseBtn = container.querySelector('.tts-pause-btn');
        const stopBtn = container.querySelector('.tts-stop-btn');
        const rateSelect = container.querySelector('.tts-rate-select');
        const voiceSelect = container.querySelector('.tts-voice-select');

        populateVoiceSelect(voiceSelect);

        function setButtonStates(speaking) {
            playBtn.disabled = speaking;
            pauseBtn.disabled = !speaking;
            stopBtn.disabled = !speaking;
            if (speaking) {
                playBtn.textContent = '\u25B6 Read Aloud';
            }
        }

        playBtn.addEventListener('click', () => {
            synth.cancel();
            isPaused = false;

            const text = getTargetText(targetId);
            if (!text || text.includes('will appear here')) return;

            const allVoices = synth.getVoices().filter(v => v.lang.startsWith('en'));
            currentUtterance = new SpeechSynthesisUtterance(text);
            currentUtterance.rate = parseFloat(rateSelect.value);
            if (allVoices[voiceSelect.value]) {
                currentUtterance.voice = allVoices[voiceSelect.value];
            }

            currentUtterance.onstart = () => setButtonStates(true);
            currentUtterance.onend = () => {
                setButtonStates(false);
                isPaused = false;
                // Remove any word highlights
                const target = document.getElementById(targetId);
                if (target && target.dataset.originalContent) {
                    target.innerHTML = target.dataset.originalContent;
                    delete target.dataset.originalContent;
                }
            };
            currentUtterance.onerror = () => setButtonStates(false);

            // Word-by-word highlighting using onboundary
            const target = document.getElementById(targetId);
            if (target) {
                target.dataset.originalContent = target.innerHTML;
                // Wrap words in spans for highlighting
                const words = text.split(/(\s+)/);
                let charOffset = 0;
                const spans = words.map(w => {
                    const start = charOffset;
                    charOffset += w.length;
                    if (!w.trim()) return w.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                    return `<span class="tts-word" data-start="${start}" data-end="${charOffset}">${w.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>`;
                });
                target.innerHTML = spans.join('');

                currentUtterance.onboundary = (e) => {
                    if (e.name !== 'word') return;
                    target.querySelectorAll('.tts-word').forEach(el => el.classList.remove('tts-current'));
                    const charIdx = e.charIndex;
                    const matching = Array.from(target.querySelectorAll('.tts-word'))
                        .find(el => parseInt(el.dataset.start) <= charIdx && parseInt(el.dataset.end) > charIdx);
                    if (matching) {
                        matching.classList.add('tts-current');
                        matching.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    }
                };
            }

            synth.speak(currentUtterance);
        });

        pauseBtn.addEventListener('click', () => {
            if (isPaused) {
                synth.resume();
                isPaused = false;
                pauseBtn.innerHTML = '&#9646;&#9646; Pause';
                pauseBtn.setAttribute('aria-label', 'Pause reading');
            } else {
                synth.pause();
                isPaused = true;
                pauseBtn.innerHTML = '&#9654; Resume';
                pauseBtn.setAttribute('aria-label', 'Resume reading');
            }
        });

        stopBtn.addEventListener('click', () => {
            synth.cancel();
            isPaused = false;
            setButtonStates(false);
            const target = document.getElementById(targetId);
            if (target && target.dataset.originalContent) {
                target.innerHTML = target.dataset.originalContent;
                delete target.dataset.originalContent;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadVoices();
        document.querySelectorAll('.tts-controls').forEach(container => {
            if (container.dataset.target) buildControls(container);
        });
    });
})();

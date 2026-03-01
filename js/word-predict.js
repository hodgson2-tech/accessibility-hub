/**
 * Word Prediction / Auto-suggest Utility
 * Auto-attaches to all <textarea> elements on the page.
 * Shows up to 5 common English word completions as the user types.
 * Navigate suggestions with Arrow keys, select with Enter or Tab, dismiss with Escape.
 */
(function () {
    'use strict';

    // ~400 most common and educationally relevant English words
    const WORDS = ('the be to of and a in that have it for not on with he as you do at this ' +
        'but his by from they we say her she or an will my one all would there their what so ' +
        'up out if about who get which go me when make can like time no just him know take ' +
        'people into year your good some could them see other than then now look only come ' +
        'its over think also back after use two how our work first well way even new want ' +
        'because any these give day most us great need large often hand high place hold turn ' +
        'help put different away again off always those both each before side best keep world ' +
        'still next few never may every should while under home little set own change end open ' +
        'seem together yet let long since against must three through where much early same ' +
        'another night begin example without stand show head state lead school learn more below ' +
        'part order far face money study class until form food feet land boy once animal life ' +
        'enough took sometimes four above kind almost live page got earth move try picture play ' +
        'air letter mother answer found near plant last father trees city eyes light thought ' +
        'left along might close something hard paper group run important car mile walk white sea ' +
        'river carry book hear stop second later idea body music color sun question fish area ' +
        'mark horse problem complete room knew piece told usually friends easy heard red door ' +
        'sure top ship across today during short better however low hours black whole remember ' +
        'waves listen wind rock space covered fast several step morning passed true hundred ' +
        'pattern table north slowly map draw voice power town fine drive care rain eat road ' +
        'chance safe matter bring happen appear family behind already note felt government ' +
        'period start word words write written reading understand meaning sentence paragraph text ' +
        'explain describe compare contrast analyze evaluate argue support evidence reason cause ' +
        'effect result conclude summary conclusion introduction information significant relevant ' +
        'related therefore although despite student teacher homework assignment project research ' +
        'practice remember skill ability development progress believe include continue create ' +
        'speak read number between become process question answer where when because which ' +
        'different important possible actually probably really usually simply however therefore ' +
        'although meanwhile perhaps certainly definitely especially particularly generally ' +
        'recently previously currently following according regarding concerning throughout ' +
        'alongside together separate individual specific general particular various several ' +
        'certain similar different available necessary required essential common special ' +
        'language structure detail main point argument idea thought feeling opinion fact ' +
        'knowledge understanding experience question problem solution attempt success failure ' +
        'challenge opportunity change growth improve develop achieve complete finish begin start ' +
        'continue stop allow prevent support challenge describe explain identify define ' +
        'discuss consider suggest recommend conclude present introduce review assess evaluate').split(' ').filter(Boolean);

    // Deduplicate and sort
    const WORD_LIST = Array.from(new Set(WORDS)).sort();

    let dropdown = null;
    let activeTextarea = null;
    let selectedIndex = -1;

    function getCurrentWord(textarea) {
        const pos = textarea.selectionStart;
        const text = textarea.value.substring(0, pos);
        const m = text.match(/[a-zA-Z]+$/);
        return m ? m[0] : '';
    }

    function getSuggestions(prefix) {
        if (prefix.length < 2) return [];
        const lower = prefix.toLowerCase();
        return WORD_LIST.filter(w => w.startsWith(lower) && w.length > lower.length).slice(0, 5);
    }

    function createDropdown() {
        dropdown = document.createElement('div');
        dropdown.className = 'wp-dropdown';
        dropdown.setAttribute('role', 'listbox');
        dropdown.setAttribute('aria-label', 'Word suggestions');
        document.body.appendChild(dropdown);
    }

    function positionDropdown(textarea) {
        const rect = textarea.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        dropdown.style.left = (rect.left + scrollX) + 'px';
        dropdown.style.top = (rect.bottom + scrollY + 3) + 'px';
        dropdown.style.minWidth = Math.min(rect.width, 280) + 'px';
    }

    function showSuggestions(textarea, suggestions) {
        dropdown.innerHTML = '';
        selectedIndex = -1;

        suggestions.forEach((word, i) => {
            const item = document.createElement('div');
            item.className = 'wp-item';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            item.setAttribute('data-index', i);

            // Bold the matching prefix
            const prefix = getCurrentWord(textarea);
            item.innerHTML = `<strong>${word.slice(0, prefix.length)}</strong>${word.slice(prefix.length)}`;

            item.addEventListener('mousedown', e => {
                e.preventDefault();
                applySuggestion(textarea, word);
            });
            dropdown.appendChild(item);
        });

        positionDropdown(textarea);
        dropdown.style.display = 'block';
    }

    function hideDropdown() {
        if (dropdown) dropdown.style.display = 'none';
        selectedIndex = -1;
    }

    function applySuggestion(textarea, word) {
        const pos = textarea.selectionStart;
        const before = textarea.value.substring(0, pos);
        const after = textarea.value.substring(pos);
        const m = before.match(/[a-zA-Z]+$/);

        if (m) {
            const newBefore = before.substring(0, before.length - m[0].length) + word;
            textarea.value = newBefore + ' ' + after;
            textarea.selectionStart = textarea.selectionEnd = newBefore.length + 1;
        }

        hideDropdown();
        // Trigger input event so other listeners (e.g. live preview) pick up the change
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function attachToTextarea(textarea) {
        textarea.addEventListener('input', () => {
            const word = getCurrentWord(textarea);
            const suggestions = getSuggestions(word);
            if (suggestions.length > 0) {
                activeTextarea = textarea;
                showSuggestions(textarea, suggestions);
            } else {
                hideDropdown();
            }
        });

        textarea.addEventListener('keydown', e => {
            if (!dropdown || dropdown.style.display === 'none') return;
            const items = dropdown.querySelectorAll('.wp-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                items.forEach((item, i) => {
                    item.classList.toggle('wp-selected', i === selectedIndex);
                    item.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                items.forEach((item, i) => {
                    item.classList.toggle('wp-selected', i === selectedIndex);
                    item.setAttribute('aria-selected', i === selectedIndex ? 'true' : 'false');
                });
            } else if ((e.key === 'Enter' || e.key === 'Tab') && selectedIndex >= 0 && items[selectedIndex]) {
                e.preventDefault();
                applySuggestion(textarea, items[selectedIndex].textContent);
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        textarea.addEventListener('blur', () => {
            // Delay allows mousedown on suggestion to fire first
            setTimeout(hideDropdown, 160);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        createDropdown();
        document.querySelectorAll('textarea').forEach(attachToTextarea);
    });

    window.addEventListener('scroll', () => {
        if (activeTextarea && dropdown && dropdown.style.display !== 'none') {
            positionDropdown(activeTextarea);
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (activeTextarea && dropdown && dropdown.style.display !== 'none') {
            positionDropdown(activeTextarea);
        }
    });
})();

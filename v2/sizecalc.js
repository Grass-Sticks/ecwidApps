/**
 * Ski pole size calculator for the Squarespace pages grasssticks.com/skipolelengthcalc/ and
 * grasssticks.ca/skipolelengthcalc/.
 *
 * Each page's Code Block holds only this (Canada uses data-units="cm"):
 *
 *   <div id="gs-size-calc" data-units="in"></div>
 *   <script src="https://apps.grasssticks.com/sizecalc.js"></script>
 *
 * so a change here goes live on both sites when ecwidApps is pushed, with no pasting.
 * Moved from Cabot's pasted code (Grass-Sticks/squarespace GSSizeCalculator/), 2026-10-09.
 * Same look and formula; the only change is the over-54-inch message (there is no maximum
 * length, Andrew 2026-10-09). The pole builder (builder.js) uses the same formula and note.
 */
(function () {
    var me = document.currentScript;
    var base = me && me.src ? me.src.replace(/sizecalc\.js(\?.*)?$/, '') : 'https://apps.grasssticks.com/';

    // pole inches = 0.5799 x height inches + 6.7078 (Cabot's formula)
    function poleInches(heightInches) {
        return 0.5799 * heightInches + 6.7078;
    }

    // Longer than this is uncommon for alpine poles, but we build it.
    var LONG_INCHES = 54;
    var LONG_CM = 137;
    var LONG_NOTE = 'Longer than most alpine poles. Great for cross-country or tall skiers.';

    var MARKUP =
        '<div class="ski-pole-calculator">' +
            '<div class="calculator-wrapper">' +
                '<div class="container" id="sizeCalcContainer">' +
                    '<div class="row h-100 text-center">' +
                        '<div class="col-6 d-flex flex-column justify-content-center">' +
                            '<h2>Height</h2>' +
                            '<div class="heightInputs">' +
                                '<div class="height" id="feetInchInputs">' +
                                    '<div class="height" id="feet">' +
                                        '<input type="text" id="feetInput" placeholder="0" maxlength="1" inputmode="numeric" aria-label="Height, feet">' +
                                        '<label for="feetInput">feet </label><br />' +
                                    '</div>' +
                                    '<div class="height" id="inches">' +
                                        '<input type="text" id="inchesInput" placeholder="0" maxlength="2" inputmode="numeric" aria-label="Height, inches">' +
                                        '<label for="inchesInput">inches</label><br />' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="toggle-container">' +
                                '<span class="unit-label">IN</span>' +
                                '<label class="switch">' +
                                    '<input type="checkbox" id="unitToggle" aria-label="Show length in centimeters">' +
                                    '<span class="slider round"></span>' +
                                '</label>' +
                                '<span class="unit-label">CM</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="col-2 d-flex justify-content-start align-items-center">' +
                            '<div class="arrow">→</div>' +
                        '</div>' +
                        '<div class="col-4 d-flex justify-content-center align-items-center">' +
                            '<div>' +
                                '<div class="result-label">Ski pole length:</div>' +
                                '<div class="result-display">' +
                                    '<input id="finalLength" value="0" readonly aria-label="Ski pole length">' +
                                    '<span id="unitDisplay">in</span>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="message" style="display: none;" aria-live="polite">' +
                '<p>Please enter a valid height.</p>' +
            '</div>' +
        '</div>';

    function addStylesheet(href) {
        var already = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
            return link.href === href;
        });
        if (already) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function start() {
        var root = document.getElementById('gs-size-calc');
        if (!root || root.dataset.ready) return;
        root.dataset.ready = '1';

        // Bootstrap's grid lays out the calculator (Cabot's version loaded it the same way).
        addStylesheet('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
        addStylesheet(base + 'sizecalc.css');
        root.innerHTML = MARKUP;

        var isInchMode = true;
        var feetInput = root.querySelector('#feetInput');
        var inchesInput = root.querySelector('#inchesInput');
        var unitToggle = root.querySelector('#unitToggle');
        var finalLength = root.querySelector('#finalLength');
        var message = root.querySelector('#message');
        var container = root.querySelector('#sizeCalcContainer');

        function showMessage(text) {
            message.querySelector('p').textContent = text;
            message.style.display = 'block';
        }

        function toggleUnit() {
            isInchMode = !unitToggle.checked;
            message.style.display = 'none';
            root.querySelector('#unitDisplay').textContent = isInchMode ? 'in' : 'cm';

            container.style.background = isInchMode ? 'darkgreen' : 'lightgreen';
            container.style.color = isInchMode ? 'white' : 'black';
            Array.prototype.forEach.call(root.querySelectorAll('.unit-label'), function (label) {
                label.style.color = isInchMode ? 'lightgreen' : 'darkgreen';
            });
            [feetInput, inchesInput].forEach(function (input) {
                input.style.color = isInchMode ? 'white' : 'black';
                input.style.borderColor = isInchMode ? 'lightgreen' : 'darkgreen';
            });
            var resultDisplay = root.querySelector('.result-display');
            resultDisplay.style.borderColor = isInchMode ? 'lightgreen' : 'darkgreen';
            resultDisplay.style.color = isInchMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.9)';
            root.querySelector('.result-label').style.color = isInchMode ? 'white' : 'black';
            root.querySelector('.arrow').style.color = isInchMode ? 'lightgreen' : 'darkgreen';

            calculate();
        }

        function calculate() {
            var feet = feetInput.value;
            var inches = inchesInput.value;

            if (feet === '' && inches === '') {
                message.style.display = 'none';
                finalLength.value = '0';
                return;
            }
            if (isNaN(feet) || isNaN(inches)) {
                showMessage('Please enter a valid height.');
                return;
            }

            var height = (feet ? parseInt(feet, 10) : 0) * 12 + (inches ? parseInt(inches, 10) : 0);
            var poleSize = poleInches(height);
            var length = isInchMode ? Math.round(poleSize) : Math.round(poleSize * 2.54);
            var unitWord = isInchMode ? 'inches' : 'centimeters';
            var text = 'Your recommended ski pole length is ' + length + ' ' + unitWord + '.';
            if (length > (isInchMode ? LONG_INCHES : LONG_CM)) text += ' ' + LONG_NOTE;
            if (poleSize > 0) showMessage(text);
            finalLength.value = length;
        }

        feetInput.addEventListener('input', calculate);
        inchesInput.addEventListener('input', calculate);
        unitToggle.addEventListener('click', toggleUnit);

        // Canada starts in centimeters.
        if (root.dataset.units === 'cm') {
            unitToggle.checked = true;
            toggleUnit();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();

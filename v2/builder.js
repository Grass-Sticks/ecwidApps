/**
 * Grass Sticks pole builder (v2). Loaded by grasssticks.js on every store page.
 *
 * Turns a pole's options into five numbered, collapsible steps (Grip, Baskets, Strap,
 * Length, Engraving): colour swatches instead of the grip and basket dropdowns, basket
 * size cards, a picture grid of straps, length with the unit worked out from the number
 * (written into the order, "48" -> "48 inches") and a height-to-length finder,
 * and a live preview of the engraving. The pole photo stays in view beside the options
 * (desktop: the photo itself; phones: a slim copy down the right edge). "Staff picks" set
 * a whole combo with one tap (switched off for now).
 *
 * Ecwid stays in charge. Its own dropdowns, radio buttons and text boxes stay on the
 * page, hidden; every swatch and card here just picks the matching Ecwid choice, so
 * Ecwid still does every price, photo swap and the cart. If this file fails to load,
 * shoppers get the normal Ecwid options.
 *
 * Works with grasssticks.js, never against it: that file still runs the engraving
 * counter, the black-only basket rule and the strap-on-the-photo layer. This one only
 * reads what they did (the greyed-out colours, the engraving price) and draws it.
 *
 * Hardcoded here, so check this file when they change in Ecwid:
 * - SWATCHES: what each colour name looks like. A new colour with no entry shows as a
 *   plain text chip until it is added.
 * - STAFF_PICKS: option values (grip, basket, strap names).
 * - The sizing formula (copied from the Squarespace sizing calculator page).
 * Prices are never in this file.
 */
(function () {
    if (window.gsBuilderLoaded) return;
    window.gsBuilderLoaded = true;

    // Only these products get the builder until it is approved for the real ones.
    // US TEST Original 865875809, Canada TEST Original 865862655.
    var BUILDER_PRODUCTS = [865875809, 865862655];

    var CANADA_STORE_ID = 125951011;
    var PHONE_WIDTH = 768; // the pole beside the options shows at this width and narrower

    // Sampled from the grip and basket product photos (US Original, 2026-10-09).
    // 'cork' and 'clear' are drawn as textures in builder.css.
    var SWATCHES = {
        'black': '#1c1c19',
        'cork': 'cork',
        'blue': '#0b88c8',
        'green': '#80df77',
        'pink': '#fc6382',
        'purple': '#8d43a1',
        'orange': '#fd7026',
        'red': '#e92831',
        'turquoise': '#39dab4',
        'white': '#eeeeee',
        'transparent': 'clear'
    };
    // Basket plastic is a slightly different shade from the grip rubber.
    var BASKET_SWATCHES = {
        'blue': '#2378be',
        'green': '#6ad779',
        'purple': '#a66de8',
        'orange': '#f25626',
        'red': '#e03e3e'
    };

    // One tap sets the whole combo. Values are the exact Ecwid choice names; a pick whose
    // values a product doesn't have is left out on that product. Taken from the most
    // ordered combos in Ecwid (US Mar to Oct 2026 sample, all of Canada since Nov 2025;
    // Andrew, 2026-10-09: "pull from ecwid for now, we can change later").
    // Switched OFF (Andrew, 2026-10-09: "lets get rid of staff picks. we might bring it back
    // at some point"). Set to true to bring them back; the list and code are kept.
    var SHOW_STAFF_PICKS = false;
    var STAFF_PICKS = [
        { name: 'Bluebird Day', grip: 'Blue', basket: 'Blue', strap: 'The Grand' },
        { name: 'Night Shift', grip: 'Black', basket: 'Black', strap: 'Fixed' },
        { name: 'Campfire', grip: 'Cork', basket: 'Orange', strap: 'Fixed' },
        { name: 'Purple Haze', grip: 'Purple', basket: 'Purple', strap: 'Purple Haze' }
    ];

    // Same as the sizing calculator (sizecalc.js): pole inches = 0.5799 x height inches + 6.7078.
    // There is no longest pole (Andrew, 2026-10-09); past 54 in / 137 cm we just add a note.
    var SIZING = {
        slope: 0.5799, intercept: 6.7078, longInches: 54, longCm: 137,
        longNote: 'Longer than most alpine poles. Great for cross-country or tall skiers.'
    };

    var STEPS = [
        { key: 'grip', title: 'Grip', modules: ['.details-product-option--Grip-Color'] },
        { key: 'baskets', title: 'Baskets', modules: ['[class*="details-product-option--Basket-Col"]', '.details-product-option--Basket-Size'] },
        { key: 'strap', title: 'Strap', modules: ['.details-product-option--Strap'] },
        { key: 'length', title: 'Length', modules: ['[class*="details-product-option--Length"]'] },
        { key: 'engraving', title: 'Engraving', modules: ['.details-product-option--Engraving', '.details-product-option--Engraving---Ski-Pole-2'] }
    ];

    var storeId = null;
    var productId = null;
    var token = 0;        // counts product pages; Ecwid reuses elements between them
    var steps = [];       // the steps found on this page
    var openKey = null;   // which step is open
    var lengthUnit = null;
    var renderTimer = null;

    // ------------------------------------------------------------------ small helpers

    function $(selector, root) { return (root || document).querySelector(selector); }
    function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function svg(markup, className) {
        var holder = document.createElement('span');
        holder.innerHTML = markup; // fixed markup written in this file, never shop data
        var node = holder.firstChild;
        if (className) node.setAttribute('class', className);
        return node;
    }

    var RULER = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4zM7.5 10.5l2-2M10.5 13.5l2-2M13.5 16.5l2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var CHEVRON = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M11 4L6 9 1 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // "Cork (+$14)" -> "+$14". Ecwid's own text, so always the real price and currency.
    // Only a signed amount counts: 'Tiny Disc- 2" (black only)' has no price.
    function surchargeIn(text) {
        var match = /\(([+\-−][^()]*\d[^()]*)\)\s*$/.exec(text || '');
        return match ? match[1].trim() : '';
    }

    function fire(node, type) {
        node.dispatchEvent(new Event(type, { bubbles: true }));
    }

    function choose(select, value) {
        if (!select || select.value === value) return;
        select.value = value;
        fire(select, 'change');
        foldPicks();
        renderSoon();
    }

    function realChoices(select) {
        return Array.prototype.filter.call(select.options, function (option) {
            // Skip Ecwid's "Please choose" and grasssticks.js's "Switch to Medium" line.
            return option.value && option.value !== 'Please choose' && !option.dataset.gsMenuNote;
        });
    }

    function swatchColour(name, basket) {
        var key = name.toLowerCase();
        if (basket && BASKET_SWATCHES[key]) return BASKET_SWATCHES[key];
        return SWATCHES[key] || null;
    }

    function paintChip(chip, colour) {
        chip.className = 'gs-b-chip';
        chip.style.background = '';
        if (colour === 'cork') chip.className += ' gs-b-chip--cork';
        else if (colour === 'clear') chip.className += ' gs-b-chip--clear';
        else if (colour) chip.style.background = colour;
    }

    function moduleOf(step, index) { return step.found[index || 0]; }

    function selectIn(module) { return module ? $('select', module) : null; }

    // ------------------------------------------------------------------ setup / teardown

    function enabled() {
        return productId !== null && BUILDER_PRODUCTS.indexOf(productId) >= 0;
    }

    function teardown() {
        $all('.gs-b').forEach(function (node) { node.parentNode && node.parentNode.removeChild(node); });
        $all('[data-gs-step]').forEach(function (node) {
            node.removeAttribute('data-gs-step');
            node.removeAttribute('data-gs-open');
            node.removeAttribute('data-gs-part');
        });
        $all('input[data-gs-keypad]').forEach(function (input) {
            input.removeAttribute('inputmode');
            input.removeAttribute('data-gs-keypad');
        });
        document.documentElement.removeAttribute('data-gs-builder');
        document.documentElement.style.removeProperty('--gs-b-photo-top');
        rail = null;
        document.documentElement.removeAttribute('data-gs-rail');
        steps = [];
    }

    function setup() {
        if (!enabled()) return;
        var options = $('.product-details__product-options');
        if (!options) return;
        var first = $(STEPS[0].modules[0]);
        if (first && first.dataset.gsBuilderToken === String(token) && $('.gs-b-head', first)) return;

        teardown();
        document.documentElement.setAttribute('data-gs-builder', 'on');

        steps = [];
        STEPS.forEach(function (definition) {
            var found = definition.modules.map(function (selector) { return $(selector, options); });
            if (!found[0]) return;
            steps.push({ key: definition.key, title: definition.title, found: found });
        });
        // Number them in the order Ecwid shows them (Length comes before Strap).
        steps.sort(function (a, b) {
            return a.found[0].compareDocumentPosition(b.found[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        steps.forEach(function (step, index) {
            step.number = index + 1;
            var main = moduleOf(step);
            main.dataset.gsBuilderToken = String(token);
            step.found.forEach(function (module, part) {
                if (!module) return;
                module.setAttribute('data-gs-step', step.key);
                module.setAttribute('data-gs-part', part === 0 ? 'main' : 'extra');
            });
            buildHead(step, steps[index + 1]);
            if (step.key === 'grip') buildSwatches(step, main, false);
            if (step.key === 'baskets') buildBaskets(step);
            if (step.key === 'strap') buildStraps(step);
            if (step.key === 'length') buildLength(step);
            if (step.key === 'engraving') buildEngraving(step);
        });
        buildStaffPicks();
        buildRail(options);
        if (!openKey || !steps.some(function (s) { return s.key === openKey; })) {
            openKey = steps.length ? steps[0].key : null;
        }
        render();
    }

    // Header button at the top of a step, and a "Next" link at its foot.
    function buildHead(step, next) {
        var main = moduleOf(step);
        var head = el('button', 'gs-b gs-b-head');
        head.type = 'button';
        head.id = 'gs-b-head-' + step.key;
        head.appendChild(el('span', 'gs-b-num', String(step.number)));
        head.appendChild(el('span', 'gs-b-title', step.title));
        step.value = el('span', 'gs-b-value');
        head.appendChild(step.value);
        head.appendChild(svg(CHEVRON, 'gs-b-chev'));
        head.addEventListener('click', function () {
            if (openKey === step.key) { openKey = null; render(); reveal(step); }
            else openStep(step.key, true);
        });
        main.insertBefore(head, main.firstChild);
        step.head = head;

        step.body = el('div', 'gs-b gs-b-body');
        main.appendChild(step.body);

        if (next) {
            var nextLink = el('button', 'gs-b gs-b-next', 'Next: ' + next.title);
            nextLink.type = 'button';
            nextLink.addEventListener('click', function () { openStep(next.key, true); });
            step.nextLink = nextLink;
            // The button sits on its own row, at the left (Andrew, 2026-10-09).
            var nextRow = el('div', 'gs-b gs-b-nextrow');
            nextRow.appendChild(nextLink);
            // After the step's last part (engraving has two Ecwid modules). Baskets' second part,
            // Ecwid's size dropdown, is always hidden (the size cards replace it), so its link
            // goes in the first part, under the colour swatches.
            var last = step.key === 'baskets' ? main : step.found.filter(Boolean).pop();
            last.appendChild(nextRow);
        }
    }

    function openStep(key, scroll) {
        openKey = key;
        render();
        if (!scroll) return;
        var step = stepByKey(key);
        if (step) reveal(step);
    }

    function reveal(step) {
        // Bring the whole step into view, scrolling only as far as needed (Andrew, 2026-10-09):
        // - header above the screen: scroll up to it;
        // - step runs off the bottom (the strap grid does): scroll down just until its bottom
        //   shows, but never past its header.
        // Desktop: the whole pole photo must stay in view. The photo leaves with the options
        // once their bottom rises above its bottom, and a step folding shut (the strap grid)
        // can make that happen while the shopper is scrolled down; then the top of the pole
        // was cut off. So never scroll down that far, and scroll back up if it already
        // happened, keeping the step's header on screen.
        // Phones: the same for the pole beside the options, which also leaves with them
        // (Andrew, 2026-10-09: Next to Engraving, the last step, cut off the pole's top).
        var head = step.head.getBoundingClientRect();
        var parts = step.found.filter(function (module) { return module && module.offsetHeight; });
        var bottom = parts.length ? parts[parts.length - 1].getBoundingClientRect().bottom : head.bottom;
        var phone = window.innerWidth <= PHONE_WIDTH;
        var pad = phone ? 16 : 20;
        var room = window.innerHeight - 16;
        var delta = 0;
        if (head.top < 0) delta = head.top - pad;
        else if (bottom > room) delta = Math.min(bottom - room, head.top - pad);
        var gallery = $('.product-details__gallery');
        var sidebar = $('.product-details__sidebar');
        var keepPhoto = null;
        if (!phone && gallery && sidebar) {
            keepPhoto = sidebar.getBoundingClientRect().bottom - gallery.offsetHeight - 16;
        }
        if (phone && rail && rail.hasAttribute('data-gs-shown') && rail.pole.offsetHeight > 120) {
            // 56 = the pole's sticky top in builder.css.
            keepPhoto = rail.getBoundingClientRect().bottom - rail.pole.offsetHeight - 56;
        }
        if (keepPhoto !== null && delta > keepPhoto) delta = Math.max(keepPhoto, head.bottom - room);
        if (Math.abs(delta) < 2) return;
        window.scrollTo({ top: window.pageYOffset + delta, behavior: 'smooth' });
    }

    function stepByKey(key) {
        for (var i = 0; i < steps.length; i++) if (steps[i].key === key) return steps[i];
        return null;
    }

    // ------------------------------------------------------------------ swatches

    function buildSwatches(step, module, basket) {
        var select = selectIn(module);
        if (!select) return;
        var label = el('p', 'gs-b-chosen');
        var row = el('div', 'gs-b-swatches');
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', basket ? 'Basket color' : 'Grip color');
        realChoices(select).forEach(function (option) {
            var button = el('button', 'gs-b-swatch');
            button.type = 'button';
            button.dataset.value = option.value;
            var chip = el('span');
            var colour = swatchColour(option.value, basket);
            paintChip(chip, colour);
            if (!colour) chip.className += ' gs-b-chip--text';
            button.appendChild(chip);
            button.appendChild(el('span', 'gs-b-swatch-name', option.value));
            var price = surchargeIn(option.text);
            if (price) button.appendChild(el('span', 'gs-b-tag', price));
            button.setAttribute('aria-label', option.value + (price ? ', ' + price : ''));
            button.addEventListener('click', function () {
                if (button.disabled) return;
                choose(selectIn(module), option.value);
            });
            row.appendChild(button);
        });
        step.body.appendChild(label);
        step.body.appendChild(row);
        if (basket) step.basketLabel = label; else step.gripLabel = label;
    }

    function drawSwatches(module, row, label, prefix) {
        var select = selectIn(module);
        if (!select || !row) return;
        var byValue = {};
        realChoices(select).forEach(function (option) { byValue[option.value] = option; });
        $all('.gs-b-swatch', row).forEach(function (button) {
            var option = byValue[button.dataset.value];
            button.setAttribute('aria-pressed', select.value === button.dataset.value ? 'true' : 'false');
            button.disabled = !option || option.disabled;
        });
        if (label) {
            label.textContent = '';
            label.appendChild(document.createTextNode(prefix + ': '));
            var picked = byValue[select.value];
            label.appendChild(el('b', null, picked ? picked.text : select.value));
        }
    }

    // ------------------------------------------------------------------ baskets

    // 'Huge Powder Basket- 4.75" (black only)' -> name, size, inches, blackOnly.
    function readSize(value) {
        var inches = /(\d+(?:\.\d+)?)\s*"/.exec(value);
        var name = value.split(/-\s|\s-|\(/)[0].replace(/\bbasket\b/i, '').replace(/\s+/g, ' ').trim();
        return {
            name: name || value,
            size: inches ? inches[1] + '"' : '',
            inches: inches ? parseFloat(inches[1]) : 4,
            blackOnly: /black only/i.test(value)
        };
    }

    function buildBaskets(step) {
        var colourModule = step.found[0];
        var sizeModule = step.found[1];
        if (sizeModule && selectIn(sizeModule)) {
            var cards = el('div', 'gs-b-sizes');
            cards.setAttribute('role', 'group');
            cards.setAttribute('aria-label', 'Basket size');
            realChoices(selectIn(sizeModule)).forEach(function (option) {
                var info = readSize(option.value);
                var card = el('button', 'gs-b-size');
                card.type = 'button';
                card.dataset.value = option.value;
                // The real basket, cut from the Extra Baskets photos (Andrew, 2026-10-09); the
                // picture itself is set in builder.css. A size with no photo gets a drawn one.
                var kind = /tiny/i.test(option.value) ? 'tiny'
                    : /huge|powder/i.test(option.value) ? 'huge'
                    : /medium/i.test(option.value) ? 'medium' : null;
                var radius = Math.max(4, Math.min(13, info.inches * 2.6));
                if (kind) {
                    var picture = el('i', 'gs-b-size-pic');
                    picture.setAttribute('data-basket', kind);
                    card.appendChild(picture);
                } else card.appendChild(svg('<svg viewBox="0 0 30 26" aria-hidden="true"><line x1="15" y1="0" x2="15" y2="26" stroke="#b9781f" stroke-width="2"/><ellipse cx="15" cy="16" rx="' + radius + '" ry="' + (radius * 0.38) + '" fill="#333"/></svg>'));
                card.appendChild(el('b', null, info.name));
                card.appendChild(el('span', null, (info.size ? info.size + ' · ' : '') + (info.blackOnly ? 'black only' : 'all colors')));
                var price = surchargeIn(option.text);
                if (price) card.appendChild(el('span', 'gs-b-tag', price));
                card.addEventListener('click', function () { choose(selectIn(sizeModule), option.value); });
                cards.appendChild(card);
            });
            step.body.appendChild(cards);
            step.sizeCards = cards;
        }
        if (colourModule) buildSwatches(step, colourModule, true);
        step.basketRow = $('.gs-b-swatches', step.body);

        // Same wording and job as grasssticks.js's note, as a link that switches to Medium.
        var note = el('p', 'gs-b-note');
        note.appendChild(document.createTextNode('This size only comes in black. '));
        var toColours = el('button', 'gs-b-link', 'Switch to Medium for colors');
        toColours.type = 'button';
        toColours.addEventListener('click', function () {
            var select = selectIn(sizeModule);
            if (!select) return;
            var medium = realChoices(select).filter(function (option) {
                return /medium/i.test(option.value) && !/black only/i.test(option.value);
            })[0];
            if (medium) choose(select, medium.value);
        });
        note.appendChild(toColours);
        step.body.appendChild(note);
        step.blackNote = note;
    }

    // ------------------------------------------------------------------ straps

    // The strap's picture is whatever the store CSS shows beside it in Ecwid's list
    // (same lookup as grasssticks.js), so a new strap needs adding in one place only.
    function strapPicture(row) {
        var match = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(row, '::before').backgroundImage || '');
        return match ? match[1] : '';
    }

    var STRAP_GROUPS = { mtnStrap: 'Mtn Straps · adjustable', NormalStrap: 'Classic beige' };

    function buildStraps(step) {
        var module = moduleOf(step);
        var rows = $all('.form-control--radio', module);
        var groups = [];
        var group = null;
        rows.forEach(function (row) {
            var radio = $('input[type="radio"]', row);
            if (!radio) return;
            var wrap = $('.form-control__radio-wrap', row);
            var isHeader = STRAP_GROUPS[radio.value] || (wrap && getComputedStyle(wrap).display === 'none');
            if (isHeader) {
                group = { title: STRAP_GROUPS[radio.value] || radio.value, items: [] };
                groups.push(group);
                return;
            }
            if (!group) { group = { title: '', items: [] }; groups.push(group); }
            var surcharge = $('.option-surcharge__value', row);
            group.items.push({
                value: radio.value,
                picture: strapPicture(row),
                price: surcharge ? surcharge.textContent.trim() : ''
            });
        });

        step.strapTiles = [];
        groups.forEach(function (g) {
            if (!g.items.length) return;
            var prices = g.items.map(function (item) { return item.price; });
            var shared = prices.every(function (p) { return p && p === prices[0]; }) ? prices[0] : '';
            var label = el('div', 'gs-b-group');
            label.appendChild(el('span', null, g.title));
            if (shared) label.appendChild(el('span', null, shared));
            step.body.appendChild(label);
            var grid = el('div', g.items.length > 4 ? 'gs-b-straps' : 'gs-b-straps gs-b-straps--small');
            grid.setAttribute('role', 'group');
            grid.setAttribute('aria-label', g.title || 'Strap');
            g.items.forEach(function (item) {
                var tile = el('button', 'gs-b-strap');
                tile.type = 'button';
                tile.dataset.value = item.value;
                if (item.picture) {
                    var picture = el('img');
                    picture.src = item.picture;
                    picture.alt = '';
                    picture.loading = 'lazy';
                    tile.appendChild(picture);
                } else {
                    tile.appendChild(el('span', 'gs-b-strap-none', 'No strap'));
                }
                tile.appendChild(el('span', 'gs-b-strap-name', item.value));
                if (!shared) tile.appendChild(el('span', 'gs-b-strap-price', item.price || 'Included'));
                tile.setAttribute('aria-label', item.value + (item.price ? ', ' + item.price : ', included'));
                tile.addEventListener('click', function () {
                    var radio = $('input[type="radio"][name="Strap"][value="' + CSS.escape(item.value) + '"]', moduleOf(step));
                    if (radio && !radio.checked) radio.click();
                    foldPicks();
                    renderSoon();
                });
                grid.appendChild(tile);
                step.strapTiles.push(tile);
            });
            step.body.appendChild(grid);
        });
    }

    function checkedStrap() {
        var radio = $('input[type="radio"][name="Strap"]:checked');
        return radio ? radio.value : '';
    }

    // ------------------------------------------------------------------ length

    function lengthInput() {
        var step = stepByKey('length');
        return step ? $('input', moduleOf(step)) : null;
    }

    // "48", "48 in", "48 inches", "122cm", "48.5" -> { n, unit } (unit null if not typed).
    function parseLength(text) {
        var match = /^\s*(\d{1,3}(?:[.,]\d+)?)\s*(cm|centimet\w*|in|inch\w*|"|'')?\.?\s*$/i.exec(text || '');
        if (!match) return null;
        var unit = match[2] ? (/^c/i.test(match[2]) ? 'cm' : 'in') : null;
        return { n: parseFloat(match[1].replace(',', '.')), unit: unit };
    }

    // Poles run about 30 to 60 inches, or 76 cm and up, so a bare number says which.
    function guessUnit(n) { return n >= 70 ? 'cm' : 'in'; }

    function lengthText(n, unit) { return n + (unit === 'cm' ? ' cm' : ' inches'); }

    function setLength(text) {
        var input = lengthInput();
        if (!input) return;
        input.value = text;
        fire(input, 'input');
        fire(input, 'change');
        renderSoon();
    }

    function buildLength(step) {
        var input = lengthInput();
        if (!input) return;
        lengthUnit = null;

        // No in/cm buttons (Andrew, 2026-10-09): the number itself says which unit, so the
        // shopper never has to choose. The line under the box confirms it ("48 in = 122 cm").
        step.lengthHelp = el('p', 'gs-b-help');
        step.body.appendChild(step.lengthHelp);

        // The best advice from the sizing page, where everyone sees it (Andrew, 2026-10-09).
        var tip = el('p', 'gs-b-tip');
        tip.appendChild(el('b', null, 'Have poles you like? '));
        tip.appendChild(document.createTextNode('Measure them from the top of the grip to the tip and use that.'));
        step.body.appendChild(tip);

        // Height-to-length finder, in place of the link to the sizing page.
        var finder = el('div', 'gs-b-finder');
        // A real button, like the old green "Click for sizing" one, so it can't be missed.
        var toggle = el('button', 'gs-b-finder-toggle');
        toggle.type = 'button';
        toggle.appendChild(svg(RULER, 'gs-b-ruler'));
        toggle.appendChild(document.createTextNode('Find my length'));
        toggle.setAttribute('aria-expanded', 'false');
        var panel = el('div', 'gs-b-finder-panel');
        panel.hidden = true;
        toggle.addEventListener('click', function () {
            panel.hidden = !panel.hidden;
            toggle.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
            if (!panel.hidden) drawFinder(step);
        });
        finder.appendChild(toggle);
        finder.appendChild(panel);
        step.body.appendChild(finder);
        step.finderPanel = panel;
    }

    function drawFinder(step) {
        var panel = step.finderPanel;
        while (panel.firstChild) panel.removeChild(panel.firstChild);
        var metric = (lengthUnit || (storeId === CANADA_STORE_ID ? 'cm' : 'in')) === 'cm';

        panel.appendChild(el('p', 'gs-b-finder-q', 'How tall are you?'));
        var row = el('div', 'gs-b-finder-row');
        var boxes = metric ? [['cm', 'cm', 3]] : [['ft', 'feet', 1], ['in', 'inches', 2]];
        var inputs = boxes.map(function (box) {
            var wrap = el('label', 'gs-b-finder-box');
            var input = el('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = box[2];
            input.setAttribute('aria-label', 'Height in ' + box[1]);
            wrap.appendChild(input);
            wrap.appendChild(el('span', null, box[0]));
            row.appendChild(wrap);
            return input;
        });
        var switchUnits = el('button', 'gs-b-link', metric ? 'Use feet and inches' : 'Use cm');
        switchUnits.type = 'button';
        switchUnits.addEventListener('click', function () {
            lengthUnit = metric ? 'in' : 'cm';
            drawFinder(step);
            renderSoon();
        });
        row.appendChild(switchUnits);
        panel.appendChild(row);

        var result = el('div', 'gs-b-finder-result');
        panel.appendChild(result);

        // The rest of the sizing page's advice is one tap away, in a new tab so the shopper
        // keeps their choices here.
        var note = el('p', 'gs-b-finder-note', 'This is a starting point. Some skiers like 1-2" longer, or shorter for off-piste. ');
        var more = el('a', 'gs-b-link', 'More sizing tips');
        more.href = storeId === CANADA_STORE_ID
            ? 'https://www.grasssticks.ca/skipolelengthcalc/'
            : 'https://www.grasssticks.com/skipolelengthcalc/';
        more.target = '_blank';
        more.rel = 'noopener';
        note.appendChild(more);
        panel.appendChild(note);

        function update() {
            while (result.firstChild) result.removeChild(result.firstChild);
            var heightInches = metric
                ? (parseFloat(inputs[0].value) || 0) / 2.54
                : (parseInt(inputs[0].value, 10) || 0) * 12 + (parseInt(inputs[1].value, 10) || 0);
            if (heightInches < 36 || heightInches > 90) return;
            var poleInches = SIZING.slope * heightInches + SIZING.intercept;
            var length = metric ? Math.round(poleInches * 2.54) : Math.round(poleInches);
            var isLong = length > (metric ? SIZING.longCm : SIZING.longInches);
            result.appendChild(el('span', null, (isLong ? SIZING.longNote + ' ' : '') + 'Your length: '));
            var use = el('button', 'gs-b-use', 'Use ' + lengthText(length, metric ? 'cm' : 'in'));
            use.type = 'button';
            use.addEventListener('click', function () {
                lengthUnit = metric ? 'cm' : 'in';
                setLength(lengthText(length, lengthUnit));
                panel.hidden = true;
                step.body.querySelector('.gs-b-finder-toggle').setAttribute('aria-expanded', 'false');
            });
            result.appendChild(use);
        }
        inputs.forEach(function (input) { input.addEventListener('input', update); });
    }

    function drawLength(step) {
        var input = lengthInput();
        if (!input || !step.lengthHelp) return;
        // Phones open the number pad, not letters (Andrew, 2026-10-09). "decimal" rather than
        // "numeric" so iPhones still offer a "." for 48.5. Set on every draw because Ecwid can
        // swap the box out.
        if (!input.hasAttribute('data-gs-keypad')) {
            input.setAttribute('inputmode', 'decimal');
            input.setAttribute('data-gs-keypad', '');
        }
        var parsed = parseLength(input.value);
        var unit = parsed ? parsed.unit || guessUnit(parsed.n) : null;
        var help = step.lengthHelp;
        help.className = 'gs-b-help';
        if (!input.value.trim()) {
            help.textContent = 'Type it in inches or cm.';
        } else if (!parsed) {
            help.textContent = 'Just the number please, like 48 or 122 cm.';
            help.className += ' gs-b-help--warn';
        } else {
            // One decimal on purpose ("48 in = 121.9 cm"): a round number made shoppers think the
            // conversion was exact (Andrew, 2026-10-09).
            var other = unit === 'cm' ? (parsed.n / 2.54).toFixed(1) + ' in' : (parsed.n * 2.54).toFixed(1) + ' cm';
            var isLong = unit === 'cm' ? parsed.n > SIZING.longCm : parsed.n > SIZING.longInches;
            help.textContent = parsed.n + ' ' + (unit === 'cm' ? 'cm' : 'in') + ' = ' + other + '.' +
                (isLong ? ' ' + SIZING.longNote : '');
        }
    }

    // When the shopper leaves the box, write the unit in ("48" -> "48 inches") so the
    // build ticket is never ambiguous. Only for a plain number; anything else is left as typed.
    document.addEventListener('change', function (event) {
        var input = lengthInput();
        if (!enabled() || !input || event.target !== input) return;
        var parsed = parseLength(input.value);
        if (!parsed || parsed.unit) return;
        setLength(lengthText(parsed.n, guessUnit(parsed.n)));
    });

    // ------------------------------------------------------------------ engraving

    function engravingInputs() {
        var step = stepByKey('engraving');
        if (!step) return [];
        return step.found.map(function (module) { return module && $('input', module); });
    }

    function buildEngraving(step) {
        var preview = el('div', 'gs-b gs-b-engrave');
        preview.setAttribute('aria-hidden', 'true');
        step.engraveBars = [0, 1].map(function () {
            var bar = el('div', 'gs-b-bamboo');
            bar.appendChild(el('span'));
            preview.appendChild(bar);
            return bar;
        });
        // Under the last box (Pole 2), so the preview sits below both.
        step.found.filter(Boolean).pop().appendChild(preview);
    }

    function lettersIn(text) { return (text || '').replace(/\s/g, '').length; }

    function drawEngraving(step) {
        var inputs = engravingInputs();
        var second = step.found[1];
        step.engraveBars.forEach(function (bar, index) {
            var input = inputs[index];
            var hidden = !input || (index === 1 && second && second.style.display === 'none');
            bar.hidden = hidden;
            if (hidden) return;
            var text = input.value.trim();
            var span = bar.firstChild;
            span.textContent = text || (inputs[1] && !(second && second.style.display === 'none') ? 'Pole ' + (index + 1) : 'Your pole');
            span.className = text ? '' : 'gs-b-empty';
        });
    }

    // ------------------------------------------------------------------ staff picks

    function buildStaffPicks() {
        var grip = stepByKey('grip');
        if (!SHOW_STAFF_PICKS || !grip || !STAFF_PICKS.length) return;
        var gripSelect = selectIn(moduleOf(grip));
        var baskets = stepByKey('baskets');
        var basketSelect = baskets && selectIn(baskets.found[0]);
        var sizeSelect = baskets && selectIn(baskets.found[1]);
        var strapValues = $all('input[type="radio"][name="Strap"]').map(function (radio) { return radio.value; });

        function has(select, value) {
            return !value || (select && realChoices(select).some(function (option) { return option.value === value; }));
        }
        var picks = STAFF_PICKS.filter(function (pick) {
            return has(gripSelect, pick.grip) && has(basketSelect, pick.basket) &&
                (!pick.strap || strapValues.indexOf(pick.strap) >= 0);
        });
        if (!picks.length) return;

        var box = el('div', 'gs-b gs-b-picks');
        // The title is a button: the picks fold to this one line once the shopper starts
        // choosing their own pair (Andrew, 2026-10-09: "its taking up alot of space"), and a tap
        // opens them again.
        var toggle = el('button', 'gs-b-picks-title');
        toggle.type = 'button';
        toggle.appendChild(document.createTextNode('Staff picks'));
        toggle.appendChild(svg(CHEVRON, 'gs-b-chev'));
        toggle.addEventListener('click', function () { setPicksOpen(row.hidden); });
        box.appendChild(toggle);
        var row = el('div', 'gs-b-picks-row');
        picksParts = { toggle: toggle, row: row };
        setPicksOpen(true);
        picks.forEach(function (pick) {
            var button = el('button', 'gs-b-pick');
            button.type = 'button';
            var dots = el('span', 'gs-b-pick-dots');
            var gripDot = el('span'); paintChip(gripDot, swatchColour(pick.grip, false)); dots.appendChild(gripDot);
            var basketDot = el('span'); paintChip(basketDot, swatchColour(pick.basket, true)); dots.appendChild(basketDot);
            button.appendChild(dots);
            var words = el('span', 'gs-b-pick-words');
            words.appendChild(el('b', null, pick.name));
            words.appendChild(el('span', null, [pick.grip + ' grip', pick.basket.toLowerCase() + ' baskets', pick.strap].filter(Boolean).join(', ')));
            button.appendChild(words);
            button.addEventListener('click', function () { applyPick(pick, gripSelect, basketSelect, sizeSelect); });
            row.appendChild(button);
        });
        box.appendChild(row);
        var main = moduleOf(grip);
        main.parentNode.insertBefore(box, main);
    }

    var picksParts = null;

    function setPicksOpen(open) {
        if (!picksParts) return;
        picksParts.row.hidden = !open;
        picksParts.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // The shopper has started choosing: fold the picks away (they can reopen them).
    function foldPicks() {
        if (picksParts && document.contains(picksParts.row)) setPicksOpen(false);
    }

    // One Ecwid choice at a time, a beat apart, so each change settles (price, photo,
    // black-only rule) before the next.
    function applyPick(pick, gripSelect, basketSelect, sizeSelect) {
        var jobs = [];
        if (sizeSelect && pick.basket && pick.basket.toLowerCase() !== 'black') {
            var medium = realChoices(sizeSelect).filter(function (o) { return /medium/i.test(o.value) && !/black only/i.test(o.value); })[0];
            if (medium) jobs.push(function () { choose(sizeSelect, medium.value); });
        }
        if (pick.grip) jobs.push(function () { choose(gripSelect, pick.grip); });
        if (pick.basket) jobs.push(function () { choose(basketSelect, pick.basket); });
        if (pick.strap) jobs.push(function () {
            var radio = $('input[type="radio"][name="Strap"][value="' + CSS.escape(pick.strap) + '"]');
            if (radio && !radio.checked) radio.click();
        });
        (function next(i) {
            if (i >= jobs.length) { renderSoon(); return; }
            jobs[i]();
            setTimeout(function () { next(i + 1); }, 150);
        })(0);
    }

    // ------------------------------------------------------------------ pole beside the options (phones)

    // The first gallery photo (the one Ecwid swaps for grip and basket colour) as
    // { src, w, h }, or null until it is known. On desktop it is an <img>; on phones Ecwid
    // shows a swipeable gallery that draws it as a background picture instead, so its size
    // is found by loading it once (then the pole beside the options is redrawn).
    var photoSizes = {};

    function mainPhoto() {
        var img = $('.details-gallery__main-image-wrapper .details-gallery__photoswipe-index-0');
        if (img) {
            var w = parseFloat(img.getAttribute('width')) || img.naturalWidth;
            var h = parseFloat(img.getAttribute('height')) || img.naturalHeight;
            var src = img.currentSrc || img.src;
            return src && w && h ? { src: src, w: w, h: h } : null;
        }
        var thumb = $('.details-gallery__photoswipe-thumb-index-0 .details-gallery__thumb-img');
        var match = thumb && /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(thumb).backgroundImage || '');
        if (!match) return null;
        var url = match[1];
        var size = photoSizes[url];
        if (!size) {
            photoSizes[url] = 'loading';
            var probe = new Image();
            probe.onload = function () {
                photoSizes[url] = { w: probe.naturalWidth, h: probe.naturalHeight };
                drawRail();
            };
            probe.src = url;
            return null;
        }
        return size === 'loading' ? null : { src: url, w: size.w, h: size.h };
    }

    // A small window onto part of the pole photo: the whole photo (plus the Mtn strap layer
    // grasssticks.js lays on it) scaled up inside a box, slid so the wanted part shows.
    // focus = [centre x, top y, bottom y] as fractions of the photo.
    function drawCrop(box, focus) {
        var photo = mainPhoto();
        while (box.firstChild) box.removeChild(box.firstChild);
        if (!photo) return;
        var src = photo.src;
        var w = photo.w;
        var h = photo.h;
        var boxW = box.clientWidth || 52;
        var boxH = box.clientHeight || 64;
        var stageH = boxH / (focus[2] - focus[1]);
        var stageW = stageH * (w / h);
        var stage = el('div', 'gs-b-stage');
        stage.style.width = stageW + 'px';
        stage.style.height = stageH + 'px';
        stage.style.left = (boxW / 2 - focus[0] * stageW) + 'px';
        stage.style.top = (-focus[1] * stageH) + 'px';
        var picture = el('img');
        picture.src = src;
        picture.alt = '';
        stage.appendChild(picture);
        var strap = $('.details-gallery__main-image-wrapper .gs-strap-photo') || $('.details-gallery .gs-strap-frame .gs-strap-photo');
        if (strap && strap.getAttribute('src')) {
            var layer = el('img', 'gs-b-stage-strap');
            layer.src = strap.getAttribute('src');
            layer.alt = '';
            // "important" so builder.css's catch-all for the stage's pictures (left 0, full
            // size) can't pull the strap into the corner at the wrong size.
            ['left', 'top', 'width', 'height'].forEach(function (side) {
                layer.style.setProperty(side, strap.style[side], 'important');
            });
            stage.appendChild(layer);
        }
        box.appendChild(stage);
    }

    // Phones: the pole rides down the right edge beside the options, so every choice can be
    // seen on it without scrolling back up (Andrew, 2026-10-09; it replaced a pinned bottom bar
    // that repeated the step summaries). builder.css makes the room for it and keeps it in view
    // (sticky) while the options are on screen; it leaves with them, so it never covers the
    // Add to Cart or the description. It fades in once the big photo has scrolled away.
    var rail = null;

    function buildRail(options) {
        rail = el('div', 'gs-b gs-b-rail');
        rail.setAttribute('aria-hidden', 'true'); // a copy of the photo above
        rail.pole = el('div', 'gs-b-rail-pole');
        rail.appendChild(rail.pole);
        options.appendChild(rail);
    }

    // The part of the photo the rail shows: the whole pole, basket and strap loop. In the
    // Original photo the Medium basket spans 0.39-0.59 of its width (Huge a little more) and
    // a Mtn strap reaches 0.81, so 0.35-0.83 shows all of them (Andrew, 2026-10-09: the
    // basket and strap were cut off). [centre x, top y, bottom y] as fractions of the photo,
    // and how much of its width fits.
    var RAIL_FOCUS = [0.59, 0.01, 1.0];
    var RAIL_SPAN = 0.48;

    function updateRail() {
        if (!rail || !enabled() || window.innerWidth > PHONE_WIDTH) return;
        var gallery = $('.details-gallery');
        var shown = !gallery || gallery.getBoundingClientRect().bottom < 60;
        if (rail.hasAttribute('data-gs-shown') === shown) return;
        rail.toggleAttribute('data-gs-shown', shown);
        // builder.css moves Ecwid's floating cart button above the pole while it shows.
        document.documentElement.toggleAttribute('data-gs-rail', shown);
        if (shown) drawRail();
    }

    function drawRail() {
        if (!rail || !rail.hasAttribute('data-gs-shown')) return;
        var photo = mainPhoto();
        var box = rail.pole;
        var width = box.clientWidth;
        if (!photo || !width) return;
        // As tall as the pole is at this width, but no taller than the screen (less the cart
        // button above it and the chat button below) or the options beside it.
        var tall = width / RAIL_SPAN * (photo.h / photo.w) * (RAIL_FOCUS[2] - RAIL_FOCUS[1]);
        var room = Math.min(window.innerHeight - 140, rail.clientHeight - 8);
        box.style.height = Math.max(120, Math.min(tall, room)) + 'px';
        drawCrop(box, RAIL_FOCUS);
    }

    function lengthMissing() {
        var input = lengthInput();
        return !!input && !input.value.trim();
    }

    // Ecwid's real Add to Cart, clicked while the Length step is closed: open it so Ecwid's
    // "required" message can be seen.
    document.addEventListener('click', function (event) {
        if (!enabled() || !event.target.closest) return;
        if (!event.target.closest('.details-product-purchase__add-to-bag')) return;
        if (lengthMissing()) openStep('length', false);
    }, true);

    // Desktop: builder.css pins the photo (position: sticky) beside the options so it stays in
    // view while choosing (Andrew, 2026-10-09). Sticky alone would carry it on over the
    // description below, so once the options column runs out, the photo's top is pulled up
    // to keep its bottom level with the options' bottom.
    function pinPhoto() {
        if (!enabled() || window.innerWidth <= PHONE_WIDTH) return;
        var gallery = $('.product-details__gallery');
        var sidebar = $('.product-details__sidebar');
        if (!gallery || !sidebar) return;
        var top = Math.min(16, sidebar.getBoundingClientRect().bottom - gallery.offsetHeight);
        document.documentElement.style.setProperty('--gs-b-photo-top', top + 'px');
    }

    var scrollQueued = false;
    window.addEventListener('scroll', function () {
        if (scrollQueued) return;
        scrollQueued = true;
        requestAnimationFrame(function () { scrollQueued = false; updateRail(); pinPhoto(); });
    }, { passive: true });
    window.addEventListener('resize', function () { updateRail(); drawRail(); pinPhoto(); });

    // ------------------------------------------------------------------ drawing

    function dot(colour) {
        var chip = el('span');
        paintChip(chip, colour);
        chip.className += ' gs-b-dot';
        return chip;
    }

    // The extra cost of the chosen option, shown beside it in the step's summary so the
    // price is up front ("Cork +$14", "Teton +$19.99"; Andrew, 2026-10-09). Ecwid's own text,
    // so always the real amount and currency. Nothing for free choices.
    function upcharge(text) {
        return text ? el('span', 'gs-b-upcharge', text) : null;
    }

    function chosenPrice(select) {
        var option = select && select.options[select.selectedIndex];
        return option ? surchargeIn(option.text) : '';
    }

    function strapPrice() {
        var radio = $('input[type="radio"][name="Strap"]:checked');
        var row = radio && radio.closest('.form-control');
        var surcharge = row && $('.option-surcharge__value', row);
        return surcharge ? surcharge.textContent.trim() : '';
    }

    function setValue(step, nodes, warn) {
        var value = step.value;
        while (value.firstChild) value.removeChild(value.firstChild);
        nodes.forEach(function (node) {
            if (node) value.appendChild(typeof node === 'string' ? document.createTextNode(node) : node);
        });
        value.classList.toggle('gs-b-value--warn', !!warn);
    }

    function render() {
        if (!enabled() || !steps.length) return;
        // Ecwid redrew the options and dropped ours: start again.
        if (!document.contains(steps[0].head)) { setup(); return; }

        steps.forEach(function (step) {
            var open = step.key === openKey;
            step.found.forEach(function (module) { if (module) module.setAttribute('data-gs-open', open ? 'yes' : 'no'); });
            step.head.setAttribute('aria-expanded', open ? 'true' : 'false');
            var done = true;

            if (step.key === 'grip') {
                var gripSelect = selectIn(moduleOf(step));
                drawSwatches(moduleOf(step), $('.gs-b-swatches', step.body), step.gripLabel, 'Grip color');
                if (gripSelect) setValue(step, [dot(swatchColour(gripSelect.value, false)), gripSelect.value, upcharge(chosenPrice(gripSelect))]);
            }
            if (step.key === 'baskets') {
                var colourSelect = selectIn(step.found[0]);
                var sizeSelect = selectIn(step.found[1]);
                drawSwatches(step.found[0], step.basketRow, step.basketLabel, 'Basket color');
                var size = sizeSelect ? readSize(sizeSelect.value) : null;
                if (step.sizeCards) {
                    $all('.gs-b-size', step.sizeCards).forEach(function (card) {
                        card.setAttribute('aria-pressed', sizeSelect && sizeSelect.value === card.dataset.value ? 'true' : 'false');
                    });
                }
                step.blackNote.hidden = !(size && size.blackOnly);
                if (colourSelect) {
                    setValue(step, [dot(swatchColour(colourSelect.value, true)), colourSelect.value + (size ? ' · ' + size.name : ''),
                        upcharge(chosenPrice(colourSelect)), upcharge(chosenPrice(sizeSelect))]);
                }
            }
            if (step.key === 'strap') {
                var strap = checkedStrap();
                (step.strapTiles || []).forEach(function (tile) {
                    tile.setAttribute('aria-pressed', tile.dataset.value === strap ? 'true' : 'false');
                });
                var picked = (step.strapTiles || []).filter(function (tile) { return tile.dataset.value === strap; })[0];
                var nodes = [];
                var picture = picked && $('img', picked);
                if (picture) { var thumb = el('img', 'gs-b-thumb'); thumb.src = picture.src; thumb.alt = ''; nodes.push(thumb); }
                nodes.push(strap || 'Choose');
                nodes.push(upcharge(strapPrice()));
                setValue(step, nodes);
            }
            if (step.key === 'length') {
                var input = lengthInput();
                drawLength(step);
                done = !!(input && input.value.trim());
                setValue(step, [done ? input.value.trim() : 'Required'], !done);
            }
            if (step.key === 'engraving') {
                var inputs = engravingInputs();
                var letters = inputs.reduce(function (sum, box) { return sum + (box ? lettersIn(box.value) : 0); }, 0);
                var price = $('.gs-engraving-price');
                drawEngraving(step);
                done = letters > 0;
                // Same look as Cork or a Mtn strap: the choice, then the green price badge
                // (Andrew, 2026-10-09). The price is grasssticks.js's own "($14)" note.
                var cost = price ? price.textContent.replace(/[()+\s]/g, '') : '';
                setValue(step, done
                    ? [letters + (letters === 1 ? ' letter' : ' letters'), upcharge(cost ? '+' + cost : '')]
                    : ['Optional']);
            }
            step.head.classList.toggle('gs-b-head--done', done);
        });
        updateRail();
        drawRail();
        pinPhoto();
    }

    function renderSoon() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(function () {
            render();
            // Ecwid sometimes settles a moment later (photo swap, price), so look again.
            setTimeout(render, 350);
            setTimeout(render, 1200);
        }, 30);
    }

    // Typing in Ecwid's boxes (length, engraving) redraws the summaries and preview.
    document.addEventListener('input', function (event) {
        if (!enabled() || !event.target.closest) return;
        if (event.target.closest('[data-gs-step]')) { foldPicks(); renderSoon(); }
    });
    // Photos load after a choice; redraw the pole beside the options when the main one does.
    document.addEventListener('load', function (event) {
        if (enabled() && event.target && event.target.tagName === 'IMG' && event.target.closest && event.target.closest('.details-gallery')) renderSoon();
    }, true);

    // ------------------------------------------------------------------ page handling

    function productIdFromUrl() {
        var match = /(?:\/p\/|-p)(\d+)/.exec(location.hash + ' ' + location.pathname);
        return match ? parseInt(match[1], 10) : null;
    }

    function start() {
        if (start.done) return;
        start.done = true;
        storeId = Ecwid.getOwnerId();

        Ecwid.OnPageLoaded.add(function (page) {
            token++;
            productId = page.type === 'PRODUCT' ? page.productId : null;
            teardown();
            if (!enabled()) return;
            var thisToken = token;
            var tries = 0;
            (function waitForOptions() {
                if (thisToken !== token) return;
                if ($('.product-details__product-options ' + STEPS[0].modules[0])) setup();
                else if (++tries < 20) setTimeout(waitForOptions, 500);
            })();
        });

        Ecwid.OnProductSelectedOptionsChanged.add(function () { renderSoon(); });

        // Loaded on a product page that is already showing (the first page, or a test).
        if (productId === null) productId = productIdFromUrl();
        if (enabled()) setup();
    }

    (function waitForEcwid(tries) {
        if (window.Ecwid && Ecwid.OnAPILoaded) {
            if (typeof Ecwid.getOwnerId === 'function' && Ecwid.getOwnerId()) start();
            else Ecwid.OnAPILoaded.add(start);
        } else if (tries < 100) {
            setTimeout(function () { waitForEcwid(tries + 1); }, 100);
        }
    })(0);
})();

/**
 * Grass Sticks storefront add-ons (v2). One file for both Ecwid stores.
 *
 * - Strap dropdown: collapses the long strap list into a dropdown that shows the chosen
 *   strap's picture, name and price.
 * - Engraving: counts engraving letters (spaces are free), limits each pole's text, and
 *   picks the matching choice in the hidden "Engraving Count" option.
 * - Size button: adds a "Click for sizing" link to the Length option.
 *
 * Prices are never calculated here. Ecwid prices every option itself (strap, grip,
 * engraving tier, quantity), so a price change or sale in Ecwid shows correctly without
 * touching this file. Features switch on by the options a product has, not by a list of
 * product numbers, so a new product works as soon as it has the right options in Ecwid.
 *
 * Replaces Cabot's apps: GSEngraving*, GSCondenseStrapOption*, GSSizeButton*.
 */
Ecwid.OnAPILoaded.add(function () {
    var STORE_ID = Ecwid.getOwnerId();
    var CANADA_STORE_ID = 125951011;

    var SIZE_CALCULATOR_URL = STORE_ID === CANADA_STORE_ID
        ? 'https://www.grasssticks.ca/skipolelengthcalc/'
        : 'https://www.grasssticks.com/skipolelengthcalc/';

    // Most characters that fit on one pole, spaces included (Andrew, 2026-09-18).
    var MAX_CHARACTERS_PER_POLE = 35;

    var SELECTORS = {
        strapOption: '.details-product-option--Strap',
        engravingPole1: '.details-product-option--Engraving input',
        engravingPole2: '.details-product-option--Engraving---Ski-Pole-2 input',
        engravingCount: '.details-product-option--Engraving-Count select',
        engravingTitle: '.details-product-option--Engraving .details-product-option__title',
        lengthTitle: '.details-product-option--Length-0028cm-or-inches0029 .product-details-module__title'
    };

    // ------------------------------------------------------------------ strap dropdown

    function setupStrapDropdown() {
        var option = document.querySelector(SELECTORS.strapOption);
        if (!option) return;
        var title = option.querySelector('.details-product-option__title');
        var content = option.querySelector('.product-details-module__content');
        if (!title || !content || content.dataset.gsStrapReady) return;
        content.dataset.gsStrapReady = '1';

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'gs-strap-toggle';
        title.parentNode.insertBefore(button, title.nextSibling);

        function selectedRadio() {
            return content.querySelector('input[type="radio"][name="Strap"]:checked');
        }

        // The strap's picture is whatever the store's custom CSS shows beside it in the list,
        // so strap pictures live in one place (Design, Custom CSS) and a new strap only needs
        // adding there.
        function pictureFor(radio) {
            var row = radio.closest('.form-control');
            if (!row) return '';
            var match = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(row, '::before').backgroundImage);
            return match ? match[1] : '';
        }

        function drawButton() {
            var radio = selectedRadio();
            while (button.firstChild) button.removeChild(button.firstChild);
            button.setAttribute('aria-label', radio ? 'Strap: ' + radio.value + '. Change strap' : 'Choose a strap');
            var label = document.createElement('span');
            label.className = 'gs-strap-text';
            if (radio) {
                var imageUrl = pictureFor(radio);
                if (imageUrl) {
                    var image = document.createElement('img');
                    image.className = 'gs-strap-image';
                    image.src = imageUrl;
                    image.alt = radio.value;
                    label.appendChild(image);
                }
                var name = document.createElement('span');
                name.className = 'gs-strap-name';
                name.textContent = radio.value;
                label.appendChild(name);
                // The surcharge text is Ecwid's own, so it is always the real price.
                var row = radio.closest('.form-control');
                var surcharge = row && row.querySelector('.option-surcharge__value');
                if (surcharge) {
                    var price = document.createElement('span');
                    price.className = 'gs-strap-price';
                    price.textContent = '(' + surcharge.textContent.trim() + ')';
                    label.appendChild(price);
                }
            }
            button.appendChild(label);
            var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrow.setAttribute('class', 'gs-strap-arrow');
            arrow.setAttribute('width', '12');
            arrow.setAttribute('height', '12');
            arrow.setAttribute('viewBox', '0 0 12 12');
            arrow.setAttribute('aria-hidden', 'true');
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M11 4L6 9 1 4');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'currentColor');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            arrow.appendChild(path);
            button.appendChild(arrow);
        }

        // Only one strap picker shows at a time (Andrew, 2026-09-18): the full list with
        // pictures, or, once a strap is picked, the closed button. Clicking the button
        // opens the list again (and hides the button).
        function collapse() {
            content.style.display = 'none';
            button.classList.remove('is-open');
            button.setAttribute('aria-expanded', 'false');
        }

        function expand() {
            content.style.display = '';
            button.classList.add('is-open');
            button.setAttribute('aria-expanded', 'true');
        }

        // One listener on the list, never on (or copies of) Ecwid's buttons, so Ecwid
        // keeps its own listeners and keeps pricing the strap.
        content.addEventListener('change', function (event) {
            if (event.target && event.target.name === 'Strap') {
                drawButton();
                collapse();
            }
        });
        button.addEventListener('click', expand);

        drawButton();
        expand(); // start open, like the store always has
    }

    // ------------------------------------------------------------------ engraving

    function parseTiers(select) {
        // Choices look like "0", "1-6", "7-8" ... Anything else is ignored.
        var tiers = [];
        for (var i = 0; i < select.options.length; i++) {
            var value = select.options[i].value;
            var range = /^(\d+)-(\d+)$/.exec(value);
            if (value === '0') tiers.push({ min: 0, max: 0, value: value });
            else if (range) tiers.push({ min: +range[1], max: +range[2], value: value });
        }
        return tiers;
    }

    function setupEngraving() {
        var select = document.querySelector(SELECTORS.engravingCount);
        if (!select || select.dataset.gsEngravingReady) return;
        var tiers = parseTiers(select);
        if (!tiers.length) return;
        select.dataset.gsEngravingReady = '1';

        var inputs = [SELECTORS.engravingPole1, SELECTORS.engravingPole2]
            .map(function (selector) { return document.querySelector(selector); })
            .filter(Boolean);
        if (!inputs.length) return;

        var mostLettersPriced = tiers.reduce(function (most, tier) { return Math.max(most, tier.max); }, 0);
        var lastGood = inputs.map(function (input) { return input.value; });

        function lettersIn(text) { return text.replace(/\s/g, '').length; }

        function tierFor(letters) {
            for (var i = 0; i < tiers.length; i++) {
                if (letters >= tiers[i].min && letters <= tiers[i].max) return tiers[i].value;
            }
            return null;
        }

        function note(input, text) {
            var box = input.closest('.form-control') || input.parentNode;
            var message = box.parentNode.querySelector('.gs-engraving-note');
            if (!message) {
                message = document.createElement('div');
                message.className = 'gs-engraving-note';
                box.parentNode.insertBefore(message, box.nextSibling);
            }
            message.textContent = text;
        }

        function setTier(value) {
            if (select.value === value) return;
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Live engraving price next to the "Engraving" title. The amount is Ecwid's own
        // text for each choice, e.g. "9-10 (+$16.50)", so it is always the real price in
        // the store's currency.
        function surchargeFor(value) {
            for (var i = 0; i < select.options.length; i++) {
                if (select.options[i].value !== value) continue;
                var match = /\(([^()]*)\)\s*$/.exec(select.options[i].text);
                return match ? match[1] : '';
            }
            return '';
        }
        var cheapestTier = tiers.filter(function (tier) { return tier.min > 0; })[0];
        var startingPrice = cheapestTier ? surchargeFor(cheapestTier.value) : '';
        var title = document.querySelector(SELECTORS.engravingTitle);
        var priceLabel = document.createElement('span');
        priceLabel.className = 'gs-engraving-price';

        function showPrice(tier) {
            if (!title) return;
            var price = tier === '0' ? startingPrice : surchargeFor(tier);
            price = price.replace(/^\+\s*/, ''); // "+$14" -> "$14" (Andrew, 2026-09-18)
            priceLabel.textContent = price ? '(' + price + ')' : '';
            if (!title.contains(priceLabel)) title.appendChild(priceLabel);
        }

        var limitReached = false;

        function update(changedIndex) {
            var input = inputs[changedIndex];
            if (input.value.length > MAX_CHARACTERS_PER_POLE) {
                input.value = input.value.slice(0, MAX_CHARACTERS_PER_POLE);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return; // the event above runs update() again with the trimmed text
            }
            var letters = inputs.reduce(function (sum, box) { return sum + lettersIn(box.value); }, 0);
            var tier = tierFor(letters);
            if (tier === null) {
                // More letters than the store has a price for: undo this keystroke/paste so
                // the order can never carry engraving that isn't charged.
                input.value = lastGood[changedIndex];
                limitReached = true;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                return; // the event above runs update() again with the old text
            }
            lastGood[changedIndex] = input.value;
            // Short on purpose (Andrew): "0 of 35", "12 of 35".
            note(input, limitReached
                ? 'Max ' + mostLettersPriced + ' letters. Contact us for more.'
                : input.value.length + ' of ' + MAX_CHARACTERS_PER_POLE);
            limitReached = false;
            setTier(tier);
            showPrice(tier);
        }

        inputs.forEach(function (input, index) {
            input.maxLength = MAX_CHARACTERS_PER_POLE;
            if (inputs.length > 1) input.placeholder = 'Ski Pole ' + (index + 1);
            input.addEventListener('input', function () { update(index); });
        });
        // Text can already be there (for example after the back button): price it now,
        // and give every box its note so nothing jumps when the shopper starts typing.
        inputs.forEach(function (input, index) { update(index); });
    }

    // ------------------------------------------------------------------ size button

    function setupSizeButton() {
        var title = document.querySelector(SELECTORS.lengthTitle);
        if (!title || title.querySelector('.gs-sizing-button')) return;
        var link = document.createElement('a');
        link.className = 'gs-sizing-button';
        link.textContent = 'Click for sizing';
        link.href = SIZE_CALCULATOR_URL;
        link.target = '_blank';
        link.rel = 'noopener';
        title.appendChild(link);
    }

    // ------------------------------------------------------------------ page handling

    function setupProductPage() {
        setupStrapDropdown();
        setupEngraving();
        setupSizeButton();
    }

    var pageLoadCount = 0;

    Ecwid.OnPageLoaded.add(function (page) {
        pageLoadCount++;
        if (page.type !== 'PRODUCT') return;
        var thisLoad = pageLoadCount;
        var tries = 0;
        (function waitForOptions() {
            if (thisLoad !== pageLoadCount) return; // shopper moved on
            if (document.querySelector('.product-details__product-options, .details-product-option')) {
                setupProductPage();
            } else if (++tries < 20) {
                setTimeout(waitForOptions, 500); // give up after 10 seconds
            }
        })();
    });

    // If Ecwid redraws part of the options, set up whatever is missing again.
    Ecwid.OnProductSelectedOptionsChanged.add(function () {
        setTimeout(setupProductPage, 0);
    });
});

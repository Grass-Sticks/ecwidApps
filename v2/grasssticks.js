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

    // Pictures for the collapsed strap button. The strap list itself gets its pictures
    // from the store's custom CSS. A strap missing here just shows its name.
    var STRAP_IMAGES = {
        'Salida Magic': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/11473b8440ac88cdd06789823e08511768ecac35.png',
        'Wasatch Front': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/aaaf04823849ce69bb21158001fe2bc909ed60ad.png',
        'Autumn': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/f2ad194c3b2b26091a5cce7ba258d4e2779b1dc7.png',
        'Bridgers': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/f5903867c8640bb53b5aab87e5468e9099087ac3.png',
        'Mount Tam': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/cfb0b1dcd7fa27eeeb9531cafc773f39fd53e8b2.png',
        'Flow': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/3586dac16e7ae760735b39966514b7ac4142c629.png',
        'Idaho 9': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/fac842e98aa70987445710d32d903a83d4e491e5.png',
        'Dark Side': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/e5f95d4c13928f6dad040e4473e1e5ee94394c0e.png',
        'Lone Peak': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/8f612d42e4877ec6535aadaf327636628411afcd.png',
        'Teton': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/50b9b3081acc108626749805f63893d7228b26ad.png',
        'The Grand': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/5b0ae3f0d2be85eb8f907c1205b0aedaef5d6084.png',
        'Spanish Peaks': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/fc10b4558a9db9928e6dc9e5a079ea4ec230d8af.png',
        'Mary Jane': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/1cc7def11bdedfbe45185ee299995a6e36719d43.png',
        'Purple Haze': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/6cb063dc3114e43e8d267cda4134d1b26ce97787.png',
        'Just Point It - Zia': 'https://v2uploads.zopim.io/3/e/F/3eFaiNrwYkfEtd5mb7bCEBxsvUWHUH4R/2fcd0c0d39c6bfd9b4389befe417ae9dbc8228a1.png',
        'Lone 2': 'https://i.ibb.co/0yM4vrm/Lone-2.png',
        'Sacagawea': 'https://i.ibb.co/RYML6RB/Sacagawea.png',
        'Fixed': 'https://i.ibb.co/ZHQ6bmV/fixed.jpg',
        'Adjustable': 'https://i.ibb.co/3Rp9vLm/adjustable.jpg',
        'Fantasia': 'https://i.ibb.co/LhC46k9R/fantasia-Strap-Edites.png'
    };

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
        button.className = 'strap-dropdown-toggle';
        button.style.setProperty('display', 'none', 'important');
        title.parentNode.insertBefore(button, title.nextSibling);

        function selectedRadio() {
            return content.querySelector('input[type="radio"][name="Strap"]:checked');
        }

        function drawButton() {
            var radio = selectedRadio();
            while (button.firstChild) button.removeChild(button.firstChild);
            button.setAttribute('aria-label', radio ? 'Strap: ' + radio.value + '. Change strap' : 'Choose a strap');
            var label = document.createElement('span');
            label.className = 'strap-dropdown-text';
            if (radio) {
                var imageUrl = STRAP_IMAGES[radio.value.trim()];
                if (imageUrl) {
                    var image = document.createElement('img');
                    image.className = 'strap-dropdown-image';
                    image.src = imageUrl;
                    image.alt = radio.value;
                    label.appendChild(image);
                }
                var name = document.createElement('span');
                name.className = 'strap-dropdown-name';
                name.textContent = radio.value;
                label.appendChild(name);
                // The surcharge text is Ecwid's own, so it is always the real price.
                var row = radio.closest('.form-control');
                var surcharge = row && row.querySelector('.option-surcharge__value');
                if (surcharge) {
                    var price = document.createElement('span');
                    price.className = 'strap-dropdown-price';
                    price.textContent = '(' + surcharge.textContent.trim() + ')';
                    label.appendChild(price);
                }
            }
            button.appendChild(label);
            var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            arrow.setAttribute('class', 'strap-dropdown-arrow');
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

        function collapse() {
            content.style.visibility = 'hidden';
            content.style.maxHeight = '0';
            content.style.overflow = 'hidden';
            button.style.setProperty('display', 'flex', 'important');
            button.setAttribute('aria-expanded', 'false');
        }

        function expand() {
            content.style.visibility = 'visible';
            content.style.maxHeight = 'none';
            content.style.overflow = 'visible';
            button.style.setProperty('display', 'none', 'important');
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
            note(input, limitReached
                ? 'Engraving is limited to ' + mostLettersPriced + ' letters in total. Contact us for more.'
                : input.value
                    ? input.value.length + ' of ' + MAX_CHARACTERS_PER_POLE + ' characters'
                    : 'Up to ' + MAX_CHARACTERS_PER_POLE + ' characters');
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
        if (!title || title.querySelector('.length-sizing-button')) return;
        var link = document.createElement('a');
        link.className = 'length-sizing-button';
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

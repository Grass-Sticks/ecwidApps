/**
 * Grass Sticks storefront add-ons (v2). One file for both Ecwid stores.
 *
 * - Strap dropdown: collapses the long strap list into a dropdown that shows the chosen
 *   strap's picture, name and price.
 * - Engraving: counts engraving letters (spaces are free), limits each pole's text, and
 *   picks the matching choice in the hidden "Engraving Count" option.
 * - Size button: adds a "Click for sizing" link to the Length option.
 * - Basket colour: picks Black and greys out the other colours for the basket sizes that
 *   only come in black.
 *
 * Prices are never calculated here. Ecwid prices every option itself (strap, grip,
 * engraving tier, quantity), so a price change or sale in Ecwid shows correctly without
 * touching this file. Features switch on by the options a product has, not by a list of
 * product numbers, so a new product works as soon as it has the right options in Ecwid.
 *
 * Replaces Cabot's apps: GSEngraving*, GSCondenseStrapOption*, GSSizeButton*.
 *
 * Also loads the pole builder (builder.js + builder.css, next to this file). It decides
 * for itself which products it runs on (BUILDER_PRODUCTS in builder.js).
 */
(function loadBuilder() {
    var me = document.currentScript;
    var base = me && me.src ? me.src.replace(/grasssticks\.js(\?.*)?$/, '') : 'https://apps.grasssticks.com/';
    var style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = base + 'builder.css';
    document.head.appendChild(style);
    var script = document.createElement('script');
    script.src = base + 'builder.js';
    script.async = true;
    document.head.appendChild(script);
})();

Ecwid.OnAPILoaded.add(function () {
    var STORE_ID = Ecwid.getOwnerId();
    var CANADA_STORE_ID = 125951011;

    var SIZE_CALCULATOR_URL = STORE_ID === CANADA_STORE_ID
        ? 'https://www.grasssticks.ca/skipolelengthcalc/'
        : 'https://www.grasssticks.com/skipolelengthcalc/';

    // Most characters that fit on one pole, spaces included (Andrew, 2026-09-18).
    var MAX_CHARACTERS_PER_POLE = 35;

    // Counts up on every page the shopper opens. Used to tell "already set up on THIS page"
    // from "set up on the product before this one", because Ecwid reuses the elements.
    var pageToken = 0;

    var SELECTORS = {
        strapOption: '.details-product-option--Strap',
        engravingPole1: '.details-product-option--Engraving input',
        engravingPole2: '.details-product-option--Engraving---Ski-Pole-2 input',
        engravingPole2Option: '.details-product-option--Engraving---Ski-Pole-2',
        engravingCount: '.details-product-option--Engraving-Count select',
        engravingTitle: '.details-product-option--Engraving .details-product-option__title',
        lengthTitle: '.details-product-option--Length-0028cm-or-inches0029 .product-details-module__title'
    };

    // ------------------------------------------------------------------ strap dropdown

    // Ecwid REUSES the option elements from one product page to the next, so nothing here
    // may assume "set up once, stays set up". Every piece looks the page up again, and the
    // page token below decides whether this page view has been set up yet.
    // (A stale engraving price was found live on 2026-10-07 because of this.)
    function strapParts() {
        var option = document.querySelector(SELECTORS.strapOption);
        if (!option) return null;
        var title = option.querySelector('.details-product-option__title');
        var content = option.querySelector('.product-details-module__content');
        if (!title || !content) return null;
        return {
            option: option,
            title: title,
            content: content,
            button: option.querySelector('.gs-strap-toggle')
        };
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

    function setupStrapDropdown() {
        var parts = strapParts();
        if (!parts) return;
        if (parts.content.dataset.gsStrapToken === String(pageToken)) return;
        parts.content.dataset.gsStrapToken = String(pageToken);

        var leftOver = parts.option.querySelectorAll('.gs-strap-toggle');
        for (var old = 0; old < leftOver.length; old++) {
            leftOver[old].parentNode.removeChild(leftOver[old]);
        }

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'gs-strap-toggle';
        parts.title.parentNode.insertBefore(button, parts.title.nextSibling);
        parts.button = button;

        alignStrapRows(parts);
        drawStrapButton(parts);
        expandStrap(parts); // start open, like the store always has
    }

    // Straps with no picture ("None") would otherwise start at the far left, out of line
    // with the rest. Indent them by the picture's own width and gap, measured from a row
    // that has one, so it stays right if the picture size changes in the store CSS.
    // Rows whose radio button is hidden are the sub-headers ("Adjustable Mtn Straps:"),
    // and they are left alone.
    function alignStrapRows(parts) {
        var radios = parts.content.querySelectorAll('input[type="radio"][name="Strap"]');
        var indent = '';
        for (var i = 0; i < radios.length; i++) {
            var withPicture = radios[i].closest('.form-control');
            if (!withPicture) continue;
            var pictureStyle = getComputedStyle(withPicture, '::before');
            if (!pictureStyle.backgroundImage || pictureStyle.backgroundImage === 'none') continue;
            var width = parseFloat(pictureStyle.width) || 0;
            if (!width) continue;
            indent = (width + (parseFloat(pictureStyle.marginRight) || 0)) + 'px';
            break;
        }
        if (!indent) return;
        for (var j = 0; j < radios.length; j++) {
            var row = radios[j].closest('.form-control');
            if (!row) continue;
            var style = getComputedStyle(row, '::before');
            var hasPicture = style.backgroundImage && style.backgroundImage !== 'none';
            var wrap = row.querySelector('.form-control__radio-wrap');
            var radioShown = wrap && getComputedStyle(wrap).display !== 'none';
            row.style.paddingLeft = (!hasPicture && radioShown) ? indent : '';
        }
    }

    function drawStrapButton(parts) {
            var button = parts.button;
            var radio = parts.content.querySelector('input[type="radio"][name="Strap"]:checked');
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
    function collapseStrap(parts) {
        parts.content.style.display = 'none';
        parts.button.classList.remove('is-open');
        parts.button.setAttribute('aria-expanded', 'false');
    }

    function expandStrap(parts) {
        parts.content.style.display = '';
        parts.button.classList.add('is-open');
        parts.button.setAttribute('aria-expanded', 'true');
    }

    // ------------------------------------------------------------------ strap on the pole photo

    // Picking a Mtn strap shows that real strap on the pole photo, over whatever grip and
    // basket colour Ecwid is showing. Each picture in strap-photos/ is the strap cut out of
    // its MTN Straps photo (US product 116311087), tucked behind the grip, plus white paint
    // over the cream strap underneath. It only lines up on the Original pole shot (every grip
    // and basket colour is that one 3052x6972 photo recoloured, with the cream strap in the
    // same place), so it runs only on the products listed here and only on that photo size.
    // box = left, top, width, height as fractions of the photo. Keys are the exact Strap
    // option value. No pole photo yet for Lone 2, Sacagawea and Fantasia: they keep the
    // cream strap. The pictures are made with strap-photo-tool/ in Andrew's notes folder.
    var STRAP_PHOTO_BASE = 'https://apps.grasssticks.com/strap-photos/';
    var STRAP_PHOTO_PRODUCTS = [865875809];
    var STRAP_PHOTO_SIZE = { width: '3052', height: '6972' };
    var STRAP_PHOTOS = {
        'Bridgers':       { file: 'bridgers.webp', box: [0.51278, 0.03701, 0.2844, 0.14716] },
        'Dark Side':      { file: 'dark-side.webp', box: [0.51278, 0.03758, 0.2844, 0.15132] },
        'Flow':           { file: 'flow.webp', box: [0.51278, 0.03772, 0.2844, 0.14329] },
        'Idaho 9':        { file: 'idaho-9.webp', box: [0.51278, 0.03873, 0.2844, 0.14013] },
        'Lone Peak':      { file: 'lone-peak.webp', box: [0.51278, 0.0383, 0.2844, 0.13052] },
        'Mount Tam':      { file: 'mount-tam.webp', box: [0.51278, 0.0403, 0.29653, 0.1321] },
        'Purple Haze':    { file: 'purple-haze.webp', box: [0.51278, 0.03701, 0.2844, 0.1562] },
        'Spanish Peaks':  { file: 'spanish-peaks.webp', box: [0.51278, 0.03571, 0.2844, 0.14859] },
        'Teton':          { file: 'teton.webp', box: [0.51278, 0.03858, 0.2844, 0.15146] },
        'The Grand':      { file: 'the-grand.webp', box: [0.51278, 0.03815, 0.2844, 0.15333] },
        'Wasatch Front':  { file: 'wasatch-front.webp', box: [0.51278, 0.04002, 0.29161, 0.1463] }
    };

    var currentProductId = null;

    // The chosen strap's picture, or null if it has none or this product isn't listed.
    function chosenStrapPhoto() {
        if (STRAP_PHOTO_PRODUCTS.indexOf(currentProductId) < 0) return null;
        var radio = document.querySelector('input[type="radio"][name="Strap"]:checked');
        return (radio && STRAP_PHOTOS[radio.value]) || null;
    }

    function strapLayer(holder, strap) {
        var layer = holder.querySelector('.gs-strap-photo');
        if (!layer) {
            layer = document.createElement('img');
            layer.className = 'gs-strap-photo';
            layer.alt = '';
            layer.setAttribute('aria-hidden', 'true');
            holder.appendChild(layer);
        }
        var src = STRAP_PHOTO_BASE + strap.file;
        if (layer.getAttribute('src') !== src) layer.setAttribute('src', src);
        return layer;
    }

    // On phones Ecwid shows a swipeable gallery instead, where the first photo is a smaller
    // copy drawn as a background picture ("contain", centred) on a link. The original photo's
    // size is only on the link's wrapper: its aspect-ratio (width / height) and its
    // min-height ("min(6972px, 100%)"). The strap goes in a frame the size of the drawn
    // photo, so the same box fractions fit.
    function phoneStrapFrame(link) {
        var wrapper = link.parentNode;
        var ratio = /^\s*([\d.]+)\s*\/\s*([\d.]+)/.exec(wrapper.style.aspectRatio || '');
        var tall = /([\d.]+)px/.exec(wrapper.style.minHeight || '');
        if (!ratio || !tall) return null;
        var photoH = parseFloat(tall[1]);
        var photoW = Math.round(photoH * parseFloat(ratio[1]) / parseFloat(ratio[2]));
        if (String(photoW) !== STRAP_PHOTO_SIZE.width || String(photoH) !== STRAP_PHOTO_SIZE.height) return null;
        var boxW = link.clientWidth;
        var boxH = link.clientHeight;
        if (!boxW || !boxH) return null;
        var scale = Math.min(boxW / photoW, boxH / photoH);
        var drawnW = photoW * scale;
        var drawnH = photoH * scale;
        var frame = link.querySelector('.gs-strap-frame');
        if (!frame) {
            frame = document.createElement('span');
            frame.className = 'gs-strap-frame';
            link.appendChild(frame);
        }
        frame.style.left = ((boxW - drawnW) / 2 / boxW * 100) + '%';
        frame.style.top = ((boxH - drawnH) / 2 / boxH * 100) + '%';
        frame.style.width = (drawnW / boxW * 100) + '%';
        frame.style.height = (drawnH / boxH * 100) + '%';
        return frame;
    }

    function updateStrapPhoto() {
        // The first picture in the gallery is the one Ecwid swaps for grip and basket colour.
        var picture = document.querySelector('.details-gallery__main-image-wrapper .details-gallery__photoswipe-index-0');
        var strap = chosenStrapPhoto();
        var fits = strap && picture &&
            picture.getAttribute('width') === STRAP_PHOTO_SIZE.width &&
            picture.getAttribute('height') === STRAP_PHOTO_SIZE.height;
        // The strap goes on the photo, and again on Ecwid's hover zoom, which is a magnified
        // copy of the photo laid over it (the box fractions fit both).
        var holders = [];
        if (fits) {
            holders.push(picture.parentNode);
            var zoom = picture.parentNode.parentNode.querySelector('.details-gallery__images-zoom');
            if (zoom) holders.push(zoom);
        } else if (strap && !picture) {
            var links = document.querySelectorAll('.details-gallery__photoswipe-thumb-index-0 .details-gallery__thumb-img');
            for (var k = 0; k < links.length; k++) {
                var frame = phoneStrapFrame(links[k]);
                if (frame) holders.push(frame);
            }
        }

        var leftOver = document.querySelectorAll('.details-gallery .gs-strap-photo');
        for (var i = 0; i < leftOver.length; i++) {
            if (holders.indexOf(leftOver[i].parentNode) >= 0) continue;
            leftOver[i].parentNode.removeChild(leftOver[i]);
        }
        var emptyFrames = document.querySelectorAll('.details-gallery .gs-strap-frame');
        for (var f = 0; f < emptyFrames.length; f++) {
            if (holders.indexOf(emptyFrames[f]) < 0) emptyFrames[f].parentNode.removeChild(emptyFrames[f]);
        }

        for (var j = 0; j < holders.length; j++) {
            var layer = strapLayer(holders[j], strap);
            layer.style.left = (strap.box[0] * 100) + '%';
            layer.style.top = (strap.box[1] * 100) + '%';
            layer.style.width = (strap.box[2] * 100) + '%';
            layer.style.height = (strap.box[3] * 100) + '%';
        }
    }

    // Ecwid redraws the gallery a moment after an option changes, sometimes after we have
    // run, so check again shortly after.
    function updateStrapPhotoSoon() {
        updateStrapPhoto();
        setTimeout(updateStrapPhoto, 300);
        setTimeout(updateStrapPhoto, 1000);
    }

    // Clicking the photo opens Ecwid's full-screen viewer (PhotoSwipe), which shows its own
    // copy of each photo at a pixel size it sets on the picture (and changes when zooming in).
    // The strap goes inside the same wrapper, so it slides with the photo. Placeholders (the blurry copy shown
    // while the real one loads) are skipped, and the photo size is checked once it has loaded.
    function updateViewerStrap() {
        var strap = chosenStrapPhoto();
        var pictures = document.querySelectorAll('.pswp__img:not(.pswp__img--placeholder)');
        var holders = [];
        for (var i = 0; i < pictures.length; i++) {
            var picture = pictures[i];
            if (!strap || String(picture.naturalWidth) !== STRAP_PHOTO_SIZE.width ||
                String(picture.naturalHeight) !== STRAP_PHOTO_SIZE.height) continue;
            var width = parseFloat(picture.style.width);
            var height = parseFloat(picture.style.height);
            if (!width || !height) continue;
            var layer = strapLayer(picture.parentNode, strap);
            layer.style.left = (strap.box[0] * width) + 'px';
            layer.style.top = (strap.box[1] * height) + 'px';
            layer.style.width = (strap.box[2] * width) + 'px';
            layer.style.height = (strap.box[3] * height) + 'px';
            holders.push(picture.parentNode);
        }
        var leftOver = document.querySelectorAll('.pswp .gs-strap-photo');
        for (var j = 0; j < leftOver.length; j++) {
            if (holders.indexOf(leftOver[j].parentNode) < 0) leftOver[j].parentNode.removeChild(leftOver[j]);
        }
    }

    // The viewer has no event to listen to, so after a click on the gallery, keep the strap
    // in step a few times a second while the viewer is open (it resizes and swaps photos),
    // and stop once it closes, or after 3 seconds if it never opened.
    var viewerTimer = null;

    function watchViewer() {
        if (viewerTimer) clearInterval(viewerTimer);
        var started = Date.now();
        var seenOpen = false;
        viewerTimer = setInterval(function () {
            var open = !!document.querySelector('.pswp--open');
            if (open) seenOpen = true;
            if ((!open && seenOpen) || (!seenOpen && Date.now() - started > 3000)) {
                clearInterval(viewerTimer);
                viewerTimer = null;
            }
            updateViewerStrap();
        }, 250);
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

    // Everything about the engraving boxes on the product page being shown right now.
    // Rebuilt on every product page, because Ecwid hands the next product the same boxes.
    var engraving = null;

    function lettersIn(text) { return text.replace(/\s/g, '').length; }

    // The amount is Ecwid's own text for each choice, e.g. "9-10 (+$16.50)", so it is
    // always the real price in the store's currency.
    function surchargeFor(select, value) {
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value !== value) continue;
            var match = /\(([^()]*)\)\s*$/.exec(select.options[i].text);
            return match ? match[1] : '';
        }
        return '';
    }

    function amountIn(text) {
        var amount = parseFloat(String(text).replace(/[^0-9.]/g, ''));
        return isNaN(amount) ? null : amount;
    }

    function engravingNote(input, text) {
        var box = input.closest('.form-control') || input.parentNode;
        var message = box.parentNode.querySelector('.gs-engraving-note');
        if (!message) {
            message = document.createElement('div');
            message.className = 'gs-engraving-note';
            box.parentNode.insertBefore(message, box.nextSibling);
        }
        message.textContent = text;
    }

    function showEngravingPrice(tier) {
        var state = engraving;
        if (!state || !state.title) return;
        var price = tier === '0' ? state.startingPrice : surchargeFor(state.select, tier);
        price = price.replace(/^\+\s*/, ''); // "+$14" -> "$14" (Andrew, 2026-09-18)
        state.priceLabel.textContent = price ? '(' + price + ')' : '';
        if (!state.title.contains(state.priceLabel)) state.title.appendChild(state.priceLabel);
    }

    function updateEngraving(changedIndex) {
        var state = engraving;
        if (!state) return;
        var input = state.inputs[changedIndex];
        if (!input) return;
        if (input.value.length > MAX_CHARACTERS_PER_POLE) {
            input.value = input.value.slice(0, MAX_CHARACTERS_PER_POLE);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return; // the event above runs this again with the trimmed text
        }
        var letters = state.inputs.reduce(function (sum, box) { return sum + lettersIn(box.value); }, 0);
        var tier = null;
        for (var i = 0; i < state.tiers.length; i++) {
            if (letters >= state.tiers[i].min && letters <= state.tiers[i].max) {
                tier = state.tiers[i].value;
                break;
            }
        }
        if (tier === null) {
            // More letters than the store has a price for: undo this keystroke/paste so
            // the order can never carry engraving that isn't charged.
            input.value = state.lastGood[changedIndex];
            state.limitReached = true;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return; // the event above runs this again with the old text
        }
        state.lastGood[changedIndex] = input.value;
        // Short on purpose (Andrew): "0 of 35", "12 of 35".
        engravingNote(input, state.limitReached
            ? 'Max ' + state.mostLettersPriced + ' letters. Contact us for more.'
            : input.value.length + ' of ' + MAX_CHARACTERS_PER_POLE);
        state.limitReached = false;
        if (state.select.value !== tier) {
            state.select.value = tier;
            state.select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        showEngravingPrice(tier);
    }

    function setupEngraving() {
        var select = document.querySelector(SELECTORS.engravingCount);
        if (!select) return;
        if (select.dataset.gsEngravingToken === String(pageToken)) return;
        var tiers = parseTiers(select);
        if (!tiers.length) return;
        var inputs = [SELECTORS.engravingPole1, SELECTORS.engravingPole2]
            .map(function (selector) { return document.querySelector(selector); })
            .filter(Boolean);
        if (!inputs.length) return;
        select.dataset.gsEngravingToken = String(pageToken);

        // Clear anything left behind on the product page before this one.
        var stale = document.querySelectorAll('.gs-engraving-note, .gs-engraving-rate, .gs-engraving-price');
        for (var s = 0; s < stale.length; s++) stale[s].parentNode.removeChild(stale[s]);

        var priceLabel = document.createElement('span');
        priceLabel.className = 'gs-engraving-price';
        var pricedTiers = tiers.filter(function (tier) { return tier.min > 0; });

        engraving = {
            select: select,
            inputs: inputs,
            tiers: tiers,
            lastGood: inputs.map(function (input) { return input.value; }),
            limitReached: false,
            mostLettersPriced: tiers.reduce(function (most, tier) { return Math.max(most, tier.max); }, 0),
            title: document.querySelector(SELECTORS.engravingTitle),
            priceLabel: priceLabel,
            startingPrice: pricedTiers.length ? surchargeFor(select, pricedTiers[0].value) : ''
        };

        // One short line under the title explaining the extra cost, e.g. "+$1.25 per 2
        // letters over 6". Worked out from Ecwid's own prices for the first two tiers, so it
        // is never out of date and shows each store's currency. Replaces the hand-typed
        // "Over 6 characters: ..." line in the store's custom CSS.
        if (pricedTiers.length > 1 && typeof Ecwid.formatCurrency === 'function') {
            var firstPrice = amountIn(surchargeFor(select, pricedTiers[0].value));
            var nextPrice = amountIn(surchargeFor(select, pricedTiers[1].value));
            var lettersPerStep = pricedTiers[1].max - pricedTiers[1].min + 1;
            var box = inputs[0].closest('.product-details-module__content');
            if (firstPrice !== null && nextPrice > firstPrice && box) {
                var rate = document.createElement('div');
                rate.className = 'gs-engraving-rate';
                rate.textContent = '+' + Ecwid.formatCurrency(Math.round((nextPrice - firstPrice) * 100) / 100) +
                    ' per ' + lettersPerStep + ' letters over ' + pricedTiers[0].max;
                box.insertBefore(rate, box.firstChild);
            }
        }

        inputs.forEach(function (input, index) {
            input.maxLength = MAX_CHARACTERS_PER_POLE;
            if (inputs.length > 1) input.placeholder = 'Ski Pole ' + (index + 1);
        });
        // Text can already be there (for example after the back button): price it now,
        // and give every box its note so nothing jumps when the shopper starts typing.
        inputs.forEach(function (input, index) { updateEngraving(index); });
    }

    // Some products (Trekking) sell as one stick or a pair, through a "Quantity" option.
    // A single stick has nothing to engrave on a second pole, so hide that box and clear
    // anything already typed in it, which also takes those letters off the price.
    function syncSecondPole() {
        var option = document.querySelector(SELECTORS.engravingPole2Option);
        if (!option) return;
        var picked = document.querySelector('.details-product-option--Quantity input[type="radio"]:checked');
        var singleStick = !!(picked && /single/i.test(picked.value));
        option.style.display = singleStick ? 'none' : '';
        if (!engraving) return;
        if (singleStick && engraving.inputs.length > 1 && engraving.inputs[1].value) {
            engraving.inputs[1].value = '';
            engraving.inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        }
        // With only one pole there is nothing to number, so drop the "Ski Pole 1" hint.
        if (engraving.inputs.length > 1) {
            engraving.inputs[0].placeholder = singleStick ? '' : 'Ski Pole 1';
        }
    }

    // ------------------------------------------------------------------ basket colour

    // Some basket sizes only come in black (Tiny Disc, Huge Powder). Their choice in Ecwid
    // says so, e.g. 'Huge Powder Basket- 4.75" (black only)'. When one is picked, set Basket
    // Color to Black and grey out the other colours (the menu still opens, so the shopper
    // can see why), so the order says what we will actually ship. Picking a size that comes
    // in colours brings the colours back and puts back the colour the shopper had.
    // Works off the "(black only)" wording, so any product or store that uses it is covered.
    // (Andrew, 2026-10-08: shoppers kept thinking these baskets were sold out.)
    var BASKET_NOTE = 'Switch to Medium for colors';
    var SWITCH_TO_COLOURS = 'gs-switch-to-medium'; // the menu line's value, never a colour

    function basketSelect(name) {
        return document.querySelector('[class*="details-product-option--Basket-' + name + '"] select');
    }

    function blackChoice(select) {
        for (var i = 0; i < select.options.length; i++) {
            if (/^black$/i.test(select.options[i].value)) return select.options[i].value;
        }
        return null;
    }

    function pickBasketColour(select, value) {
        if (select.value === value) return;
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function syncBasketColour() {
        var size = basketSelect('Size');
        var colour = basketSelect('Col'); // "Color" or "Colour"
        if (!size || !colour) return;
        var black = blackChoice(colour);
        if (!black) return;
        var box = colour.closest('.product-details-module__content') || colour.parentNode;
        var note = box.querySelector('.gs-basket-note');
        var blackOnly = /black only/i.test(size.value);

        if (blackOnly) {
            if (!colour.dataset.gsBlackOnly) colour.dataset.gsColourBefore = colour.value;
            colour.dataset.gsBlackOnly = 'yes';
            greyOutColours(colour, black);
            pickBasketColour(colour, black);
            if (!note) {
                note = document.createElement('div');
                note.className = 'gs-basket-note';
                box.appendChild(note);
            }
            note.textContent = BASKET_NOTE + '.';
            return;
        }

        if (note) note.parentNode.removeChild(note);
        if (!colour.dataset.gsBlackOnly) return;
        delete colour.dataset.gsBlackOnly;
        greyOutColours(colour, null);
        var before = colour.dataset.gsColourBefore;
        delete colour.dataset.gsColourBefore;
        if (before) pickBasketColour(colour, before);
    }

    // Picking the "Switch to Medium for colors" line in the colour menu switches Basket Size
    // to the first size that comes in colours (Medium), which brings the colours back.
    // Ecwid must never see this line as a colour, so its change is stopped before Ecwid's
    // own listener and the menu is put back on Black first.
    function switchToColourSize(colour) {
        var size = basketSelect('Size');
        var black = blackChoice(colour);
        if (black) colour.value = black;
        if (!size) return;
        for (var i = 0; i < size.options.length; i++) {
            var option = size.options[i];
            if (/medium/i.test(option.value) && !/black only/i.test(option.value)) {
                size.value = option.value;
                size.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
        }
    }

    // Greys out every colour except `keep` (null brings them all back), and puts the
    // "Switch to Medium for colors" line at the top of the menu. Only touches the colours it
    // greyed itself, so anything Ecwid greys out stays as Ecwid set it.
    function greyOutColours(select, keep) {
        var menuNote = select.querySelector('option[data-gs-menu-note]');
        if (keep !== null && !menuNote) {
            menuNote = document.createElement('option');
            menuNote.dataset.gsMenuNote = 'yes';
            menuNote.value = SWITCH_TO_COLOURS;
            menuNote.textContent = BASKET_NOTE;
            select.insertBefore(menuNote, select.firstChild);
        } else if (keep === null && menuNote) {
            select.removeChild(menuNote);
        }
        for (var i = 0; i < select.options.length; i++) {
            var option = select.options[i];
            if (option.dataset.gsMenuNote) continue;
            if (keep !== null && option.value !== keep) {
                if (!option.disabled) {
                    option.disabled = true;
                    option.dataset.gsGreyed = 'yes';
                }
            } else if (option.dataset.gsGreyed) {
                option.disabled = false;
                delete option.dataset.gsGreyed;
            }
        }
    }

    // ------------------------------------------------------------------ size button

    function setupSizeButton() {
        var title = document.querySelector(SELECTORS.lengthTitle);
        if (!title) return;
        if (title.querySelector('.gs-sizing-button')) return; // Ecwid kept ours: leave it
        var link = document.createElement('a');
        link.className = 'gs-sizing-button';
        link.textContent = 'Click for sizing';
        link.href = SIZE_CALCULATOR_URL;
        link.target = '_blank';
        link.rel = 'noopener';
        title.appendChild(link);
    }

    // ------------------------------------------------------------------ gift card note

    // Gift cards include the recipient's shipping. When one is in the cart, say so right
    // under the cart summary, beside the shipping charge. (Express buttons like Google Pay
    // and PayPal skip Ecwid's shipping step, so the summary is the one place every buyer
    // sees.) A gift card is any item with a "Gift Card Type" option, in either store.
    var GIFT_CARD_OPTION = 'Gift Card Type';

    function updateGiftCardNote() {
        Ecwid.Cart.get(function (cart) {
            var hasGiftCard = (cart.items || []).some(function (item) {
                return item.options && Object.prototype.hasOwnProperty.call(item.options, GIFT_CARD_OPTION);
            });
            var summary = document.querySelector('.ec-cart__summary');
            var note = document.querySelector('.gs-giftcard-note');
            if (!hasGiftCard || !summary) {
                if (note) note.parentNode.removeChild(note);
                return;
            }
            if (note && note.previousElementSibling === summary) return;
            if (note) note.parentNode.removeChild(note);
            note = document.createElement('div');
            note.className = 'gs-giftcard-note';
            var lead = document.createElement('strong');
            lead.textContent = 'Gift card in your cart: ';
            note.appendChild(lead);
            note.appendChild(document.createTextNode(
                "this shipping charge covers your recipient's order. They'll pay nothing for shipping when they order."));
            summary.parentNode.insertBefore(note, summary.nextSibling);
        });
    }

    function isCartOrCheckout(page) {
        return page.type === 'CART' || page.type.indexOf('CHECKOUT') === 0;
    }

    // ------------------------------------------------------------------ page handling

    function setupProductPage() {
        // A product with no engraving must not inherit the last one's engraving state.
        if (!document.querySelector(SELECTORS.engravingCount)) engraving = null;
        setupStrapDropdown();
        setupEngraving();
        setupSizeButton();
        syncSecondPole(); // runs again whenever an option changes, so it follows Quantity
        syncBasketColour(); // same, so it follows Basket Size
        updateStrapPhotoSoon(); // same, so it follows grip and basket colour
    }

    var pageLoadCount = 0;
    var onCartPage = false;

    // Listeners live on the document, attached once, because the option elements they would
    // otherwise be attached to are reused by Ecwid for the next product.
    document.addEventListener('change', function (event) {
        if (!event.target || event.target.name !== 'Strap') return;
        var parts = strapParts();
        if (!parts || !parts.button) return;
        drawStrapButton(parts);
        collapseStrap(parts);
        updateStrapPhotoSoon();
    });

    // "Switch to Medium for colors" picked in the colour menu. Caught on the way down
    // (capture), so Ecwid's own listener on the menu never hears it.
    ['input', 'change'].forEach(function (type) {
        document.addEventListener(type, function (event) {
            var target = event.target;
            if (!target || target.tagName !== 'SELECT' || target.value !== SWITCH_TO_COLOURS) return;
            event.stopImmediatePropagation();
            if (type === 'change') switchToColourSize(target);
        }, true);
    });

    // A click on the gallery may open the full-screen viewer. Ecwid's gallery stops the click
    // from bubbling up, so this one listens on the way down (capture).
    document.addEventListener('click', function (event) {
        if (event.target && event.target.closest && event.target.closest('.details-gallery')) watchViewer();
    }, true);

    document.addEventListener('click', function (event) {
        if (!event.target || !event.target.closest) return;
        if (!event.target.closest('.gs-strap-toggle')) return;
        var parts = strapParts();
        if (parts && parts.button) expandStrap(parts);
    });

    document.addEventListener('input', function (event) {
        if (!engraving || !event.target || !event.target.matches) return;
        // Ecwid can hand the same box to a different option on the next product, so check
        // it really is an engraving box right now, not just the one we remember.
        if (!event.target.matches(SELECTORS.engravingPole1) &&
            !event.target.matches(SELECTORS.engravingPole2)) return;
        var index = engraving.inputs.indexOf(event.target);
        if (index >= 0) updateEngraving(index);
    });

    Ecwid.OnPageLoaded.add(function (page) {
        pageLoadCount++;
        pageToken++;
        var thisLoad = pageLoadCount;
        var tries = 0;
        onCartPage = isCartOrCheckout(page);
        currentProductId = page.type === 'PRODUCT' ? page.productId : null;
        if (onCartPage) {
            (function waitForSummary() {
                if (thisLoad !== pageLoadCount) return; // shopper moved on
                if (document.querySelector('.ec-cart__summary')) updateGiftCardNote();
                else if (++tries < 20) setTimeout(waitForSummary, 500);
            })();
            return;
        }
        if (page.type !== 'PRODUCT') return;
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

    // Items added or removed on the cart page: show or hide the gift card note to match.
    Ecwid.OnCartChanged.add(function () {
        if (onCartPage) setTimeout(updateGiftCardNote, 300);
    });
});

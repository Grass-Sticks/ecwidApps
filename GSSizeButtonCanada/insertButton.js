Ecwid.OnAPILoaded.add(function() {
    console.log('ecwid api loaded');

    // Insert CSS styles
    const styles = `
        .length-sizing-button {
            display: inline-block !important;
            padding: 6px 12px !important;
            width: auto !important;
            margin-left: 10px !important;
            background-color: #4CAF50 !important;
            color: white !important;
            border-radius: 4px !important;
            text-decoration: none !important;
            cursor: pointer !important;
            font-family: Arial, sans-serif !important;
            font-size: 12px !important;
            font-weight: bold !important;
            line-height: 1.2 !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
            text-align: center !important;
        }
        .length-sizing-button:hover {
            background-color: #45a049 !important;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
            transform: translateY(-1px) !important;
        }
        @media (max-width: 768px) {
            .length-sizing-button {
                width: 100px !important;
                font-size: 10px !important;
                padding: 5px 10px !important;
            }
        }
        @media (max-width: 480px) {
            .length-sizing-button {
                width: 80px !important;
                font-size: 9px !important;
                padding: 4px 8px !important;
            }
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    // Bumped on every page change, so a retry loop from an earlier page stops itself
    let pageLoadCount = 0;
    const MAX_TRIES = 20; // 20 x 500ms = give up after 10 seconds

    // Function to insert the button
    function insertButton(loadNumber, tries) {
        if (loadNumber !== pageLoadCount) {
            return; // shopper has moved to another page
        }
        const placeholder = document.querySelector('.details-product-option--Length-0028cm-or-inches0029');
        if (!placeholder) {
            if (tries >= MAX_TRIES) {
                console.log('Placeholder not found, giving up');
                return;
            }
            console.log('Placeholder not found, waiting...');
            setTimeout(function() { insertButton(loadNumber, tries + 1); }, 500);
            return;
        }

        const lengthInputDiv = placeholder.querySelector('.product-details-module__title');
        if (lengthInputDiv) {
            // Remove any existing sizing buttons first
            const existingButton = lengthInputDiv.querySelector('.length-sizing-button');
            if (existingButton) {
                existingButton.remove();
            }

            const link = document.createElement('a');
            link.textContent = 'Click for sizing';
            link.href = 'https://www.grasssticks.ca/skipolelengthcalc/';
            link.target = '_blank';
            link.className = 'length-sizing-button';
            lengthInputDiv.appendChild(link);
            console.log('Link inserted');
        } else {
            console.error('Length input div not found');
        }
    }

    // Handle page loads. Ecwid fires this on every page change inside the store, so no
    // separate URL watcher is needed.
    Ecwid.OnPageLoaded.add(function(page) {
        pageLoadCount++;
        console.log('Page type is', page.type, "!!!");
        if (page.type === 'PRODUCT') {
            console.log(page.productId);
            var productIds = [793363376, 793363171, 793364072, 793364070, 793363373, 55001151, 74102380, 506210440, 570262509, 94782479];

            // Check if the current product ID is in the allowed list
            if (!productIds.includes(page.productId)) {return;}

            insertButton(pageLoadCount, 0);
        }
    });
});

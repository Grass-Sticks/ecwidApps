let popupInstance = null; // Declare popupInstance in the global scope

Ecwid.OnAPILoaded.add(function() {
    Ecwid.OnPageLoaded.add(function(page) {
        function createPopup(targetElementSelector) {
            console.log('Creating popup for selector:', targetElementSelector);
        
            // Check if popup is already open
            if (popupInstance) {
                console.log('Popup is already open');
                return; // Exit the function if popup is already open
            }

            const targetElement = document.querySelector(targetElementSelector);
            if (targetElement) {
                console.log('Target element found:', targetElement);
                
                const popup = document.createElement('div');
                popup.className = 'custom-popup';
        
                const closeButton = document.createElement('button');
                closeButton.className = 'custom-popup-close';
                closeButton.innerHTML = '&times;';
                closeButton.onclick = () => {
                    popup.remove();
                    popupInstance = null; // Reset the popup instance when closed
                };
        
                popup.innerHTML = `
                <div>
                    <h3>NOTICE!</h3>
                    <p>You pay shipping so your recipient pays nothing when they order</p>
                </div>
                `;
                popup.appendChild(closeButton);
        
                document.body.appendChild(popup);
                popupInstance = popup; // Set the popup instance
        
                function positionPopup() {
                    console.log('Positioning popup');
                    const rect = targetElement.getBoundingClientRect();
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    const popupRect = popup.getBoundingClientRect();
        
                    // Set max-width based on window size
                    popup.style.maxWidth = `${Math.min(windowWidth * 0.9, 400)}px`;
        
                    // Position the popup
                    let left = rect.left;
                    let top = rect.bottom + 10; // 10px gap
        
                    // Adjust horizontal position if it overflows the window
                    if (left + popupRect.width > windowWidth) {
                        left = Math.max(0, windowWidth - popupRect.width);
                    }
        
                    // If popup overflows vertically, position it above the target element
                    if (top + popupRect.height > windowHeight) {
                        top = Math.max(0, rect.top - popupRect.height - 10);
                    }
        
                    popup.style.left = `${left}px`;
                    popup.style.top = `${top}px`;
                }
        
                positionPopup();
                window.addEventListener('resize', positionPopup);
        
                console.log('Popup appended to body');
            } else {
                console.log('Target element not found');
            }
        }

        const categoryID = 28816028;
        const canadaCategoryID = 191095255;
        const currCategoryID = page.categoryId;
        console.log('category ID:', currCategoryID);
        if (categoryID == currCategoryID || canadaCategoryID == currCategoryID) {
            const target = '.details-product-purchase__controls';
            document.querySelector(target).addEventListener('click', function() {
                createPopup(target);
            });
        }
    });
});

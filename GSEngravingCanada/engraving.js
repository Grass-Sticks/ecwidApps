// Engraving cost calculator -- Calculate the cost of engravings for a customer's ski pole.
// Author: Cabot McTavish
// 8/8/2024
// To do: set display of Engraving - Ski Pole 2 to none, test
Ecwid.OnAPILoaded.add(function() {
    Ecwid.OnPageLoaded.add(function(page) {
      if (page.type == 'PRODUCT') {
        var customInput1 = document.querySelector("input[aria-label='Engraving - Ski Pole 1']");
        var customInput2 = document.querySelector("input[aria-label='Engraving - Ski Pole 2']");
        const productId = page.productId;
  
        const handleInputChange = async function(event) {
            const changedInput = event.target;
            // BASKET SIZE
            const basketSizeElement = document.querySelector('.product-details-module.details-product-option.details-product-option--select.details-product-option--Basket-Size')
            const basketSizeWindow = basketSizeElement.querySelector('.form-control--select.form-control.form-control--flexible')
            const basketSizeSelect = basketSizeWindow.querySelector('.form-control__select')
            const basketSizeValue = basketSizeSelect ? basketSizeSelect.value : '';
            const basketSizeMenu = { 'Tiny Disc- 2" (black only)': 0, 'Medium Basket- 4"': 1, 'Huge Powder Basket- 4.75" (black only)': 2 };
            const basketSize = basketSizeMenu[basketSizeValue] || 1;
    
            
            // GRIP COLOR
            const gripColorElement = document.querySelector('.product-details-module.details-product-option.details-product-option--select.details-product-option--Grip-Color')
            const gripColorWindow = gripColorElement.querySelector('.form-control--select.form-control.form-control--flexible')
            const gripColorSelect = gripColorWindow.querySelector('.form-control__select')
            const gripColorValue = gripColorSelect ? gripColorSelect.value : '';
            const gripColorMenu = { 'Black': 0, 'Cork': 1, 'Blue': 2, 'Green': 3, 'Pink': 4, 'Purple': 5, 'Orange': 6, 'Red': 7, 'Turquoise': 8 };
            const gripColor = gripColorMenu[gripColorValue] || 2;
    
            
            // BASKET COLOR
            const basketColorElement = document.querySelector('.product-details-module.details-product-option.details-product-option--select.details-product-option--Basket-Color')
            const basketColorWindow = basketColorElement.querySelector('.form-control--select.form-control.form-control--flexible')
            const basketColorSelect = basketColorWindow.querySelector('.form-control__select')
            const basketColorValue = basketColorSelect ? basketColorSelect.value : '';
            const basketColorMenu = { 'Black': 0, 'White': 1, 'Transparent': 2, 'Blue': 3, 'Green': 4, 'Pink': 5, 'Purple': 6, 'Orange': 7, 'Red': 8, 'Turquiose': 9 };
            const basketColor = basketColorMenu[basketColorValue] || 0;
    
            // STRAP
            // const strapElement = document.querySelector('.product-details-module.details-product-option.details-product-option--radio.details-product-option--Strap')
            const strapRadio = document.querySelector("input[name='Strap']:checked");
            const strapValue = strapRadio ? strapRadio.value : '';
            const strapMenu = { 'Salida Magic': 0, 'Autumn': 1, 'Bridgers': 2, 'Mount Tam': 3, 'Flow': 4, 'Idaho 9': 5, 'Dark Side': 6, 'Lone Peak': 7, 'Teton': 8, 'The Grand': 9, 'Spanish Peaks': 10, 'Adjustable': 11, 'Fixed': 12, 'None': 13 };
            const strap = strapMenu[strapValue] || 12;
    
            // ENGRAVING
            const customEngraving = [0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17];
            const charCount1 = customInput1 ? customInput1.value.length : 0;
            const charCount2 = customInput2 ? customInput2.value.length : 0;
            const engraving = customEngraving[charCount1+charCount2]+1 || 0;
            const curInput1 = customInput1.value;
            const curInput2 = customInput2.value;
    
            // Length
            const lengthInput = document.querySelector("input[aria-label='Length (cm or inches)']");
            const lengthInputVal = lengthInput ? lengthInput.value : '';
    
            // Update the product with options
            const options = [basketSize, gripColor, basketColor, strap];
            if ((charCount1 + charCount2) > 0) {
                options.push(engraving);
            }
    
            Ecwid.openPage('product', {
                'id': productId,
                'options': options
            })
    
            customInput1.value = curInput1;
            customInput2.value = curInput2;
            lengthInput.value = lengthInputVal
            changedInput.focus();
            }
        if ((customInput1 && customInput2)&&(productId !== 207127971)) {
          customInput1.addEventListener('input', handleInputChange)
          customInput2.addEventListener('input', handleInputChange)
        } 
      }
    });
  });
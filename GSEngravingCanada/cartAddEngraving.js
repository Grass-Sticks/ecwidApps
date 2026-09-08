/**
 * @fileoverview This file adds an engraving feature to the ski pole products on the ecwid store and in the GrassSticks website.  It uses the Ecwid API with listeners and mutation observers to maintain the correct display and cart.
 * @author Cabot McTavish
 * 
 * This file is grouped by sections: Constants, Functions, Initialization.  In the need for edits, only the constants section should be changed.  The functions section should not be edited.  The initialization section should be used to setup the listeners.
 * *** IF you get rid of the strap condense, need to update strap events to click instead of self made event *** 
*/

Ecwid.OnAPILoaded.add(function() {
    // Store observers in an array
    let observers = [];
    const INITIALIZED_OPTION_LISTENERS = new Set();
    // Store visibility listener reference for cleanup
    let visibilityListener = null;

    Ecwid.OnPageLoaded.add(async function(page) {
      if (page.type === 'PRODUCT') {
          const productIds = [793363376, 793363171, 793364072, 793363373, 800709674];
          // CanadaOG, CanadaTouring, CanadaRingTail, CanadaTrek, CanadaKids, UsaOG, UsaTouring, UsaRingTail, UsaTrek, UsaKids
          // const officialProductIds = [793363376, 793363171, 793364072, 793364070, 793363373, 55001151, 74102380, 506210440, 570262509, 94782479];
  
          // Check if the current product ID is in the allowed list
          if (!productIds.includes(page.productId)) {return;}

          // ------------------------- CONSTANTS ------------------------- 
          // Option names (used in multiple places)
          const OPTION_NAMES = {
            BASKET_SIZE: 'Basket Size',
            GRIP_COLOR: 'Grip Color',
            BASKET_COLOR: 'Basket Color',
            STRAP: 'Strap',
            ENGRAVING: 'Engraving Count',
            LENGTH: 'Length (cm or inches)',
            ENGRAVING_1: 'Engraving',
            ENGRAVING_2: 'Engraving - Ski Pole 2'
          };
  
          // OG, touring, ringtail torched, kids, trek, test og
          const BASE_PRICES = {793363376: 169, 793363171: 185, 793364072: 192, 793363373: 99, 793364070: 169, 800709674: 169}
          const CORK_PRICE = 19;
          const SINGLE_HIKING_PRICE = -45;
          const STRAP_PRICES = {'None': -4.20, 'Adjustable': 14, 'Fixed': 0, 'mtnStrap': 28};
          const CURRENT = {
            [OPTION_NAMES.STRAP]: null,
            [OPTION_NAMES.GRIP_COLOR]: null,
            [OPTION_NAMES.BASKET_SIZE]: null,
            [OPTION_NAMES.BASKET_COLOR]: null,
            [OPTION_NAMES.LENGTH]: null,
            [OPTION_NAMES.ENGRAVING]: null,
            [OPTION_NAMES.ENGRAVING_1]: null,
            [OPTION_NAMES.ENGRAVING_2]: null
          };

          const CURRENT_PRICE = {
            [OPTION_NAMES.STRAP]: 0,
            [OPTION_NAMES.GRIP_COLOR]: 0,
            [OPTION_NAMES.ENGRAVING]: 0,
          };

          if (page.productId === 793364070) {
            OPTION_NAMES.HIKING_QUANTITY = 'Quantity';
            CURRENT[OPTION_NAMES.HIKING_QUANTITY] = null;
            CURRENT_PRICE[OPTION_NAMES.HIKING_QUANTITY] = 0;
          }

          // Timing constants
          const CART_UPDATE_DELAY = 100;

          // DOM Selectors (frequently used)
          const SELECTORS = {
            ENGRAVING_1: "input[aria-label='Engraving']",
            ENGRAVING_2: "input[aria-label='Engraving - Ski Pole 2']",
            LENGTH: "input[aria-label='Length (cm or inches)']",
            STRAP: "input[name='Strap']:checked",
            GRIP_COLOR: '.details-product-option--Grip-Color select',
            BASKET_SIZE: '.details-product-option--Basket-Size select',
            BASKET_COLOR: '.details-product-option--Basket-Color select',
            PRICE_DISPLAY: '.details-product-price__value.ec-price-item.notranslate',
            ADD_TO_BAG: '.details-product-purchase__add-to-bag',
            ADD_MORE: '.details-product-purchase__add-more',
            QUANTITY: "input[name='ec-qty']",
            HIKING_QUANTITY: 'input[name="Quantity"]:checked'
          };

          const basePrice = BASE_PRICES[page.productId];

          // To change these, need to also go into Ecwid and change the individual product option prices
          const customEngraving = ['0', '1-6', '1-6', '1-6', '1-6', '1-6', '1-6', '7-8', '7-8', '9-10', '9-10', '11-12', '11-12', '13-14', '13-14', '15-16', '15-16', '17-18', '17-18', '19-20', '19-20', '21-22', '21-22', '23-24', '23-24', '25-26', '25-26', '27-28', '27-28', '29-30', '29-30', '31-32', '31-32', '33-34', '33-34', '35-36', '35-36', '37-38', '37-38', '39-40', '39-40'];
          const engraveInd=[0,22,22,22,22,22,22,23.75,23.75,25.5,25.5,27.25,27.25,29,29,30.75,30.75,32.5,32.5,34.25,34.25,36,36,37.75,37.75,39.5,39.5,41.25,41.25,43,43,44.75,44.75,46.5,46.5,48.25,48.25,50,50,51.75,51.75];

          // ------------------------- FUNCTIONS ------------------------- 
          function updatePrice() {
            try {
              console.log('Starting updatePrice()');
              const priceElement = document.querySelector(SELECTORS.PRICE_DISPLAY);
              if (!priceElement) {
                console.log('Price element not found');
                return;
              }

              // Temporarily disconnect price observers
              const priceObserver = observers.find(obs => obs._priceObserver);
              if (priceObserver) {
                  priceObserver._updating = true;
              }

              // Update price
              const totalPrice = basePrice + 
                CURRENT_PRICE[OPTION_NAMES.STRAP] + 
                CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] + 
                CURRENT_PRICE[OPTION_NAMES.ENGRAVING] +
                (page.productId === 793364070 ? CURRENT_PRICE[OPTION_NAMES.HIKING_QUANTITY] : 0);
              
              console.log('Price calculation:', {
                basePrice,
                strapPrice: CURRENT_PRICE[OPTION_NAMES.STRAP],
                gripPrice: CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR],
                engravingPrice: CURRENT_PRICE[OPTION_NAMES.ENGRAVING],
                totalPrice
              });

              // Update price immediately
              priceElement.textContent = `$${totalPrice.toFixed(2)}`;

              // Re-enable price observer
              if (priceObserver) {
                  setTimeout(() => {
                      priceObserver._updating = false;
                  }, 0);
              }
            }
            catch (error) {
              console.error('Error updating price:', error);
            }
          }

          // Function to get the current product configuration
          function getProduct() {
            try {
                console.log('Starting getProduct()');
                console.log('Current hiking quantity value:', CURRENT[OPTION_NAMES.HIKING_QUANTITY]);
                
                const options = {
                    [OPTION_NAMES.BASKET_SIZE]: CURRENT[OPTION_NAMES.BASKET_SIZE] || '',
                    [OPTION_NAMES.GRIP_COLOR]: CURRENT[OPTION_NAMES.GRIP_COLOR] || '',
                    [OPTION_NAMES.BASKET_COLOR]: CURRENT[OPTION_NAMES.BASKET_COLOR] || '',
                    [OPTION_NAMES.STRAP]: CURRENT[OPTION_NAMES.STRAP] || '',
                    [OPTION_NAMES.ENGRAVING]: CURRENT[OPTION_NAMES.ENGRAVING] || '0',
                    [OPTION_NAMES.LENGTH]: CURRENT[OPTION_NAMES.LENGTH] || '',
                    [OPTION_NAMES.ENGRAVING_1]: CURRENT[OPTION_NAMES.ENGRAVING_1] || '',
                    [OPTION_NAMES.ENGRAVING_2]: CURRENT[OPTION_NAMES.ENGRAVING_2] || ''
                };

                // Get quantity element and parse its value
                const quantityElement = document.querySelector(SELECTORS.QUANTITY);
                let quantity = 1; // Default to 1

                if (quantityElement && quantityElement.value) {
                    const parsedQuantity = parseInt(quantityElement.value, 10);
                    if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
                        quantity = parsedQuantity;
                    }
                }

                console.log('Quantity value:', quantity);

                // Add hiking quantity to options if it's the hiking pole product
                if (page.productId === 793364070) {
                    console.log('Adding hiking quantity to product options:', CURRENT[OPTION_NAMES.HIKING_QUANTITY]);
                    options[OPTION_NAMES.HIKING_QUANTITY] = CURRENT[OPTION_NAMES.HIKING_QUANTITY] || 'Trekking Pole Pair';
                }

                const product = {
                    id: page.productId,
                    quantity: quantity,
                    options: options
                };

                console.log('Final product configuration:', product);
                return product;
            } catch (error) {
                console.error('Error in getProduct:', error);
                return null;
            }
          }
  
          // Add to cart
          function handleAddToCart(event) {
            return new Promise((resolve, reject) => {
              console.log('Starting handleAddToCart()');
              event.preventDefault();
              
              const product = getProduct();
              console.log('Product configuration:', product);
              
              // Validate length input with user feedback
              if (!product.options[OPTION_NAMES.LENGTH]) {
                  // Create and show error popup
                  const popup = document.createElement('div');
                  popup.id = 'length-error-popup';
                  popup.style.cssText = `
                      position: fixed;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      background: #ff4444;
                      color: white;
                      padding: 20px;
                      border-radius: 5px;
                      z-index: 1000;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                      text-align: center;
                  `;
                  popup.textContent = 'Please select a length for your poles before adding to cart.';
                  document.body.appendChild(popup);

                  // Add shake animation to button
                  const button = document.querySelector(SELECTORS.ADD_TO_BAG) || document.querySelector(SELECTORS.ADD_MORE);
                  if (button) {
                      button.style.animation = 'shake-cart-button 0.5s';
                      button.style.animationIterationCount = '1';
                  }

                  // Remove popup and animation after delay
                  setTimeout(() => {
                      document.body.removeChild(popup);
                      if (button) {
                          button.style.animation = '';
                      }
                  }, 3000);

                  // Scroll to length input
                  const lengthInput = document.querySelector(SELECTORS.LENGTH);
                  if (lengthInput) {
                      lengthInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      lengthInput.focus();
                  }

                  console.log('Length validation failed');
                  return reject(new Error('Length input is required'));
              }

              // Check engraving length
              const totalEngravingLength = 
                  (product.options[OPTION_NAMES.ENGRAVING_1]?.replace(/\s/g, '').length || 0) + 
                  (product.options[OPTION_NAMES.ENGRAVING_2]?.replace(/\s/g, '').length || 0);

              console.log('Engraving validation:', {
                length1: product.options[OPTION_NAMES.ENGRAVING_1]?.length || 0,
                length2: product.options[OPTION_NAMES.ENGRAVING_2]?.length || 0,
                totalLength: totalEngravingLength
              });

              // if (totalEngravingLength > 40) {
              //     // Create and show error popup
              //     const popup = document.createElement('div');
              //     popup.id = 'engraving-error-popup';
              //     popup.style.cssText = `
              //         position: fixed;
              //         top: 50%;
              //         left: 50%;
              //         transform: translate(-50%, -50%);
              //         background: #ff4444;
              //         color: white;
              //         padding: 20px;
              //         border-radius: 5px;
              //         z-index: 1000;
              //         box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              //     `;
              //     popup.textContent = 'Engraving text is too long. Maximum 40 characters total.';
              //     document.body.appendChild(popup);

              //     // Add shake animation to button
              //     const button = document.querySelector(SELECTORS.ADD_TO_BAG);
              //     button.style.animation = 'shake-cart-button 0.5s';
              //     button.style.animationIterationCount = '1';

              //     // Remove popup and animation after delay
              //     setTimeout(() => {
              //         document.body.removeChild(popup);
              //         button.style.animation = '';
              //     }, 3000);

              //     return reject(new Error('Engraving text too long'));
              // }

              // Add callback to the product object
              const cartProduct = {
                ...product,
                callback: function(success, addedProduct, cart, error) {                  
                  if (success) {
                    resolve(product);
                  } else {
                    reject(error || new Error('Failed to add product to cart'));
                  }
                }
              };
              
              // Add the product to the cart
              Ecwid.Cart.addProduct(cartProduct);
            });
          }

          // Remove from cart (DISABLED)
          function handleRemoveFromCart(product) {
            return new Promise((resolve) => {
              product.options[OPTION_NAMES.ENGRAVING] = '0';
              const item = product;
              console.log('item to remove:', item);
              Ecwid.Cart.get(function(cart) {
                try {
                  console.log('current cart:', cart);

                  if (!cart || !cart.items) {
                    console.error('Cart is not available or empty');
                    resolve();
                    return;
                  }

                  for (let i = 0; i < cart.items.length; i++) {
                    if (isEqual(cart.items[i].options, item.options) && cart.items[i].product.id === item.id) {
                      console.log(`Cart item matches:`, {...cart.items[i]}, `item:`, {...item});
                      if (cart.items[i].quantity > item.quantity) {
                        cart.items[i].quantity -= item.quantity;
                        Ecwid.Cart.removeProduct(i);
                        
                        // Add a small delay before adding the product back
                        setTimeout(() => {
                          Ecwid.Cart.addProduct(cart.items[i], function(success) {
                            if (success) {
                              console.log(`Cart item ${i} quantity decremented to ${cart.items[i].quantity}`);
                            } else {
                              console.error('Failed to update cart item quantity');
                            }
                            resolve();
                          });
                        }, CART_UPDATE_DELAY); // 100ms delay
                      } else {
                        Ecwid.Cart.removeProduct(i);
                        console.log(`Cart item ${i} removed`);
                        resolve();
                      }
                      return; // Exit the function after initiating cart update
                    }
                  }

                  console.log('No matching product found in cart');
                  resolve();
                } catch (error) {
                  console.error('Error removing product from cart:', error);
                  resolve();
                }
              });
            });
          }

          // Check if two objects are equal
          function isEqual(obj1, obj2) {
              // Check if the number of keys is different
            if (Object.keys(obj1).length !== Object.keys(obj2).length) {
              return false;
            }

            for (const key in obj1) {
              // Check if the key exists in obj2
              if (!(key in obj2)) {
                return false;
              }

              // Check if the values are equal
              if (obj1[key] !== obj2[key]) {
                return false;
              }
            }

            return true;
          }

          // Debounce function
          function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
              const later = () => {
                clearTimeout(timeout);
                func(...args);
              };
              clearTimeout(timeout);
              timeout = setTimeout(later, wait);
            };
          }

          // Modified listener functions
          function attachStrapListeners() {
            console.log('Attaching strap listeners');
            const strapContainer = document.querySelector('.details-product-option--Strap');
            
            if (!strapContainer) {
                console.log('Strap container not found');
                return;
            }

            // Listen for our custom event instead of directly to radio buttons
            strapContainer.addEventListener('strapOptionChanged', (e) => {
                console.log('Strap option changed event received:', e.detail);
                CURRENT[OPTION_NAMES.STRAP] = e.detail.value;
                CURRENT_PRICE[OPTION_NAMES.STRAP] = e.detail.price;
                updatePrice();
            });
          }

          function attachProductListeners() {
            console.log('Starting attachProductListeners()');
            
            // Helper function to safely add event listener only once
            function addListenerOnce(elementId, element, eventType, handler) {
                if (!element) return;
                
                const key = `${elementId}_${eventType}`;
                
                if (INITIALIZED_OPTION_LISTENERS.has(key)) {
                    console.log(`Skipping ${key}, already initialized`);
                    return;
                }
                
                element.addEventListener(eventType, handler);
                INITIALIZED_OPTION_LISTENERS.add(key);
                console.log(`Added ${eventType} listener to ${elementId}`);
            }

            // Engraving inputs
            const engravingInput1 = document.querySelector(SELECTORS.ENGRAVING_1);
            const engravingInput2 = document.querySelector(SELECTORS.ENGRAVING_2);
            console.log('Found engraving inputs:', {
                input1: !!engravingInput1,
                input2: !!engravingInput2
            });

            // Engraving 1
            if (engravingInput1 && !INITIALIZED_OPTION_LISTENERS.has('engraving1_placeholder')) {
                const formControl1 = engravingInput1.closest('.form-control');
                const placeholder1 = formControl1.querySelector('.form-control__placeholder');
                if (placeholder1) {
                    placeholder1.remove();
                }
                
                // Set the input placeholder
                engravingInput1.placeholder = 'Ski Pole 1';
                
                addListenerOnce('engraving1', engravingInput1, 'focus', () => {
                    engravingInput1.placeholder = '';
                });
                
                addListenerOnce('engraving1', engravingInput1, 'blur', () => {
                    if (!engravingInput1.value) {
                        engravingInput1.placeholder = 'Ski Pole 1';
                    }
                });
                
                addListenerOnce('engraving1', engravingInput1, 'input', () => {
                    console.log('Engraving 1 input changed:', engravingInput1.value);
                    const engravingText2 = engravingInput2 ? engravingInput2.value : '';
                    const engravingText1 = engravingInput1.value;
                    const charCount = engravingText1.replace(/\s/g, '').length + engravingText2.replace(/\s/g, '').length;
                    
                    if (charCount > 40) {
                        engravingInput1.value = engravingInput1.value.slice(0, -1);
                        return;
                    }
                    
                    CURRENT_PRICE[OPTION_NAMES.ENGRAVING] = engraveInd[charCount];
                    CURRENT[OPTION_NAMES.ENGRAVING_1] = engravingText1;
                    CURRENT[OPTION_NAMES.ENGRAVING] = customEngraving[charCount];
                    updatePrice();
                });
            }
            
            // Engraving 2
            if (engravingInput2 && !INITIALIZED_OPTION_LISTENERS.has('engraving2_placeholder')) {
                const formControl2 = engravingInput2.closest('.form-control');
                const placeholder2 = formControl2.querySelector('.form-control__placeholder');
                if (placeholder2) {
                    placeholder2.remove();
                }
                
                // Set the input placeholder
                engravingInput2.placeholder = 'Ski Pole 2';
                
                addListenerOnce('engraving2', engravingInput2, 'focus', () => {
                    engravingInput2.placeholder = '';
                });
                
                addListenerOnce('engraving2', engravingInput2, 'blur', () => {
                    if (!engravingInput2.value) {
                        engravingInput2.placeholder = 'Ski Pole 2';
                    }
                });
                
                addListenerOnce('engraving2', engravingInput2, 'input', () => {
                    const engravingText1 = engravingInput1 ? engravingInput1.value : '';
                    const engravingText2 = engravingInput2.value;
                    const charCount = engravingText1.replace(/\s/g, '').length + engravingText2.replace(/\s/g, '').length;
                    
                    if (charCount > 40) {
                        engravingInput2.value = engravingInput2.value.slice(0, -1);
                        return;
                    }
                    
                    CURRENT_PRICE[OPTION_NAMES.ENGRAVING] = engraveInd[charCount];
                    CURRENT[OPTION_NAMES.ENGRAVING_2] = engravingText2;
                    CURRENT[OPTION_NAMES.ENGRAVING] = customEngraving[charCount];
                    updatePrice();
                });
            }

            // Grip color listener
            const gripColorSelect = document.querySelector(SELECTORS.GRIP_COLOR);
            console.log('Found grip color select:', !!gripColorSelect);
            
            if (gripColorSelect && !INITIALIZED_OPTION_LISTENERS.has('gripColor_change')) {
                addListenerOnce('gripColor', gripColorSelect, 'change', () => {
                    const gripColorValue = gripColorSelect.value;
                    const gripPrice = (gripColorValue === 'Cork') ? CORK_PRICE : 0;
                    
                    console.log('Grip color changed:', {
                        newValue: gripColorValue,
                        isCork: gripColorValue === 'Cork',
                        newPrice: gripPrice
                    });
                    
                    CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] = gripPrice;
                    CURRENT[OPTION_NAMES.GRIP_COLOR] = gripColorValue;
                    updatePrice();
                });
                
                INITIALIZED_OPTION_LISTENERS.add('gripColor_change');
            }

            // Basket size listener
            const basketSizeSelect = document.querySelector(SELECTORS.BASKET_SIZE);
            console.log('Found basket size select:', !!basketSizeSelect);
            
            if (basketSizeSelect && !INITIALIZED_OPTION_LISTENERS.has('basketSize_change')) {
                addListenerOnce('basketSize', basketSizeSelect, 'change', () => {
                    console.log('Basket size changed:', {
                        newValue: basketSizeSelect.value,
                        previousValue: CURRENT[OPTION_NAMES.BASKET_SIZE]
                    });
                    CURRENT[OPTION_NAMES.BASKET_SIZE] = basketSizeSelect.value;
                });
                
                INITIALIZED_OPTION_LISTENERS.add('basketSize_change');
            }

            // Basket color listener
            const basketColorSelect = document.querySelector(SELECTORS.BASKET_COLOR);
            console.log('Found basket color select:', !!basketColorSelect);
            
            if (basketColorSelect && !INITIALIZED_OPTION_LISTENERS.has('basketColor_change')) {
                addListenerOnce('basketColor', basketColorSelect, 'change', () => {
                    console.log('Basket color changed:', {
                        newValue: basketColorSelect.value,
                        previousValue: CURRENT[OPTION_NAMES.BASKET_COLOR]
                    });
                    CURRENT[OPTION_NAMES.BASKET_COLOR] = basketColorSelect.value;
                });
                
                INITIALIZED_OPTION_LISTENERS.add('basketColor_change');
            }

            // Length input listener
            const lengthInput = document.querySelector(SELECTORS.LENGTH);
            console.log('Found length input:', !!lengthInput);
            
            if (lengthInput && !INITIALIZED_OPTION_LISTENERS.has('length_change')) {
                // Clear placeholder on focus
                addListenerOnce('length', lengthInput, 'focus', () => {
                    lengthInput.placeholder = '';
                });
                
                // Restore placeholder on blur if empty
                addListenerOnce('length', lengthInput, 'blur', () => {
                    if (!lengthInput.value) {
                        lengthInput.placeholder = 'Enter your length here';
                    }
                });
                
                addListenerOnce('length', lengthInput, 'change', () => {
                    console.log('Length changed:', lengthInput.value);
                    CURRENT[OPTION_NAMES.LENGTH] = lengthInput.value;
                });

                INITIALIZED_OPTION_LISTENERS.add('length_change');
            }
            
            // Hiking quantity listener
            if (page.productId === 793364070) {
                console.log('Processing hiking quantity for product 793364070');
                const hikingQuantity = document.querySelector('.details-product-option--Quantity');
                
                if (hikingQuantity && !INITIALIZED_OPTION_LISTENERS.has('hikingQuantity_change')) {
                    addListenerOnce('hikingQuantity', hikingQuantity, 'change', (event) => {
                        try {
                            // Get the selected radio button and validate
                            const selectedRadio = hikingQuantity.querySelector(SELECTORS.HIKING_QUANTITY);
                            const hikingQuantityValue = selectedRadio?.value || 'Trekking Pole Pair';
                            const isSingleStick = hikingQuantityValue === 'Single Hiking Stick';
                            
                            // Calculate price adjustment
                            const hikingQuantityPrice = isSingleStick ? SINGLE_HIKING_PRICE : 0;
                            
                            // Get and validate engraving inputs
                            const engravingText1 = engravingInput1?.value || '';
                            const engravingText2 = isSingleStick ? '' : (engravingInput2?.value || '');

                            // Calculate new character count
                            const charCount = engravingText1.replace(/\s/g, '').length + engravingText2.replace(/\s/g, '').length;
                            
                            // Debug logging
                            console.log('Hiking quantity update:', {
                                value: hikingQuantityValue,
                                price: hikingQuantityPrice,
                                charCount,
                                engravingPrice: engraveInd[charCount],
                                text1Length: engravingText1.length,
                                text2Length: engravingText2.length
                            });

                            // Update state
                            CURRENT[OPTION_NAMES.HIKING_QUANTITY] = hikingQuantityValue;
                            CURRENT_PRICE[OPTION_NAMES.HIKING_QUANTITY] = hikingQuantityPrice;
                            CURRENT_PRICE[OPTION_NAMES.ENGRAVING] = engraveInd[charCount];
                            CURRENT[OPTION_NAMES.ENGRAVING] = customEngraving[charCount];
                            
                            // Handle second engraving field visibility
                            const engravingDiv2 = document.querySelector('.details-product-option--Engraving---Ski-Pole-2');
                            if (engravingDiv2) {
                                engravingDiv2.style.display = isSingleStick ? 'none' : 'block';
                                
                                if (isSingleStick && engravingInput2) {
                                    engravingInput2.value = '';
                                    CURRENT[OPTION_NAMES.ENGRAVING_2] = '';
                                }
                            }
                            
                            updatePrice();
                        } catch (error) {
                            console.error('Error handling hiking quantity change:', error);
                        }
                    });
                } else {
                    console.warn('Hiking quantity element not found for product 793364070');
                }

                INITIALIZED_OPTION_LISTENERS.add('hikingQuantity_change');
            }
          }

          // Initialize current values
          function initializeCurrentValues() {
            console.log('Starting initializeCurrentValues()');
            
            // Get all form elements
            const strapRadio = document.querySelector(SELECTORS.STRAP);
            const gripColorSelect = document.querySelector(SELECTORS.GRIP_COLOR);
            const basketSizeSelect = document.querySelector(SELECTORS.BASKET_SIZE);
            const basketColorSelect = document.querySelector(SELECTORS.BASKET_COLOR);
            const lengthInput = document.querySelector(SELECTORS.LENGTH);
            const engravingInput1 = document.querySelector(SELECTORS.ENGRAVING_1);
            const engravingInput2 = document.querySelector(SELECTORS.ENGRAVING_2);
            const hikingQuantityRadio = page.productId === 793364070 ? 
                document.querySelector(SELECTORS.HIKING_QUANTITY) : null;

            // Initialize current values
            CURRENT[OPTION_NAMES.STRAP] = strapRadio ? strapRadio.value : null;
            CURRENT[OPTION_NAMES.GRIP_COLOR] = gripColorSelect ? gripColorSelect.value : null;
            CURRENT[OPTION_NAMES.BASKET_SIZE] = basketSizeSelect ? basketSizeSelect.value : null;
            CURRENT[OPTION_NAMES.BASKET_COLOR] = basketColorSelect ? basketColorSelect.value : null;
            CURRENT[OPTION_NAMES.LENGTH] = lengthInput ? lengthInput.value : null;
            // Initialize engraving count based on existing engraving text (excluding spaces)
            const engravingText1Init = engravingInput1 ? (engravingInput1.value || '') : '';
            const engravingText2Init = engravingInput2 ? (engravingInput2.value || '') : '';
            const rawCharCountInit =
                engravingText1Init.replace(/\s/g, '').length +
                engravingText2Init.replace(/\s/g, '').length;
            const maxEngravingIndex = Math.min(40, customEngraving.length - 1, engraveInd.length - 1);
            const charCountInit = Math.min(maxEngravingIndex, rawCharCountInit);
            CURRENT[OPTION_NAMES.ENGRAVING] = rawCharCountInit > 0 ? customEngraving[charCountInit] : '0';
            CURRENT[OPTION_NAMES.ENGRAVING_1] = engravingInput1 ? engravingText1Init : null;
            CURRENT[OPTION_NAMES.ENGRAVING_2] = engravingInput2 ? engravingText2Init : null;

            // Initialize prices
            CURRENT_PRICE[OPTION_NAMES.STRAP] = strapRadio ? STRAP_PRICES[strapRadio.value] || 0 : 0;
            CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] = gripColorSelect && gripColorSelect.value === 'Cork' ? CORK_PRICE : 0;
            CURRENT_PRICE[OPTION_NAMES.ENGRAVING] = rawCharCountInit > 0 ? engraveInd[charCountInit] : 0;

            // Add hiking quantity initialization if applicable
            if (page.productId === 793364070) {
                CURRENT[OPTION_NAMES.HIKING_QUANTITY] = hikingQuantityRadio ? hikingQuantityRadio.value : null;
                CURRENT_PRICE[OPTION_NAMES.HIKING_QUANTITY] = hikingQuantityRadio && 
                    hikingQuantityRadio.value === 'Single Hiking Stick' ? SINGLE_HIKING_PRICE : 0;
            }

            console.log('Found form elements:', {
                strap: !!strapRadio,
                gripColor: !!gripColorSelect,
                basketSize: !!basketSizeSelect,
                basketColor: !!basketColorSelect,
                length: !!lengthInput,
                engraving1: !!engravingInput1,
                engraving2: !!engravingInput2,
                hikingQuantity: !!hikingQuantityRadio
            });

            // Initial price calculation
            updatePrice();
          }

          // Function to attach listeners to cart buttons
          function attachCartListeners() {
            try {
                const addToBagDiv = document.querySelector(SELECTORS.ADD_TO_BAG);
                const addMoreDiv = document.querySelector(SELECTORS.ADD_MORE);
                
                const targetDivs = [addToBagDiv, addMoreDiv].filter(div => div);
                
                targetDivs.forEach(targetDiv => {
                    const oldButton = targetDiv.querySelector(".form-control__button");
                    if (oldButton) {
                        const newButton = oldButton.cloneNode(true);
                        oldButton.parentNode.replaceChild(newButton, oldButton);
                        
                        newButton.addEventListener('click', async (event) => {
                            console.log('Custom cart button clicked');
                            event.preventDefault();
                            event.stopPropagation();
                            
                            try {
                                await handleAddToCart(event);
                            } catch (error) {
                                console.error('Error handling cart update:', error);
                            }
                        }, true);
                    }
                });
            } catch (error) {
                console.error('Error in attachCartListeners:', error);
            }
          }

          // Separate function for setting up price observer
          function setupPriceObserver() {
            const priceElement = document.querySelector(SELECTORS.PRICE_DISPLAY);
            if (!priceElement) return;

            // Disconnect existing price observers
            observers
                .filter(observer => observer._priceObserver)
                .forEach(observer => observer.disconnect());
            
            // Remove them from the array
            observers = observers.filter(observer => !observer._priceObserver);

            const priceObserver = new MutationObserver((mutations) => {
                // Add a flag to prevent recursive updates
                if (priceObserver._updating) return;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'characterData' || mutation.type === 'childList') {
                        const currentPrice = priceElement.textContent;
                        const totalPrice = basePrice + 
                            CURRENT_PRICE[OPTION_NAMES.STRAP] + 
                            CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] + 
                            CURRENT_PRICE[OPTION_NAMES.ENGRAVING] +
                            (page.productId === 793364070 ? CURRENT_PRICE[OPTION_NAMES.HIKING_QUANTITY] : 0);
                        
                        const expectedPrice = `$${totalPrice.toFixed(2)}`;
                        if (currentPrice !== expectedPrice) {
                            console.log('Price update needed:', {
                                current: currentPrice,
                                expected: expectedPrice,
                                base: basePrice,
                                strap: CURRENT_PRICE[OPTION_NAMES.STRAP],
                                grip: CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR],
                                engraving: CURRENT_PRICE[OPTION_NAMES.ENGRAVING]
                            });
                            
                            // Set updating flag before making changes
                            priceObserver._updating = true;
                            priceElement.textContent = expectedPrice;
                            // Clear updating flag after a short delay
                            setTimeout(() => {
                                priceObserver._updating = false;
                            }, 0);
                        }
                    }
                });
            });

            priceObserver._priceObserver = true;
            priceObserver.observe(priceElement, {
                characterData: true,
                childList: true,
                subtree: true
            });
            
            observers.push(priceObserver);
          }

          // Keep setupMutationObserver as its own function
          function setupMutationObserver(debouncedAttachCartListeners) {
            const observer = new MutationObserver((mutations) => {
                try {
                    let shouldAttachListeners = false;
                    let shouldAttachStrapListeners = false;
                    
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList') {
                            const targetNode = mutation.target;
                            
                            // Check for strap option appearing
                            const hasStrapChanges = (
                                // Direct strap container appears
                                (targetNode.matches && targetNode.matches('.details-product-option--Strap')) ||
                                // Parent container gets straps
                                (targetNode.matches && targetNode.matches('.details-product-options')) ||
                                // Check added nodes for strap content
                                Array.from(mutation.addedNodes).some(node => {
                                    if (node.matches) {
                                        return node.matches('.details-product-option--Strap') ||
                                               node.matches('.details-product-options');
                                    }
                                    if (node.querySelector) {
                                        const strapOption = node.querySelector('.details-product-option--Strap');
                                        if (strapOption) {
                                            // Update CURRENT and CURRENT_PRICE when strap option appears
                                            const selectedStrap = strapOption.querySelector('input[name="Strap"]:checked');
                                            if (selectedStrap) {
                                                console.log('Found strap option:', selectedStrap.value);
                                                CURRENT[OPTION_NAMES.STRAP] = selectedStrap.value;
                                                CURRENT_PRICE[OPTION_NAMES.STRAP] = STRAP_PRICES[selectedStrap.value] || 0;
                                                console.log('Updated strap state:', {
                                                    value: CURRENT[OPTION_NAMES.STRAP],
                                                    price: CURRENT_PRICE[OPTION_NAMES.STRAP]
                                                });
                                            }
                                        }
                                        return !!strapOption;
                                    }
                                    return false;
                                })
                            );

                            if (hasStrapChanges) {
                                console.log('Strap option appeared');
                                shouldAttachStrapListeners = true;
                            }

                            // Existing cart controls check
                            const hasControlsChange = (
                                targetNode.matches && 
                                targetNode.matches('.details-product-purchase__controls')
                            ) || Array.from(mutation.addedNodes).some(node => 
                                node.matches && node.matches('.details-product-purchase__controls')
                            );

                            if (hasControlsChange) {
                                console.log('Cart controls change detected');
                                shouldAttachListeners = true;
                            }
                        }
                    }

                    // Handle both types of changes independently
                    if (shouldAttachStrapListeners) {
                        console.log('Reattaching strap listeners');
                        setTimeout(() => {
                            attachStrapListeners();
                        }, 0);
                    }

                    if (shouldAttachListeners) {
                        console.log('Reattaching cart listeners');
                        debouncedAttachCartListeners();
                    }
                } catch (error) {
                    console.error('Error in MutationObserver callback:', error);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
            });
            
            observers.push(observer);
          }

          // Add this helper function
          function waitForElements() {
              return new Promise((resolve, reject) => {
                  // Single reset of all values at the start
                  console.log('Resetting all values before checking elements');
                  Object.keys(CURRENT).forEach(key => {
                      CURRENT[key] = null;
                  });
                  Object.keys(CURRENT_PRICE).forEach(key => {
                      CURRENT_PRICE[key] = 0;
                  });

                  let retryCount = 0;
                  const maxRetries = 50; // 5 seconds maximum wait
                  let checkTimeout;  // Added timeout reference

                  const checkElements = () => {
                      if (retryCount >= maxRetries) {
                          clearTimeout(checkTimeout);  // Clear timeout before rejecting
                          reject(new Error('Timeout waiting for elements'));
                          return;
                      }
                      retryCount++;
                      const elements = {
                          engraving1: document.querySelector(SELECTORS.ENGRAVING_1),
                          engraving2: document.querySelector(SELECTORS.ENGRAVING_2),
                          gripColor: document.querySelector(SELECTORS.GRIP_COLOR),
                          basketSize: document.querySelector(SELECTORS.BASKET_SIZE),
                          basketColor: document.querySelector(SELECTORS.BASKET_COLOR),
                          length: document.querySelector(SELECTORS.LENGTH)
                      };

                      console.log(`Checking for elements (attempt ${retryCount}/${maxRetries}):`, elements);

                      if (Object.values(elements).some(el => el !== null)) {
                          clearTimeout(checkTimeout);  // Clear timeout before resolving
                          console.log('Some elements found');
                          resolve(elements);  // Pass elements to resolve
                      } else {
                          console.log('No elements found, retrying...');
                          checkTimeout = setTimeout(checkElements, 100);
                      }
                  };

                  checkElements();
              });
          }

          // ------------------------- Initialization ------------------------- 
          try {
              // Clean up any existing observers first
              observers.forEach(observer => {
                  if (observer && observer.disconnect) {
                      observer.disconnect();
                  }
              });
              observers.length = 0; // Clear the array
              
              await waitForElements();
              
              // Initialize in logical order
              initializeCurrentValues();  // Set initial values
              setupPriceObserver();      // Setup price monitoring
              attachProductListeners();   // Product option listeners
              attachStrapListeners();     // Strap-specific listeners
              attachCartListeners();      // Cart-related listeners
              
              // Setup mutation observer for dynamic content
              const debouncedAttachCartListeners = debounce(attachCartListeners, CART_UPDATE_DELAY);
              setupMutationObserver(debouncedAttachCartListeners);
              
              // Setup visibility change listener to recover from page dormancy
              // Remove old listener if it exists to prevent duplicates
              if (visibilityListener) {
                  document.removeEventListener('visibilitychange', visibilityListener);
              }
              
              // Capture productIds in closure so it persists after callback ends
              const allowedProductIds = [...productIds];
              
              // Create new listener
              visibilityListener = () => {
                  if (document.visibilityState === 'visible') {
                      // Extract product ID from current URL (format: .../p/74102380)
                      const currentUrl = window.location.href;
                      const urlMatch = currentUrl.match(/\/p\/(\d+)/);
                      const currentProductId = urlMatch ? parseInt(urlMatch[1], 10) : null;
                      
                      // Check if current product ID is in the allowed list for THIS script
                      if (!currentProductId || !allowedProductIds.includes(currentProductId)) {
                          console.log('Not on valid product page (productId:', currentProductId, '), skipping recovery');
                          return;
                      }
                      
                      console.log('Page became visible - recovering from potential dormancy');
                      
                      // Clear listener tracking so they can be reattached
                      INITIALIZED_OPTION_LISTENERS.clear();
                      
                      // Re-read all values from DOM
                      initializeCurrentValues();
                      
                      // Reattach all listeners
                      attachProductListeners();
                      attachStrapListeners();
                      attachCartListeners();
                      
                      // Reset price observer
                      setupPriceObserver();
                      
                      console.log('Recovery complete. Current state:', {
                          CURRENT,
                          CURRENT_PRICE
                      });
                  }
              };
              
              // Attach the new listener
              document.addEventListener('visibilitychange', visibilityListener);
              
          } catch (error) {
              console.error('Error during initialization:', error);
          }
        } else {
            // Cleanup when leaving product page
            console.log('Cleaning up observers and listeners');
            observers.forEach(observer => {
                if (observer && observer.disconnect) {
                    observer.disconnect();
                }
            });
            observers.length = 0; // Clear the array
            
            // Clear all initialization flags
            INITIALIZED_OPTION_LISTENERS.clear();
            console.log('Reset all initialization flags');
        }
    });
});

/**
 * @fileoverview This file adds an engraving feature to the plunger products on the ecwid store and in the GrassSticks website.  It uses the Ecwid API with listeners and mutation observers to maintain the correct display and cart.
 * @author Cabot McTavish
 * 
 * This file is grouped by sections: Constants, Functions, Initialization.  In the need for edits, only the constants section should be changed.  The functions section should not be edited.  The initialization section should be used to setup the listeners.
*/

Ecwid.OnAPILoaded.add(function() {
    // Store observers in an array
    let observers = [];
    const INITIALIZED_OPTION_LISTENERS = new Set();
    // Store visibility listener reference for cleanup
    let visibilityListener = null;


    Ecwid.OnPageLoaded.add(async function(page) {
      if (page.type === 'PRODUCT') {
          // Update productIds array with plunger product IDs
          const productIds = [800713928, 361714149]; // Add plunger product IDs here
  
          // Check if the current product ID is in the allowed list
          if (productIds.length > 0 && !productIds.includes(page.productId)) {return;}

          // ------------------------- CONSTANTS ------------------------- 
          // Option names (used in multiple places)
          const OPTION_NAMES = {
            GRIP_COLOR: 'Grip Color',
            ENGRAVING: 'Engraving Count',
            ENGRAVING_TEXT: 'Engraving'
          };
  
          // Update BASE_PRICES with plunger product IDs and prices
          const BASE_PRICES = {800713928: 38, 361714149: 38}; // Add plunger product IDs and base prices here
          const CORK_PRICE = 14;
          const CURRENT = {
            [OPTION_NAMES.GRIP_COLOR]: null,
            [OPTION_NAMES.ENGRAVING]: null,
            [OPTION_NAMES.ENGRAVING_TEXT]: null
          };

          const CURRENT_PRICE = {
            [OPTION_NAMES.GRIP_COLOR]: 0,
            [OPTION_NAMES.ENGRAVING]: 0,
          };

          // Timing constants
          const CART_UPDATE_DELAY = 100;

          // DOM Selectors (frequently used)
          const SELECTORS = {
            ENGRAVING: "input[aria-label='Engraving']",
            GRIP_COLOR: "input[name='Grip Color']:checked",
            PRICE_DISPLAY: '.details-product-price__value.ec-price-item.notranslate',
            ADD_TO_BAG: '.details-product-purchase__add-to-bag',
            ADD_MORE: '.details-product-purchase__add-more',
            QUANTITY: "input[name='ec-qty']"
          };

          const basePrice = BASE_PRICES[page.productId] || 0;

          // To change these, need to also go into Ecwid and change the individual product option prices
          const customEngraving = ['0', '1-6', '1-6', '1-6', '1-6', '1-6', '1-6', '7-8', '7-8', '9-10', '9-10', '11-12', '11-12', '13-14', '13-14', '15-16', '15-16', '17-18', '17-18', '19-20', '19-20', '21-22', '21-22', '23-24', '23-24', '25-26', '25-26', '27-28', '27-28', '29-30', '29-30', '31-32', '31-32', '33-34', '33-34', '35-36', '35-36', '37-38', '37-38', '39-40', '39-40'];
          const engraveInd=[0,14,14,14,14,14,14,15.25,15.25,16.5,16.5,17.75,17.75,19,19,20.25,20.25,21.5,21.5,22.75,22.75,24,24,25.25,25.25,26.5,26.5,27.75,27.75,29,29,30.25,30.25,31.5,31.5,32.75,32.75,34,34,35.25,35.25];

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
                CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] + 
                CURRENT_PRICE[OPTION_NAMES.ENGRAVING];
              
              console.log('Price calculation:', {
                basePrice,
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
                
                const options = {
                    [OPTION_NAMES.GRIP_COLOR]: CURRENT[OPTION_NAMES.GRIP_COLOR] || '',
                    [OPTION_NAMES.ENGRAVING]: CURRENT[OPTION_NAMES.ENGRAVING] || '0',
                    [OPTION_NAMES.ENGRAVING_TEXT]: CURRENT[OPTION_NAMES.ENGRAVING_TEXT] || ''
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

              // Check engraving length (excluding spaces)
              const engravingLength = product.options[OPTION_NAMES.ENGRAVING_TEXT]?.replace(/\s/g, '').length || 0;

              console.log('Engraving validation:', {
                length: engravingLength
              });

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

            // Engraving input
            const engravingInput = document.querySelector(SELECTORS.ENGRAVING);
            console.log('Found engraving input:', !!engravingInput);

            // Engraving
            if (engravingInput && !INITIALIZED_OPTION_LISTENERS.has('engraving_placeholder')) {
                const formControl = engravingInput.closest('.form-control');
                const placeholder = formControl ? formControl.querySelector('.form-control__placeholder') : null;
                if (placeholder) {
                    placeholder.remove();
                }
                
                // Set the input placeholder
                engravingInput.placeholder = 'Enter engraving text';
                
                addListenerOnce('engraving', engravingInput, 'focus', () => {
                    engravingInput.placeholder = '';
                });
                
                addListenerOnce('engraving', engravingInput, 'blur', () => {
                    if (!engravingInput.value) {
                        engravingInput.placeholder = 'Enter engraving text';
                    }
                });
                
                addListenerOnce('engraving', engravingInput, 'input', () => {
                    console.log('Engraving input changed:', engravingInput.value);
                    const engravingText = engravingInput.value;
                    const charCount = engravingText.replace(/\s/g, '').length;
                    
                    if (charCount > 40) {
                        engravingInput.value = engravingInput.value.slice(0, -1);
                        return;
                    }
                    
                    CURRENT_PRICE[OPTION_NAMES.ENGRAVING] = engraveInd[charCount];
                    CURRENT[OPTION_NAMES.ENGRAVING_TEXT] = engravingText;
                    CURRENT[OPTION_NAMES.ENGRAVING] = customEngraving[charCount];
                    updatePrice();
                });
            }

            // Grip color listener (radio buttons)
            const gripColorContainer = document.querySelector('.details-product-option--Grip-Color');
            console.log('Found grip color container:', !!gripColorContainer);
            
            if (gripColorContainer && !INITIALIZED_OPTION_LISTENERS.has('gripColor_change')) {
                // Listen for changes on radio buttons within the container
                gripColorContainer.addEventListener('change', (event) => {
                    if (event.target.type === 'radio' && event.target.name === 'Grip Color') {
                        const gripColorValue = event.target.value;
                        const gripPrice = (gripColorValue === 'Cork') ? CORK_PRICE : 0;
                        
                        console.log('Grip color changed:', {
                            newValue: gripColorValue,
                            isCork: gripColorValue === 'Cork',
                            newPrice: gripPrice
                        });
                        
                        CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] = gripPrice;
                        CURRENT[OPTION_NAMES.GRIP_COLOR] = gripColorValue;
                        updatePrice();
                    }
                });
                
                INITIALIZED_OPTION_LISTENERS.add('gripColor_change');
            }
          }

          // Initialize current values
          function initializeCurrentValues() {
            console.log('Starting initializeCurrentValues()');
            
            // Get all form elements
            const gripColorRadio = document.querySelector(SELECTORS.GRIP_COLOR);
            const engravingInput = document.querySelector(SELECTORS.ENGRAVING);

            // Initialize current values
            CURRENT[OPTION_NAMES.GRIP_COLOR] = gripColorRadio ? gripColorRadio.value : null;
            // Initialize engraving count based on existing engraving text (excluding spaces)
            const engravingTextInit = engravingInput ? (engravingInput.value || '') : '';
            const rawCharCountInit = engravingTextInit.replace(/\s/g, '').length;
            const maxEngravingIndex = Math.min(40, customEngraving.length - 1, engraveInd.length - 1);
            const charCountInit = Math.min(maxEngravingIndex, rawCharCountInit);
            CURRENT[OPTION_NAMES.ENGRAVING] = rawCharCountInit > 0 ? customEngraving[charCountInit] : '0';
            CURRENT[OPTION_NAMES.ENGRAVING_TEXT] = engravingInput ? engravingTextInit : null;

            // Initialize prices
            CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] = gripColorRadio && gripColorRadio.value === 'Cork' ? CORK_PRICE : 0;
            CURRENT_PRICE[OPTION_NAMES.ENGRAVING] = rawCharCountInit > 0 ? (engraveInd[charCountInit] || 0) : 0;

            console.log('Found form elements:', {
                gripColor: !!gripColorRadio,
                engraving: !!engravingInput
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
                            CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] + 
                            CURRENT_PRICE[OPTION_NAMES.ENGRAVING];
                        
                        const expectedPrice = `$${totalPrice.toFixed(2)}`;
                        if (currentPrice !== expectedPrice) {
                            console.log('Price update needed:', {
                                current: currentPrice,
                                expected: expectedPrice,
                                base: basePrice,
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
                    
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList') {
                            const targetNode = mutation.target;
                            
                            // Check for grip color option appearing
                            const hasGripColorChanges = (
                                (targetNode.matches && targetNode.matches('.details-product-option--Grip-Color')) ||
                                (targetNode.matches && targetNode.matches('.details-product-options')) ||
                                Array.from(mutation.addedNodes).some(node => {
                                    if (node.matches) {
                                        return node.matches('.details-product-option--Grip-Color') ||
                                               node.matches('.details-product-options');
                                    }
                                    if (node.querySelector) {
                                        const gripColorOption = node.querySelector('.details-product-option--Grip-Color');
                                        if (gripColorOption) {
                                            // Update CURRENT and CURRENT_PRICE when grip color option appears
                                            const selectedGripColor = gripColorOption.querySelector('input[name="Grip Color"]:checked');
                                            if (selectedGripColor) {
                                                console.log('Found grip color option:', selectedGripColor.value);
                                                CURRENT[OPTION_NAMES.GRIP_COLOR] = selectedGripColor.value;
                                                CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR] = selectedGripColor.value === 'Cork' ? CORK_PRICE : 0;
                                                console.log('Updated grip color state:', {
                                                    value: CURRENT[OPTION_NAMES.GRIP_COLOR],
                                                    price: CURRENT_PRICE[OPTION_NAMES.GRIP_COLOR]
                                                });
                                            }
                                        }
                                        return !!gripColorOption;
                                    }
                                    return false;
                                })
                            );

                            if (hasGripColorChanges) {
                                console.log('Grip color option appeared');
                                // Reattach product listeners to catch new grip color radio buttons
                                setTimeout(() => {
                                    attachProductListeners();
                                }, 0);
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
                          engraving: document.querySelector(SELECTORS.ENGRAVING),
                          gripColor: document.querySelector(SELECTORS.GRIP_COLOR)
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


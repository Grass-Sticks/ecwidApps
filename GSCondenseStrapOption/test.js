// Create and insert the dropdown toggle button
const optionTitle = document.querySelector('.option-title');
const optionContent = document.querySelector('.option-content');

// Set default selected item
const defaultOption = document.querySelector('#strap-mtn');
defaultOption.checked = true;

// Create dropdown button with selected value
const dropdownButton = document.createElement('button');
dropdownButton.className = 'dropdown-toggle';
dropdownButton.innerHTML = `
    <span>${defaultOption.labels[0].textContent}</span>
    <svg class="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8">
        <path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>
`;

// Insert after option-title
optionTitle.parentNode.insertBefore(dropdownButton, optionTitle.nextSibling);

// Add click handler for dropdown
dropdownButton.addEventListener('click', () => {
    optionContent.classList.toggle('expanded');
    dropdownButton.classList.toggle('active');
});

// Add change handler for radio buttons
const radioButtons = document.querySelectorAll('input[name="strap"]');
radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.checked) {
            const selectedText = e.target.labels[0].textContent;
            dropdownButton.querySelector('span').textContent = selectedText;
            // Close dropdown when option is selected
            optionContent.classList.remove('expanded');
            dropdownButton.classList.remove('active');
        }
    });
});

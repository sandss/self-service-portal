import { useEffect } from 'react';

export function useButtonLabeling(descriptor: any) {
  useEffect(() => {
    if (!descriptor) return;

    const updateButtonLabels = () => {
      // Only target the main "Add" button at the bottom of array fields
      const addButtons = document.querySelectorAll('.rjsf .array-item-add button');
      
      // Only target the last button in each array item (which should be the remove button)
      const arrayItems = document.querySelectorAll('.rjsf .array-item');
      
      // Handle main add buttons
      addButtons.forEach(button => {
        const htmlButton = button as HTMLButtonElement;
        if (htmlButton.textContent === '' || htmlButton.textContent?.trim() === '') {
          htmlButton.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Device
          `;
        }
      });
      
      // Handle remove buttons (last button in each array item)
      arrayItems.forEach(item => {
        const buttons = item.querySelectorAll('button');
        if (buttons.length > 0) {
          const removeButton = buttons[buttons.length - 1] as HTMLButtonElement;
          // Check if it looks like a remove button (empty or has remove-like content)
          if ((removeButton.textContent === '' || removeButton.textContent?.trim() === '') && 
              !removeButton.innerHTML.includes('Add Device')) {
            removeButton.innerHTML = `
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove
            `;
          }
        }
      });
    };

    // Initial button labeling
    updateButtonLabels();

    // Set up MutationObserver to watch for new buttons
    const formContainer = document.querySelector('.rjsf');
    if (formContainer) {
      const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                // Check if new buttons were added
                if (element.matches('button') || element.querySelector('button')) {
                  shouldUpdate = true;
                }
              }
            });
          }
        });
        
        if (shouldUpdate) {
          // Small delay to ensure DOM is fully updated
          setTimeout(updateButtonLabels, 10);
        }
      });

      observer.observe(formContainer, {
        childList: true,
        subtree: true
      });

      // Cleanup observer on unmount
      return () => observer.disconnect();
    }
  }, [descriptor]);
}

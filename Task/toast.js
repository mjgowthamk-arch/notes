// 1. Create function 'showToast' taking 'message' and default parameter 'type = "success"'

function showToast(message, type='success'){
    let container=document.getElementById('toast-container')

    if(!container){
        container=document.createElement('div');
        container.id='toast-container';
        document.body.append(container);
    }

    const toast=document.createElement('div');
    toast.className =  `toast ${type}`;
    toast.textContent = message;
    container.append(toast);
    
    // 2. Grab the element with ID 'toast-container' using let (container might be reassigned)

    // 3. If container does NOT exist (!container):

        // 4. Create a new 'div' element and assign it to container

        // 5. Set container.id to 'toast-container'

        // 6. Append container to document.body

    // 7. Create a new 'div' element for the individual toast box (const toast)

    // 8. Set toast.className using a template literal: `toast ${type}`

    // 9. Set toast.textContent to 'message'

    // 10. Append 'toast' into 'container'

    requestAnimationFrame(()=>{
        toast.classList.add('show');
    })
    
    // 11. Call requestAnimationFrame with an arrow callback () => { ... }

        // 12. Inside: add the 'show' class to toast (toast.classList.add('show'))

        setTimeout(() => {
            toast.classList.remove('show'); 
            setTimeout(()=> toast.remove(), 400);

        }, 2500);
}
    // 13. Set a setTimeout timer for 2500ms (2.5 seconds) with an arrow callback:

        // 14. Inside: remove the 'show' class from toast (toast.classList.remove('show'))

        // 15. Set a nested setTimeout timer for 400ms (matches CSS transition duration):

            // 16. Inside: completely delete the toast element from the page (toast.remove())

            
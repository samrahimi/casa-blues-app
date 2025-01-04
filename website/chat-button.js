const chatButton = document.getElementById('chatButton');
const chatIframeContainer = document.getElementById('chatIframeContainer');
const chatIframe = document.getElementById('chatIframe');
let isChatOpen = false;

chatButton.addEventListener('click', () => {
    isChatOpen = !isChatOpen;
    chatIframeContainer.style.display = isChatOpen ? 'block' : 'none';
    chatButton.style.display = isChatOpen ? 'none' : 'block'; // Hide/show chat button based on chat state
});

window.addEventListener('message', (event) => {
    if (event.data === 'closeChatIframe') {
        isChatOpen = false;
        chatIframeContainer.style.display = 'none';
        chatButton.style.display = 'block'; // Show chat button when chat is closed
    }
});
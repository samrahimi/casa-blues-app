import { executeToolAsync } from './chat-tools.js';
import { OPENAI_API_KEY } from './config.js';

const closeChat = document.getElementById('closeChat');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessage');

// Load the agent prompt from markdown file
async function loadAgentPrompt() {
    try {
        const response = await fetch('agent-prompt.md');
        if (!response.ok) {
            throw new Error(`Failed to load agent prompt: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading agent prompt:', error);
        return '';
    }
}

// Initialize conversation history
let conversationHistory = [];

// Initialize the chat
async function initializeChat() {
    const [agentInvocation] = await Promise.all([
        loadAgentPrompt(),
        loadTools()
    ]);
    conversationHistory = [{
        role: 'system',
        content: agentInvocation
    }];
}

// Load tools configuration
let tools = [];
async function loadTools() {
    try {
        const response = await fetch('chat-tools.json');
        if (!response.ok) {
            throw new Error(`Failed to load tools: ${response.status}`);
        }
        tools = await response.json();
    } catch (error) {
        console.error('Error loading tools:', error);
    }
}

closeChat.addEventListener('click', () => {
    window.parent.postMessage('closeChatIframe', '*');
});

sendMessageButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.role);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = marked.parse(message.content);

    messageElement.appendChild(messageContent);

    if (message.role === 'tool') {
        messageContent.innerHTML = marked.parse(`Tool \`${message.name}\` result: \`\`\`json\n${message.content}\n\`\`\``);
    } else if (message.tool_calls) {
        const toolCallsList = document.createElement('ul');
        message.tool_calls.forEach(toolCall => {
            const toolCallItem = document.createElement('li');
            toolCallItem.textContent = `Function Call: ${toolCall.function.name}(${toolCall.function.arguments})`;
            toolCallsList.appendChild(toolCallItem);
        });
        messageElement.appendChild(toolCallsList);
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function performInference() {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: conversationHistory,
                tools: tools
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message;
        
        // Add assistant's message to history and display it
        conversationHistory.push(assistantMessage);
        displayMessage(assistantMessage);

        // If there are tool calls, handle them
        if (assistantMessage.tool_calls) {
            await handleToolCalls(assistantMessage.tool_calls);
        }
    } catch (error) {
        console.error('Error in performInference:', error);
        const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing your request.' };
        displayMessage(errorMessage);
    }
}

async function handleToolCalls(toolCalls) {
    try {
        // Execute each tool call sequentially
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            try {
                // Execute the tool and get the result
                const toolResult = await executeToolAsync(functionName, args, toolCall.id);
                
                // Add tool result to conversation history and display it
                conversationHistory.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: JSON.stringify(toolResult)
                });
                
                displayMessage({
                    role: 'tool',
                    name: functionName,
                    content: JSON.stringify(toolResult)
                });
            } catch (toolError) {
                console.error('Error executing tool:', toolError);
                const errorMessage = {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: JSON.stringify({ error: toolError.message })
                };
                conversationHistory.push(errorMessage);
                displayMessage(errorMessage);
            }
        }

        // After all tools have been executed, perform another inference
        await performInference();
    } catch (error) {
        console.error('Error in handleToolCalls:', error);
        const errorMessage = { role: 'assistant', content: 'Sorry, there was an error processing the tool calls.' };
        displayMessage(errorMessage);
    }
}

async function sendMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Add user message to history and display it
    const userMessageObj = { role: 'user', content: userMessage };
    conversationHistory.push(userMessageObj);
    displayMessage(userMessageObj);
    
    // Clear input
    chatInput.value = '';

    // Perform inference with updated conversation history
    await performInference();
}



// Initialize the chat when the page loads
initializeChat();
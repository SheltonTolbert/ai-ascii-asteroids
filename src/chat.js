function initChat() {
    const chatHistory = document.getElementById('chat-history');
    
    // Wait for iframe to load and be accessible
    chatHistory.onload = () => {
        try {
            const contentDoc = chatHistory.contentDocument || chatHistory.contentWindow.document;
            
            // Add base styling
            const style = contentDoc.createElement('style');
            style.textContent = `
                body { margin: 0; padding: 20px; font-family: monospace; background: #282828; }
                .message { margin-bottom: 20px; }
                .message.user { color: #fabd2f; }
                .message.assistant { margin-left: 20px; border-left: 2px solid #83a598; padding-left: 10px; }
                .summary { color: #b8bb26; margin-bottom: 10px; }
                details { margin: 10px 0; }
                summary { color: #d3869b; cursor: pointer; }
                .code-block { background: rgba(40, 40, 40, 0.6); padding: 10px; border-radius: 4px; margin-top: 10px; }
                pre { margin: 0; white-space: pre-wrap; }
            `;
            
            // Ensure we have access to the document
            if (contentDoc.head) {
                contentDoc.head.appendChild(style);
            } else {
                const head = contentDoc.createElement('head');
                head.appendChild(style);
                contentDoc.documentElement.insertBefore(head, contentDoc.body);
            }

            // Get raw text content
            const text = contentDoc.body.textContent || '';
            if (!text) {
                console.error('No content found in chat history');
                return;
            }

            // Clear and process content
            contentDoc.body.innerHTML = '';
            const messages = text.split(/(?=SheltonTolbert:|GitHub Copilot:)/g);

            messages.forEach(message => {
                if (!message.trim()) return;

                const messageDiv = contentDoc.createElement('div');
                messageDiv.className = message.startsWith('SheltonTolbert:') ? 'message user' : 'message assistant';

                const contentDiv = contentDoc.createElement('div');
                contentDiv.className = 'message-content';

                if (message.startsWith('GitHub Copilot:')) {
                    const parts = message.replace('GitHub Copilot:', '').split('```');
                    
                    // Add summary
                    const summary = contentDoc.createElement('div');
                    summary.className = 'summary';
                    summary.textContent = parts[0].trim();
                    contentDiv.appendChild(summary);

                    // Add code blocks
                    for (let i = 1; i < parts.length; i += 2) {
                        if (parts[i]?.trim()) {
                            const details = contentDoc.createElement('details');
                            const summary = contentDoc.createElement('summary');
                            summary.textContent = 'View code changes';
                            details.appendChild(summary);

                            const codeBlock = contentDoc.createElement('div');
                            codeBlock.className = 'code-block';
                            codeBlock.innerHTML = `<pre><code>${parts[i].trim()}</code></pre>`;
                            details.appendChild(codeBlock);
                            contentDiv.appendChild(details);
                        }
                    }
                } else {
                    contentDiv.textContent = message.trim();
                }

                messageDiv.appendChild(contentDiv);
                contentDoc.body.appendChild(messageDiv);
            });
            
            console.log('Chat history loaded successfully');
        } catch (error) {
            console.error('Error initializing chat:', error);
        }
    };
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', initChat);

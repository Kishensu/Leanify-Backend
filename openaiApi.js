const OpenAI = require('openai');
const { OPENAI_API_KEY, ASSISTANT_ID } = process.env;


const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const assistantId = ASSISTANT_ID;


async function createThread() {
    console.log('Creating a new thread...');
    const thread = await openai.beta.threads.create();
    return thread;
}


async function addMessage(threadId, message) {
    console.log('Adding a new message to thread: ' + threadId);
    const response = await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message,
    });
    console.log('msg is: ' + message);
    return response;
}

async function runAssistant(threadId) {
    console.log('Running assistant for thread: ' + threadId);
    const response = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
    });
    return response;
}


async function checkingStatus(res, threadId, runId, pollingInterval) {
    try {
        const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);
        const status = runObject.status;
        console.log('Current status:', status);

        if (status === 'completed') {
            clearInterval(pollingInterval); 

            const messagesList = await openai.beta.threads.messages.list(threadId);

            const messages = messagesList.body.data[0].content;
            console.log("hasu also wants to see" + messages);


            if (!res.headersSent) {
                res.json({ messages });
            }
        }
    } catch (error) {
        console.error('Error during polling:', error);
        clearInterval(pollingInterval); 
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error retrieving assistant response' });
        }
    }
}

module.exports = {
    createThread,
    addMessage,
    runAssistant,
    checkingStatus,
};
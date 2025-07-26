import { messages } from '../server.js';

export const getMessages = (chatId) => {
  if (!chatId) {
    return [];
  }

  const chatMessages = messages.get(chatId) || [];
  
  // Return messages sorted by timestamp (oldest first)
  return chatMessages.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
};

export const getRecentMessages = (chatId, limit = 50) => {
  const allMessages = getMessages(chatId);
  
  // Return only the most recent messages
  return allMessages.slice(-limit);
};

export const searchMessages = (chatId, searchTerm) => {
  const chatMessages = messages.get(chatId) || [];
  
  if (!searchTerm) {
    return chatMessages;
  }

  return chatMessages.filter(message => 
    message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};


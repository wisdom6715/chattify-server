import { messages } from '../server.js';

export const getMessages = (roomId) => {
  if (!roomId) {
    return [];
  }

  const roomMessages = messages.get(roomId) || [];
  
  // Return messages sorted by timestamp (oldest first)
  return roomMessages.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
};

export const getRecentMessages = (roomId, limit = 50) => {
  const allMessages = getMessages(roomId);
  
  // Return only the most recent messages
  return allMessages.slice(-limit);
};

export const searchMessages = (roomId, searchTerm) => {
  const roomMessages = messages.get(roomId) || [];
  
  if (!searchTerm) {
    return roomMessages;
  }

  return roomMessages.filter(message => 
    message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
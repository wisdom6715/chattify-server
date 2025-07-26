import { rooms } from '../server.js';

export const createRoom = (roomName, createdBy) => {
  if (!roomName || !createdBy) {
    throw new Error('Room name and creator ID are required');
  }

  const roomId = Date.now().toString();
  const currentTime = new Date().toISOString();

  const room = {
    id: roomId,
    name: roomName.trim(),
    createdBy,
    createdAt: currentTime,
    participants: [createdBy],
    lastMessage: null,
    lastActivity: currentTime,
    isPrivate: false,
    description: null
  };

  rooms.set(roomId, room);

  console.log(`Room "${roomName}" created by ${createdBy}`);
  
  return room;
};

export const createPrivateRoom = (user1Id, user2Id, roomName = null) => {
  if (!user1Id || !user2Id) {
    throw new Error('Both user IDs are required for private room');
  }

  // Generate a unique room name for private chat if not provided
  const generatedName = roomName || `Private_${user1Id}_${user2Id}`;
  const roomId = `private_${Math.min(user1Id, user2Id)}_${Math.max(user1Id, user2Id)}`;
  const currentTime = new Date().toISOString();

  // Check if private room already exists
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const room = {
    id: roomId,
    name: generatedName,
    createdBy: user1Id,
    createdAt: currentTime,
    participants: [user1Id, user2Id],
    lastMessage: null,
    lastActivity: currentTime,
    isPrivate: true,
    description: 'Private conversation'
  };

  rooms.set(roomId, room);

  console.log(`Private room created between ${user1Id} and ${user2Id}`);
  
  return room;
};
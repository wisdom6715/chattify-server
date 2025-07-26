import { rooms, users } from '../server.js';

export const getRooms = () => {
  const roomList = [];
  
  for (const [roomId, room] of rooms.entries()) {
    const participantDetails = room.participants.map(participantId => {
      const participant = users.get(participantId);
      return participant ? {
        id: participant.id,
        username: participant.username,
        online: participant.online
      } : null;
    }).filter(Boolean);

    roomList.push({
      id: roomId,
      name: room.name,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      participants: participantDetails,
      participantCount: room.participants.length,
      lastMessage: room.lastMessage || null,
      lastActivity: room.lastActivity || room.createdAt
    });
  }

  // Sort rooms by last activity (most recent first)
  return roomList.sort((a, b) => 
    new Date(b.lastActivity) - new Date(a.lastActivity)
  );
};

export const getUserRooms = (userId) => {
  const userRooms = [];
  
  for (const [roomId, room] of rooms.entries()) {
    if (room.participants.includes(userId)) {
      const participantDetails = room.participants.map(participantId => {
        const participant = users.get(participantId);
        return participant ? {
          id: participant.id,
          username: participant.username,
          online: participant.online
        } : null;
      }).filter(Boolean);

      userRooms.push({
        id: roomId,
        name: room.name,
        createdBy: room.createdBy,
        createdAt: room.createdAt,
        participants: participantDetails,
        participantCount: room.participants.length,
        lastMessage: room.lastMessage || null,
        lastActivity: room.lastActivity || room.createdAt
      });
    }
  }

  // Sort by last activity
  return userRooms.sort((a, b) => 
    new Date(b.lastActivity) - new Date(a.lastActivity)
  );
};
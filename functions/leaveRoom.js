export const handleLeaveRoom = (socket, data, rooms, users, io) => {
    const { roomId, userId, username } = data;
  
    if (!roomId || !userId) {
      socket.emit('error', { message: 'Room ID and user ID are required' });
      return;
    }
  
    // Check if room exists
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
  
    // Leave the socket room
    socket.leave(roomId);
  
    // Remove user from room participants
    const participantIndex = room.participants.indexOf(userId);
    if (participantIndex > -1) {
      room.participants.splice(participantIndex, 1);
      rooms.set(roomId, room);
    }
  
    // Emit successful leave
    socket.emit('room_left', {
      roomId,
      roomName: room.name,
      message: `Left room: ${room.name}`
    });
  
    // Notify other users in the room
    socket.to(roomId).emit('user_left_room', {
      userId,
      username: username || 'Unknown user',
      roomId,
      roomName: room.name,
      message: `${username || 'A user'} left the room`
    });
  
    // If no participants left, optionally delete the room (uncomment if needed)
    // if (room.participants.length === 0) {
    //   rooms.delete(roomId);
    //   console.log(`Room ${room.name} deleted - no participants left`);
    // }
  
    console.log(`User ${username || userId} left room ${room.name}`);
  };
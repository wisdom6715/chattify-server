export const handleUserConnection = (socket, userData, users, io) => {
    const { userId, username } = userData;
    
    if (!username) {
      socket.emit('error', { message: 'Username is required' });
      return;
    }
  
    // Generate userId if not provided
    const finalUserId = userId || Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
    // Update or create user
    const user = {
      id: finalUserId,
      username,
      socketId: socket.id,
      online: true,
      lastSeen: new Date().toISOString()
    };
  
    users.set(finalUserId, user);
    socket.userId = finalUserId;
  
    // Emit successful connection
    socket.emit('user_connected_success', {
      userId: finalUserId,
      username,
      message: 'Connected successfully'
    });
  
    // Notify other users about online status
    socket.broadcast.emit('user_status_changed', {
      userId: finalUserId,
      username,
      online: true
    });
  
    console.log(`User ${username} (${finalUserId}) connected with socket ${socket.id}`);
  };
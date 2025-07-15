import io from 'socket.io-client';

// const socket = io.connect('https://chess-8kfd.onrender.com',);
// const socket = io.connect('https://chess.dynamochess.in');
const socket = io.connect(import.meta.env.VITE_SOCKET_URL);
// Listen for the 'connect' event
socket.on('connect', () => {
    console.log('Socket connected');
  });
  
  // Listen for the 'disconnect' event
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  

export default socket;
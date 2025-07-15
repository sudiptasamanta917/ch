const playerTurn = async (playerId) => {
    let currentTurn = playerId; // Track the current player's turn
  
    if (playerId === room.players[0].playerId) {
      io.to(roomId).emit("nextPlayerTurn", {
        playerId: playerId,
        playerColour: "w",
      });
  
      let currentTime1 = room.timer1;
  
      for (let i = currentTime1; i >= 0; i--) {
        room = await Room.findById(roomId);
  
        if (room.nextplayer !== playerId || room.checkMate || room.DrawStatus) {
          // Stop the timer if the turn changes or the game ends
          return;
        }
  
        const result = convertSecondsToMinutes(i);
        io.to(roomId).emit("timer1", result);
  
        room.timer1 = i - 1;
        if (room.timer1 === 59) {
          io.to(roomId).emit("timerIs60", {
            successfully: true,
            playerId: room.players[0].playerId,
          });
        }
  
        if (room.timer1 === 0) {
          io.to(roomId).emit("playerWon", {
            playerId: room.players[1].playerId,
          });
          room.winner = room.players[1].playerId;
          updateRatings(room.players[1], room.players[0], room.coin);
          await room.save();
          deleteRoom(roomId);
          return;
        }
  
        if (room.isLeftPLayer1) {
          room.playerList.splice(0, 1);
          io.to(roomId).emit("playerWon", {
            playerId: room.players[1].playerId,
          });
          room.winner = room.players[1].playerId;
          updateRatings(room.players[1], room.players[0], room.coin);
          await room.save();
          return;
        }
  
        if (room.players[0].strikeDone) {
          room.players[0].strikeDone = false;
          await room.save();
          break;
        }
  
        await sleep(1000); // Pause for 1 second
      }
    } else {
      io.to(roomId).emit("nextPlayerTurn", {
        playerId: playerId,
        playerColour: "b",
      });
  
      let currentTime2 = room.timer2;
  
      for (let i = currentTime2; i >= 0; i--) {
        room = await Room.findById(roomId);
  
        if (room.nextplayer !== playerId || room.checkMate || room.DrawStatus) {
          // Stop the timer if the turn changes or the game ends
          return;
        }
  
        const result = convertSecondsToMinutes(i);
        io.to(roomId).emit("timer2", result);
  
        room.timer2 = i - 1;
        if (room.timer2 === 59) {
          io.to(roomId).emit("timerIs60", {
            successfully: true,
            playerId: room.players[1].playerId,
          });
        }
  
        if (room.timer2 === 0) {
          io.to(roomId).emit("playerWon", {
            playerId: room.players[0].playerId,
          });
          room.winner = room.players[0].playerId;
          updateRatings(room.players[0], room.players[1], room.coin);
          await room.save();
          deleteRoom(roomId);
          return;
        }
  
        if (room.isLeftPLayer2) {
          room.playerList.splice(1, 1);
          io.to(roomId).emit("playerWon", {
            playerId: room.players[0].playerId,
          });
          room.winner = room.players[0].playerId;
          updateRatings(room.players[0], room.players[1], room.coin);
          await room.save();
          return;
        }
  
        if (room.players[1].strikeDone) {
          room.players[1].strikeDone = false;
          await room.save();
          break;
        }
  
        await sleep(1000); // Pause for 1 second
      }
    }
  };
  

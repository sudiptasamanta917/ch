const calculateTournamentScores = async (tournament, roundId, tournamentId) => {
    const tournamentData = await TournamentModel.findById(tournamentId);
    console.log(roundId, tournamentId, tournamentData, "++++++++++++hiiiiiiiii+++++++++++++");
    
    for (const playerId of tournamentData.players) {
      const player = await PlayersTournament.findById(playerId);
      if (!player) continue;
  
      console.log(player, "+++++Player Info++++++");
  
      const matches = await Match.find({
        $or: [{ user1: player.user }, { user2: player.user }],
        result: { $ne: 'pending' },
        round: new mongoose.Types.ObjectId(roundId) // Correctly filter by roundId
      });
  
      console.log(matches, "+++++Matches Info++++++");
  
      let buchholzScore = 0;
      let sbScore = 0;
      let roundScore = 0; // Initialize round score
  
      for (const match of matches) {
        if (match.result === 'bye') {
          // Handle bye result
          player.receivedBye = true;
          roundScore += 1; // Player gets a full point for a bye
          continue; // Skip further processing for this match
        }
  
        const isWinner = match.winner === player.user;
        const isDraw = !isWinner && match.loser !== player.user;
  
        const opponentId = isWinner ? match.loser : match.winner;
        const opponent = await PlayersTournament.findOne({ user: opponentId });
  
        console.log(opponent, "+++++Opponent Info++++++");
  
        if (opponent) {
          buchholzScore += opponent.score;
  
          if (isWinner) {
            sbScore += opponent.score; // Full opponent's score if player won
            roundScore += 1; // Increase round score for a win
            player.score += 1; // Increase player's overall score for a win
          } else if (isDraw) {
            sbScore += opponent.score * 0.5; // Half opponent's score for a draw
            roundScore += 0.5; // Increase round score for a draw
          }
          
          if (match.loser === opponent.user) {
            opponent.score = Math.max(opponent.score, 0); // Ensure opponent's score doesn't go below 0
            await opponent.save(); // Save the opponent's updated score
          }
        }
      }
  
      // Add or update the round score in roundWiseScore array
      const roundIndex = player.roundWiseScore.findIndex(r => r.roundNumber === roundId);
      if (roundIndex > -1) {
        player.roundWiseScore[roundIndex].score = roundScore;
      } else {
        player.roundWiseScore.push({ roundNumber: roundId, score: roundScore });
      }
  
      // Update the player's other tournament scores
      player.buchholz = buchholzScore;
      player.sonnebornBerger = sbScore;
      await player.save();
  
      console.log(
        player.buchholz,
        player.sonnebornBerger,
        roundScore,
        "Player scores updated successfully."
      );
    }
  };
  
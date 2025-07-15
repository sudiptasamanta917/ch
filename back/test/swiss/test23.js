// Function to check if players can be assigned alternating colors
const canAssignColors = (player1, player2) => {
    const player1LastColor = player1.colorHistory[player1.colorHistory.length - 1];
    const player2LastColor = player2.colorHistory[player2.colorHistory.length - 1];
    console.log(player1LastColor,player2LastColor,"------------------------------------------------")
  
    return player1LastColor !== player2LastColor; // Avoid repeating the same color for players
  };
  
  // Handle additional pairing for adjacent score groups when primary pairing is not possible
  // Handle additional pairing for adjacent score groups when primary pairing is not possible
  const handleAdjacentPairing = async (sortedPlayers, usedPlayers, round, urls, tournamentId, previousMatchups, urlIndex, pairs) => {
    const totalPlayers = sortedPlayers.length;
  
    // Iterate through each player to find a suitable opponent
    for (let i = 0; i < totalPlayers; i++) {
      const player1 = sortedPlayers[i];
  
      // Skip if player is already used
      if (usedPlayers.has(player1.user.toString())) {
        continue;
      }
  
      // Find a suitable opponent for player1
      for (let j = 0; j < totalPlayers; j++) {
        const player2 = sortedPlayers[j];
  
        // Skip if the same player or player is already used
        if (player1.user === player2.user || usedPlayers.has(player2.user.toString())) {
          continue;
        }
  
        // Check if players have already played against each other
        const previousMatch =
          previousMatchups.has(`${player1.user}-${player2.user}`) ||
          previousMatchups.has(`${player2.user}-${player1.user}`);
  
        // Pair players if they have not played before
        if (!previousMatch) {
          const matchUrl = urls[urlIndex++ % urls.length]; // Increment urlIndex here
  
          const boardNumber = pairs.length + 1;
          // Assign colors alternately based on board number
          const colorAssignment =
            boardNumber % 2 === 0
              ? { user1Color: 'w', user2Color: 'b' }
              : { user1Color: 'b', user2Color: 'w' };
  
          // Create a new match with color assignments
          const match = await Match.create({
            round: round._id,
            tournamentId: tournamentId,
            player1: player1._id,
            player2: player2._id,
            user1: player1.user,
            user2: player2.user,
            result: 'pending', // Mark as pending until match is played
            url: matchUrl,
            boardNumber: boardNumber,
            user1Color: colorAssignment.user1Color, // Save user1 color
            user2Color: colorAssignment.user2Color, // Save user2 color
          });
           await match.save()
          pairs.push([player1, player2]); // Store the pair of players
          usedPlayers.add(player1.user.toString());
          usedPlayers.add(player2.user.toString());
  
          round.matches.push(match); // Add the match to the round
  
          // Record the match pairing to avoid future duplicates
          previousMatchups.add(`${player1.user}-${player2.user}`);
          previousMatchups.add(`${player2.user}-${player1.user}`);
         console.log(colorAssignment.user1Color,"1111111111111111111111111111111111111111111111111111111111")
         console.log(colorAssignment.user1Color,"33333333333333333333333333333333333333333333333333333333333333")
        
          // Update players' color history for the current match
          player1.colorHistory.push(colorAssignment.user1Color);
          player2.colorHistory.push(colorAssignment.user2Color);
          // Save updated color history to the database for both players
      await PlayersTournament.updateOne(
        { _id: player1._id },
        { $set: { colorHistory: player1.colorHistory } }
      );
      await PlayersTournament.updateOne(
        { _id: player2._id },
        { $set: { colorHistory: player2.colorHistory } }
      );
          await round.save();
          break; // Break once a match is found to avoid over-pairing
        }
      }
    }
    return urlIndex; // Return updated urlIndex
  };
  
  const pairPlayersForRound = async (tournament, round, urls, tournamentId,roundNumber) => {
    // Fetch players participating in the tournament, including their scores and tie-breaker details
    const players = await PlayersTournament.aggregate([
      {
        $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) }, // Match players by tournament ID
      },
      {
        $project: {
          user: 1,
          score: 1,
          buchholz: 1,
          sonnebornBerger: 1,
          receivedBye: 1,
          colorHistory: 1, // Retrieve only the necessary fields
          "userData.rating": 1 // Include userData.rating in the projection
  
        },
      },
    ]);
    // console.log(players, "++++++++++ Player Data ++++++++++++");
  
  
  
    // Sort players based on score and tie-breaker criteria
    let sortedPlayers = players.sort(
      (a, b) =>
        b.score - a.score ||
        b.buchholz - a.buchholz ||
        b.sonnebornBerger - a.sonnebornBerger
    );
  
  console.log(sortedPlayers,"ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp")
  
    const pairs = []; // Array to hold player pairs
    const usedPlayers = new Set(); // Track players who have been used in pairing
    let urlIndex = 0; // Index to cycle through URLs for matches
  
    // Fetch previous matches to avoid repeated pairings
    const previousMatches = await Match.find({ tournamentId });
    const previousMatchups = new Set(
      previousMatches.flatMap((match) => [
        `${match.user1}-${match.user2}`,
        `${match.user2}-${match.user1}`, // Store previous match pairings in both directions
      ])
    );
  
    // Handle byes if the number of players is odd
    if (sortedPlayers.length % 2 !== 0) {
      let byePlayerIndex = sortedPlayers.length - 1;
  
      // Find a player who has not received a bye yet
      while (byePlayerIndex >= 0 && sortedPlayers[byePlayerIndex].receivedBye) {
        byePlayerIndex--;
      }
  
      // If a player is eligible for a bye, create a bye match
      if (byePlayerIndex >= 0) {
        const byePlayer = sortedPlayers.splice(byePlayerIndex, 1)[0];
  
        const match = await Match.create({
          round: round._id,
          tournamentId: tournamentId,
          player1: byePlayer._id,
          player2: null, // No opponent for a bye
          user1: byePlayer.user,
          user2: null,
          winner: byePlayer.user,
          result: "completed", // Mark the match as completed
          url: urls[urlIndex++ % urls.length], // Assign URL
          user1Color: null, // No color since it's a bye
          user2Color: null,
        });
  
        // Update player's score and mark as having received a bye
        byePlayer.receivedBye = true;
        await PlayersTournament.updateOne(
          { _id: byePlayer._id },
          { $set: { score: byePlayer.score, receivedBye: true } }
        );
  
        round.matches.push(match); // Add the bye match to the round
        usedPlayers.add(byePlayer.user.toString());
      }
    }
  
    // Pair players for the round
    const totalPlayers = sortedPlayers.length;
  
    for (let i = 0; i < totalPlayers / 2; i++) {
      const player1 = sortedPlayers[i];
      const player2 = sortedPlayers[i + Math.floor(totalPlayers / 2)];
//   console.log(player1,player2,"0000000000000000000000000000000000000000000000000000000")
      // Skip pairing if any player has already been used
      if (usedPlayers.has(player1.user.toString()) || usedPlayers.has(player2.user.toString())) {
        console.log(`Skipping used player: ${player1.user} or ${player2.user}`);
        continue;
      }
  
      // Check if players have already played against each other
      const previousMatch =
        previousMatchups.has(`${player1.user}-${player2.user}`) ||
        previousMatchups.has(`${player2.user}-${player1.user}`);
  
      // Pair players if they have not played before and color assignment is valid
      if (!previousMatch && canAssignColors(player1, player2)) {
        const matchUrl = urls[urlIndex++ % urls.length];
  
        const boardNumber = pairs.length + 1; // Board number based on pairs count
        // Assign colors alternately based on board number
        const colorAssignment =
          boardNumber % 2 === 0
            ? { player1Color: "w", player2Color: "b" }
            : { player1Color: "b", player2Color: "w" };
  
        // Create a new match with color assignment for user1 and user2
        const match = await Match.create({
          round: round._id,
          tournamentId: tournamentId,
          player1: player1._id,
          player2: player2._id,
          user1: player1.user,
          user2: player2.user,
          result: "pending", // Mark as pending until match is played
          url: matchUrl,
          boardNumber: boardNumber,
          user1Color: colorAssignment.player1Color,
          user2Color: colorAssignment.player2Color,
        });
  
        pairs.push([player1, player2]); // Store the pair of players
        usedPlayers.add(player1.user.toString());
        usedPlayers.add(player2.user.toString());
  
        round.matches.push(match); // Add the match to the round
  
        // Record the match pairing to avoid future duplicates
        previousMatchups.add(`${player1.user}-${player2.user}`);
        previousMatchups.add(`${player2.user}-${player1.user}`);
  
        // Update players' color history for the current match
        player1.colorHistory.push(colorAssignment.player1Color);
        player2.colorHistory.push(colorAssignment.player2Color);
        // Save updated color history to the database for both players
      await PlayersTournament.updateOne(
        { _id: player1._id },
        { $set: { colorHistory: player1.colorHistory } }
      );
      await PlayersTournament.updateOne(
        { _id: player2._id },
        { $set: { colorHistory: player2.colorHistory } }
      );
      } else {
        console.log(`Previous match found or color clash for: ${player1.user} vs ${player2.user}`);
        urlIndex = await handleAdjacentPairing(
          sortedPlayers,
          usedPlayers,
          round,
          urls,
          tournamentId,
          previousMatchups,
          urlIndex,
          pairs
        ); // Pass the pairs array to the function
      }
    }
    await round.save();
    console.log(`Paired ${pairs.length} players for the round.`);
    return round.matches;
  };
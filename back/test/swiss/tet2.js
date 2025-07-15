// Helper function to determine if color assignment is valid based on players' color history
const canAssignColors = (player1, player2) => {
    const player1WhiteGames = player1.colorHistory.filter((color) => color === 'w').length;
    const player1BlackGames = player1.colorHistory.filter((color) => color === 'b').length;
    const player2WhiteGames = player2.colorHistory.filter((color) => color === 'w').length;
    const player2BlackGames = player2.colorHistory.filter((color) => color === 'b').length;
  
    const player1PrefersWhite = player1WhiteGames <= player1BlackGames;
    const player2PrefersWhite = player2WhiteGames <= player2BlackGames;
  
    return player1PrefersWhite !== player2PrefersWhite;
  };
  
  // Helper function to update player color history in the database
  const updatePlayerColorHistory = async (player) => {
    await PlayersTournament.updateOne({ _id: player._id }, { $set: { colorHistory: player.colorHistory } });
  };
  
  // Function to create and save a match
  const createMatch = async (player1, player2, round, tournamentId, matchUrl, boardNumber, colorAssignment) => {
    const match = await Match.create({
      round: round._id,
      tournamentId: tournamentId,
      player1: player1._id,
      player2: player2._id,
      user1: player1.user,
      user2: player2.user,
      result: 'pending',
      url: matchUrl,
      boardNumber: boardNumber,
      user1Color: colorAssignment.user1Color,
      user2Color: colorAssignment.user2Color,
    });
    await match.save();
    return match;
  };
  
  // Function to handle adjacent pairing when a suitable match is not found
  const handleAdjacentPairing = async (sortedPlayers, usedPlayers, round, urls, tournamentId, previousMatchups, urlIndex, pairs) => {
    const totalPlayers = sortedPlayers.length;
  
    for (let i = 0; i < totalPlayers; i++) {
      const player1 = sortedPlayers[i];
  
      if (usedPlayers.has(player1.user.toString())) continue;
  
      for (let j = 0; j < totalPlayers; j++) {
        const player2 = sortedPlayers[j];
  
        if (player1.user === player2.user || usedPlayers.has(player2.user.toString())) continue;
  
        const previousMatch = previousMatchups.has(`${player1.user}-${player2.user}`) || previousMatchups.has(`${player2.user}-${player1.user}`);
  
        if (!previousMatch) {
          const matchUrl = urls[urlIndex++ % urls.length];
          const boardNumber = pairs.length + 1;
  
          const colorAssignment = boardNumber % 2 === 0
            ? { user1Color: 'w', user2Color: 'b' }
            : { user1Color: 'b', user2Color: 'w' };
  
          const match = await createMatch(player1, player2, round, tournamentId, matchUrl, boardNumber, colorAssignment);
          pairs.push([player1, player2]);
          usedPlayers.add(player1.user.toString());
          usedPlayers.add(player2.user.toString());
  
          round.matches.push(match);
  
          previousMatchups.add(`${player1.user}-${player2.user}`);
          previousMatchups.add(`${player2.user}-${player1.user}`);
  
          player1.colorHistory.push(colorAssignment.user1Color);
          player2.colorHistory.push(colorAssignment.user2Color);
  
          await updatePlayerColorHistory(player1);
          await updatePlayerColorHistory(player2);
  
          await round.save();
          break;
        }
      }
    }
    return urlIndex;
  };
  
  // Function to pair players for the round
  const pairPlayersForRound = async (tournament, round, urls, tournamentId) => {
    const players = await PlayersTournament.aggregate([
      {
        $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) },
      },
      {
        $project: {
          user: 1,
          score: 1,
          buchholz: 1,
          sonnebornBerger: 1,
          receivedBye: 1,
          colorHistory: 1,
          "userData.rating": 1,
        },
      },
    ]);
  
    let sortedPlayers = players.sort((a, b) =>
      b.score - a.score || b.buchholz - a.buchholz || b.sonnebornBerger - a.sonnebornBerger
    );
  
    const pairs = [];
    const usedPlayers = new Set();
    let urlIndex = 0;
  
    const previousMatches = await Match.find({ tournamentId });
    const previousMatchups = new Set(
      previousMatches.flatMap((match) => [
        `${match.user1}-${match.user2}`,
        `${match.user2}-${match.user1}`,
      ])
    );
  
    if (sortedPlayers.length % 2 !== 0) {
      let byePlayerIndex = sortedPlayers.length - 1;
  
      while (byePlayerIndex >= 0 && sortedPlayers[byePlayerIndex].receivedBye) {
        byePlayerIndex--;
      }
  
      if (byePlayerIndex >= 0) {
        const byePlayer = sortedPlayers.splice(byePlayerIndex, 1)[0];
  
        const match = await Match.create({
          round: round._id,
          tournamentId: tournamentId,
          player1: byePlayer._id,
          player2: null,
          user1: byePlayer.user,
          user2: null,
          winner: byePlayer.user,
          result: "completed",
          url: urls[urlIndex++ % urls.length],
          user1Color: null,
          user2Color: null,
        });
  
        byePlayer.receivedBye = true;
        await PlayersTournament.updateOne({ _id: byePlayer._id }, { $set: { score: byePlayer.score, receivedBye: true } });
  
        round.matches.push(match);
        usedPlayers.add(byePlayer.user.toString());
      }
    }
  
    const totalPlayers = sortedPlayers.length;
  
    for (let i = 0; i < totalPlayers / 2; i++) {
      const player1 = sortedPlayers[i];
      const player2 = sortedPlayers[i + Math.floor(totalPlayers / 2)];
  
      if (usedPlayers.has(player1.user.toString()) || usedPlayers.has(player2.user.toString())) {
        continue;
      }
  
      const previousMatch = previousMatchups.has(`${player1.user}-${player2.user}`) || previousMatchups.has(`${player2.user}-${player1.user}`);
  
      if (!previousMatch && canAssignColors(player1, player2)) {
        const matchUrl = urls[urlIndex++ % urls.length];
        const boardNumber = pairs.length + 1;
  
        const colorAssignment = boardNumber % 2 === 0
          ? { player1Color: "w", player2Color: "b" }
          : { player1Color: "b", player2Color: "w" };
  
        const match = await createMatch(player1, player2, round, tournamentId, matchUrl, boardNumber, colorAssignment);
  
        pairs.push([player1, player2]);
        usedPlayers.add(player1.user.toString());
        usedPlayers.add(player2.user.toString());
  
        round.matches.push(match);
  
        previousMatchups.add(`${player1.user}-${player2.user}`);
        previousMatchups.add(`${player2.user}-${player1.user}`);
  
        player1.colorHistory.push(colorAssignment.player1Color);
        player2.colorHistory.push(colorAssignment.player2Color);
  
        await updatePlayerColorHistory(player1);
        await updatePlayerColorHistory(player2);
      } else {
        urlIndex = await handleAdjacentPairing(sortedPlayers, usedPlayers, round, urls, tournamentId, previousMatchups, urlIndex, pairs);
      }
    }
  
    await round.save();
    return round.matches;
  };





  // Function to pair players for the round
const pairPlayersForRound = async (tournament, round, urls, tournamentId, roundNumber) => {
    // Fetch players participating in the tournament
    const players = await PlayersTournament.aggregate([
      {
        $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) },
      },
      {
        $project: {
          user: 1,
          score: 1,
          buchholz: 1,
          sonnebornBerger: 1,
          receivedBye: 1,
          colorHistory: 1,
          "userData.rating": 1
        },
      },
    ]);
  
    // Sort players based on score and tie-breaker criteria
    let sortedPlayers = players.sort(
      (a, b) => b.score - a.score ||
                b.buchholz - a.buchholz ||
                b.sonnebornBerger - a.sonnebornBerger
    );
  
    const pairs = []; // Array to hold player pairs
    const usedPlayers = new Set(); // Track players who have been used in pairing
    let urlIndex = 0; // Index to cycle through URLs for matches
  
    // Fetch previous matches to avoid repeated pairings
    const previousMatches = await Match.find({ tournamentId });
    const previousMatchups = new Set(
      previousMatches.flatMap((match) => [
        `${match.user1}-${match.user2}`,
        `${match.user2}-${match.user1}`,
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
          url: urls[urlIndex++ % urls.length],
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
  
    // 1. Pair players with the same scores
    const scoreMap = new Map(); // To group players by score
    for (const player of sortedPlayers) {
      if (!scoreMap.has(player.score)) {
        scoreMap.set(player.score, []);
      }
      scoreMap.get(player.score).push(player);
    }
  
    for (const playersWithSameScore of scoreMap.values()) {
      while (playersWithSameScore.length >= 2) {
        const player1 = playersWithSameScore.pop();
        const player2 = playersWithSameScore.pop();
  
        // Skip pairing if any player has already been used
        if (usedPlayers.has(player1.user.toString()) || usedPlayers.has(player2.user.toString())) {
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
          const colorAssignment =
            boardNumber % 2 === 0
              ? { player1Color: "w", player2Color: "b" }
              : { player1Color: "b", player2Color: "w" };
  
          const match = await Match.create({
            round: round._id,
            tournamentId: tournamentId,
            player1: player1._id,
            player2: player2._id,
            user1: player1.user,
            user2: player2.user,
            result: "pending",
            url: matchUrl,
            boardNumber: boardNumber,
            user1Color: colorAssignment.player1Color,
            user2Color: colorAssignment.player2Color,
          });
  
          pairs.push([player1, player2]);
          usedPlayers.add(player1.user.toString());
          usedPlayers.add(player2.user.toString());
  
          round.matches.push(match);
  
          // Record the match pairing to avoid future duplicates
          previousMatchups.add(`${player1.user}-${player2.user}`);
          previousMatchups.add(`${player2.user}-${player1.user}`);
  
          // Update players' color history for the current match
          player1.colorHistory.push(colorAssignment.player1Color);
          player2.colorHistory.push(colorAssignment.player2Color);
  
          await PlayersTournament.updateOne(
            { _id: player1._id },
            { $set: { colorHistory: player1.colorHistory } }
          );
          await PlayersTournament.updateOne(
            { _id: player2._id },
            { $set: { colorHistory: player2.colorHistory } }
          );
        }
      }
    }
  
    // 2. Handle remaining players using adjacent pairing
    const remainingPlayers = sortedPlayers.filter(player => !usedPlayers.has(player.user.toString()));
    if (remainingPlayers.length > 0) {
      urlIndex = await handleAdjacentPairing(
        remainingPlayers,
        usedPlayers,
        round,
        urls,
        tournamentId,
        previousMatchups,
        urlIndex,
        pairs
      );
    }
  
    await round.save();
    console.log(`Paired ${pairs.length} players for the round.`);
    return round.matches;
  };
  


  // Function to check if players can be assigned alternating colors
const canAssignColors = (player1, player2) => {
    const player1WhiteGames = player1.colorHistory.filter(color => color === 'w').length;
    const player1BlackGames = player1.colorHistory.filter(color => color === 'b').length;
  
    const player2WhiteGames = player2.colorHistory.filter(color => color === 'w').length;
    const player2BlackGames = player2.colorHistory.filter(color => color === 'b').length;
  
    // Player 1 prefers white if they have played less black games and vice versa
    const player1PrefersWhite = player1WhiteGames <= player1BlackGames;
    const player2PrefersWhite = player2WhiteGames <= player2BlackGames;
  
    // Return true if their preferences are different
    return player1PrefersWhite !== player2PrefersWhite;
  };
  
  // Function to create a match
  const createMatch = async (round, tournamentId, player1, player2, matchUrl, boardNumber) => {
    const colorAssignment = boardNumber % 2 === 0
      ? { player1Color: "w", player2Color: "b" }
      : { player1Color: "b", player2Color: "w" };
  
    const match = await Match.create({
      round: round._id,
      tournamentId: tournamentId,
      player1: player1._id,
      player2: player2._id,
      user1: player1.user,
      user2: player2.user,
      result: 'pending',
      url: matchUrl,
      boardNumber: boardNumber,
      user1Color: colorAssignment.player1Color,
      user2Color: colorAssignment.player2Color,
    });
  
    return match;
  };
  
  // Function to update player color history in the database
  const updatePlayerColorHistory = async (player) => {
    await PlayersTournament.updateOne(
      { _id: player._id },
      { $set: { colorHistory: player.colorHistory } }
    );
  };
  
  // Function to handle adjacent pairing
  const handleAdjacentPairing = async (sortedPlayers, usedPlayers, round, urls, tournamentId, previousMatchups, urlIndex, pairs) => {
    const totalPlayers = sortedPlayers.length;
  
    // Iterate through each player to find a suitable opponent
    for (let i = 0; i < totalPlayers; i++) {
      const player1 = sortedPlayers[i];
  
      // Skip if player is already used
      if (usedPlayers.has(player1.user.toString())) continue;
  
      // Find a suitable opponent for player1
      for (let j = 0; j < totalPlayers; j++) {
        const player2 = sortedPlayers[j];
  
        // Skip if the same player or player is already used
        if (player1.user === player2.user || usedPlayers.has(player2.user.toString())) continue;
  
        // Check if players have already played against each other
        const previousMatch = previousMatchups.has(`${player1.user}-${player2.user}`) || previousMatchups.has(`${player2.user}-${player1.user}`);
  
        // Pair players if they have not played before
        if (!previousMatch) {
          const matchUrl = urls[urlIndex++ % urls.length]; // Increment urlIndex
          const boardNumber = pairs.length + 1;
  
          const match = await createMatch(round, tournamentId, player1, player2, matchUrl, boardNumber);
          pairs.push([player1, player2]);
          usedPlayers.add(player1.user.toString());
          usedPlayers.add(player2.user.toString());
          round.matches.push(match);
  
          // Record the match pairing to avoid future duplicates
          previousMatchups.add(`${player1.user}-${player2.user}`);
          previousMatchups.add(`${player2.user}-${player1.user}`);
  
          // Update players' color history for the current match
          player1.colorHistory.push(match.user1Color);
          player2.colorHistory.push(match.user2Color);
          
          // Save updated color history to the database for both players
          await updatePlayerColorHistory(player1);
          await updatePlayerColorHistory(player2);
  
          await round.save();
          break; // Break once a match is found
        }
      }
    }
    return urlIndex; // Return updated urlIndex
  };
  
  // Function to handle bye matches
  const handleByeMatches = async (sortedPlayers, round, tournamentId, urls, urlIndex) => {
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
          player2: null,
          user1: byePlayer.user,
          user2: null,
          winner: byePlayer.user,
          result: "completed",
          url: urls[urlIndex++ % urls.length],
          user1Color: null,
          user2Color: null,
        });
  
        // Update player's score and mark as having received a bye
        byePlayer.receivedBye = true;
        await PlayersTournament.updateOne(
          { _id: byePlayer._id },
          { $set: { score: byePlayer.score, receivedBye: true } }
        );
  
        round.matches.push(match); // Add the bye match to the round
      }
    }
  };
  
  // Function to pair players for a round
  const pairPlayersForRound = async (tournament, round, urls, tournamentId, roundNumber) => {
    const players = await PlayersTournament.aggregate([
      { $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) } },
      {
        $project: {
          user: 1,
          score: 1,
          buchholz: 1,
          sonnebornBerger: 1,
          receivedBye: 1,
          colorHistory: 1,
          "userData.rating": 1,
        },
      },
    ]);
  
    // Sort players based on score and tie-breaker criteria
    const sortedPlayers = players.sort((a, b) =>
      b.score - a.score || b.buchholz - a.buchholz || b.sonnebornBerger - a.sonnebornBerger
    );
  
    const pairs = []; // Array to hold player pairs
    const usedPlayers = new Set(); // Track players who have been used in pairing
    let urlIndex = 0; // Index to cycle through URLs for matches
  
    // Fetch previous matches to avoid repeated pairings
    const previousMatches = await Match.find({ tournamentId });
    const previousMatchups = new Set(
      previousMatches.flatMap(match => [`${match.user1}-${match.user2}`, `${match.user2}-${match.user1}`])
    );
  
    // Handle bye matches
    await handleByeMatches(sortedPlayers, round, tournamentId, urls, urlIndex);
  
    // Pair players for the round
    const totalPlayers = sortedPlayers.length;
  
    for (let i = 0; i < totalPlayers / 2; i++) {
      const player1 = sortedPlayers[i];
      const player2 = sortedPlayers[i + Math.floor(totalPlayers / 2)];
  
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
        const boardNumber = pairs.length + 1;
  
        const match = await createMatch(round, tournamentId, player1, player2, matchUrl, boardNumber);
        pairs.push([player1, player2]);
        usedPlayers.add(player1.user.toString());
        usedPlayers.add(player2.user.toString());
        round.matches.push(match);
  
        // Record the match pairing to avoid future duplicates
        previousMatchups.add(`${player1.user}-${player2.user}`);
        previousMatchups.add(`${player2.user}-${player1.user}`);
  
        // Update players' color history for the current match
        player1.colorHistory.push(match.user1Color);
        player2.colorHistory.push(match.user2Color);
  
        // Save updated color history to the database for both players
        await updatePlayerColorHistory(player1);
        await updatePlayerColorHistory(player2);
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
        );
      }
    }
  
    await round.save(); // Save the updated round after pairing players
  };
  
  // Main function to be called for pairing players
  const pairPlayers = async (tournamentId, roundNumber) => {
    const tournament = await Tournament.findById(tournamentId);
    const round = await Round.findOne({ tournamentId, roundNumber });
    const urls = await getMatchUrls(); // Fetch match URLs
  
    await pairPlayersForRound(tournament, round, urls, tournamentId, roundNumber);
  };
  
  
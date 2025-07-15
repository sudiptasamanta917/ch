const groupPlayersByScore = (players) => {
    const scoreGroups = {};
    const seenUsers = new Set();
  
    players.forEach((player) => {
      if (seenUsers.has(player.user.toString())) return;
      seenUsers.add(player.user.toString());
  
      const score = player.score;
      if (!scoreGroups[score]) {
        scoreGroups[score] = [];
      }
      scoreGroups[score].push(player);
    });
  
    return Object.values(scoreGroups);
  };

  const assignColors = (player1, player2, boardNumber) => {
    const player1LastColor = player1.colorHistory[player1.colorHistory.length - 1];
    const player2LastColor = player2.colorHistory[player2.colorHistory.length - 1];
  
    // Assign colors based on previous color history
    if (player1LastColor === 'w' && player2LastColor !== 'b') {
      return { player1Color: 'b', player2Color: 'w' };
    } else if (player1LastColor === 'b' && player2LastColor !== 'w') {
      return { player1Color: 'w', player2Color: 'b' };
    } else if (player2LastColor === 'w' && player1LastColor !== 'b') {
      return { player1Color: 'b', player2Color: 'w' };
    } else if (player2LastColor === 'b' && player1LastColor !== 'w') {
      return { player1Color: 'w', player2Color: 'b' };
    } else {
      // Assign colors alternately based on board number
      return boardNumber % 2 === 0
        ? { player1Color: 'w', player2Color: 'b' }
        : { player1Color: 'b', player2Color: 'w' };
    }
  };
  
  const handleOddGroupPairing = async (groups, usedPlayers, round, urls, tournamentId, urlIndex, pairs, previousMatchups) => {
    for (let i = 0; i < groups.length; i++) {
      let currentGroup = groups[i];
  
      // If current group has odd players, take the last one and pair with next group's first player
      if (currentGroup.length % 2 !== 0) {
        const leftoverPlayer = currentGroup.pop(); // Remove the odd player
  
        // Pair the leftover player with the first player from the next group if it exists
        if (i + 1 < groups.length && groups[i + 1].length > 0) {
          const nextGroup = groups[i + 1];
          const nextPlayer = nextGroup.shift(); // Take the first player from the next group
  
          const boardNumber = pairs.length + 1;
          const matchUrl = urls[urlIndex++ % urls.length];
          
          // Assuming assignColors is already defined and works correctly
          const colorAssignment = assignColors(leftoverPlayer, nextPlayer, boardNumber);
  
          try {
            const match = await Match.create({
              round: round._id,
              tournamentId: tournamentId,
              player1: leftoverPlayer._id,
              player2: nextPlayer._id,
              user1: leftoverPlayer.user,
              user2: nextPlayer.user,
              result: 'pending',
              url: matchUrl,
              boardNumber: boardNumber,
              user1Color: colorAssignment.player1Color,
              user2Color: colorAssignment.player2Color,
            });
  
            pairs.push(match);
            usedPlayers.add(leftoverPlayer.user.toString());
            usedPlayers.add(nextPlayer.user.toString());
  
            previousMatchups.add(`${leftoverPlayer.user}-${nextPlayer.user}`);
            previousMatchups.add(`${nextPlayer.user}-${leftoverPlayer.user}`);
          } catch (error) {
            console.error(`Error creating match for players ${leftoverPlayer.user} and ${nextPlayer.user}:`, error);
          }
        }
      }
    }
  };
  
  
  // const pairPlayersForRound = async (tournament, round, urls, tournamentId, roundNumber) => {
  //   const players = await PlayersTournament.aggregate([
  //     {
  //       $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) },
  //     },
  //     {
  //       $project: {
  //         user: 1,
  //         score: 1,
  //         buchholz: 1,
  //         sonnebornBerger: 1,
  //         receivedBye: 1,
  //         colorHistory: 1,
  //       },
  //     },
  //   ]);
  
  //   let scoreGroups = groupPlayersByScore(players);
  
  //   const pairs = [];
  //   const usedPlayers = new Set();
  //   let urlIndex = 0;
  
  //   const previousMatches = await Match.find({ tournamentId });
  //   const previousMatchups = new Set(
  //     previousMatches.flatMap((match) => [
  //       `${match.user1}-${match.user2}`,
  //       `${match.user2}-${match.user1}`,
  //     ])
  //   );
  
  //   // Check for odd number of total players
  //   const sortedPlayers = players.filter(player => !usedPlayers.has(player.user.toString()));
  //   if (sortedPlayers.length % 2 !== 0) {
  //     let byePlayerIndex = sortedPlayers.length - 1;
  
  //     // Find a player who has not received a bye yet
  //     while (byePlayerIndex >= 0 && sortedPlayers[byePlayerIndex].receivedBye) {
  //       byePlayerIndex--;
  //     }
  
  //     // If a player is eligible for a bye, create a bye match
  //     if (byePlayerIndex >= 0) {
  //       const byePlayer = sortedPlayers.splice(byePlayerIndex, 1)[0];
  
  //       const match = await Match.create({
  //         round: round._id,
  //         tournamentId: tournamentId,
  //         player1: byePlayer._id,
  //         player2: null, // No opponent for a bye
  //         user1: byePlayer.user,
  //         user2: null,
  //         winner: byePlayer.user,
  //         result: "completed", // Mark the match as completed
  //         url: urls[urlIndex++ % urls.length], // Assign URL
  //         user1Color: null, // No color since it's a bye
  //         user2Color: null,
  //       });
  
  //       // Update player's score and mark as having received a bye
  //       byePlayer.receivedBye = true;
  //       await PlayersTournament.updateOne(
  //         { _id: byePlayer._id },
  //         { $set: { score: byePlayer.score, receivedBye: true } }
  //       );
  
  //       round.matches.push(match); // Add the bye match to the round
  //       usedPlayers.add(byePlayer.user.toString());
  //     }
  //   }
  
  //   // Handle odd players in each group
  //  await handleOddGroupPairing(scoreGroups, usedPlayers, round, urls, tournamentId, urlIndex, pairs, previousMatchups);
  
  //   // Pair the remaining players within each group
  //   for (let group of scoreGroups) {
  //     for (let i = 0; i < group.length - 1; i += 2) {
  //       const player1 = group[i];
  //       const player2 = group[i + 1];
  
  //       if (
  //         usedPlayers.has(player1.user.toString()) ||
  //         usedPlayers.has(player2.user.toString())
  //       ) {
  //         continue;
  //       }
  
  //       const previousMatch =
  //         previousMatchups.has(`${player1.user}-${player2.user}`) ||
  //         previousMatchups.has(`${player2.user}-${player1.user}`);
  
  //       if (!previousMatch) {
  //         const matchUrl = urls[urlIndex++ % urls.length];
  //         const boardNumber = pairs.length + 1;
  //         const colorAssignment = assignColors(player1, player2, boardNumber);
  
  //         const match = await Match.create({
  //           round: round._id,
  //           tournamentId: tournamentId,
  //           player1: player1._id,
  //           player2: player2._id,
  //           user1: player1.user,
  //           user2: player2.user,
  //           result: 'pending',
  //           url: matchUrl,
  //           boardNumber: boardNumber,
  //           user1Color: colorAssignment.player1Color,
  //           user2Color: colorAssignment.player2Color,
  //         });
  
  //         pairs.push([player1, player2]);
  //         usedPlayers.add(player1.user.toString());
  //         usedPlayers.add(player2.user.toString());
  //         round.matches.push(match);
  //         previousMatchups.add(`${player1.user}-${player2.user}`);
  //         previousMatchups.add(`${player2.user}-${player1.user}`);
  //       }
  //     }
  //   }
  
  //   await round.save();
  //   console.log(`Paired ${pairs.length} players for the round.`);
  //   return round.matches;
  // };

  const pairPlayersForRound = async (tournament, round, urls, tournamentId, roundNumber) => {
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
        },
      },
    ]);
  
    const usedPlayers = new Set();
    let urlIndex = 0;
  
    // Retrieve previous matches to avoid repeat pairings
    const previousMatches = await Match.find({ tournamentId });
    const previousMatchups = new Set(
      previousMatches.flatMap((match) => [
        `${match.user1}-${match.user2}`,
        `${match.user2}-${match.user1}`,
      ])
    );
  
    // 1. Handle Bye Player if Odd Number of Players
    const sortedPlayers = players.filter((player) => !usedPlayers.has(player.user.toString()));
    if (sortedPlayers.length % 2 !== 0) {
      let byePlayerIndex = sortedPlayers.length - 1;
  
      // Find a player who hasn't received a bye yet
      while (byePlayerIndex >= 0 && sortedPlayers[byePlayerIndex].receivedBye) {
        byePlayerIndex--;
      }
  
      // If an eligible player for a bye is found, create a bye match
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
  
        // Update player's score and mark them as having received a bye
        await PlayersTournament.updateOne(
          { _id: byePlayer._id },
          { $set: { score: byePlayer.score, receivedBye: true } }
        );
  
        round.matches.push(match); // Add the bye match to the round
        usedPlayers.add(byePlayer.user.toString());
      }
    }
  
    // 2. Group Players by Score
    let scoreGroups = await groupPlayersByScore(sortedPlayers);
  
    // 3. Handle Odd Group Pairing and Pair the Remaining Players Within Each Group
    const pairs = [];
    for (let i = 0; i < scoreGroups.length; i++) {
      let currentGroup = scoreGroups[i];
  
      // If current group has odd players, take the last one and pair with next group's first player
      if (currentGroup.length % 2 !== 0) {
        const leftoverPlayer = currentGroup.pop(); // Remove the odd player
  
        // Pair the leftover player with the first player from the next group if it exists
        if (i + 1 < scoreGroups.length && scoreGroups[i + 1].length > 0) {
          const nextGroup = scoreGroups[i + 1];
          const nextPlayer = nextGroup.shift(); // Take the first player from the next group
  
          await createMatch(leftoverPlayer, nextPlayer, round, urls, urlIndex++, pairs, previousMatchups, usedPlayers);
        }
      }
  
      // Pair the remaining players within the group
      for (let j = 0; j < currentGroup.length; j++) {
        const player1 = currentGroup[j];
  
        // Find an unpaired alternative player from the same group
        let alternativePlayer = currentGroup.find(
          (p) =>
            !usedPlayers.has(p.user.toString()) &&
            !previousMatchups.has(`${p.user}-${player1.user}`) &&
            !previousMatchups.has(`${player1.user}-${p.user}`)
        );
  
        // If no alternative player is found, pair player1 with someone from the next group
        if (!alternativePlayer && i + 1 < scoreGroups.length) {
          const nextGroup = scoreGroups[i + 1];
          alternativePlayer = nextGroup.find(
            (p) =>
              !usedPlayers.has(p.user.toString()) &&
              !previousMatchups.has(`${p.user}-${player1.user}`) &&
              !previousMatchups.has(`${player1.user}-${p.user}`)
          );
        }
  
        if (alternativePlayer) {
          // Pair player1 with the alternativePlayer
          await createMatch(player1, alternativePlayer, round, urls, urlIndex++, pairs, previousMatchups, usedPlayers);
        }
      }
    }
  
    // Save the round with all its matches
    await round.save();
    console.log(`Paired ${pairs.length} players for the round.`);
    return round.matches;
  };
  
  // Helper function to create a match and manage color assignment and history
  const createMatch = async (player1, player2, round, urls, urlIndex, pairs, previousMatchups, usedPlayers) => {
    const matchUrl = urls[urlIndex % urls.length];
    const boardNumber = pairs.length + 1;
  
    const colorAssignment = await assignColors(player1, player2, boardNumber);
  
    const match = await Match.create({
      round: round._id,
      tournamentId: round.tournamentId,
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
  
    pairs.push([player1, player2]);
    usedPlayers.add(player1.user.toString());
    usedPlayers.add(player2.user.toString());
    round.matches.push(match);
  
    // Update color history for both players
    await PlayersTournament.updateOne(
      { _id: player1._id },
      { $push: { colorHistory: colorAssignment.player1Color } }
    );
    await PlayersTournament.updateOne(
      { _id: player2._id },
      { $push: { colorHistory: colorAssignment.player2Color } }
    );
  
    previousMatchups.add(`${player1.user}-${player2.user}`);
    previousMatchups.add(`${player2.user}-${player1.user}`);
  };
  
  
  
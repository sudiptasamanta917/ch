for (let i = 0; i < scoreGroups.length; i++) {
  let currentGroup = scoreGroups[i];

  currentGroup.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
    return 0; // Add further tie-breaking criteria if needed
  });

  // Handle odd players by moving the leftover player to the next group
  if (currentGroup.length % 2 !== 0) {
    const leftoverPlayer = currentGroup.pop(); // Remove the odd player

    if (!usedPlayers.has(leftoverPlayer.user.toString())) {
      if (i + 1 < scoreGroups.length && scoreGroups[i + 1].length > 0) {
        const nextGroup = scoreGroups[i + 1];
        let nextPlayer = null;

        for (let j = 0; j < nextGroup.length; j++) {
          const potentialNextPlayer = nextGroup[j];
          if (
            !usedPlayers.has(potentialNextPlayer.user.toString()) &&
            !previousMatchups.has(`${leftoverPlayer.user}-${potentialNextPlayer.user}`) &&
            !previousMatchups.has(`${potentialNextPlayer.user}-${leftoverPlayer.user}`)
          ) {
            nextPlayer = potentialNextPlayer;
            nextGroup.splice(j, 1); // Remove the paired player from the next group
            break;
          }
        }

        if (nextPlayer) {
          const boardNumber = pairs.length + 1;
          const matchUrl = urls[urlIndex++ % urls.length];
          const colorAssignment = assignColors(leftoverPlayer, nextPlayer, boardNumber);

          try {
            const match = await Match.create({
              round: round._id,
              tournamentId: tournamentId,
              player1: leftoverPlayer._id,
              player2: nextPlayer._id,
              user1: leftoverPlayer.user,
              user2: nextPlayer.user,
              result: "pending",
              url: matchUrl,
              boardNumber: boardNumber,
              user1Color: colorAssignment.player1Color,
              user2Color: colorAssignment.player2Color,
            });

            pairs.push([leftoverPlayer, nextPlayer]); // Track players
            usedPlayers.add(leftoverPlayer.user.toString());
            usedPlayers.add(nextPlayer.user.toString());

            // Update color history
            await PlayersTournament.updateOne(
              { _id: leftoverPlayer._id },
              { $push: { colorHistory: colorAssignment.player1Color } }
            );
            await PlayersTournament.updateOne(
              { _id: nextPlayer._id },
              { $push: { colorHistory: colorAssignment.player2Color } }
            );

            round.matches.push(match);
            previousMatchups.add(`${leftoverPlayer.user}-${nextPlayer.user}`);
            previousMatchups.add(`${nextPlayer.user}-${leftoverPlayer.user}`);
          } catch (error) {
            console.error(
              `Error creating match for players ${leftoverPlayer.user} and ${nextPlayer.user}:`,
              error
            );
          }
        } else {
          console.log(`No valid pair found for leftover player ${leftoverPlayer.user}`);
        }
      }
    } else {
      console.log(`Leftover player ${leftoverPlayer.user} is already used.`);
    }
  }

  // Pair the remaining players within the group
  const half = Math.floor(currentGroup.length / 2);
  for (let j = 0; j < half; j++) {
    const player1 = currentGroup[j];
    const player2 = currentGroup[j + half];
  
    if (usedPlayers.has(player1.user.toString()) || usedPlayers.has(player2.user.toString())) {
      continue;
    }
  
    const previousMatch =
      previousMatchups.has(`${player1.user}-${player2.user}`) ||
      previousMatchups.has(`${player2.user}-${player1.user}`);
  
    if (!previousMatch) {
      const matchUrl = urls[urlIndex++ % urls.length];
      const boardNumber = pairs.length + 1;
      const colorAssignment = await assignColors(player1, player2, boardNumber);
  
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
    } else {
      // Handle case where players are already matched
      let alternativePlayer = currentGroup.find(
        (p) =>
          p.user.toString() !== player1.user.toString() &&
          !usedPlayers.has(p.user.toString()) &&
          !previousMatchups.has(`${p.user}-${player1.user}`) &&
          !previousMatchups.has(`${player1.user}-${p.user}`)
      );
  
      if (alternativePlayer) {
        const matchUrl = urls[urlIndex++ % urls.length];
        const boardNumber = pairs.length + 1;
        const colorAssignment = await assignColors(player1, alternativePlayer, boardNumber);
  
        const match = await Match.create({
          round: round._id,
          tournamentId: tournamentId,
          player1: player1._id,
          player2: alternativePlayer._id,
          user1: player1.user,
          user2: alternativePlayer.user,
          result: "pending",
          url: matchUrl,
          boardNumber: boardNumber,
          user1Color: colorAssignment.player1Color,
          user2Color: colorAssignment.player2Color,
        });
  
        pairs.push([player1, alternativePlayer]);
        usedPlayers.add(player1.user.toString());
        usedPlayers.add(alternativePlayer.user.toString());
        round.matches.push(match);
  
        // Update color history for both players
        await PlayersTournament.updateOne(
          { _id: player1._id },
          { $push: { colorHistory: colorAssignment.player1Color } }
        );
        await PlayersTournament.updateOne(
          { _id: alternativePlayer._id },
          { $push: { colorHistory: colorAssignment.player2Color } }
        );
  
        previousMatchups.add(`${player1.user}-${alternativePlayer.user}`);
        previousMatchups.add(`${alternativePlayer.user}-${player1.user}`);
      } else {
        // If no alternative player is found, move both player1 and player2 to the next group
        if (i + 1 < scoreGroups.length) {
          const nextGroup = scoreGroups[i + 1];
          nextGroup.push(player1, player2); // Move both players to the next group
          console.log(
            `No valid pair found for ${player1.user} and ${player2.user}, moved to the next group`
          );
  
          // Remove both players from the current group
          currentGroup.splice(j, 1); // Remove player1
          currentGroup.splice(j + half - 1, 1); // Remove player2 (accounting for the earlier removal of player1)
  
          // Recalculate 'half' since the group size has changed
          half = Math.floor(currentGroup.length / 2);
  
          // Adjust 'j' since the group was modified
          j--;
        } else {
          console.log(`No next group exists for ${player1.user} and ${player2.user}`);
        }
      }
    }
  }
  
}

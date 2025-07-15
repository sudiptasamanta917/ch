const pairPlayersForRound = async (tournament, round, urls, tournamentId) => {
  // Fetch player data for the tournament
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
        receivedBye: 1, // Include the receivedBye field
      },
    },
  ]);
  console.log(players, "++++++++++ Player Data ++++++++++++");

  // Sort players by score, then by Buchholz
  let sortedPlayers = players.sort(
    (a, b) => b.score - a.score || b.buchholz - a.buchholz
  );

  const pairs = [];
  const usedPlayers = new Set();
  let urlIndex = 0;

  // Retrieve all previous matches to avoid repeat pairings
  const previousMatches = await Match.find({ tournamentId });
  const previousMatchups = new Set(
    previousMatches.flatMap((match) => [
      `${match.user1}-${match.user2}`,
      `${match.user2}-${match.user1}`,
    ])
  );

  // If the number of players is odd, assign a bye to the last player who hasn't received a bye
  if (sortedPlayers.length % 2 !== 0) {
    let byePlayerIndex = sortedPlayers.length - 1;

    // Find the first player who hasn't received a bye
    while (byePlayerIndex >= 0 && sortedPlayers[byePlayerIndex].receivedBye) {
      byePlayerIndex--;
    }

    if (byePlayerIndex >= 0) {
      const byePlayer = sortedPlayers.splice(byePlayerIndex, 1)[0]; // Remove the player from sortedPlayers

      // Assign a bye and create a "match" with a bye
      const match = await Match.create({
        round: round._id,
        tournamentId: tournamentId,
        player1: byePlayer._id,
        player2: null, // No opponent for a bye
        user1: byePlayer.user,
        user2: null, // No user2 for a bye
        result: "completed",
        url: urls[urlIndex++ % urls.length], // Assign a unique URL
      });

      // The byePlayer gets a full point for the round
      byePlayer.score += 1;
      byePlayer.receivedBye = true;
      await PlayersTournament.updateOne(
        { _id: byePlayer._id },
        { $set: { score: byePlayer.score, receivedBye: true } }
      );

      // Add the match to the round
      round.matches.push(match);

      usedPlayers.add(byePlayer.user.toString());
    }
  }

  // Pair remaining players
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player1 = sortedPlayers[i];
    if (usedPlayers.has(player1.user.toString())) continue;

    let foundPair = false; // Flag to check if a pair is found for player1

    for (let j = i + 1; j < sortedPlayers.length; j++) {
      const player2 = sortedPlayers[j];
      if (usedPlayers.has(player2.user.toString())) continue;

      // Check if these players have already been paired in any previous round
      const previousMatch =
        previousMatchups.has(`${player1.user}-${player2.user}`) ||
        previousMatchups.has(`${player2.user}-${player1.user}`);

      // If no previous match exists, pair them together
      if (!previousMatch) {
        const matchUrl = urls[urlIndex++ % urls.length]; // Assign a unique URL to this match

        // Create the match
        const match = await Match.create({
          round: round._id,
          tournamentId: tournamentId,
          player1: player1._id,
          player2: player2._id,
          user1: player1.user,
          user2: player2.user,
          result: "pending",
          url: matchUrl,
        });

        pairs.push([player1, player2]);
        usedPlayers.add(player1.user.toString());
        usedPlayers.add(player2.user.toString());

        // Add the match to the round
        round.matches.push(match);

        previousMatchups.add(`${player1.user}-${player2.user}`);
        previousMatchups.add(`${player2.user}-${player1.user}`);

        foundPair = true; // Mark that a valid pair was found for player1
        break; // Break the inner loop to move to the next player
      }
    }

    // If no valid pair is found for player1, return false
    if (!foundPair) {
      console.log(`Pairing not possible for player: ${player1.user}`);
      return false;
    }
  }

  // Save the updated round with the new matches
  await round.save();
  return true; // Return true if all players were successfully paired
};


const calculateTournamentScores = async (tournament, roundId, tournamentId) => {
    const tournamentData = await TournamentModel.findById(tournamentId);
    const roundData = await Round.findById(roundId); // Get round info for roundNumber
    console.log(roundId, tournamentId, tournamentData, "+++++ Tournament and Round Data +++++");

    // Loop through each player in the tournament
    for (const playerId of tournamentData.players) {
        const player = await PlayersTournament.findById(playerId);
        if (!player) continue;

        console.log(player, "+++++ Player Info +++++");

        // Fetch matches where the player participated in the given round
        const matches = await Match.find({
            $or: [{ user1: player.user }, { user2: player.user }],
            result: { $ne: 'pending' },
            round: new mongoose.Types.ObjectId(roundId) // Ensure round filtering
        });

        console.log(matches, "+++++ Matches Info +++++");

        let roundScore = 0;
        let sonnebornBergerScore = 0;
        let directEncounterScore = 0; // For tracking head-to-head results

        // Process each match to calculate scores
        for (const match of matches) {
            if (match.result === 'bye') {
                // Handle bye: Player gets 1 point for a bye
                match.result="completed"
                const existingRoundScore = player.roundWiseScore.find(r => r.roundNumber === roundData.roundNumber);
                if (existingRoundScore) {
                    existingRoundScore.score = 1; // Update score for the round
                } else {
                    player.roundWiseScore.push({ roundNumber: roundData.roundNumber, score: 1 }); // Add a new round score
                }
                continue; // Skip further processing for this match
            }

            // Identify the opponent for this match
            let opponentUser = match.winner === player.user ? match.loser : match.winner;
            let opponent = await PlayersTournament.findOne({ user: opponentUser, tournamentId });

            // Calculate points based on match result
            if (match.winner === player.user) {
                roundScore += 1; // Player won
                sonnebornBergerScore += opponent?.score || 0; // Add opponent's score to Sonneborn-Berger
            } else if (match.result === 'draw') {
                roundScore += 0.5; // Draw gives 0.5 point
            }

            // Update Buchholz score (sum of opponent's score)
            player.buchholz += opponent?.score || 0;

            // Direct encounter tie-breaker (check if this is a head-to-head match)
            if (opponent && opponent.score !== undefined) {
                if (match.winner === player.user) {
                    directEncounterScore += 1; // Player wins head-to-head
                } else if (match.loser === player.user) {
                    directEncounterScore -= 1; // Player loses head-to-head
                }
            }
        }

        // Cumulative score tie-breaker (sum of scores up to the current round)
        let cumulativeScore = player.roundWiseScore.reduce((total, round) => total + round.score, 0);

        // Update player's total score and tie-breakers
        player.score += roundScore;
        player.sonnebornBerger += sonnebornBergerScore;
        player.directEncounter += directEncounterScore;
        player.cumulativeScore = cumulativeScore + roundScore; // Update cumulative score with the latest round

        // Update the player's round-wise score directly
        const existingRoundScore = player.roundWiseScore.find(r => r.roundNumber === roundData.roundNumber);
        if (existingRoundScore) {
            existingRoundScore.score = roundScore; // Update existing score for the round
        } else {
            player.roundWiseScore.push({ roundNumber: roundData.roundNumber, score: roundScore }); // Add a new round score
        }

        // Save the updated player data
        await player.save();

        console.log(`Updated player ${player.user} - Score: ${player.score}, Buchholz: ${player.buchholz}, SB: ${player.sonnebornBerger}, Direct Encounter: ${player.directEncounter}, Cumulative Score: ${player.cumulativeScore}`);
    }
};


const startTournament = async (req, res) => {
  const { tournamentId, gameTime, roundNumber, noOfRounds, delayTime } = req.params;

  try {
    const tournament = await TournamentModel.findById(tournamentId).populate("players");
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    if (roundNumber == 1) {
      if (tournament.status == "pending") {
        // Check if there are enough players
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to start the tournament" });
        }

        // Create or fetch Player documents
        const playerIds = [];
        for (const joinedPlayer of tournament.JoinedPlayerList) {
          let player = await PlayersTournament.findOne({
            user: joinedPlayer.user,
            tournamentId: tournament._id,
          });

          if (!player) {
            player = new PlayersTournament({
              user: joinedPlayer.user,
              userData: joinedPlayer.userData,
              tournamentId: tournament._id,
            });
            await player.save();
          }
          playerIds.push(player._id);
        }

        // Update the tournament with player IDs and set status to ongoing
        tournament.players = playerIds;
        tournament.status = "ongoing";
        tournament.upComingRound =2;  // Increment after first round starts
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(tournament.noOfplayers, gameTime, tournamentId, round._id);

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(tournament, round, urls, tournamentId);

          const pendingMatches = await Match.find({ result: "pending", round: round._id });

          for (const match of pendingMatches) {
            const player1Id = (await PlayersTournament.findById(match.player1)).user;
            const player2Id = (await PlayersTournament.findById(match.player2)).user;

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Id,
              player2: player2Id,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              

              const totalLength=matchesData.length
              let count=0
              for(let element of matchesData){
                if(element.result=="completed"){
             count++
                }
              }
              console.log(count,totalLength,flag,matchesData,"++++++6666666666666666666666666666666666666666666666666666666666666666+++++++++++++++")
              if (count==totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(tournament, round._id, tournamentId);

                if (roundNumber == noOfRounds) {
                  tournament.status = "completed";
                  await tournament.save();
                }

                flag = true;
                break;
              }

              await sleep(1000);
            }
          }

          terminate(round._id);
        };

        scheduleNextRound();

        return res.status(200).json({ message: "Tournament started successfully", tournament });
      }
    }

    if (roundNumber ==2) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to continue the tournament" });
        }

        const playerIds = [];
        for (const joinedPlayer of tournament.JoinedPlayerList) {
          let player = await PlayersTournament.findOne({
            user: joinedPlayer.user,
            tournamentId: tournament._id,
          });

          if (!player) {
            player = new PlayersTournament({
              user: joinedPlayer.user,
              userData: joinedPlayer.userData,
              tournamentId: tournament._id,
            });
            await player.save();
          }
          playerIds.push(player._id);
        }

        tournament.players = playerIds;
        tournament.upComingRound =3;  // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(tournament.noOfplayers, gameTime, tournamentId, round._id);

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(tournament, round, urls, tournamentId);

          const pendingMatches = await Match.find({ result: "pending", round: round._id });

          for (const match of pendingMatches) {
            const player1Id = (await PlayersTournament.findById(match.player1)).user;
            const player2Id = (await PlayersTournament.findById(match.player2)).user;

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Id,
              player2: player2Id,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              

              const totalLength=matchesData.length
              let count=0
              for(let element of matchesData){
                if(element.result=="completed"){
             count++
                }
              }
              console.log(count,totalLength,flag,matchesData,"++++++555555555555555555555555555555555555555555555555555555555555555555555555555+++++++++++++++")
              if (count==totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(tournament, round._id, tournamentId);

                if (roundNumber == noOfRounds) {
                  tournament.status = "completed";
                  await tournament.save();
                }

                flag = true;
                break;
              }

              await sleep(1000);
            }
          }

          terminate(round._id);
        };

        scheduleNextRound();

        return res.status(200).json({ message: "Round started successfully", tournament });
      }

      if (tournament.status == "completed") {
        return res.status(200).json({ message: "Tournament already completed", tournament });
      }
    }


    if (roundNumber==3) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to continue the tournament" });
        }

        const playerIds = [];
        for (const joinedPlayer of tournament.JoinedPlayerList) {
          let player = await PlayersTournament.findOne({
            user: joinedPlayer.user,
            tournamentId: tournament._id,
          });

          if (!player) {
            player = new PlayersTournament({
              user: joinedPlayer.user,
              userData: joinedPlayer.userData,
              tournamentId: tournament._id,
            });
            await player.save();
          }
          playerIds.push(player._id);
        }

        tournament.players = playerIds;
        tournament.upComingRound = 4;  // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(tournament.noOfplayers, gameTime, tournamentId, round._id);

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(tournament, round, urls, tournamentId);

          const pendingMatches = await Match.find({ result: "pending", round: round._id });

          for (const match of pendingMatches) {
            const player1Id = (await PlayersTournament.findById(match.player1)).user;
            const player2Id = (await PlayersTournament.findById(match.player2)).user;

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Id,
              player2: player2Id,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              

              const totalLength=matchesData.length
              let count=0
              for(let element of matchesData){
                if(element.result=="completed"){
             count++
                }
              }
              console.log(count,totalLength,flag,matchesData,"++++++555555555555555555555555555555555555555555555555555555555555555555555555555+++++++++++++++")
              if (count==totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(tournament, round._id, tournamentId);

                if (roundNumber == noOfRounds) {
                  tournament.status = "completed";
                  await tournament.save();
                }

                flag = true;
                break;
              }

              await sleep(1000);
            }
          }

          terminate(round._id);
        };

        scheduleNextRound();

        return res.status(200).json({ message: "Round started successfully", tournament });
      }

      if (tournament.status == "completed") {
        return res.status(200).json({ message: "Tournament already completed", tournament });
      }
    }




    if (roundNumber==4) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to continue the tournament" });
        }

        const playerIds = [];
        for (const joinedPlayer of tournament.JoinedPlayerList) {
          let player = await PlayersTournament.findOne({
            user: joinedPlayer.user,
            tournamentId: tournament._id,
          });

          if (!player) {
            player = new PlayersTournament({
              user: joinedPlayer.user,
              userData: joinedPlayer.userData,
              tournamentId: tournament._id,
            });
            await player.save();
          }
          playerIds.push(player._id);
        }

        tournament.players = playerIds;
        tournament.upComingRound =5;  // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(tournament.noOfplayers, gameTime, tournamentId, round._id);

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(tournament, round, urls, tournamentId);

          const pendingMatches = await Match.find({ result: "pending", round: round._id });

          for (const match of pendingMatches) {
            const player1Id = (await PlayersTournament.findById(match.player1)).user;
            const player2Id = (await PlayersTournament.findById(match.player2)).user;

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Id,
              player2: player2Id,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              

              const totalLength=matchesData.length
              let count=0
              for(let element of matchesData){
                if(element.result=="completed"){
             count++
                }
              }
              console.log(count,totalLength,flag,matchesData,"++++++555555555555555555555555555555555555555555555555555555555555555555555555555+++++++++++++++")
              if (count==totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(tournament, round._id, tournamentId);

                if (roundNumber == noOfRounds) {
                  tournament.status = "completed";
                  await tournament.save();
                }

                flag = true;
                break;
              }

              await sleep(1000);
            }
          }

          terminate(round._id);
        };

        scheduleNextRound();

        return res.status(200).json({ message: "Round started successfully", tournament });
      }

      if (tournament.status == "completed") {
        return res.status(200).json({ message: "Tournament already completed", tournament });
      }
    }


    if (roundNumber ==5) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to continue the tournament" });
        }

        const playerIds = [];
        for (const joinedPlayer of tournament.JoinedPlayerList) {
          let player = await PlayersTournament.findOne({
            user: joinedPlayer.user,
            tournamentId: tournament._id,
          });

          if (!player) {
            player = new PlayersTournament({
              user: joinedPlayer.user,
              userData: joinedPlayer.userData,
              tournamentId: tournament._id,
            });
            await player.save();
          }
          playerIds.push(player._id);
        }

        tournament.players = playerIds;
        tournament.upComingRound =6;  // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(tournament.noOfplayers, gameTime, tournamentId, round._id);

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(tournament, round, urls, tournamentId);

          const pendingMatches = await Match.find({ result: "pending", round: round._id });

          for (const match of pendingMatches) {
            const player1Id = (await PlayersTournament.findById(match.player1)).user;
            const player2Id = (await PlayersTournament.findById(match.player2)).user;

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Id,
              player2: player2Id,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              

              const totalLength=matchesData.length
              let count=0
              for(let element of matchesData){
                if(element.result=="completed"){
             count++
                }
              }
              console.log(count,totalLength,flag,matchesData,"++++++555555555555555555555555555555555555555555555555555555555555555555555555555+++++++++++++++")
              if (count==totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(tournament, round._id, tournamentId);

                if (roundNumber == noOfRounds) {
                  tournament.status = "completed";
                  await tournament.save();
                }

                flag = true;
                break;
              }

              await sleep(1000);
            }
          }

          terminate(round._id);
        };

        scheduleNextRound();

        return res.status(200).json({ message: "Round started successfully", tournament });
      }

      if (tournament.status == "completed") {
        return res.status(200).json({ message: "Tournament already completed", tournament });
      }
    }


    if (roundNumber ==6) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to continue the tournament" });
        }

        const playerIds = [];
        for (const joinedPlayer of tournament.JoinedPlayerList) {
          let player = await PlayersTournament.findOne({
            user: joinedPlayer.user,
            tournamentId: tournament._id,
          });

          if (!player) {
            player = new PlayersTournament({
              user: joinedPlayer.user,
              userData: joinedPlayer.userData,
              tournamentId: tournament._id,
            });
            await player.save();
          }
          playerIds.push(player._id);
        }

        tournament.players = playerIds;
        tournament.upComingRound =7;  // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(tournament.noOfplayers, gameTime, tournamentId, round._id);

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(tournament, round, urls, tournamentId);

          const pendingMatches = await Match.find({ result: "pending", round: round._id });

          for (const match of pendingMatches) {
            const player1Id = (await PlayersTournament.findById(match.player1)).user;
            const player2Id = (await PlayersTournament.findById(match.player2)).user;

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Id,
              player2: player2Id,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              

              const totalLength=matchesData.length
              let count=0
              for(let element of matchesData){
                if(element.result=="completed"){
             count++
                }
              }
              console.log(count,totalLength,flag,matchesData,"++++++555555555555555555555555555555555555555555555555555555555555555555555555555+++++++++++++++")
              if (count==totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(tournament, round._id, tournamentId);

                if (roundNumber == noOfRounds) {
                  tournament.status = "completed";
                  await tournament.save();
                }

                flag = true;
                break;
              }

              await sleep(1000);
            }
          }

          terminate(round._id);
        };

        scheduleNextRound();

        return res.status(200).json({ message: "Round started successfully", tournament });
      }

      if (tournament.status == "completed") {
        return res.status(200).json({ message: "Tournament already completed", tournament });
      }
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};


  const cron = require('node-cron');
  const moment = require('moment-timezone');
  const TournamentModel = require('./models/TournamentModel'); // Update the path as needed
  const { startTournament } = require('./tournamentController'); // Update the path as needed
  
  // Helper function to format date and time in IST
  const getCurrentDateTimeInIST = () => {
      const now = moment().tz('Asia/Kolkata');
      const date = now.format('YYYY-MM-DD');
      const time = now.format('HH:mm'); // Get HH:mm in IST
      return { date, time };
  };
  
  // Cron job to start tournaments that are pending and match the current date and time
  cron.schedule('*/10 * * * * *', async () => { // Every 10 seconds
      const { date, time } = getCurrentDateTimeInIST();
  
      try {
          const tournaments = await TournamentModel.find({
              status: 'pending',
              startDate: date,
              time: time
          });
  
          for (const tournament of tournaments) {
              await startTournament({ params: { tournamentId: tournament._id, gameTime: tournament.gameTimeDuration, roundNumber: 1, noOfRounds: tournament.noOfRounds, delayTime: tournament.delayTime } });
          }
      } catch (error) {
          console.error('Error starting pending tournaments:', error);
      }
  });
  
  // Cron job to start rounds of tournaments that are ongoing and match the current date and time
  cron.schedule('*/10 * * * * *', async () => { // Every 10 seconds
      const { date, time } = getCurrentDateTimeInIST();
  
      try {
          const tournaments = await TournamentModel.find({
              status: 'ongoing',
              startDate: date,
              time: time
          });
  
          for (const tournament of tournaments) {
              const roundNumber = tournament.upComingRound;
              await startTournament({ params: { tournamentId: tournament._id, gameTime: tournament.gameTimeDuration, roundNumber, noOfRounds: tournament.noOfRounds, delayTime: tournament.delayTime } });
          }
      } catch (error) {
          console.error('Error starting ongoing tournament rounds:', error);
      }
  });
  




  
  

  

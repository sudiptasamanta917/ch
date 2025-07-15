const cron = require('node-cron');
const { startTournament } = require('./controllers/tournamentController');



// Schedule to run every day at midnight (00:00)
cron.schedule("* * * * * *",async()=>{
  const currentTime = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const istTime = new Date(currentTime.getTime() + istOffset);

  // Format the current date as YYYY-MM-DD (e.g., "2024-08-26")
  const currentDate = istTime.toISOString().slice(0, 10);

  // Format the current time as HH:MM (e.g., "15:32")
  const currentFormattedTime = istTime.toTimeString().slice(0, 5);

  try {
      // Find the tournament that should start now
      const tournamentToStart = await TournamentModel.findOne({
        startDate: currentDate,
        time: currentFormattedTime,
        status: 'pending' // Only look for tournaments that haven't started yet
      });
  
      if (tournamentToStart) {
        // Pass the necessary parameters to the start function
        await start(tournamentToStart._id,tournamentToStart.time, tournamentToStart.noOfRounds, tournamentToStart.delayTime);
      } else {
        console.log("No tournaments are scheduled to start at this time.");
      }
    } catch (error) {
      console.error("Error finding tournaments to start:", error);
    }



})
 


const start = async (tournamentId, gameTime, noOfRounds, delayTime ) => {
    console.log("Starting tournament...");
  
    // const { tournamentId, gameTime, noOfRounds, delayTime } = req.params;
  
    try {
      const tournament = await TournamentModel.findById(tournamentId).populate("players");
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
  
      // Ensure tournament starts only if it's not already completed or ongoing
      if (tournament.status === "completed") {
        return res.status(400).json({ message: "Tournament already completed" });
      }
  
      if (tournament.status === "pending") {
        if (tournament.JoinedPlayerList.length < 2) {
          return res.status(400).json({ message: "Not enough players to start the tournament" });
        }
  
        // Create or fetch Player documents and add them to the players array
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
  
        // Update the tournament document with the player IDs and initial settings
        tournament.players = playerIds;
        tournament.status = "ongoing";
        tournament.upComingRound = 1; // Initialize the upcoming round
        await tournament.save();
  
        // Generate unique URLs for matches
        const noOfPlayers = tournament.noOfplayers;
        const urls = createUniqueUrls(noOfPlayers, gameTime);
  
        const scheduleNextRound = async (currentRoundNumber) => {
          if (tournament.status === "completed") return;
  
          // Create a new round
          const round = await Round.create({ roundNumber: currentRoundNumber });
  
          // Pair players for the current round
          await pairPlayersForRound(tournament, round, urls, tournamentId);
  
          // Fetch pending matches
          const pendingMatches = await Match.aggregate([
            {
              $match: {
                result: "pending",
                round: round._id,
              },
            },
          ]);
  
          for (const match of pendingMatches) {
            const player1 = await PlayersTournament.findOne({ _id: match.player1 });
            const player2 = await PlayersTournament.findOne({ _id: match.player2 });
  
            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1.user,
              player2: player2.user,
              matchUrl: match.url,
            });
            await playerMatch.save();
          }
  
          tournament.rounds.push(round);
          tournament.upComingRound += 1; // Increment the upcoming round
          await tournament.save();
  
          // Schedule the next round
          setTimeout(async () => {
            await simulateRoundResults(round._id, tournamentId, delayTime);
            await calculateTournamentScores(tournament, round._id, tournamentId);
  
            if (currentRoundNumber >= noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
              console.log("Tournament completed");
            } else {
              scheduleNextRound(currentRoundNumber + 1); // Schedule next round
            }
          }, gameTime * 1000); // Convert game time to milliseconds
        };
  
        // Start the first round
        scheduleNextRound(tournament.upComingRound);
  
        res.status(200).json({ message: "Tournament started successfully", tournament });
  
      } else if (tournament.status === "ongoing") {
        res.status(400).json({ message: "Tournament is already ongoing" });
      }
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error });
    }
  };
  
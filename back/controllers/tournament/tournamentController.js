// const Tournament = require("../../models/tournamentModel")
const User = require("../../models/userModel");
const mongoose = require("mongoose");
const PlayersTournament = require("../../models/Tournament/PlayersTournament");
const TournamentModel = require("../../models/Tournament/TournamentModel");
const PairedMatch = require("../../models/Tournament/pairedModel");
const { check, validationResult } = require("express-validator");
const Round = require("../../models/Tournament/Round");
const Match = require("../../models/Tournament/Match");
const moment = require("moment-timezone");
const moments = require("moment"); // Import moment for date formatting
const momentz = require("moment");
// const calculateTournamentScores = require("../../utils/scoringUtils");
// const calculateSonnebornBerger = require("../../utils/scoringUtils");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const cron = require("node-cron");
// const moment = require('moment');
// tournamentController.js
// Function to calculate the number of rounds

// sleep function
const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

function calculateRounds(noOfplayers) {
  return Math.floor(Math.log2(noOfplayers));
}

// Helper function to format date and time in IST
const getCurrentDateTimeInIST = () => {
  const now = moment().tz("Asia/Kolkata");
  const date = now.format("YYYY-MM-DD");
  const time = now.format("HH:mm"); // Get HH:mm in IST
  return { date, time };
};

//create unique urls
const createUniqueUrls = (noOfPlayers, gameTime, tournamentId, roundId) => {
  const protocol = "https";
  const host = "dynamochess.in";
  const urls = [];

  // Generate n/2 unique URLs
  const numberOfUrls = Math.floor(noOfPlayers / 2);

  for (let i = 0; i < numberOfUrls; i++) {
    const inputId = uuidv4();
    const url = `${protocol}://${host}/multiplayer/tournament:${tournamentId}:${roundId}:${inputId}/${gameTime}`;
    urls.push(url);
    console.log(url,"++++++++++++++999999999+++++++++++++++")
  }

  return urls;
};


async function calculateBuchSonberger(player, tournamentId) {
  // player.buchholz += opponent?.score || 0;
  const pairedOponentData = await PairedMatch.aggregate([
    {
      $match: {
        $and: [
          {
            $or: [
              { player1: new mongoose.Types.ObjectId(player.user) },
              { player2: new mongoose.Types.ObjectId(player.user) },
            ],
          },
          { tournamentId: player.tournamentId },
        ],
      },
    },
  ]);
  //  console.log(pairedOponentData,"ooooooooooooooooooo99999999999999999")

  let opponentUserIds = [];
  for (const pairedMatch of pairedOponentData) {
    if (pairedMatch.player1.toString() === player.user) {
      opponentUserIds.push(pairedMatch.player2.toString());
    }
    if (pairedMatch.player2.toString() === player.user) {
      opponentUserIds.push(pairedMatch.player1.toString());
    }
  }
  console.log(
    opponentUserIds,
    "================================================"
  );
  for (const opponentId of opponentUserIds) {
    console.log(opponentId, "888888888888888888888888888888888888888888888888");
    const opponent = await PlayersTournament.findOne({ user: opponentId });
    //  console.log(opponent,"7777777777777777777777777777777777777777777")
    player.buchholz += opponent?.score || 0;
  }
  // player.buchholz = totalBuchholzScore;
  await player.save();
}


const calculateTournamentScores = async (tournament, roundId, tournamentId) => {
  const tournamentData = await TournamentModel.findById(tournamentId);
  const roundData = await Round.findById(roundId); // Get round info for roundNumber
  console.log(
    roundId,
    tournamentId,
    tournamentData,
    "+++++ Tournament and Round Data +++++"
  );
  let count = 0;
  // Loop through each player in the tournament
  for (const playerId of tournamentData.players) {
    const player = await PlayersTournament.findById(playerId);
    if (!player) continue;

    console.log(player, "+++++ Player Info +++++");

    // Fetch matches where the player participated in the given round
    const matches = await Match.find({
      $or: [{ user1: player.user }, { user2: player.user }],
      result: { $ne: "pending" },
      round: new mongoose.Types.ObjectId(roundId), // Ensure round filtering
    });

    console.log(count++, matches, "+++++ Matches Info +++++");

    let roundScore = 0;
    let sonnebornBergerScore = 0;
    let directEncounterScore = 0; // For tracking head-to-head results
    if (matches.length > 0) {
      console.log("+++++++++++++++hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii++++++++++++++")
      // Process each  matches[0] to calculate scores

      //this is for bye condition   //
      if (
        matches[0].result === "completed" &&
        matches[0].winner === player.user &&
        matches[0].loser === "null" &&
        matches[0].gameTypeWin === "bye"
      ) {
        player.roundWiseScore.push({
          roundNumber: roundData.roundNumber,
          score: 1,
        }); // Add a new round score

        console.log(
          "pahla bye or abort hoga if969696996969699696969696996969696996969699696969699696969696996"
        );
        player.score += 1;
        await player.save();

        // Cumulative score tie-breaker (sum of scores up to the current round)
        let cumulativeScore = player.roundWiseScore.reduce(
          (total, round) => total + round.score,
          0
        );
        player.cumulativeScore = cumulativeScore + 1;
        if (matches[0].joinedCount != 0) {
          await calculateBuchSonberger(player, tournamentId);
        }
        await player.save();
      }else if( matches[0].result === "completed" &&
        matches[0].winner === player.user &&
        matches[0].loser === "null" &&
        matches[0].gameTypeWin === "Abort"){
          player.roundWiseScore.push({
            roundNumber: roundData.roundNumber,
            score: 1,
          }); // Add a new round score
  
          console.log(
            "pahla bye or abort hoga if969696996969699696969696996969696996969699696969699696969696996"
          );
          player.score += 1;
          await player.save();
  
          // Cumulative score tie-breaker (sum of scores up to the current round)
          let cumulativeScore = player.roundWiseScore.reduce(
            (total, round) => total + round.score,
            0
          );
          player.cumulativeScore = cumulativeScore + 1;
          await player.save();
      }else if(matches[0].result === "completed" &&
        matches[0].winner != player.user &&
        matches[0].loser === "null" &&
        matches[0].gameTypeWin === "Abort"){
          player.roundWiseScore.push({
            roundNumber: roundData.roundNumber,
            score: 0,
          }); // Add a new round score
  
          console.log(
            "pahla bye or abort hoga if969696996969699696969696996969696996969699696969699696969696996"
          );
          player.score += 0;
          await player.save();
  
          // Cumulative score tie-breaker (sum of scores up to the current round)
          let cumulativeScore = player.roundWiseScore.reduce(
            (total, round) => total + round.score,
            0
          );
          player.cumulativeScore = cumulativeScore + 0;
          await player.save();
      }

      // this is for normal win condition
      else if (
        matches[0].result === "completed" &&
        matches[0].winner === player.user &&
        matches[0].loser != "null" 
      ) {
        player.roundWiseScore.push({
          roundNumber: roundData.roundNumber,
          score: 1,
        }); // Add a new round score

        console.log(
          " dusra if969696996969699696969696996969696996969699696969699696969696996"
        );
        await player.save();

        let opponentUser =
          matches[0].winner === player.user ? matches[0].loser : matches[0].winner;
        let opponent = await PlayersTournament.findOne({
          user: opponentUser,
          tournamentId,
        });


        // roundScore += 1; // Player won
        player.score += 1;
        sonnebornBergerScore += opponent?.score || 0; // Add opponent's score to Sonneborn-Berger


        if (opponent && opponent.score !== undefined) {
          directEncounterScore += 1; // Player wins head-to-head
        }

        // Cumulative score tie-breaker (sum of scores up to the current round)
        let cumulativeScore = player.roundWiseScore.reduce(
          (total, round) => total + round.score,
          0
        );

        player.sonnebornBerger += sonnebornBergerScore;
        player.directEncounter += directEncounterScore;
        player.cumulativeScore = cumulativeScore + 1;
        await calculateBuchSonberger(player, tournamentId);

        await player.save();
      }
      //this is for loss condition
     else if (matches[0].result == "completed" && matches[0].loser === player.user && matches[0].winner !="null") {
        player.roundWiseScore.push({
          roundNumber: roundData.roundNumber,
          score: 0,
        }); // Add a new round score

        console.log(
          " teesra if 969696996969699696969696996969696996969699696969699696969696996"
        );
        await player.save();

        let opponentUser =
          matches[0].winner === player.user ? matches[0].loser : matches[0].winner;
        let opponent = await PlayersTournament.findOne({
          user: opponentUser,
          tournamentId,
        });


        // roundScore += 1; // Player won
        player.score += 0;
        sonnebornBergerScore += opponent?.score || 0; // Add opponent's score to Sonneborn-Berger


        if (opponent && opponent.score !== undefined) {
          directEncounterScore -= 1; // Player loses head-to-head
        }

        // Cumulative score tie-breaker (sum of scores up to the current round)
        let cumulativeScore = player.roundWiseScore.reduce(
          (total, round) => total + round.score,
          0
        );

        player.sonnebornBerger += sonnebornBergerScore;
        player.directEncounter += directEncounterScore;
        player.cumulativeScore = cumulativeScore + 1;
        await calculateBuchSonberger(player, tournamentId);
        await player.save();
      }
      //when both player not played
     else if (
        matches[0].result === "completed" &&
        matches[0].loser === "null" &&
        matches[0].winner === "null"
      ) {
        player.roundWiseScore.push({
          roundNumber: roundData.roundNumber,
          score: 0,
        }); // Add a new round score

        console.log(
          " 4th koi join nahi hua 969696996969699696969696996969696996969699696969699696969696996"
        );
        await player.save();
      }else {
        console.log("++++++++++koi match nahi mila ++++++++++++++");
        player.roundWiseScore.push({
          roundNumber: roundData.roundNumber,
          score: 0,
        }); // Add a new round score

        console.log(
          "969696996969699696969696996969696996969699696969699696969696996"
        );
        await player.save();
      }
    } else {
      console.log("++++++++++koi match nahi mila ++++++++++++++")
      player.roundWiseScore.push({
        roundNumber: roundData.roundNumber,
        score: 0,
      }); // Add a new round score

      console.log(
        "969696996969699696969696996969696996969699696969699696969696996"
      );
      await player.save();
    }
    // Update player's total score and tie-breakers

    // Update cumulative score with the latest round


    await player.save();

    console.log(
      `Updated player ${player.user} - Score: ${player.score}, Buchholz: ${player.buchholz}, SB: ${player.sonnebornBerger}, Direct Encounter: ${player.directEncounter}, Cumulative Score: ${player.cumulativeScore}`
    );
  }

  // Handle players with pending matches (or no matches)----------new part of the code --------


  // ---------------------new part of the code ----------
};

const simulateRoundResults = async (roundId, tournamentId, delayTime) => {
  console.log(
    roundId,
    "++++++++++++++++++92222222222222222222222+++++++++++++"
  );

  // Find all pending matches for the specified round
  const pendingMatches = await Match.aggregate([
    {
      $match: {
        round: roundId,
        result: "pending",
      },
    },
  ]);

  console.log(pendingMatches, "Pending matches");

  // Iterate over each pending match and update the result
  for (let match of pendingMatches) {
    let result = "completed";
    await Match.updateOne({ _id: match._id }, { $set: { result } });

    console.log(`Match ${match._id} updated with result: ${result}`);
  }

  // Get the current time in IST and add the delay time
  const updatedTimeIST = moment().tz("Asia/Kolkata").add(delayTime, "minutes");

  // Format the time as 'HH:mm'
  const formattedTime = updatedTimeIST.format("HH:mm");
  console.log(
    formattedTime,
    "+++++++++++++++++++jjjjjjjjjjjjjjjjjjjjjjkkkkkkkkkkkkkkkkkkk++++++++++"
  );

  await TournamentModel.updateOne(
    { _id: tournamentId },
    { $set: { time: formattedTime } }
  );

  console.log(`Tournament ${tournamentId} time updated to: ${formattedTime}`);

  // Set an interval to check if the current time matches the updated time
  const checkTimeInterval = setInterval(async () => {
    const tournament = await TournamentModel.findById(tournamentId);
    // console.log(tournament,"88888888888888888888888888888")
    // Check if tournament is found before accessing its properties
    if (!tournament) {
      console.error(`Tournament with ID ${tournamentId} not found.`);
      clearInterval(checkTimeInterval);
      return;
    }
    const { time: currentTime } = getCurrentDateTimeInIST();

    if (currentTime === tournament.time) {
      console.log("2400000000000000000000000000000000000000000000000");
      try {
        const tournament = await TournamentModel.findById(tournamentId);
        if (tournament && tournament.status === "ongoing") {
          const roundNumber = tournament.upComingRound;
          await startTournament(
            tournamentId,
            tournament.gameTimeDuration,
            roundNumber,
            tournament.noOfRounds,
            tournament.delayTime
          );
        }
        clearInterval(checkTimeInterval); // Stop the interval
      } catch (error) {
        console.error("Error starting tournament:", error);
      }
    }
  }, 2000); // Check every 2 seconds
};


const assignColors = (player1, player2, boardNumber) => {
  const player1LastColor = player1.colorHistory.slice(-1)[0];
  const player2LastColor = player2.colorHistory.slice(-1)[0];

  // If both players have no history, assign based on the board number
  if (!player1LastColor && !player2LastColor) {
    return boardNumber % 2 === 0
      ? { player1Color: "w", player2Color: "b" }
      : { player1Color: "b", player2Color: "w" };
  }

  // Helper function to check for color imbalance
  const hasColorImbalance = (player, color) =>
    player.colorHistory.slice(-2).every(c => c === color);

  const player1HasWhiteImbalance = hasColorImbalance(player1, "w");
  const player2HasWhiteImbalance = hasColorImbalance(player2, "w");
  const player1HasBlackImbalance = hasColorImbalance(player1, "b");
  const player2HasBlackImbalance = hasColorImbalance(player2, "b");

  // Special case: Player A with "w" imbalance, Player B with "b" imbalance
  if (player1HasWhiteImbalance && player2HasBlackImbalance) {
    return { player1Color: "b", player2Color: "w" };
  } else if (player1HasBlackImbalance && player2HasWhiteImbalance) {
    return { player1Color: "w", player2Color: "b" };
  }

  // Force alternation if one player has a color imbalance
  if (player1HasWhiteImbalance && !player2HasWhiteImbalance) {
    return { player1Color: "b", player2Color: "w" };
  } else if (player2HasWhiteImbalance && !player1HasWhiteImbalance) {
    return { player1Color: "w", player2Color: "b" };
  } else if (player1HasBlackImbalance && !player2HasBlackImbalance) {
    return { player1Color: "w", player2Color: "b" };
  } else if (player2HasBlackImbalance && !player1HasBlackImbalance) {
    return { player1Color: "b", player2Color: "w" };
  }

  // If both have balanced history, alternate based on their last game colors
  if (player1LastColor !== player2LastColor) {
    return {
      player1Color: player1LastColor === "w" ? "b" : "w",
      player2Color: player2LastColor === "w" ? "b" : "w",
    };
  }

  // If both have the same last color, alternate based on board number
  return boardNumber % 2 === 0
    ? { player1Color: "w", player2Color: "b" }
    : { player1Color: "b", player2Color: "w" };
};



const groupPlayersByScore = async (players) => {
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

  // Convert the object to an array and sort it by score in descending order
  const sortedGroups = Object.keys(scoreGroups)
    .sort((a, b) => b - a) // Sort scores in descending order
    .map((score) => scoreGroups[score]); // Map the sorted scores to the corresponding players

  return sortedGroups;
};

const pairPlayersForRound = async (
  tournament,
  round,
  urls,
  tournamentId,
  roundNumber
) => {
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
        directEncounter: 1,
        receivedBye: 1,
        colorHistory: 1,
        "userData.rating": 1, // Include userData.rating in the projection
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

  let sortedPlayers;

  if (roundNumber === 1) {
    sortedPlayers = players
      .filter((p) => !usedPlayers.has(p.user.toString()))
      .sort((a, b) => (b.userData.rating || 0) - (a.userData.rating || 0));
  } else {
    // Handle sorting by score for subsequent rounds
    sortedPlayers = players
      .filter((player) => !usedPlayers.has(player.user.toString()))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
        return 0; // Add further tie-breaking criteria if needed
      });

  }

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
        gameTypeWin:"bye",
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

  console.log(
    sortedPlayers,
    "9999999999999999999999999999999999999999999999999999999999999999999999999"
  );
  // 2. Group Players by Score
  let scoreGroups = await groupPlayersByScore(sortedPlayers);
  console.log(
    scoreGroups,
    "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
  );

  const movePairedPlayersToNextClosestGroup = (
    scoreGroups,
    previousMatchups
  ) => {
    // Iterate through each score group
    for (let i = 0; i < scoreGroups.length; i++) {
      const group = scoreGroups[i];
      var totalPlayers = group.length;
      group.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
        return 0; // Add further tie-breaking criteria if needed
      });
      console.log(group.length, "++++++++++++legth abhi ketna hai++++++++++++++")
      // Handle odd group sizes by moving the last player to another group
      if (totalPlayers % 2 !== 0) {
        const lastPlayer = group.pop(); // Remove last player
        let moved = false;
        console.log(group.length, "++++++++++++length  ketna hogyaaaaaaaaaaaa++++++++++++++")
        // Move the last player to the closest next group
        for (let j = i + 1; j < scoreGroups.length; j++) {
          const nextGroup = scoreGroups[j];
          nextGroup.push(lastPlayer);
          nextGroup.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
            if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
            return 0; // Add further tie-breaking criteria if needed
          });
          console.log(nextGroup, "++++odd wala hai upar se niche nextGroup ko bhi dekho ++++++++++++")
          console.log(`Player ${lastPlayer.user} moved to score group ${j} nicheeeeeeeeeeee`);
          moved = true;
          break;
        }

        // If no next group is available, try to move the player to a previous group
        if (!moved) {
          for (let j = i - 1; j >= 0; j--) {
            const prevGroup = scoreGroups[j];
            prevGroup.push(lastPlayer);
            nextGroup.sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
              if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
              return 0; // Add further tie-breaking criteria if needed
            });
            console.log(nextGroup, "++++odd wala niche se upar nextGroup ko bhi dekho ++++++++++++")
            console.log(`Player ${lastPlayer.user} moved to score group ${j} uparrrrrrrr`);
            moved = true;
            break;
          }
        }

        // If no valid group is found, create a new group for the last player
        if (!moved) {
          scoreGroups.push([lastPlayer]);
          console.log(`Player ${lastPlayer.user} moved to a new score group. nayaaaaaaaaaaaa`);
        }
      }


      // Pair players starting from first to middle and last to middle
      console.log(group, group.length, "-----------------kahuaaaaaa reeeee dekhaaaa grioup ko ------------------------")
      totalPlayers = group.length;
      var midIndex = Math.floor(totalPlayers / 2);


      for (let k = 0; k < midIndex; k++) {
        const player1 = group[k];

        const player2Index = midIndex + k; // Calculate player2's index before any removal
        const player2 = group[player2Index]; // Pairing first half with second half

        console.log(group, "++++++++++++++ Check the group ++++++++++++++");

        // Check if players have already been paired previously
        const previousMatch =
          previousMatchups.has(`${player1.user}-${player2.user}`) ||
          previousMatchups.has(`${player2.user}-${player1.user}`);

        console.log(previousMatch, "++++++true or false++++++");

        if (previousMatch) {
          let moved = false;

          // Try to move players to the next closest available group (higher groups first)
          for (let j = i + 1; j < scoreGroups.length; j++) {
            const nextGroup = scoreGroups[j];
            nextGroup.push(player1);
            nextGroup.push(player2);

            // Remove player2 first (to prevent index shifting)
            group.splice(player2Index, 1);
            // Remove player1 second
            group.splice(k, 1);
            console.log(group, "+++++++++++++++1109group++++++++++++++++++++")

            nextGroup.sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
              if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
              return 0; // Add further tie-breaking criteria if needed
            });

            console.log(nextGroup, "++++ Sorted nextGroup ++++++++++++");
            console.log(`Players ${player1.user} and ${player2.user} moved to score group ${j}`);
            moved = true;
            break;
          }

          // If no valid group was found in higher score groups, check the lower groups
          if (!moved) {
            for (let j = i - 1; j >= 0; j--) {
              const prevGroup = scoreGroups[j];
              prevGroup.push(player1);
              prevGroup.push(player2);
              // Remove player2 first (to prevent index shifting)
              group.splice(player2Index, 1);
              // Remove player1 second
              group.splice(k, 1);
              console.log(group, "+++++++++++++++1133group++++++++++++++++++++")

              prevGroup.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
                if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
                return 0;
              });

              console.log(prevGroup, "++++ Sorted previousGroup ++++++++++++");
              console.log(`Players ${player1.user} and ${player2.user} moved to score group ${j}`);
              moved = true;
              break;
            }
          }

          // If no higher or lower group is found, create a new group
          if (!moved) {
            scoreGroups.push([player1, player2]);
            console.log(`Players ${player1.user} and ${player2.user} moved to a new score group.`);
            // Remove player2 first (to prevent index shifting)
            group.splice(player2Index, 1);
            // Remove player1 second
            group.splice(k, 1);
          }

          // Adjust indices after removal of two players
          k -= 1; // Decrease k by 1 (because two players are removed)
          // midIndex -= 2; // Decrease midIndex by 2 as two players were removed
          midIndex = Math.floor(group.length / 2)
        }
      }

    }

    return scoreGroups;
  };
  // Call the function to move paired players
  scoreGroups = movePairedPlayersToNextClosestGroup(
    scoreGroups,
    previousMatchups
  );

  console.log(scoreGroups, "+++++++++pahlaaaaaaaaaaaaCheck+++++++++++");

  // 3. Handle Odd Group Pairing and Pair the Remaining Players Within Each Group
  const pairs = [];
  for (let i = 0; i < scoreGroups.length; i++) {
    let currentGroup = scoreGroups[i];
    console.log(
      currentGroup,
      "++++++++++========================+++++++++++++++++++++++++"
    );

    currentGroup.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
      return 0; // Add further tie-breaking criteria if needed
    });
    // If current group has odd players, take the last one and pair with next group's first player
    if (currentGroup.length % 2 !== 0) {
      const leftoverPlayer = currentGroup.pop(); // Remove the odd player

      // Check if leftover player is already used
      if (!usedPlayers.has(leftoverPlayer.user.toString())) {
        // Pair the leftover player with the first valid player from the next group if it exists
        if (i + 1 < scoreGroups.length && scoreGroups[i + 1].length > 0) {
          const nextGroup = scoreGroups[i + 1];
          let nextPlayer = null;

          // Loop through players in the next group to find a valid pair
          for (let j = 0; j < nextGroup.length; j++) {
            const potentialNextPlayer = nextGroup[j];

            // Check if the player has already been paired or if they've already faced the leftover player
            if (
              !usedPlayers.has(potentialNextPlayer.user.toString()) &&
              !previousMatchups.has(
                `${leftoverPlayer.user}-${potentialNextPlayer.user}`
              ) &&
              !previousMatchups.has(
                `${potentialNextPlayer.user}-${leftoverPlayer.user}`
              )
            ) {
              nextPlayer = potentialNextPlayer;
              nextGroup.splice(j, 1); // Remove the paired player from the next group
              break; // Exit the loop once a valid player is found
            }
          }

          // If a valid next player is found, create the match
          if (nextPlayer) {
            const boardNumber = pairs.length + 1;
            const matchUrl = urls[urlIndex++ % urls.length];
            console.log(
              leftoverPlayer,
              nextPlayer,
              "77777777777777777777777777777777777777777777777777777777777"
            );

            // Assuming assignColors is already defined and works correctly
            const colorAssignment = assignColors(
              leftoverPlayer,
              nextPlayer,
              boardNumber
            );

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
            console.log(
              `No valid pair found for leftover player ${leftoverPlayer.user}`
            );
          }
        }
      } else {
        console.log(`Leftover player ${leftoverPlayer.user} is already used.`);
      }
    }

    console.log(
      currentGroup,
      "6666666666666666666666666666666666666666666666666666666666666666666"
    );
    // Pair the remaining players within the group
    // const half = Math.floor(currentGroup.length / 2);
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

    // After the main pairing logic for each group

    // Step to gather any unpaired players left in the score groups
    let leftoverPlayers = [];
    if (scoreGroups.length > 0) {
      console.log(scoreGroups, scoreGroups.length, "989898989898888888888888888888888888888888888888888888888888888888")
      // Loop through score groups and collect any unpaired players
      for (let i = 0; i < scoreGroups.length; i++) {
        const remainingPlayers = scoreGroups[i].filter(
          (player) => !usedPlayers.has(player.user.toString())
        );
        console.log(remainingPlayers, remainingPlayers.length, "adadaddadadadadddddddddddddaaaaaaaaaaaaaaaaaaaaaaaaaaa")
        if (remainingPlayers.length > 0) {
          leftoverPlayers = leftoverPlayers.concat(remainingPlayers);
          scoreGroups[i] = []; // Clear the group since we're moving the remaining players
        }
      }
      console.log(leftoverPlayers, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
      // If there are leftover players, try to pair them
      if (leftoverPlayers.length > 0) {
        console.log(`Attempting to pair leftover players:`, leftoverPlayers);

        // Sort the leftover players based on score and tie-breakers for pairing
        leftoverPlayers.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
          if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
          return 0;
        });

        // Pair the leftover players
        // const leftoverHalf = Math.floor(leftoverPlayers.length / 2);
        for (let j = 0; j < leftoverPlayers.length; j++) {
          let player1 = leftoverPlayers[j];
          for (k = j + 1; k < leftoverPlayers.length; k++) {
            let player2 = leftoverPlayers[k];
            if (usedPlayers.has(player1.user.toString()) || usedPlayers.has(player2.user.toString())) {
              console.log("+++++usedddddddddddddddddddddddddddddddddddplayers hai++++++++++")
              continue; // Skip if either player is already paired
            }

            const previousMatch =
              previousMatchups.has(`${player1.user}-${player2.user}`) ||
              previousMatchups.has(`${player2.user}-${player1.user}`);
            if (previousMatch) {
              console.log("previous match mai thaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
              continue
            } else {
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

            }


          }



        }
      }

    }

    let newLeftPlayers=[]
    if (scoreGroups.length > 0) {
      console.log(scoreGroups, scoreGroups.length, "989898989898888888888888888888888888888888888888888888888888888888")
      // Loop through score groups and collect any unpaired players
      for (let i = 0; i < scoreGroups.length; i++) {
        const remainingPlayers = scoreGroups[i].filter(
          (player) => !usedPlayers.has(player.user.toString())
        );
        console.log(remainingPlayers, remainingPlayers.length, "adadaddadadadadddddddddddddaaaaaaaaaaaaaaaaaaaaaaaaaaa")
        if (remainingPlayers.length > 0) {
          newLeftPlayers = newLeftPlayers.concat(remainingPlayers);
          scoreGroups[i] = []; // Clear the group since we're moving the remaining players
        }
      }
      console.log(newLeftPlayers, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
      // If there are leftover players, try to pair them
      if (newLeftPlayers.length > 0) {
        console.log(`Attempting to pair leftover players:`, newLeftPlayers);

        // Sort the leftover players based on score and tie-breakers for pairing
        newLeftPlayers.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
          if (b.sonnebornBerger !== a.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
          return 0;
        });

        // Pair the leftover players
        // const leftoverHalf = Math.floor(newLeftPlayers.length / 2);
        for (let j = 0; j < newLeftPlayers.length; j++) {
          let player1 = newLeftPlayers[j];
          for (k = j + 1; k < newLeftPlayers.length; k++) {
            let player2 = newLeftPlayers[k];
            if (usedPlayers.has(player1.user.toString()) || usedPlayers.has(player2.user.toString())) {
              console.log("+++++usedddddddddddddddddddddddddddddddddddplayers hai++++++++++")
              continue; // Skip if either player is already paired
            }

            const previousMatch =
              previousMatchups.has(`${player1.user}-${player2.user}`) ||
              previousMatchups.has(`${player2.user}-${player1.user}`);
            if (previousMatch) {
              console.log("previous match mai thaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
              continue
            } else {
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

            }


          }



        }
      }

    }




  }



  // Save the round with all its matches
  await round.save();
  console.log(`Paired ${pairs.length} players for the round.`);
  return round.matches;
};

const createTournament = async (req, res) => {
  try {
    console.log("kakakak");
    const {
      tournamentName,
      startDate,
      entryFees,
      time,
      gameTimeDuration,
      delayTime,
    } = req.body;
    console.log(req.body);
    const createdBy = req.user._id;

    // Parse and validate the start date
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date.",
      });
    }

    // Validate entry fees
    const fees = parseFloat(entryFees);
    if (isNaN(fees) || fees < 0) {
      return res.status(400).json({
        success: false,
        message: "Entry fees must be a valid positive number.",
      });
    }

    // Calculate the number of rounds based on the number of players
    // const rounds = calculateRounds(noOfplayers || 10);
    // console.log(rounds, "lllllll");

    // Create a new tournament
    const tournament = new TournamentModel({
      tournamentName,
      startDate: startDate,
      entryFees: fees.toString(), // Convert to string for consistency
      time,
      topThreePlayer: [],
      JoinedPlayerList: [],
      tournamentIsJoin: false,
      createdBy,
      gameTimeDuration,
      delayTime,
    });

    // Save the tournament to the database
    const tournamentData = await tournament.save();

    // Send success response
    return res.status(200).json({
      success: true,
      data: tournamentData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the tournament.",
      error: error.message,
    });
  }
};

const updateTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const {
      tournamentName,
      startDate,
      entryFees,
      time,
      gameTimeDuration,
      delayTime,
    } = req.body;

    // Log incoming request
    console.log(
      tournamentName,
      startDate,
      entryFees,
      time,
      gameTimeDuration,
      delayTime,
      tournamentId
    );

    // Check if tournamentId is valid
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid tournament ID format.",
      });
    }

    // Parse and format the startDate to YYYY-MM-DD format
    const formattedStartDate = moments(startDate).format("YYYY-MM-DD");

    // Check if formattedStartDate is a valid date
    if (!moments(formattedStartDate, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).send({
        success: false,
        message: "Invalid start date.",
      });
    }

    // Check if EntryFees is a valid number
    const fees = parseFloat(entryFees);
    if (isNaN(fees) || fees < 0) {
      return res.status(400).send({
        success: false,
        message: "Entry fees must be a valid positive number.",
      });
    }

    // Check if the tournament exists
    const existingTournament = await TournamentModel.findById(tournamentId);
    if (!existingTournament) {
      return res.status(404).send({
        success: false,
        message: "Tournament not found.",
      });
    }

    // Now updating the tournament
    const updatedTournament = await TournamentModel.findByIdAndUpdate(
      tournamentId,
      {
        tournamentName,
        startDate: formattedStartDate, // Use formatted startDate
        entryFees: fees.toString(), // Storing as a string
        time, // Update time as it is (in IST)
        delayTime,
        gameTimeDuration,
      },
      { new: true }
    );

    return res.status(200).send({
      success: true,
      data: updatedTournament,
    });
  } catch (error) {
    return res.status(400).send({
      success: false,
      message: error.message,
    });
  }
};

const deleteTournament = async (req, res) => {
  const tournamentId = req.params.id;
  const deletedTournament = await TournamentModel.findByIdAndDelete(
    tournamentId
  );
  res.status(200).json({
    success: true,
    data: deletedTournament,
  });
};

const getMyTournament = async (req, res) => {
  // const userId=req.params.id
  const myTournament = await TournamentModel.aggregate([
    {
      $match: {
        tournamentIsJoin: false,
      },
    },
  ]);
  res.status(200).json({
    success: true,
    data: myTournament,
  });
};
const getAllTournament = async (req, res) => {
  try {
    // Get page and limit from query parameters, with defaults
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

    // Calculate the starting index
    const startIndex = (page - 1) * limit;

    // Fetch the tournaments with pagination
    const tournaments = await TournamentModel.find({})
     .sort({ startDate: -1 })
      .skip(startIndex) // Skip the previous pages' data
      .limit(limit); // Limit to 'limit' number of items

    // Fetch the total count of tournaments for metadata
    const totalTournaments = await TournamentModel.countDocuments();

    res.status(200).json({
      success: true,
      data: tournaments,
      meta: {
        total: totalTournaments, // Total number of tournaments
        page, // Current page
        totalPages: Math.ceil(totalTournaments / limit), // Total pages
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "An error occurred while retrieving tournaments.",
      error: error.message,
    });
  }
};
const searchTournament=async(req,res)=>{
  const { searchTerm } = req.query;
  console.log(searchTerm)

  try {
    const tournaments = await TournamentModel.find({
      tournamentName: { $regex: searchTerm, $options: "i" },
    });

    res.status(200).json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while searching tournaments.",
      error: error.message,
    });
  }
}


const getTournamentByUserId = async (req, res) => {
  const userId = req.user._id;

  try {
    const tournaments = await TournamentModel.find({
      "JoinedPlayerList.user": userId,
    });

    res.status(200).json({
      success: true,
      data: tournaments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving tournaments.",
      error: error.message,
    });
  }
};
const joinTournament = async (req, res) => {
  const { tournamentId } = req.params;
  const userId = req.user._id;

  try {
    // Fetch the tournament by ID
    let tournament = await TournamentModel.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found.",
      });
    }

    // Check if the user is already a participant
    const userAlreadyInTournament = tournament.JoinedPlayerList.some((player) =>
      player.user.equals(userId)
    );
    if (userAlreadyInTournament) {
      return res.status(400).json({
        success: false,
        message: "User is already a participant in this tournament.",
      });
    }

    //when the tournament time exceed then no body can join

    if (tournament.status == "ongoing") {
      res.status(400).json({
        success: false,
        message: "Tournament is already ongoing",
      });
    }
    if (tournament.status == "completed") {
      res.status(400).json({
        success: false,
        message: "Tournament is already completed",
      });
    }
   
    // Check if the current time exceeds the tournament start time
    // if (tournament.status === "pending") {
    //   const currentTime = momentz();
    //   const tournamentStartTime = momentz(tournament.time); // Assuming `tournament.time` is in a valid datetime format
      
    //   if (currentTime.isAfter(tournamentStartTime)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Tournament time is over. You cannot join now.",
    //     });
    //   }
    // }



    
    const userData = await User.findById(userId);
    // console.log(userData, "uuuuuuuuuuu");
    // Add the user to the tournament's JoinedPlayerList
    tournament.JoinedPlayerList.push({ user: userId, userData: userData }); // Adjust based on actual data structure
    tournament.noOfplayers = tournament.JoinedPlayerList.length;
    await tournament.save();
    const noOfplayer = tournament.noOfplayers;
    const rounds = calculateRounds(noOfplayer);
    tournament.noOfRounds = rounds;
    await tournament.save();
    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while joining the tournament.",
      error: error.message,
    });
  }
};

const getTournamentById = async (req, res) => {
  const tournamentId = req.params.id;
  try {
    const tournament = await TournamentModel.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }

    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the tournament",
      error: error.message,
    });
  }
};

const getPairedList = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    // const userId = req.user._id;
    // console.log(tournamentId, "kkkkkk");

    // Find paired matches where the user is either player1 or player2
    const pairedMatchList = await PairedMatch.find({
      tournamentId: tournamentId,
    });

    // If no paired matches are found, return an empty array
    if (!pairedMatchList || pairedMatchList.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No paired matches found",
        data: [], // Return an empty array
      });
    }

    // const boardData = await Match.find({
    //   tournamentId: tournamentId,
    // });


    // Return the list of paired matches
    return res.status(200).json({
      success: true,
      data: pairedMatchList

    });
  } catch (error) {
    // Handle errors and return an appropriate response
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching paired matches.",
      error: error.message,
    });
  }
};

const adminNotification = async (req, res) => {
  try {
    // Get the current date and time in IST
    const istMoment = moment().tz("Asia/Kolkata");

    // Format the IST date to 'YYYY-MM-DD'
    const date = istMoment.format("YYYY-MM-DD");

    // Get the current IST time (HH:mm)
    const currentTime = istMoment.format("HH:mm");

    // Calculate the IST time 5 minutes ahead
    const futureTimeMoment = istMoment.clone().add(5, "minutes");
    const futureFormattedTime = futureTimeMoment.format("HH:mm");

    // console.log("IST Current Date:", date);
    // console.log("IST Current Time:", currentTime);
    // console.log("IST Time 5 Minutes Ahead:", futureFormattedTime);

    // Find tournaments where the start date is today and the time is within the range
    const tournaments = await TournamentModel.aggregate([
      {
        $match: {
          startDate: date,
          status: "pending",
          // time: {
          //   $gte: currentTime,
          //   $lte: futureFormattedTime,
          // },
        },
      },
    ]);

    if (tournaments && tournaments.length > 0) {
      res.status(200).json({
        success: true,
        data: tournaments,
      });
    } else {
      res.status(200).json({
        success: true,
        message: "No tournaments found within the time range",
      });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

const startTournament = async (
  tournamentId,
  gameTime,
  roundNumber,
  noOfRounds,
  delayTime
) => {
  // const { tournamentId, gameTime, roundNumber, noOfRounds, delayTime } = req.params;

  try {
    const tournament = await TournamentModel.findById(tournamentId).populate(
      "players"
    );
    if (!tournament)
      return res.status(404).json({ message: "Tournament not found" });

    if (roundNumber == 1) {
      if (tournament.status == "pending") {
        // Check if there are enough players
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 2; // Increment after first round starts
        await tournament.save();

        const roundDuration = gameTime * 2000+60000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();
          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;
            console.log(
              "1111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111"
            );
           
            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);
            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              console.log(
                "1111kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk111111111111111111111111111111111kkkkkkkkkkkkkkkkkkkk"
              );
              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }

              // console.log(count,totalLength,flag,matchesData,"++++++111111111111111111111111111111111111111111111111+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

              
                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );
                await simulateRoundResults(round._id, tournamentId, delayTime);
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
      }
    }
    if (roundNumber == 2) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 3; // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000+60000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();
          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;
            console.log(
              "2kkkkk2222222222222222222222kkkkkkkkkkkkkkkkkkkkkkkkkk222222222222222222222222222222kkkkkkkkkkkkkkkkkkkkkkkk"
            );
            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);

            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);
          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });
              console.log(
                "222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222"
              );

              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }

              // console.log(count,totalLength,flag,matchesData,"++++++111111111111111111111111111111111111111111111111+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

                await simulateRoundResults(round._id, tournamentId, delayTime);
                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );

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
      }
    }
    if (roundNumber == 3) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 4; // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000+60000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();
          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;
            console.log(
              "333kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk33333333333333333333333333333"
            );
            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);


            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });

              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                console.log(
                  "3333333333333333333333333333333333333333333333333333333333333333333333333333333"
                );
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }

              // console.log(count,totalLength,flag,matchesData,"++++++111111111111111111111111111111111111111111111111+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );
                await simulateRoundResults(round._id, tournamentId, delayTime);
    

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
      }
    }
    if (roundNumber == 4) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 5; // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();

          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);


            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });

              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }
              // console.log(count,totalLength,flag,matchesData,"++++++44444444444444444444444444444444+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );
                await simulateRoundResults(round._id, tournamentId, delayTime);
    

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
      }
    }
    if (roundNumber == 5) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 6; // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);

          await tournament.save();
          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);


            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });

              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }
              // console.log(count,totalLength,flag,matchesData,"++++++555555555555555555555555555555555555555555555555555555555555555555555555555+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );
                await simulateRoundResults(round._id, tournamentId, delayTime);
    

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
      }
    }
    if (roundNumber == 6) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 7; // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();
          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);


            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });

              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }
              // console.log(count,totalLength,flag,matchesData,"++++++6666666666666666666666666666666666666666+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );
                await simulateRoundResults(round._id, tournamentId, delayTime);
    
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
      }
    }
    if (roundNumber == 7) {
      if (tournament.status == "ongoing") {
        // Similar logic for rounds > 1
        if (tournament.JoinedPlayerList.length < 2) {
          tournament.status="suspended"
          await tournament.save();
          return 
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
        tournament.upComingRound = 8; // Increment round for ongoing rounds
        await tournament.save();

        const roundDuration = gameTime * 2000; // Assuming time in milliseconds
        const round = await Round.create({ roundNumber });
        const urls = createUniqueUrls(
          tournament.noOfplayers,
          gameTime,
          tournamentId,
          round._id
        );

        const scheduleNextRound = async () => {
          if (tournament.status === "completed") return;

          await pairPlayersForRound(
            tournament,
            round,
            urls,
            tournamentId,
            roundNumber
          );

          const pendingMatches = await Match.find({
            result: "pending",
            round: round._id,
          });

          for (const match of pendingMatches) {
            const player1Data = await PlayersTournament.findById(match.player1);
            const player2Data = await PlayersTournament.findById(match.player2);

            const playerMatch = new PairedMatch({
              tournamentId: tournament._id,
              roundId: round._id,
              player1: player1Data.user,
              player2: player2Data.user,
              player1Name: player1Data.userData.name, // Assuming name is stored in userData
              player2Name: player2Data.userData.name, // Assuming name is stored in userData
              matchUrl: match.url,
              result: "pending",
              roundNumber: roundNumber, // Add the round number to the match
            });
            await playerMatch.save();
          }

          tournament.rounds.push(round);
          await tournament.save();
          for (let i = 0; i < 60; i++) {
            console.log(i);
            await sleep(1000);
          }

          // Handle the completion of the round
          let flag = false;
          const timeout = setTimeout(async () => {
            if (flag) return;

            await calculateTournamentScores(
              tournament,
              round._id,
              tournamentId
            );
            await simulateRoundResults(round._id, tournamentId, delayTime);


            if (roundNumber == noOfRounds) {
              tournament.status = "completed";
              await tournament.save();
            }

            flag = true;
          }, roundDuration);

          async function terminate(roundId) {
            while (!flag) {
              const matchesData = await Match.find({ round: roundId });

              const totalLength = matchesData.length;
              let count = 0;
              for (let element of matchesData) {
                if (element.joinedCount == 0) {
                  element.result = "completed";
                  await element.save(); // Save the updated match
                }
                if (element.result == "completed") {
                  count++;
                }
              }
              // console.log(count,totalLength,flag,matchesData,"++++++6666666666666666666666666666666666666666+++++++++++++++")
              if (count == totalLength) {
                clearTimeout(timeout);

                await calculateTournamentScores(
                  tournament,
                  round._id,
                  tournamentId
                );
                await simulateRoundResults(round._id, tournamentId, delayTime);
    

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
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const getUpcomingTournament = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get the current date and time
    // Get the current time in IST
    const currentTime = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
    const istTime = new Date(currentTime.getTime() + istOffset);

    // Format the current date as YYYY-MM-DD (e.g., "2024-08-26")
    const currentDate = istTime.toISOString().slice(0, 10);

    // Format the current time as HH:MM (e.g., "15:32")
    const currentFormattedTime = istTime.toTimeString().slice(0, 5);

    // console.log(currentFormattedTime, currentDate);

    const tournamentData = await TournamentModel.aggregate([
      {
        $match: {
          "JoinedPlayerList.user": new mongoose.Types.ObjectId(userId), // Use `new` keyword here
          status: "ongoing",
          startDate: currentDate, // Match the current date (e.g., "2024-08-26")
          time: currentFormattedTime, // Match the time exactly one minute from now (e.g., "15:32")
        },
      },
      {
        $sort: { time: 1 }, // Sort by the time to get the most upcoming tournaments first
      },
    ]);
    if (!tournamentData) {
      res.status(404).json({ message: "No upcoming tournaments found" });
    }
    //console.log(tournamentData, "ppppppppp");

    const pairedMatches = await Match.find({
      $and: [
        {
          $or: [{ user1: userId }, { user2: userId }],
        },
        { result: "pending" },
      ],
    });
    // console.log(pairedMatches,"++++++ddddddddddddddddddddddddddddddddddddddddd+++++++++")

    if (!pairedMatches) {
      res.status(404).json({ message: "No paird match found" });
    }

    res.status(200).json({
      tournaments: tournamentData,
      pairedMatches: pairedMatches,
    });
  } catch (error) {
    console.error("Error fetching upcoming tournaments:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getpairPlayers = async (req, res) => {
  const tournamentId = req.params.id;
  console.log(tournamentId);
  try {
    const tournament = await PairedMatch.findOne({
      tournamentId: tournamentId,
    });
    console.log(tournament);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }
    const player1 = await User.findById(tournament.player1).select("-password");
    const player2 = await User.findById(tournament.player2).select("-password");
    res.status(200).json({
      success: true,
      data: {
        tournament,
        player1,
        player2,
      },
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the players",
      error: error.message,
    });
  }
};

const getOngoingmatch = async (req, res) => {
  try {
    const tournament = await TournamentModel.find({
      status: "ongoing",
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }
    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the tournament",
      error: error.message,
    });
  }
};

const getOngoingmatchData = async (req, res) => {
  try {
    const round = req.params.id;
    // console.log(round,"uuuuuuuuuuuuuu");
    // Use findOne to search by a field other than the _id
    const matchesData = await Match.aggregate([
      { $match: { round: round, result: "completed" } },
    ]);
    //  console.log(matchesData,"uyyyyyyyyyyy")

    if (!matchesData) {
      return res.status(404).json({
        success: false,
        message: "Round not found",
      });
    }
    let playersScore = [];

    for (let element of matchesData) {
      let userId1 = element.user1;
      let userId2 = element.user2;
      console.log(userId1.toString(), userId2.toString());
      let user1 = await PlayersTournament.findOne({ user: userId1.toString() }); // Convert ObjectId to string if necessary
      let user2 = await PlayersTournament.findOne({ user: userId2.toString() });
      console.log(user1, user2);
      playersScore.push(user1, user2);
    }

    if (matchesData) {
      res.status(200).json({
        success: true,
        data: playersScore,
        matchesData: matchesData,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the round data",
      error: error.message,
    });
  }
};

const getTournamentResult = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    // console.log(tournamentId,"kkkkkkk")
    // Aggregate players data, matching by tournamentId and sorting by score, buchholz, and sonnebornBerger
    const playersData = await PlayersTournament.aggregate([
      {
        $match: {
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
        },
      },
      {
        // Sort first by score, then by buchholz, then by sonnebornBerger
        $sort: {
          score: -1, // Sort by score in descending order
          buchholz: -1, // Sort by buchholz in descending order
          sonnebornBerger: -1, // Sort by sonnebornBerger in descending order
          directEncounter: -1, // Sort by direct encounter in descending order
          cumulativeScore: -1, // Sort by cumulative score in descending order
          "userData.name": 1, // Sort alphabetically by 'userData.user' in ascending order (A to Z)
        },
      },
    ]);

    // Check if any data was found
    if (!playersData || playersData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No results found",
      });
    }

    // Respond with the sorted players data
    res.status(200).json({
      success: true,
      data: playersData,
    });
  } catch (error) {
    // Handle any errors that occur during the aggregation
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

const getOngoingMatchDatas = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    // Destructuring the rounds from the request body
    // console.log(tournamentId,"hiiiiiiiiiiii")
    const playerScoredata = await PlayersTournament.aggregate([
      {
        $match: {
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
        },
      },
    ]);
    // Initialize an array to store all players' scores
    // console.log(playerScoredata)

    // Respond with the collected players' scores and matches data
    res.status(200).json({
      success: true,
      data: playerScoredata,
    });
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the match data",
      error: error.message,
    });
  }
};
const getCompletedmatch = async (req, res) => {
  try {
    const tournament = await TournamentModel.find({
      status: "completed",
    });
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: "Tournament not found",
      });
    }
    res.status(200).json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the tournament",
      error: error.message,
    });
  }
};

const getJoinedCount = async (req, res) => {
  try {
    const { tournamentId, roundId, userId } = req.params;
    console.log(
      tournamentId,
      roundId,
      userId,
      "1222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222"
    );
    // Find the match for the given tournament, round, and user
    const match = await Match.findOneAndUpdate(
      {
        tournamentId: tournamentId,
        round: roundId,
        $or: [{ user1: userId }, { user2: userId }],
      },
      {
        $inc: { joinedCount: 1 }, // Increment the joinedCount by 1
      },
      { new: true } // Return the updated document after modification
    );
    if (match) {
      res.status(200).json({
        message: "User joined successfully. Join count incremented.",
        match,
      });
    } else {
      res.status(404).json({ message: "Match not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error joining match", error });
  }
};

const getboardNumberData = async (req, res) => {
  const { tournamentId } = req.params;

  try {
    const boardData = await Match.find({
      tournamentId: tournamentId,
    });

    res.status(200).json({
      success: true,
      data: boardData,


    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching board number data" });
  }
};

const getDataByRoundIdAndNumber = async (req, res) => {
  const { tournamentId, roundNumber } = req.params;
  console.log(tournamentId, roundNumber);
  try {
    const roundNum = parseInt(roundNumber, 10);
    const players = await PlayersTournament.aggregate([
      {
        $match: {
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          'roundWiseScore.roundNumber': roundNum
        }
      },
      {
        $project: {
          'userData.name': 1,  // Project userData name
          roundScore: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$roundWiseScore",
                  as: "score",
                  cond: { $eq: ["$$score.roundNumber", roundNum] }
                }
              },
              0 // Extract the first matching roundScore
            ]
          }
        }
      }
    ]);
    // Ensure that the response structure contains both userData and roundScore
    res.status(200).json({ success: true, data: players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};


const userScoreDataForAdmin = async (req, res) => {
  const { tournamentId } = req.params;
  try {
    const scoreData = await PlayersTournament.aggregate([
      {
        $match: {
          tournamentId: new mongoose.Types.ObjectId(tournamentId)
        }
      },
      {
        $project: {
          score: 1,
          buchholz: 1,
          sonnebornBerger: 1,
          directEncounter: 1,
          cumulativeScore: 1,
          "userData.rating": 1,
          "userData.name": 1,
          "roundWiseScore.roundNumber": 1,
          "roundWiseScore.score": 1
        }
      },
      {
        $sort: {
          score: -1,             // Sort by score in descending order
          buchholz: -1,          // Sort by buchholz in descending order
          sonnebornBerger: -1,   // Sort by sonnebornBerger in descending order
          directEncounter: -1,   // Sort by direct encounter in descending order
          cumulativeScore: -1,   // Sort by cumulative score in descending order
          "userData.name": 1      // Sort alphabetically by 'userData.name' in ascending order
        }
      }
    ]);

    // Restructure the response
    const formattedData = scoreData.map((player, index) => {
      return {
        [index + 1]: {
          name: player.userData.name, // Assuming `name` is part of `userData`
          rating: player.userData.rating,
          scores: player.roundWiseScore.map(rws => rws.score),
          totalPoints: player.score
        }
      };
    });

    // Response
    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user score data" });
  }
};


const getTime = async (req, res) => {
  // Even if the system time is wrong, this will give the correct time for the specified timezone
  const indiaTime = moment().tz("Asia/Kolkata").format();
  // console.log(indiaTime); // Correct Indian Standard Time (IST)
  if (!indiaTime) {
    res.status(400).json({
      success: false,
      message: "Failed to get the current time"
    })
  }
  res.status(200).json({
    success: true,
    time: indiaTime
  })
}

// Cron job to start tournaments that are pending and match the current date and time
cron.schedule("*/10 * * * * *", async () => {
  // Every 10 seconds
  const { date, time } = getCurrentDateTimeInIST();
  // console.log(time,date,"8888888888888888888888888888888888888888888888888",)
  try {
    const tournaments = await TournamentModel.find({
      status: "pending",
      startDate: date,
      time: time,
    });

    for (const tournament of tournaments) {
      let tournamentId = tournament._id;
      let gameTime = tournament.gameTimeDuration;
      let roundNumber = 1;
      let noOfRounds = tournament.noOfRounds;
      let delayTime = tournament.delayTime;
      await startTournament(
        tournamentId,
        gameTime,
        roundNumber,
        noOfRounds,
        delayTime
      );
    }

    // const tournamentsdata = await TournamentModel.find({
    //   $expr: { $lte: [{ $size: "$players" }, 1] }, // Ensures array size <= 1
    //   startDate: date, // Matches the specific date
    //   time: { $lt: time }, // Matches times earlier than the given time
    //   status: "pending", // Ensures the status is "pending"
    // });

    // console.log(tournamentsdata, "players");

    // if (tournamentsdata.length > 0) {
    //   await TournamentModel.updateMany(
    //     { _id: { $in: tournamentsdata.map(t => t._id) } }, // Update matched tournaments
    //     { $set: { status: "suspended" } }
    //   );

    //   console.log(
    //     `${tournamentsdata.length} tournaments updated to 'suspended game'`
    //   );
    // } else {
    //   console.log("No tournaments matched the condition for update.");
    // }
  } catch (error) {
    console.error("Error starting pending tournaments:", error);
  }
});

module.exports = {
  createTournament,
  updateTournament,
  deleteTournament,
  getMyTournament,
  joinTournament,
  getTournamentByUserId,
  getTournamentById,
  adminNotification,
  startTournament,
  getUpcomingTournament,
  getpairPlayers,
  getOngoingmatch,
  getOngoingmatchData,
  getTournamentResult,
  getOngoingMatchDatas,
  getCompletedmatch,
  getPairedList,
  getJoinedCount,
  getboardNumberData,
  getDataByRoundIdAndNumber,
  userScoreDataForAdmin,
  getTime,
  getAllTournament,
  searchTournament
};

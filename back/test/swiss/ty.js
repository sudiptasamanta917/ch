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

//   let scoreGroups = await groupPlayersByScore(players);
//   console.log(scoreGroups, "pppppppppppppppppppppppppppppppppp");

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
//   await handleOddGroupPairing(scoreGroups, usedPlayers, round, urls, tournamentId, previousMatchups, urlIndex, pairs);

//   // Pair the remaining players within each group
//   for (let group of scoreGroups) {
//     const half = Math.floor(group.length / 2);
//     for (let i = 0; i < half; i++) {
//       const player1 = group[i]; // Player from the first half
//       const player2 = group[i + half]; // Corresponding player from the second half

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
//         console.log(player1, player2, "mamammamamamamammammmmmmmmmmmmmmmmmmmmmmmmmmmmmm");
//         const colorAssignment = await assignColors(player1, player2, boardNumber);
//         console.log(colorAssignment, "kakakakakkakakakakkkkkkkkkkkkkkkkkkkkkkkkkkakkkkkkkkkkkk");

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
        
//         // Update color history for both players
//         await PlayersTournament.updateOne(
//           { _id: player1._id },
//           { $push: { colorHistory: colorAssignment.player1Color } }
//         );
//         await PlayersTournament.updateOne(
//           { _id: player2._id },
//           { $push: { colorHistory: colorAssignment.player2Color } }
//         );

//         previousMatchups.add(`${player1.user}-${player2.user}`);
//         previousMatchups.add(`${player2.user}-${player1.user}`);
//       } else {
//         // Handle players who could not be paired
//         const unpairedPlayers = [];
//         unpairedPlayers.push(player1);
//         unpairedPlayers.push(player2);
//       }
//     }
//   }

//   // Handle unpaired players
//   const unpairedPlayers = sortedPlayers.filter(player => !usedPlayers.has(player.user.toString()));
//   for (const player of unpairedPlayers) {
//     if (!player.receivedBye) {
//       const match = await Match.create({
//         round: round._id,
//         tournamentId: tournamentId,
//         player1: player._id,
//         player2: null, // No opponent for a bye
//         user1: player.user,
//         user2: null,
//         winner: player.user,
//         result: "completed", // Mark the match as completed
//         url: urls[urlIndex++ % urls.length], // Assign URL
//         user1Color: null, // No color since it's a bye
//         user2Color: null,
//       });

//       // Update player's score and mark as having received a bye
//       player.receivedBye = true;
//       await PlayersTournament.updateOne(
//         { _id: player._id },
//         { $set: { score: player.score, receivedBye: true } }
//       );

//       round.matches.push(match); // Add the bye match to the round
//       usedPlayers.add(player.user.toString());
//     }
//   }

//   await round.save();
//   console.log(`Paired ${pairs.length} players for the round.`);
//   return round.matches;
// };
console.log(3>2>1)

for(let i=0; i<5; i++){
  setTimeout(()=>{
    console.log(i)
  },1000)
}


const func1 = () => {
  console.log(1);
};
func1(); 

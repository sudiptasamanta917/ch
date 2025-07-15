// const pairPlayersForRound = async (tournament, round, urls, tournamentId) => {
//     // Fetch player data for the tournament
//     const players = await PlayersTournament.aggregate([
//       {
//         $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId) }
//       },
//       {
//         $project: {
//           user: 1,
//           score: 1,
//           buchholz: 1,
//           sonnebornBerger: 1,
//           receivedBye: 1 // Include the receivedBye field
//         }
//       }
//     ]);
//     console.log(players, "++++++++++ Player Data ++++++++++++");
  
//     // Sort players by score, then by Buchholz
//     let sortedPlayers = players.sort((a, b) => b.score - a.score || b.buchholz - a.buchholz);
  
//     const pairs = [];
//     const usedPlayers = new Set();
//     let urlIndex = 0;
  
//     // Retrieve all previous matches to avoid repeat pairings
//     const previousMatches = await Match.find({ tournamentId });
//     const previousMatchups = new Set(
//       previousMatches.flatMap(match => [
//         `${match.user1}-${match.user2}`,
//         `${match.user2}-${match.user1}`
//       ])
//     );
  
//     // If the number of players is odd, assign a bye to the last player who hasn't received a bye
//     if (sortedPlayers.length % 2 !== 0) {
//       let byePlayerIndex = sortedPlayers.length - 1;
  
//       // Find the first player who hasn't received a bye
//       while (byePlayerIndex >= 0 && sortedPlayers[byePlayerIndex].receivedBye) {
//         byePlayerIndex--;
//       }
  
//       if (byePlayerIndex >= 0) {
//         const byePlayer = sortedPlayers.splice(byePlayerIndex, 1)[0]; // Remove the player from sortedPlayers
  
//         // Assign a bye and create a "match" with a bye
//         const match = await Match.create({
//           round: round._id,
//           tournamentId: tournamentId,
//           player1: byePlayer._id,
//           player2: null, // No opponent for a bye
//           user1: byePlayer.user,
//           user2: null, // No user2 for a bye
//           winner: byePlayer.user,
//           result: "completed",
//           url: urls[urlIndex++ % urls.length], // Assign a unique URL
//         });
  
//         // The byePlayer gets a full point for the round
//         byePlayer.score += 1;
//         byePlayer.receivedBye = true;
  
//         // Update the roundWiseScore for the bye player
//         const roundScoreUpdate = {
//           roundNumber: round.roundNumber, // Assuming `roundNumber` is part of the round object
//           score: 1 // Full point for the bye
//         };
  
//         await PlayersTournament.updateOne(
//           { _id: byePlayer._id },
//           {
//             $set: { score: byePlayer.score, receivedBye: true },
//             $push: { roundWiseScore: roundScoreUpdate } // Push the round-wise score
//           }
//         );
  
//         // Add the match to the round
//         round.matches.push(match);
  
//         usedPlayers.add(byePlayer.user.toString());
//       }
//     }
  
//     // Pair remaining players
//     for (let i = 0; i < sortedPlayers.length; i++) {
//       const player1 = sortedPlayers[i];
//       if (usedPlayers.has(player1.user.toString())) continue;
  
//       let foundPair = false; // Flag to check if a pair is found for player1
  
//       for (let j = i + 1; j < sortedPlayers.length; j++) {
//         const player2 = sortedPlayers[j];
//         if (usedPlayers.has(player2.user.toString())) continue;
  
//         // Check if these players have already been paired in any previous round
//         const previousMatch = previousMatchups.has(`${player1.user}-${player2.user}`) || previousMatchups.has(`${player2.user}-${player1.user}`);
  
//         // If no previous match exists, pair them together
//         if (!previousMatch) {
//           const matchUrl = urls[urlIndex++ % urls.length]; // Assign a unique URL to this match
  
//           // Create the match
//           const match = await Match.create({
//             round: round._id,
//             tournamentId: tournamentId,
//             player1: player1._id,
//             player2: player2._id,
//             user1: player1.user,
//             user2: player2.user,
//             result: "pending",
//             url: matchUrl,
//           });
  
//           pairs.push([player1, player2]);
//           usedPlayers.add(player1.user.toString());
//           usedPlayers.add(player2.user.toString());
  
//           // Add the match to the round
//           round.matches.push(match);
  
//           previousMatchups.add(`${player1.user}-${player2.user}`);
//           previousMatchups.add(`${player2.user}-${player1.user}`);
  
//           foundPair = true; // Mark that a valid pair was found for player1
//           break; // Break the inner loop to move to the next player
//         }
//       }
  
//       // If no valid pair is found for player1, return false
//       if (!foundPair) {
//         console.log(`Pairing not possible for player: ${player1.user}`);
//         return false;
//       }
//     }
  
//     // Save the updated round with the new matches
//     await round.save();
//     return true; // Return true if all players were successfully paired
//   };


//   const simulateRoundResults = async (roundId, tournamentId, delayTime) => {
//     console.log(roundId, "++++++++++++++++++92222222222222222222222+++++++++++++");
  
//     // Find all pending matches for the specified round
//     const pendingMatches = await Match.aggregate([
//       {
//         $match: {
//           round: roundId,
//           result: "pending",
//         },
//       },
//     ]);
  
//     console.log(pendingMatches, "Pending matches");
  
//     // Iterate over each pending match and update the result
//     for (let match of pendingMatches) {
//       let result = "completed";
//       await Match.updateOne({ _id: match._id }, { $set: { result } });
  
//       console.log(`Match ${match._id} updated with result: ${result}`);
//     }
  
//     // Get the current time in IST and add the delay time
//     const updatedTimeIST = moment().tz("Asia/Kolkata").add(delayTime, 'minutes');
    
//     // Format the time as 'HH:mm'
//     const formattedTime = updatedTimeIST.format("HH:mm");
//     console.log(formattedTime,"+++++++++++++++++++jjjjjjjjjjjjjjjjjjjjjjkkkkkkkkkkkkkkkkkkk++++++++++");
  
//     // Update the tournament time
//     const updatedTournament = await TournamentModel.updateOne(
//       { _id: tournamentId },
//       { $set: { time: formattedTime } }
//     );
  
//     // Check if the tournament was found and updated
//     if (!updatedTournament || updatedTournament.nModified === 0) {
//       console.error(`Tournament with ID ${tournamentId} not found or not updated.`);
//       return;
//     }
  
//     console.log(`Tournament ${tournamentId} time updated to: ${formattedTime}`);
  
//     // Set an interval to check if the current time matches the updated time
//     const checkTimeInterval = setInterval(async () => {
//       const tournament = await TournamentModel.findById(tournamentId);
      
//       // Check if tournament is found before accessing its properties
//       if (!tournament) {
//         console.error(`Tournament with ID ${tournamentId} not found.`);
//         clearInterval(checkTimeInterval);
//         return;
//       }
  
//       const { time: currentTime } = getCurrentDateTimeInIST();
  
//       if (currentTime === tournament.time) {
//         clearInterval(checkTimeInterval); // Stop the interval
  
//         try {
//           if (tournament && tournament.status === 'ongoing') {
//             const roundNumber = tournament.upComingRound;
//             await startTournament(tournamentId, tournament.gameTimeDuration, roundNumber, tournament.noOfRounds, tournament.delayTime);
//           }
//         } catch (error) {
//           console.error('Error starting tournament:', error);
//         }
//       }
//     }, 2000); // Check every 2 seconds
//   };
  
  

// console.log(!!"hii");  // ?  Any non-empty string (like "false") is truthy,
// console.log(!" ");       // ?An empty string ("")is falsy, but (" ") is truthy .

// console.log( !undefined, !null) //true true because  both are falsy values in js

// console.log(null == undefined);  // ?incase of javscript both null and undefined taken as absence of value and both are falsy
// console.log(null === undefined); // ?but in this case null is object type and undefined is undefined type
// console.log(null == null);       // ?true since both are false
// console.log(null === null);       // ?true since both are false and  data type is also same

console.log([] + 1);    // ? []->""+1="1"
console.log([1,2] + 1); // ?The array [1, 2] is coerced to "1,2", so "1,2" + 1 results in the string "1,21".


console.log("2" * "3");  // 15Explanation: In multiplication, JavaScript coerces the strings "5" and "3" to numbers, so 5 * 3 = 15. When multiplying "5" by "abc", "abc" cannot be coerced to a number, resulting in NaN.
console.log("5" * "abc"); // NaN
console.log("hi" * "abc"); // NaN
// Null Coercion in Arithmetic
console.log(null + 1);  // 1 Explanation: null is coerced to 0 in arithmetic operations, so 0 + 1 results in 1.
console.log(undefined + 1);  // NaN  undefined cannot be coerced to a valid number, so any arithmetic operation with undefined results in NaN.

// In subtraction, strings are coerced to numbers. "5" - "2" becomes 5 - 2, which is 3. However, "abc" cannot be converted to a number, so "5" - "abc" results in NaN.
console.log("5" - "2"); // 3
console.log("5" - "abc"); // NaN

console.log({} + []);  // "[object Object]"
console.log([] + {});  // ""
console.log({}+{} );  // "[object Object][object Object]"
// When using the + operator, an empty object {} is coerced to "[object Object]", and an empty array [] is coerced to an empty string "". Therefore, {} + [] becomes "[object Object]" + "", resulting in "[object Object]". [] + {} results in an empty string because both [] and {} are coerced to strings and concatenated.

console.log(false || "hello");  // "hello"
console.log(true && "goodbye"); // "goodbye"

console.log([] == false);  // true
console.log([] == "");     // true
console.log([] == !"");     // true
console.log([] == 0);      // true

// An empty array [] is coerced to an empty string "", and "" == false is true because "" is falsy. Similarly, [] == "" is true because both are coerced to "".

console.log(!!1);   // true
console.log(!!0);   // false
console.log(!!"");  // false


console.log(5 + true);   // 6
console.log(5 + null);   // 5
console.log(5 + undefined); // NaN
// In addition, true is coerced to 1, so 5 + true becomes 6

console.log("10" > 5);    // true
console.log("10" > "2");  // false
console.log([3] == 3);    // true
// "10" is coerced to 10, so "10" > 5 is true. However, in string comparison, "10" is lexicographically smaller than "2", so "10" > "2" is false. [3] is coerced to 3, so [3] == 3 is true.
let obj1 = {};
let obj2 = {};
console.log(obj1 == obj2);  // false
console.log(obj1 === obj2); // false
//Objects are compared by reference, not by value. Since obj1 and obj2 are different objects (even though they have the same structure), both == and === comparisons return false.
console.log(!{}); //false

console.log(+[]);  // 0  An empty array ([]) is coerced to an empty string "", and when you try to convert an empty string to a number using the unary +, it becomes 0.

console.log(null || 5);   // 5
console.log(undefined || "default");  // "default"
//The || operator returns the first truthy value it encounters. Since null and undefined are falsy, it returns the right-hand values, which are 5 and "default".

console.log(true - false);  // 1
console.log(false + true);  // 1
console.log(true * true);   // 1
//true is coerced to 1 and false is coerced to 0 in arithmetic operations. Therefore, true - false is 1 - 0 = 1, false + true is 0 + 1 = 1, and true * true is 1 * 1 = 1.
console.log(NaN == NaN);  // false
console.log(NaN === NaN); // false

let a = { valueOf: () => 1 };
let b = { valueOf: () => 2 };
console.log(a > b);   // false
console.log(a < b);   // true
//When comparing objects, JavaScript tries to coerce them to primitive values using valueOf. Here, a.valueOf() returns 1 and b.valueOf() returns 2, so a < b is true and a > b is false.


const pairPlayersForRound = async (tournament, round, urls, tournamentId,roundNumber) => {
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
    console.log(
      previousMatchups,
      "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
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
          winner: byePlayer.user,
          result: "completed",
          url: urls[urlIndex++ % urls.length], // Assign a unique URL
        });
  
        // The byePlayer gets a full point for the round
        // byePlayer.score += 1;
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
          console.log(
            match,
            "ppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp"
          );
  
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


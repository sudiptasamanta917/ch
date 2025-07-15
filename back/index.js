require('dotenv').config();


const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const { APP_PORT, DB_URL, SESSIONSECRET } = require("./config");
const mongoose = require("mongoose");
const passport = require("passport");
const axios = require("axios");
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);
const Room = require("./models/room");
const Analysis = require("./models/Analysis");
const User = require("./models/userModel");
const cron = require("node-cron");
const Challenge = require("./models/ChallengeModel");
const Wallet = require("./models/walletModel");
const WalletHistory = require("./models/paymentHistoryModel");
const Match = require("./models/Tournament/Match");
const Round = require("./models/Tournament/Round");
const PlayerTournament = require("./models/Tournament/PlayersTournament");
app.use(cors(
  {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  }
));
app.use(express.json());
app.use(bodyParser.json());
app.use(passport.initialize());
app.use("/public", express.static("public"));
require("./middleware/passport")(passport);
app.get("/ping", (req, res) => {
  res.send("PONG");
});
app.get("/", (req, res) => {
  res.send("hiiiiiiiii from the server");
});
const user_routes = require("./routes/userRoute");
const timeRoute = require("./routes/timeRoute");
const ruleRoute = require("./routes/ruleRoute");
const bannerRoute = require("./routes/bannerRoutes");
const ratingRoute = require("./routes/ratingRoutes");
const trainerRoute = require("./routes/trainerRoutes");
const matchRoute = require("./routes/matchRoute");
const postRoute = require("./routes/postRoute");
const membershipRoute = require("./routes/MembershipRoute");
const tournamentRoute = require("./routes/tournamentRoutes");
const Createchallenge = require("./routes/challengeRoutes");
const AnalysisRoute = require("./routes/analysisRoute");
const walletRoute = require("./routes/walletRoute");
app.use("/aniput", (req, res) => {
  console.log("aniput");
  res.json({ message: "aniput" });

});
//user_routes
app.use("/", user_routes);
app.use("/", timeRoute);
app.use("/", ruleRoute);
app.use("/", bannerRoute);
app.use("/", ratingRoute);
app.use("/", trainerRoute);
app.use("/", matchRoute);
app.use("/", postRoute);
app.use("/", membershipRoute);
app.use("/", tournamentRoute);
app.use("/", Createchallenge);
app.use("/", AnalysisRoute);
app.use("/", walletRoute);
function ConvertDynamoCoinsToInr(dynamoCoins) {
  const conversionRate = 20; // 1 rs = 20 DynamoCoins
  return dynamoCoins / conversionRate;
}
function ConvertInrToDynamoCoins(rupees) {
  const conversionRate = 20; // 1 rs = 20 DynamoCoins
  return rupees * conversionRate;
}

async function ByePointCalculation(tournamentId, userId, roundId) {
  try {
    console.log(
      tournamentId,
      userId,
      roundId,
      "uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu"
    );
    // const userObjectId = new mongoose.Types.ObjectId(userId);
    // Use findOne to get the actual document that can be modified
    const playerData = await PlayerTournament.findOne({
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
      user: userId,
    });
    console.log(playerData, "tytyytytytyty");
    // Fetch the roundNumber from the Round schema using the roundId
    const roundData = await Round.findOne({ _id: roundId });
    if (!roundData) {
      return res.status(404).json({ error: "Round not found" });
    }
    const roundNumber = roundData.roundNumber;
    console.log(roundData, "Round data");

    // Fetch the match data based on tournamentId, userId, and roundId
    const matchData = await Match.findOne({
      tournamentId: tournamentId,
      $or: [{ user1: userId }, { user2: userId }],
      round: roundId,
    });

    if (!matchData) {
      return res.status(404).json({ error: "Match not found" });
    }
    console.log(matchData, "Match data");

    // Update the match result to 'completed'
    matchData.result = "completed";
    matchData.winner = userId;
    matchData.loser == "null";
    matchData.gameTypeWin = "Abort";
    await matchData.save();
    // Save the updated player data
    await playerData.save();
  } catch (error) {
    console.error("Error in ByePointCalculation:", error);
  }
}

// // update Rating with formula
function calculateRatingForWinner(ratingOfPlayer, ratingOpp, actualScore, K) {
  // Calculate the expected score
  const expectedScore = 1 / (1 + 10 ** ((ratingOpp - ratingOfPlayer) / 400));

  // Calculate the rating change
  const ratingChange = K * (actualScore - expectedScore);

  // Calculate the new rating
  const newRating = ratingOfPlayer + ratingChange;

  return newRating;
}

const updateRatings = async (player1, player2, coin) => {
  try {
    console.log("hiiiiiiiiiiiiiiiii");
    // console.log(player1, player2, typeof coin, "Initial Player and Coin Info");
    // Find the users
    const user1 = await User.findOne({ _id: player1.playerId });
    const user2 = await User.findOne({ _id: player2.playerId });
    if (!user1 || !user2) {
      console.log("One or both users not found.");
      return;
    }
    // Calculate netCoin
    let netCoin = 1.8 * coin;
    // console.log(user1, user2, netCoin, "Before Updating dynamoCoin");
    // Update dynamoCoin values
    user1.dynamoCoin += netCoin;
    user2.dynamoCoin -= coin;
    console.log(
      user1.dynamoCoin,
      user2.dynamoCoin,
      "Updated dynamoCoin values"
    );
    // Save the users and check for errors
    const userdata1 = await user1.save();
    const userdata2 = await user2.save();
    const inr1 = ConvertDynamoCoinsToInr(200);
    const inr2 = ConvertDynamoCoinsToInr(200);
    // console.log(userdata1, "tttttttttttttt", userdata2);
    // console.log(player1.playerId, "fffffffffffffff", player2.playerId);

    // Find wallets for the users
    const walletData1 = await Wallet.findOne({ userId: player1.playerId });
    const walletData2 = await Wallet.findOne({ userId: player2.playerId });
    // console.log("wallet_data1:", walletData1);
    // console.log("wallet_data2:", walletData2);
    if (!walletData1 || !walletData2) {
      console.log("One or both wallets not found.");
      return;
    }
    // console.log(
    //   inr1,
    //   inr2,
    //   "kkkkkkkkkkkkkkkkkkkk",
    //   userdata1.dynamoCoin,
    //   typeof userdata2.dynamoCoin
    // );
    let dynamoCoin1 = userdata1.dynamoCoin;
    let dynamoCoin2 = userdata2.dynamoCoin;
    // Create and save wallet history entries
    const walletHistoryData1 = new WalletHistory({
      userId: userdata1._id,
      walletId: walletData1._id,
      userName: userdata1.name,
      userEmail: userdata1.email,
      type: "batting",
      balance: inr1,
      dynamoCoin: dynamoCoin1,
    });
    await walletHistoryData1.save();
    const walletHistoryData2 = new WalletHistory({
      userId: userdata2._id,
      walletId: walletData2._id,
      userName: userdata2.name,
      userEmail: userdata2.email,
      type: "batting",
      balance: inr2,
      dynamoCoin: dynamoCoin2,
    });
    await walletHistoryData2.save();
    // console.log(userdata1.dynamoCoin, "tttttttttttttt", userdata2.dynamoCoin);
    // console.log(user1, user2, "After Saving dynamoCoin and wallet history");

    const newRating1 = calculateRatingForWinner(
      user1.rating,
      user2.rating,
      1,
      20
    );
    const newRating2 = calculateRatingForWinner(
      user2.rating,
      user1.rating,
      0,
      20
    );
    user1.rating = newRating1;
    user2.rating = newRating2;
    await user1.save();
    await user2.save();
    // console.log(player1.playerId, player2.playerId, "999999999999999999");

    // Fetch and filter matches
    const matches = await Match.find({ result: "pending" });
    // console.log("All pending matches:", matches);

    const userData = matches.filter((match) => {
      // console.log(
      //   match.user1.toString(),
      //   player1.playerId.toString(),
      //   "hiiiii"
      // );
      return (
        match.user1.toString() === player1.playerId.toString() ||
        match.user2.toString() === player1.playerId.toString()
      );
    });
    console.log(
      "++++++++++++++Matches for provided user IDs+++++++++++++++++++++++++++++:",
      userData
    );

    // Process each match
    for (const user of userData) {
      console.log(
        "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
      );
      user.winner = player1.playerId;
      user.loser = player2.playerId;
      user.result = "completed";
      user.gameTypeWin = "notDraw";
      await user.save();
      // console.log("Updated match info for user:", user);
    }
  } catch (error) {
    console.error("Error updating ratings:", error);
  }
};
app.get("/update-activity/:username", async (req, res) => {
  const { username } = req.params;
  try {
    let user = await User.findOne({ username });

    if (!user) {
      user = new User({ username });
    }

    user.lastActivity = new Date();
    await user.save();

    res.status(200).json({ message: "Activity updated successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
app.get("/online-users", async (req, res) => {
  try {
    // Find users whose last activity is within the last 10 minutes
    const threshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const onlineUsers = await User.find({ lastActivity: { $gt: threshold } });
    if (onlineUsers.length > 0) {
      res.status(200).json(onlineUsers);
    } else {
      res.status(200).json({
        success: true,
        message: "No online users found",
        data: [],
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
// crone job for updating the routes
cron.schedule("* * * * *", async () => {
  try {
    // Update all users' online status
    await User.updateMany(
      { lastActivity: { $gt: new Date(Date.now() - 10 * 60 * 1000) } },
      { $set: { online: true } }
    );

    // Set offline for users inactive for more than 10 minutes
    await User.updateMany(
      { lastActivity: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
      { $set: { online: false } }
    );
    // Find and delete expired challenges
    const expiredChallenges = await Challenge.find({
      expireTime: { $lt: new Date() },
      expired: false,
    });

    for (const challenge of expiredChallenges) {
      challenge.expired = true;
      await challenge.save();
      await Challenge.findByIdAndDelete(challenge._id);
    }

    // console.log("Online status updated");
  } catch (err) {
    console.error("Error updating online status:", err);
  }
});

app.post("/sendChallenges", async (req, res) => {
  const { from, to, joinLink } = req.body;
});

//============================= socket code ===============================================
const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
// createPosition
const createPosition = () => {
  const position = new Array(10).fill("").map((x) => new Array(10).fill(""));
  for (let i = 0; i < 10; i++) {
    position[8][i] = "bp";
    position[1][i] = "wp";
  }
  position[0][0] = "wr";
  position[0][1] = "wn";
  position[0][2] = "wb";
  position[0][3] = "wm";
  position[0][4] = "wq";
  position[0][5] = "wk";
  position[0][6] = "wm";
  position[0][7] = "wb";
  position[0][8] = "wn";
  position[0][9] = "wr";
  position[9][0] = "br";
  position[9][1] = "bn";
  position[9][2] = "bb";
  position[9][3] = "bm";
  position[9][4] = "bq";
  position[9][5] = "bk";
  position[9][6] = "bm";
  position[9][7] = "bb";
  position[9][8] = "bn";
  position[9][9] = "br";
  return position;
};
const createPosition2 = () => {
  const position = new Array(10).fill("").map((x) => new Array(10).fill(""));
  for (let i = 0; i < 10; i++) {
    position[8][i] = "wp";
    position[1][i] = "bp";
  }
  position[0][0] = "br";
  position[0][1] = "bn";
  position[0][2] = "bb";
  position[0][3] = "bm";
  position[0][4] = "bq";
  position[0][5] = "bk";
  position[0][6] = "bm";
  position[0][7] = "bb";
  position[0][8] = "bn";
  position[0][9] = "br";
  position[9][0] = "wr";
  position[9][1] = "wn";
  position[9][2] = "wb";
  position[9][3] = "wm";
  position[9][4] = "wq";
  position[9][5] = "wk";
  position[9][6] = "wm";
  position[9][7] = "wb";
  position[9][8] = "wn";
  position[9][9] = "wr";
  return position;
};
let count = 0;
const deleteRoom = async (roomId) => {
  const storeRoomData = await Room.findById(roomId);
  // Store the room document in the Analysis collection
  await Analysis.create({ analysisData: storeRoomData });
  await Room.findByIdAndDelete(roomId);
};
const convertSecondsToMinutes = (totalSeconds) => {
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  // Ensuring two digits for seconds
  let formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
  return `${minutes}:${formattedSeconds}`;
};
// console.log(data);
io.on("connection", async (socket) => {
  // let messages=[]
  console.log(`A user connected: ${socket.id}`);
  socket.on("joinRoom", async (body) => {
    try {
      console.log("joinRoom mai join hogyaaaaa");
      // there will be three condition till now
      // ist condition when normal joining scenerio
      let playerId = body.playerId;
      let name = body.name;

      let coin = body.coin;
      let profileImageUrl = body.profileImageUrl;
      let playerStatus = body.playerStatus;
      let joinId = body.joinId;
      let timer = body.timer;
      let countryicon = body.countryicon;

      console.log(timer, "jjjjjjjjjjjjjjjj");
      const userData = await User.findById(playerId);
      console.log(userData, "bbbbbbbbbbbbbbbbbbbbbbbbbb");
      let Rating = userData.rating;

      var roomId;
      var room;

      const playerInRoom = await Room.aggregate([
        { $unwind: "$players" }, // Unwind the players array
        { $match: { "players.playerId": playerId } }, // Match the playerId
        { $group: { _id: "$_id", room: { $first: "$$ROOT" } } }, // Group by room ID and retrieve the whole room document
      ]);
      console.log(playerInRoom, "++++++++++++++playerInRoom++++++++++++++++++");
      if (playerInRoom.length > 0) {
        console.log("Player already in the room");
        roomId = playerInRoom[0]._id;
        console.log(roomId, "roomId");
        room = await Room.findById(roomId);
        console.log(room, "##################################");
        let count = 0;
        if (room.players.length == 2) {
          console.log("Room is full, cannot join");
          for (let element of room.players) {
            if (element.playerId === playerId) {
              // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$");
              io.to(socket.id).emit("JoinStatus", true);
              room = await Room.findById(roomId);
              io.to(socket.id).emit("reJoinRoomData", room);
              // allboarddata,nextPlayerTurn,color
              io.to(socket.id).emit("moveList", room.moveList);

              socket.emit("nextPlayerTurn", {
                playerId: room.nextplayer,
                playerColour: room.nextPlayerColor,
              });
              console.log(room.nextPlayerColor, "iiiiiiiiiiiiii");
            }
            console.log(socket.id, "====================");

            if (element.playerId != playerId) {
              console.log(socket.id, "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
              io.to(socket.id).emit("JoinStatus", true);
              io.to(socket.id).emit("updatedRoom", room);
            }
            count++;
            if (count == 2) {
              //  let index=0
              //   for(let i=0; i<room.players.length;i++){
              //     if(room.players[i].playerId==playerId){
              //       index
              //       break
              //     }
              //     index++
              //   }
              //   room.players[index]=room.players[index]
            }
          }
        }

        if (room.players.length === 1) {
          // for (let i = 0; i < room.players.length; i++) {
          //   console.log("looooooooooooooooooooooooooop");
          //   for (let j = 0; j < room[i].players.length; j++) {
          //     if (room[i].players[j].playerId === playerId) {
          //       roomId = room[i]._id.toString();
          //       console.log(roomId, "pppppppppppppp");
          //       await Room.findByIdAndDelete(roomId);
          //       break;
          //     }
          //   }
          // }
          if (room.players[0].playerId === playerId) {
            await Room.findByIdAndDelete(roomId);
          }
          skipJoining();
        }
      } else {
        skipJoining();
      }
      // await sleep(1000)
      async function skipJoining() {
        if (joinId === "randomMultiplayer") {
          // console.log(joinId, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

          if (coin > 0) {
            // console.log("hiiiiiiiiiii")

            // await sleep(1000)
            // Find a room with coin > 0 and isJoin == true
            room = await Room.aggregate([
              {
                $match: {
                  coin: coin,
                  isJoin: true,
                  joinId: "randomMultiplayer",
                },
              },
            ]);
            // console.log(room, "+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA++")
            if (room.length > 0) {
              // A suitable room is found, join the room
              console.log(room, "++++++++++++ppppppp+++++++++++++");
              for (let element of room) {
                if (element.timer == timer) {
                  room = element;
                  // console.log(room, "+++++++jajajjajja++++++++")
                  // console.log("+++++++++++kakakkakka+++++++++")
                  break;
                }
              }
              console.log(room, "uuuuuuuuuuuuuuuuuuuuuuuuuu");
              if (room) {
                console.log("hiiiiiiiiiiiiiiiii");
                room.players.push({
                  socketID: socket.id,
                  playerId,
                  name,
                  Rating,
                  coin,
                  profileImageUrl,
                  playerStatus,
                  colour: "b",
                  countryicon,
                });
                room.occupancy += 1;
                room.timer = timer;

                roomId = room._id.toString();
                if (room.occupancy >= 2) {
                  room.isJoin = false;
                  const data = createPosition();
                  room.allBoardData.push({ newPosition: data });
                }
                await Room.findByIdAndUpdate(room._id, room);
                socket.join(roomId);
                socket.emit("roomJoined", { roomId: room._id });
                io.to(roomId).emit("updatedPlayers", room.players);
                io.to(roomId).emit("updatedRoom", room);
                if (room.occupancy >= 2) {
                  io.to(roomId).emit("startGame", {
                    start: true,
                    playerId: room.players[1].playerId,
                  });

                  start(roomId);
                }
              } else {
                // console.log("second else ma aagayaaaa")
                // No suitable room found, create a new room
                const newRoom = new Room({
                  coin: coin,
                  players: [
                    {
                      socketID: socket.id,
                      playerId,
                      name,
                      Rating,
                      coin,
                      profileImageUrl,
                      playerStatus,
                      colour: "w",
                      countryicon,
                    },
                  ],
                  occupancy: 1,
                  joinId: "randomMultiplayer",
                  timer: timer,
                });

                await newRoom.save();
                roomId = newRoom._id.toString();
                socket.join(roomId);
                socket.emit("roomJoined", { roomId: newRoom._id });
                room = await Room.findById(roomId);

                // for (let i = 1; i > 0; i++) {
                //     io.to(roomId).emit("jointimer", JSON.stringify(i));
                //     room = await Room.findById(roomId);
                // }
                // console.log(room, "hahahahahah")
                io.to(roomId).emit("createRoomSuccess", room);
                io.to(roomId).emit("updatedRoom", room);
                io.to(roomId).emit("updatedPlayers", room.players);
                socket.broadcast.emit("newPlayerJoined", {
                  playerId,
                  name,
                  Rating,
                  coin,
                  profileImageUrl,
                  playerStatus,
                  colour: "w",
                  countryicon,
                });
              }
            } else {
              console.log("++++++++++++ismai kahe nahi ghusaaaaaaaaa+++++++++");
              // No suitable room found, create a new room
              const newRoom = new Room({
                coin: coin,
                players: [
                  {
                    socketID: socket.id,
                    playerId,
                    name,
                    Rating,
                    coin,
                    profileImageUrl,
                    playerStatus,
                    colour: "w",
                    countryicon,
                  },
                ],
                occupancy: 1,
                joinId: "randomMultiplayer",
                timer: timer,
              });

              await newRoom.save();
              roomId = newRoom._id.toString();
              socket.join(roomId);
              socket.emit("roomJoined", { roomId: newRoom._id });
              room = await Room.findById(roomId);

              // for (let i = 1; i > 0; i++) {
              //     io.to(roomId).emit("jointimer", JSON.stringify(i));
              //     room = await Room.findById(roomId);
              // }
              // console.log(room, "hahahahahah")
              io.to(roomId).emit("createRoomSuccess", room);
              io.to(roomId).emit("updatedRoom", room);
              io.to(roomId).emit("updatedPlayers", room.players);
              socket.broadcast.emit("newPlayerJoined", {
                playerId,
                name,
                Rating,
                coin,
                profileImageUrl,
                playerStatus,
                colour: "w",
                countryicon,
              });
            }
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("joinById", async (body) => {
    // console.log("ismai join hogya joinByid mai")
    let playerId = body.playerId;
    let name = body.name;
    // let Rating = body.Rating;
    let coin = body.coin;
    let profileImageUrl = body.profileImageUrl;
    let playerStatus = body.playerStatus;
    let joinId = body.joinId;
    let timer = body.timer;
    let countryicon = body.countryicon;
    let roomId;
    let room;
    const userData = await User.findById(playerId);
    console.log(userData, "bbbbbbbbbbbbbbbbbbbbbbbbbb");
    let Rating = userData.rating;

    const playerInRoom = await Room.aggregate([
      { $unwind: "$players" },
      { $match: { "players.playerId": playerId } },
      { $project: { players: 1, _id: 0 } },
    ]);
    // console.log(playerInRoom, "playerInRoom")
    // console.log(playerInRoom, "playerInRoom")
    if (playerInRoom.length > 0) {
      console.log("Player already in the room");
      console.log(joinId, "yyyyyyyyyyyy");
      const roomData = await Room.findOne({ joinId });
      console.log(roomData, "uuuuuuuuuuuuuuuuuuuuuuuuuuu");
      roomId = roomData._id;
      room = await Room.findById(roomId);
      console.log(room, roomId, "+++++++Tournament Data++++++++++++");
      if (room.players.length == 2) {
        console.log("Tournament Room is full, cannot join");
        for (let element of room.players) {
          if (element.playerId === playerId) {
            // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$");
            io.to(socket.id).emit("JoinStatus", true);
            room = await Room.findById(roomId);
            io.to(socket.id).emit("reJoinRoomData", room);
            // allboarddata,nextPlayerTurn,color
            io.to(socket.id).emit("moveList", room.moveList);

            socket.emit("nextPlayerTurn", {
              playerId: room.nextplayer,
              playerColour: room.nextPlayerColor,
            });
          }
          console.log(socket.id, "====================");

          if (element.playerId != playerId) {
            // console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
            io.to(socket.id).emit("JoinStatus", true);
            io.to(socket.id).emit("updatedRoom", room);
          }
        }
      }

      if (room.players.length === 1) {
        // for (let i = 0; i < room.players.length; i++) {
        //   console.log("looooooooooooooooooooooooooop");
        //   for (let j = 0; j < room[i].players.length; j++) {
        //     if (room[i].players[j].playerId === playerId) {
        //       roomId = room[i]._id.toString();
        //       console.log(roomId, "pppppppppppppp");
        //       await Room.findByIdAndDelete(roomId);
        //       break;
        //     }
        //   }
        // }
        if (room.players[0].playerId === playerId) {
          await Room.findByIdAndDelete(roomId);
        }
        skipJoining();
      }
    } else {
      skipJoining();
    }
    async function skipJoining() {
      // console.log(joinId, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

      if (coin > 0) {
        // console.log("hiiiiiiiiiii")

        // await sleep(1000)
        // Find a room with coin > 0 and isJoin == true
        room = await Room.aggregate([
          {
            $match: {
              coin: coin,
              isJoin: true,
              joinId: joinId,
            },
          },
        ]);
        // console.log(room, "+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA++")
        if (room.length > 0) {
          // A suitable room is found, join the room
          console.log(room, "++++++++++++ppppppp+++++++++++++");
          for (let element of room) {
            if (element.timer == timer) {
              room = element;
              // console.log(room, "+++++++jajajjajja++++++++")
              // console.log("+++++++++++kakakkakka+++++++++")
              break;
            }
          }
          console.log(room, "uuuuuuuuuuuuuuuuuuuuuuuuuu");
          if (room) {
            console.log("hiiiiiiiiiiiiiiiii");
            room.players.push({
              socketID: socket.id,
              playerId,
              name,
              Rating,
              coin,
              profileImageUrl,
              playerStatus,
              colour: "b",
              countryicon,
            });
            room.occupancy += 1;
            room.timer = timer;

            roomId = room._id.toString();
            if (room.occupancy >= 2) {
              room.isJoin = false;
              const data = createPosition();
              room.allBoardData.push({ newPosition: data });
            }
            await Room.findByIdAndUpdate(room._id, room);
            socket.join(roomId);
            socket.emit("roomJoined", { roomId: room._id });
            io.to(roomId).emit("updatedPlayers", room.players);
            io.to(roomId).emit("updatedRoom", room);
            if (room.occupancy >= 2) {
              io.to(roomId).emit("startGame", {
                start: true,
                playerId: room.players[1].playerId,
              });

              start(roomId);
            }
          } else {
            // console.log("second else ma aagayaaaa")
            // No suitable room found, create a new room
            const newRoom = new Room({
              coin: coin,
              players: [
                {
                  socketID: socket.id,
                  playerId,
                  name,
                  Rating,
                  coin,
                  profileImageUrl,
                  playerStatus,
                  colour: "w",
                  countryicon,
                },
              ],
              occupancy: 1,
              joinId: joinId,
              timer: timer,
            });

            await newRoom.save();
            roomId = newRoom._id.toString();
            socket.join(roomId);
            socket.emit("roomJoined", { roomId: newRoom._id });
            room = await Room.findById(roomId);

            io.to(roomId).emit("createRoomSuccess", room);
            io.to(roomId).emit("updatedRoom", room);
            io.to(roomId).emit("updatedPlayers", room.players);
            socket.broadcast.emit("newPlayerJoined", {
              playerId,
              name,
              Rating,
              coin,
              profileImageUrl,
              playerStatus,
              countryicon,
            });
          }
        } else {
          console.log("++++++++++++ismai kahe nahi ghusaaaaaaaaa+++++++++");
          // No suitable room found, create a new room
          const newRoom = new Room({
            coin: coin,
            players: [
              {
                socketID: socket.id,
                playerId,
                name,
                Rating,
                coin,
                profileImageUrl,
                playerStatus,
                colour: "w",
                countryicon,
              },
            ],
            occupancy: 1,
            joinId: joinId,
            timer: timer,
          });

          await newRoom.save();
          roomId = newRoom._id.toString();
          socket.join(roomId);
          socket.emit("roomJoined", { roomId: newRoom._id });
          room = await Room.findById(roomId);

          io.to(roomId).emit("createRoomSuccess", room);
          io.to(roomId).emit("updatedRoom", room);
          io.to(roomId).emit("updatedPlayers", room.players);
          socket.broadcast.emit("newPlayerJoined", {
            playerId,
            name,
            Rating,
            coin,
            profileImageUrl,
            playerStatus,
            countryicon,
          });
        }
      }
    }
  });
  socket.on("joinRoomViaTournament", async (body) => {
    let playerId = body.playerId;
    let name = body.name;
    // let Rating = body.Rating;
    let coin = body.coin;
    let profileImageUrl = body.profileImageUrl;
    let playerStatus = body.playerStatus;
    let joinId = body.joinId;
    let timer = body.timer;
    let countryicon = body.countryicon;
    let colour = body.colour;
    let roomId;
    let room;
    const userData = await User.findById(playerId);
    console.log(userData, "bbbbbbbbbbbbbbbbbbbbbbbbbb");
    let Rating = userData.rating;
    console.log(
      "++++++++++++++++++++++++++++++++joinId++++++++++++++++++++++++++++++++",
      joinId
    );
    const playerInRoom = await Room.findOne({ joinId });
    console.log(
      playerInRoom,
      "+++++++++++++++++playerInRoom++++++++++++++++++++"
    );
    if (playerInRoom) {
      console.log("Player already in the room");
      console.log(joinId, "yyyyyyyyyyyy");
      const roomData = await Room.findOne({ joinId });
      console.log(roomData, "uuuuuuuuuuuuuuuuuuuuuuuuuuu");
      roomId = roomData._id;
      room = await Room.findById(roomId);
      console.log(room, roomId, "+++++++Tournament Data++++++++++++");
      if (room.players.length == 2) {
        console.log("Tournament Room is full, cannot join");
        for (let element of room.players) {
          if (element.playerId === playerId) {
            // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$");
            io.to(socket.id).emit("JoinStatus", true);
            room = await Room.findById(roomId);
            io.to(socket.id).emit("reJoinRoomData", room);
            // allboarddata,nextPlayerTurn,color
            io.to(socket.id).emit("moveList", room.moveList);

            socket.emit("nextPlayerTurn", {
              playerId: room.nextplayer,
              playerColour: room.nextPlayerColor,
            });
          }

          if (element.playerId != playerId) {
            // console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
            io.to(socket.id).emit("JoinStatus", true);
            io.to(socket.id).emit("updatedRoom", room);
          }
        }
      }

      if (room.players.length === 1) {
        // for (let i = 0; i < room.players.length; i++) {
        //   console.log("looooooooooooooooooooooooooop");
        //   for (let j = 0; j < room[i].players.length; j++) {
        //     if (room[i].players[j].playerId === playerId) {
        //       roomId = room[i]._id.toString();
        //       console.log(roomId, "pppppppppppppp");
        //       await Room.findByIdAndDelete(roomId);
        //       break;
        //     }
        //   }
        // }
        if (room.players[0].playerId === playerId) {
          await Room.findByIdAndDelete(roomId);
          console.log(
            "ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt"
          );
        }
        skipJoining();
      }
    } else {
      skipJoining();
    }
    async function skipJoining() {
      if (coin > 0) {
        // Find a room with the same `joinId` and appropriate conditions
        const existingRoom = await Room.findOneAndUpdate(
          {
            coin: coin,
            isJoin: true,
            joinId: joinId,
          },
          { $set: { isJoin: false } }, // Temporarily lock the room
          { new: true }
        );
        console.log(existingRoom, "llllllllllllllllllllllllllllllllllllllllll");

        if (existingRoom) {
          console.log("Joining existing room:", existingRoom._id);
          // Check if the player already exists in the room
          const playerExists = existingRoom.players.some(
            (player) => player.playerId === playerId
          );

          if (playerExists) {
            console.log(
              "Player already exists in the room, skipping addition."
            );
            socket.join(existingRoom._id.toString());
            io.to(socket.id).emit("JoinStatus", true);
            io.to(socket.id).emit("reJoinRoomData", existingRoom);
            return; // Exit to prevent duplicate addition
          }

          // Add player to the room
          existingRoom.players.push({
            socketID: socket.id,
            playerId,
            name,
            Rating,
            coin,
            profileImageUrl,
            playerStatus,
            colour,
            countryicon,
          });
          existingRoom.occupancy += 1;
          existingRoom.timer = timer;

          if (existingRoom.occupancy >= 2) {
            existingRoom.isJoin = false; // Room is full, prevent further joining
            const data = createPosition();
            existingRoom.allBoardData.push({ newPosition: data });
          }

          await existingRoom.save();
          roomId = existingRoom._id.toString();
          socket.join(roomId);

          io.to(roomId).emit("updatedPlayers", existingRoom.players);
          io.to(roomId).emit("updatedRoom", existingRoom);

          if (existingRoom.occupancy >= 2) {
            io.to(roomId).emit("startGame", {
              start: true,
              playerId: existingRoom.players[1].playerId,
            });
            start(roomId);
          }
        } else {
          console.log("Creating a new room");
          // No suitable room found, create a new one

          const playerInRoom = await Room.aggregate([
            { $match: { "players.playerId": playerId } },
          ]);
          console.log(playerInRoom, "rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr")

          const newRoom = new Room({
            coin: coin,
            players: [
              {
                socketID: socket.id,
                playerId,
                name,
                Rating,
                coin,
                profileImageUrl,
                playerStatus,
                colour,
                countryicon,
              },
            ],
            occupancy: 1,
            joinId: joinId,
            timer: timer,
          });

          await newRoom.save();
          roomId = newRoom._id.toString();
          socket.join(roomId);

          io.to(roomId).emit("createRoomSuccess", newRoom);
          io.to(roomId).emit("updatedRoom", newRoom);
          io.to(roomId).emit("updatedPlayers", newRoom.players);
          socket.broadcast.emit("newPlayerJoined", {
            playerId,
            name,
            Rating,
            coin,
            profileImageUrl,
            playerStatus,
            colour,
            countryicon,
          });
        }
      }
    }
  });

  const start = async (roomId) => {
    try {
      // console.log(count++)
      console.log("ketniBar call hua start room");
      var roomId = roomId;
      var room = await Room.findById(roomId);
      if (room === null) {
        io.to(roomId).emit("errorOccured", "Room ID is Wrong");
      }
      room.playerList = [];
      await room.save();
      room.playerList.push(room.players[0].playerId);
      room.playerList.push(room.players[1].playerId);
      if (room.players[0].colour === "b") {
        console.log("000000000000000000000000000000000000000000000000000");
        let tempData = room.players[1];
        room.players[1] = room.players[0];
        room.players[0] = tempData;
      }
      await room.save();
      // for player1 white and player 2 black fix
      io.to(roomId).emit("updatedRoom", room);
      room.timer1 = room.timer;
      room.timer2 = room.timer;
      room.stopTimer1 = false;
      room.stopTimer2 = false;
      room.nextplayer = room.players[0].playerId;
      room.nextPlayerColor = "w";

      // console.log(room.players[0].playerId, "LLLLLLLLLLLLLLLLLLLLLLLLLLL")
      room = await room.save();
      let data = createPosition();
      // room.allBoardData.push(data)
      // allData.push(data)
      room = await room.save();
      let data2 = createPosition2();
      io.to(roomId).emit("createPosition", {
        createPosition: data,
        positions: [
          {
            createPosition2: data2,
            playerId: room.players[1].playerId,
          },
        ],
      });

      io.to(roomId).emit("nextPlayerTurn", {
        playerId: room.players[0].playerId,
        playerColour: "w",
      });

      // console.log({ playerId: room.players[0].playerId, playerColour: "w" }, "nextPlayerTurn");
      var endLoop = false;
      do {
        const playerTurn = async (playerId) => {
          let currentTurn = playerId; // Track the current player's turn

          if (playerId === room.players[0].playerId) {
            io.to(roomId).emit("nextPlayerTurn", {
              playerId: playerId,
              playerColour: "w",
            });

            let currentTime1 = room.timer1;

            for (let i = currentTime1; i >= 0; i--) {
              room = await Room.findById(roomId);

              if (
                room.nextplayer !== playerId ||
                room.checkMate ||
                room.DrawStatus
              ) {
                // Stop the timer if the turn changes or the game ends
                return;
              }

              const result = convertSecondsToMinutes(i);
              io.to(roomId).emit("timer1", result);
              await sleep(1000);
              room.timer1 = i - 1;

              if (room.timer1 === 59) {
                io.to(roomId).emit("timerIs60", {
                  successfully: true,
                  playerId: room.players[0].playerId,
                });
              }

              if (room.timer1 === 0) {
                io.to(roomId).emit("playerWon", {
                  playerId: room.players[1].playerId,
                });
                room.winner = room.players[1].playerId;
                updateRatings(room.players[1], room.players[0], room.coin);
                await room.save();
                deleteRoom(roomId);
                return;
              }

              if (room.isLeftPLayer1) {
                room.playerList.splice(0, 1);
                io.to(roomId).emit("playerWon", {
                  playerId: room.players[1].playerId,
                });
                room.winner = room.players[1].playerId;
                updateRatings(room.players[1], room.players[0], room.coin);
                await room.save();
                return;
              }

              if (room.players[0].strikeDone) {
                room.players[0].strikeDone = false;
                await room.save();
                break;
              }

              // Pause for 1 second
              room = await room.save();
            }
          } else {
            io.to(roomId).emit("nextPlayerTurn", {
              playerId: playerId,
              playerColour: "b",
            });

            let currentTime2 = room.timer2;

            for (let i = currentTime2; i >= 0; i--) {
              room = await Room.findById(roomId);

              if (
                room.nextplayer !== playerId ||
                room.checkMate ||
                room.DrawStatus
              ) {
                // Stop the timer if the turn changes or the game ends
                return;
              }

              const result = convertSecondsToMinutes(i);
              io.to(roomId).emit("timer2", result);
              await sleep(1000);
              room.timer2 = i - 1;

              if (room.timer2 === 59) {
                io.to(roomId).emit("timerIs60", {
                  successfully: true,
                  playerId: room.players[1].playerId,
                });
              }

              if (room.timer2 === 0) {
                io.to(roomId).emit("playerWon", {
                  playerId: room.players[0].playerId,
                });
                room.winner = room.players[0].playerId;
                updateRatings(room.players[0], room.players[1], room.coin);
                await room.save();
                deleteRoom(roomId);
                return;
              }

              if (room.isLeftPLayer2) {
                room.playerList.splice(1, 1);
                io.to(roomId).emit("playerWon", {
                  playerId: room.players[0].playerId,
                });
                room.winner = room.players[0].playerId;
                updateRatings(room.players[0], room.players[1], room.coin);
                await room.save();
                return;
              }

              if (room.players[1].strikeDone) {
                room.players[1].strikeDone = false;
                await room.save();
                break;
              }

              // Pause for 1 second
              room = await room.save();
            }
          }
        };

        if (room.playerList.length > 1 || room.players.length > 1) {
          // console.log(room.nextplayer, "kakakakak")
          if (room.timer1 <= 1 || room.timer2 <= 1) {
            io.to(roomId).emit("playerWon", {
              playerId: room.players[0].playerId,
            });
            room.winner = room.players[0].playerId;
            room = await room.save();
            updateRatings(room.players[0], room.players[1], room.coin);
            endLoop = true;
            deleteRoom(roomId);
          }
          await playerTurn(room.nextplayer);
          // console.log(
          //   room.nextplayer,
          //   "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
          // );
        } else {
          io.to(roomId).emit("playerWon", { playerId: room.playerList[0] });
          room.winner = room.players[0].playerId;
          room = await room.save();
          updateRatings(room.players[0], room.players[1], room.coin);
          endLoop = true;
          deleteRoom(roomId);
        }
        if (room.players.length == 1 || room.playerList.length == 1) {
          endLoop = true;
        }
      } while (endLoop == false);
    } catch (error) {
      console.log(error);
    }
  };

  socket.on("boardUpdate", async (body) => {
    try {
      // console.log(
      //   "++++++++++++++++++++++++qqqqqqqqqqqqqqqqqqqqqqqqqqqq+++++++++++++++++++++"
      // );
      const { roomId, boardData, playerId, move } = body;
      let room = await Room.findById(roomId);

      if (!room) {
        return io.to(roomId).emit("errorOccured", "Room ID is Wrong");
      }

      // console.log("Board Data:", boardData);

      // Update the current player's move status and switch to the next player
      if (room.players[0].playerId === playerId) {
        room.players[0].strikeDone = true;
        room.nextplayer = room.players[1].playerId;
        room.nextPlayerColor = room.players[1].colour;
      } else if (room.players[1].playerId === playerId) {
        room.players[1].strikeDone = true;
        room.nextplayer = room.players[0].playerId;
        room.nextPlayerColor = room.players[0].colour;
      }

      room.moveList.push(move);
      room.repetationArray.push(move);

      // Save the updated room document
      await room.save();
      // console.log(room.moveList, "+++++++hiiiiii++++++");
      // console.log(room.repetationArray, "+++++++++byeeeeeeee++++++++++++");
      io.to(roomId).emit("moveList", room.moveList);

      if (room.repetationArray.length == 9) {
        function func3(arr) {
          if (arr[0] === arr[4] && arr[4] === arr[8] && arr[1] === arr[5]) {
            return true;
          }
          return false;
        }
        const result = func3(room.repetationArray);
        // console.log(result);
        if (result == true) {
          room.threefoldCount += 1;
          room = await room.save();
          if (room.threefoldCount == 1) {
            io.to(roomId).emit("ThreeFold", { message: true });
          }
          if (room.threefoldCount == 5) {
            io.to(roomId).emit("fiveFoldData", { message: true });
            io.to(roomId).emit("DrawStatus", { DrawStatus: true });
            deleteRoom(roomId);
          }

          room.repetationArray.shift();
          room = await room.save();
        } else {
          room.threefoldCount = 0;
          room.repetationArray.shift();
          room = await room.save();
        }
      }
      console.log(
        `Player ${playerId} made a move. Next player: ${room.nextplayer}`
      );

      // Reverse the board for the opponent player
      let reversedBoardData = {
        newPosition: boardData.newPosition.slice().reverse(),
      };

      // Update the board data for both players
      room.allBoardData.push(
        room.players[0].playerId === playerId ? boardData : reversedBoardData
      );
      await room.save();

      room.players.forEach((element) => {
        const playerBoardData =
          element.playerId === playerId ? boardData : reversedBoardData;
        // console.log(element.socketID, "qpqpqpqppq");
        io.to(element.socketID).emit("receive_boardData", {
          playerId: element.playerId,
          playerColour: element.colour,
          data: playerBoardData,
        });
      });
      // const storeRoomData = await Room.findById(roomId);
      // io.to(roomId).emit("allBoardData",storeRoomData)
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("getBoardDate", async (body) => {
    try {
      let roomId = body.roomId;
      let next = body.next;
      let previous = body.previous;
      let indexNumber = body.indexNumber;
      let endIndex = body.endIndex;
      let startIndex = body.startIndex;
      let playerId = body.playerId;
      console.log(indexNumber, playerId, "lalalalallalalal");
      let room = await Room.findById(roomId);
      let socketId1;
      let socketId2;
      for (let element of room.players) {
        if (element.playerId === room.players[0].playerId) {
          socketId1 = element.socketID;
        }
        if (element.playerId === room.players[1].playerId) {
          socketId2 = element.socketID;
        }
      }
      room = await Room.findById(roomId);
      if (room === null) {
        io.to(roomId).emit("errorOccured", "Room ID is Wrong");
      }
      const currentindex = room.currentIndex;
      if (previous) {
        let previousIndex = currentindex - 1;
        room.currentIndex = previousIndex;
        await room.save();
        if (previousIndex >= 0) {
          const allData = room.allBoardData;
          io.to(socketId).emit("boardAtPreviousIndex", allData[previousIndex]);
          // console.log(allData[previousIndex]);
          if (previousIndex == 0) {
            io.emit("zeroIndex", previousIndex);
          }
        } else {
          console.log("Previous index is out of bounds");
        }
      } else if (next) {
        let nextIndex = currentindex + 1;
        room.currentIndex = nextIndex;
        await room.save();
        if (nextIndex < room.allBoardData.length) {
          const allData = room.allBoardData;
          io.to(socketId).emit("boardAtMextIndex", allData[nextIndex]);
          // console.log(allData[nextIndex]);
          if (nextIndex == room.allBoardData.length - 1) {
            io.emit("lastIndex", nextIndex);
          }
        } else {
          console.log("Next index is out of bounds");
        }
      } else if (indexNumber == 0 || indexNumber > 0) {
        if (playerId == room.players[0].playerId) {
          room.currentIndex = indexNumber;
          if (indexNumber == 0) {
            // console.log(indexNumber, "gggggggggggggggggggggg");
            const allData = room.allBoardData;
            // console.log(allData[indexNumber], "kkkkkkk");
            io.to(socketId1).emit("boardAtIndex", allData[indexNumber]);
          }
          await room.save();
          const allData = room.allBoardData;
          // console.log(allData[indexNumber], "pppppppppppppppppppp");
          io.to(socketId1).emit("boardAtIndex", allData[indexNumber]);
        } else {
          room.currentIndex = indexNumber;
          const allData = room.allBoardData;
          let currentData = allData[indexNumber].newPosition;
          let n = currentData.length - 1;
          let arrayData = [];
          for (let i = n; i >= 0; i--) {
            arrayData.push(currentData[i]);
          }
          io.to(socketId2).emit("boardAtIndex", { newPosition: arrayData });
        }
      } else if (startIndex) {
        if (playerId == room.players[0].playerId) {
          let startIndex = 0;
          room.currentIndex = startIndex;
          await room.save();
          const allData = room.allBoardData;
          // console.log(allData[startIndex], "pppppppppppppppppppp");
          io.to(socketId1).emit("boardAtIndex", allData[indexNumber]);
        } else {
          let startIndex = 0;
          room.currentIndex = startIndex;
          const allData = room.allBoardData;
          let currentData = allData[indexNumber].newPosition;
          let n = currentData.length - 1;
          let arrayData = [];
          for (let i = n; i >= 0; i--) {
            arrayData.push(currentData[i]);
          }
          io.to(socketId2).emit("boardAtIndex", { newPosition: arrayData });
        }

        // ==================================
        let startIndex = 0;
        room.currentIndex = startIndex;
        await room.save();
        if (startIndex == 0) {
          const allData = room.allBoardData;
          io.to(socketId).emit("boardAtStartIndex", allData[startIndex]);
          // console.log(allData[startIndex]);
        } else {
          console.log("start index is out of bounds");
        }
      } else {
        if (endIndex) {
          console.log("end index mai ghus gaaaaaaaaaa");
          room.currentIndex = room.allBoardData.length - 1;
          console.log(room.currentIndex);
          endIndex = room.currentIndex;
          room.currentIndex = endIndex;
          await room.save();
          const allData = room.allBoardData;
          io.to(socketId).emit("boardAtfinalIndex", allData[endIndex]);
          console.log(allData[endIndex]);
          io.emit("finalIndex", endIndex);
        }
      }
      //  at this moment we lost the currentPlayer so we have to find it
      let currentPlayerId = room.nextplayer;
      let correspondingColor;
      for (let element of room.players) {
        if (element.playerId == currentPlayerId) {
          correspondingColor = element.colour;
        }
      }
      // console.log(currentPlayerId, correspondingColor);
      io.to(roomId).emit("nextPlayerTurn", {
        playerId: currentPlayerId,
        playerColour: correspondingColor,
      });
    } catch (error) {
      console.log("joinRoom_______err", error);
    }
  });
  socket.on("clearAll", async () => {
    try {
      await Room.deleteMany({});
    } catch (e) {
      console.log(e);
    }
  });
  socket.on("clearRoom", async (body) => {
    try {
      var roomId = body.roomId;
      let room = await Room.findById(roomId);
      if (room == null) {
        socket.emit("errorOccured", "Room not found");
        return;
      }

      await Room.deleteOne({ _id: roomId });
    } catch (e) {
      console.log(e);
    }
  });
  socket.on("leaveRoom", async (body) => {
    let roomId = body.roomId;
    let playerId = body.playerId;
    // let challengeId = body.challengeId;
    // console.log(roomId, playerId, challengeId, "adaddadadadadad");
    let room = await Room.findById(roomId);

    if (room == null) {
      socket.emit("errorOccured", "Room not found");
      return;
    }

    // const playerIndex = room.players.indexOf((player) => {
    //     player.playerId == playerId
    // })
    let playerIndex;
    let socketID;
    let count = 0;

    for (let element of room.players) {
      if (element.playerId == playerId) {
        playerIndex = count;
        break;
      }
      count++;
    }

    // for (let i = 0; i < room.players.length; i++) {
    //     if (room.players[i].playerId === playerId) {
    //         playerIndex = i
    //         if (i == 0) {
    //             socketID = room.players[1].socketID
    //         }
    //         if (i == 1) {
    //             socketID = room.players[0].socketID
    //         }

    //     }
    // }

    if (room.players.length == 1) {
      await Room.findByIdAndDelete(roomId);
      return;
    }
    console.log("++++++++++++++pppppppppppppppp++++++++++++++++");
    console.log(playerIndex, "akkakakakkak");
    if (playerIndex == 0) {
      console.log("+++++++++++++++++");
      io.to(roomId).emit("playerWon", { playerId: room.players[1].playerId });
      room.winner = room.players[1].playerId;
      console.log(
        room.players[1].playerId,
        room.players[0].playerId,
        room.coin,
        "kakakakkakakakakkkkkkkkkkkkkkkkkkkkkkkkkkkk"
      );
      updateRatings(room.players[1], room.players[0], room.coin);
      room = await room.save();
      console.log("bababab");
      room.isLeftPLayer1 = true;
    } else {
      console.log("bbiiiiiiii");

      io.to(roomId).emit("playerWon", { playerId: room.players[0].playerId });
      room.winner = room.players[0].playerId;
      updateRatings(room.players[0], room.players[1], room.coin);
      room = await room.save();
      console.log("afafafafa");
      room.isLeftPLayer2 = true;
    }
    room = await room.save();
    io.to(roomId).emit("roomLeftPlayerId", { playerId: playerId });
    room = await room.save();
    room.players = room.players.filter((player) => {
      return player.playerId != playerId;
    });
    deleteRoom(roomId);
    let challegeRoom = await Challenge.aggregate([
      { $match: { challengeId: challengeId } },
    ]);
    console.log(challegeRoom, "lalalalal");
    if (challegeRoom) {
      let challengeId = challegeRoom[0]._id;
      await Challenge.deleteOne({ _id: challengeId });
    }
  });
  socket.on("disconnect", async () => {
    console.log(`A user disconnect: ${socket.id}`);



    let Socket = socket.id;
    var allInOne = await Room.find();
    for (let element of allInOne) {
      console.log(allInOne.length);
      for (let i = 0; i < element.players.length; i++) {
        if (element.players[i].socketID == Socket.toString()) {
          let roomId = element._id.toString();
          console.log(roomId, "aagya roomid");
          var playerId = element.players[i].playerId;
          LeaveRoom(roomId, playerId)

          // if (i == 0) {
          //     io.to(element.players[1].socketID).emit("opponentLeft", element.players[i].playerId);
          // } else {
          //     io.to(element.players[0].socketID).emit("opponentLeft", element.players[i].playerId);
          // }
          // console.log(playerId, "aagya playerId");
          // io.to(roomId).emit("playerLeft", element.players[i].playerId);
          // var room = await Room.findById(roomId);
          // room.players = room.players.filter((items) => {
          //     return items.playerId != playerId;
          // });
          // room = await room.save();
          // // io.to(roomId).emit("updatedRoom", room);
          // break;
        }
      }
    }
  });
  async function LeaveRoom(roomId, playerId) {

    // let roomId = body.roomId;
    // let playerId = body.playerId;

    console.log(roomId, playerId, "adaddadadadadad");
    let room = await Room.findById(roomId);

    if (room == null) {
      socket.emit("errorOccured", "Room not found");
      return;
    }


    let playerIndex;
    let socketID;
    let count = 0;

    for (let element of room.players) {
      if (element.playerId == playerId) {
        playerIndex = count;
        break;
      }
      count++;
    }



    if (room.players.length == 1) {
      await Room.findByIdAndDelete(roomId);
      return;
    }
    console.log("++++++++++++++pppppppppppppppp++++++++++++++++");
    console.log(playerIndex, "akkakakakkak");
    if (playerIndex == 0) {
      console.log("+++++++++++++++++");
      io.to(roomId).emit("playerWon", { playerId: room.players[1].playerId });
      room.winner = room.players[1].playerId;
      console.log(
        room.players[1].playerId,
        room.players[0].playerId,
        room.coin,
        "kakakakkakakakakkkkkkkkkkkkkkkkkkkkkkkkkkkk"
      );
      updateRatings(room.players[1], room.players[0], room.coin);
      room = await room.save();
      console.log("bababab");
      room.isLeftPLayer1 = true;
    } else {
      console.log("bbiiiiiiii");

      io.to(roomId).emit("playerWon", { playerId: room.players[0].playerId });
      room.winner = room.players[0].playerId;
      updateRatings(room.players[0], room.players[1], room.coin);
      room = await room.save();
      console.log("afafafafa");
      room.isLeftPLayer2 = true;
    }
    room = await room.save();
    io.to(roomId).emit("roomLeftPlayerId", { playerId: playerId });
    room = await room.save();
    room.players = room.players.filter((player) => {
      return player.playerId != playerId;
    });
    deleteRoom(roomId);




  }
  socket.on("moveList", async (body) => {
    let postion = body.postion;
    // let finalPostion=body.finalPostion
    let roomId = body.roomId;
    // let room=await Room.findById(roomId)
    io.to(roomId).emit("postion", postion);
  });
  socket.on("Abort", async (body) => {
    // console.log("jiiiiiiii")
    let roomId = body.roomId;
    let tournamentId = body.tournamentId;
    let userId = body.userId;
    let roundId = body.roundId;
    console.log(roomId, "ffffff");
    await Room.findByIdAndDelete(roomId);
    console.log(tournamentId, userId, roundId, "jiiiiiiii");
    io.to(roomId).emit("abort", "Draw");
    await ByePointCalculation(tournamentId, userId, roundId);
  });
  socket.on("CheckMate", async (body) => {
    let roomId = body.roomId;
    let playerId = body.playerId;
    let room = await Room.findById(roomId);
    io.to(roomId).emit("playerWon", { playerId: playerId });

    for (let element of room.players) {
      if (element.playerId == playerId) {
        updateRatings(room.players[0], room.players[1], room.coin);
        room.winner = room.players[0].playerId;
        room = await room.save();
        break;
      } else {
        updateRatings(room.players[1], room.players[0], room.coin);
        room.winner = room.players[1].playerId;
        room = await room.save();
        break;
      }
    }

    io.to(roomId).emit("checkMate", true);
    const storeRoomData = await Room.findById(roomId);

    // Store the room document in the Analysis collection
    // await Analysis.create({ analysisData: storeRoomData });

    room.checkMate = true;
    room = await room.save();
    console.log(room.checkMate, "ajajjajaj");

    await deleteRoom(roomId);
  });
  socket.on("send_message", (body) => {
    try {
      let roomId = body.roomId;
      let message = body.message;
      let playerId = body.playerId;

      socket.join(roomId);
      io.to(roomId).emit("receive_message", { message, playerId });
    } catch (error) {
      console.log("send_message_______err", error);
    }
  });
  socket.on("Draw", async (body) => {
    let roomId = body.roomId;
    let playerId = body.playerId;
    let room = await Room.findById(roomId);
    if (room.players[0].playerId == playerId) {
      let socketId = room.players[1].socketID;
      io.to(socketId).emit("DrawMessage", {
        message: "your opponent offers a draw",
      });
    }
    if (room.players[1].playerId == playerId) {
      let socketId = room.players[0].socketID;
      io.to(socketId).emit("DrawMessage", {
        message: "your opponent offers a draw",
      });
    }
  });
  socket.on("DrawStatus", async (body) => {
    let roomId = body.roomId;
    // let playerId=room.playerId
    let DrawStatus = body.DrawStatus;
    let room = await Room.findById(roomId);

    if (DrawStatus == true) {
      room.DrawStatus = true;
      room.winner = "Draw";
      room = await room.save();
      io.to(roomId).emit("DrawStatus", { DrawStatus: true });
      // const storeRoomData = await Room.findById(roomId);
      // Store the room document in the Analysis collection
      // await Analysis.create({ analysisData: storeRoomData });

      deleteRoom(roomId);
    } else {
      room.DrawStatus = false;
      room = await room.save();
      io.to(roomId).emit("DrawStatus", { DrawStatus: false });
    }
  });
  socket.on("getAnalysisBoard", async (body) => {
    let roomId = body.roomId;
    let roomAnalysis = await Analysis.find();

    let playerId = body.playerId;
    let socketId;
    console.log(roomId, playerId, "jjjjjjjjjjjjj");

    for (let element of roomAnalysis) {
      if (element.analysisData[0]._id == roomId) {
        roomAnalysis = element.analysisData[0];
        for (let i = 0; i < element.analysisData[0].players.length; i++) {
          if (element.analysisData[0].players[i].playerId == playerId) {
            socketId = element.analysisData[0].players[i].socketID;
            io.emit("analysisBoard", roomAnalysis);
            break;
          }
        }
      }
    }

    console.log(roomAnalysis, "papapap");
  });
  socket.on("notifications", async (data) => {
    // Expecting 'data' to contain the properties that would normally be in req.body
    const { userId } = data;
    if (!userId) {
      console.log("User ID is not provided");
      return;
    }
    console.log(userId, "fffffff");
    try {
      const notifications = await Challenge.find({ toUserId: userId })
        .sort({ createdAt: -1 })
        .limit(5);
      console.log(notifications);

      io.emit("notifications_msg", notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      io.emit("notifications_error", {
        message: "Error fetching notifications",
      });
    }
  });
  socket.on("sendChallenges", async (req, res) => {
    const { from, to, joinLink } = req.body;
  });
  socket.on("rematch", async (body) => {
    let playerId = body.playerId;
    let roomId = body.roomId;
    console.log(roomId, playerId, "ajajjajaj");
    let room = await Room.findById(roomId);

    if (room.players[0].playerId == playerId) {
      let socketId = room.players[1].socketID;
      io.to(socketId).emit("rematch", true);
    } else {
      let socketId = room.players[0].socketID;
      io.to(socketId).emit("rematch", true);
    }
  });
  socket.on("rematchStatus", async (body) => {
    var randomRoomId = Math.floor(Date.now() / 1000).toString();
    let rematchResponse = body.rematchResponse;
    let roomId = body.roomId;
    let room = await Room.findById(roomId);
    if (rematchResponse == true) {
      io.to(roomId).emit("rematchResponse", randomRoomId);
    } else {
      io.to(roomId).emit("rematchResponse", false);
    }
  });
  socket.on("threefoldCancel", async (body) => {
    let roomId = body.roomId;
    let threefold = body.threefold;
    console.log(threefold, "jjjjjjjjjj");
    let room = await Room.findById(roomId);
    if (threefold == false) {
      io.to(roomId).emit("threefoldCancel", true);
    }
    if (threefold == true) {
      room.DrawStatus = true;
      room = await room.save();
      io.to(roomId).emit("threefoldStatus", { threefoldStatus: true });
      deleteRoom(roomId);
    }
  });
  socket.on("threefoldRequest", async (body) => {
    let roomId = body.roomId;
    let playerId = body.playerId;
    console.log(playerId, "hhhhhhh");
    let room = await Room.findById(roomId);
    if (room.players[0].playerId == playerId) {
      let socketId = room.players[1].socketID;
      io.to(socketId).emit("threefoldRequest", {
        message: "your opponent offers a threeFold Drew",
      });
    }
    if (room.players[1].playerId == playerId) {
      let socketId = room.players[0].socketID;
      io.to(socketId).emit("threefoldRequest", {
        message: "your opponent offers a threeFold Drew",
      });
    }
  });
  socket.on("turnBack", async (body) => {
    let roomId = body.roomId;
    let playerId = body.playerId;
    let room = await Room.findById(roomId);
    room.turnBackPlayer = playerId;
    console.log(
      "++++++++++sbbsbsbsbsbsbbsbsbbsb+++++++++++++",
      roomId,
      playerId
    );
    if (room.players[0].playerId === playerId) {
      room.turnBackPlayerColor = "w";
    } else {
      room.turnBackPlayerColor = "b";
    }
    room = await room.save();
    if (room.players[0].playerId == playerId) {
      let socketId = room.players[1].socketID;
      io.to(socketId).emit("turnBack", true);
    } else {
      let socketId = room.players[0].socketID;
      io.to(socketId).emit("turnBack", true);
    }
    console.log(room.nextplayer, "ttttttttttttttt", room.turnBackPlayer);
  });
  socket.on("turnBackStatus", async (body) => {
    let roomId = body.roomId;
    let turnBack = body.turnBack;
    let playerId = body.playerId;
    let room = await Room.findById(roomId);
    console.log(
      "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww"
    );

    if (room.turnBackPlayer == room.nextplayer) {
      if (playerId != room.nextplayer) {
        if (room.players[0].playerId == room.nextplayer) {
          room.players[0].strikeDone = true;
        } else {
          room.players[1].strikeDone = true;
        }
      }
    } else {
      if (room.players[0].playerId === playerId) {
        room.players[0].strikeDone = true;
      } else if (room.players[1].playerId === playerId) {
        room.players[1].strikeDone = true;
      }
    }
    room = await room.save();
    if (turnBack == true) {
      console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
      io.to(roomId).emit("turnBackStatus", { turnBackStatus: true });
      console.log(room.nextplayer, "ttttttttttttttt", room.turnBackPlayer);
      if (room.nextplayer === room.turnBackPlayer) {
        room.moveList = room.moveList.slice(0, room.moveList.length - 2);
        room.nextplayer = room.turnBackPlayer;
        room.allBoardData = room.allBoardData.slice(
          0,
          room.allBoardData.length - 2
        );

        let data1 = room.allBoardData[room.allBoardData.length - 1];
        console.log(data1, "kakkakakak");
        room = await room.save();
        let socketId1 = room.players[0].socketID;
        let socketId2 = room.players[1].socketID;
        let playerId1 = room.players[0].playerId;
        let playerId2 = room.players[1].playerId;
        let playerColour1 = room.players[0].colour;
        let playerColour2 = room.players[1].colour;
        io.to(socketId1).emit("receive_boardData", {
          playerId: playerId1,
          playerColour: playerColour1,
          data: data1,
        });
        let data2 = data1.newPosition.reverse();
        io.to(socketId2).emit("receive_boardData", {
          playerId: playerId2,
          playerColour: playerColour2,
          data: { newPosition: data2 },
        });

        // room = await room.save()
        io.to(roomId).emit("nextPlayerTurn", {
          playerId: room.nextplayer,
          playerColour: room.nextPlayerColor,
        });
      } else {
        room.nextplayer = room.turnBackPlayer;
        room.nextPlayerColor = room.turnBackPlayerColor;
        console.log(room.nextPlayerColor, "jjjjjjjj");
        room.allBoardData = room.allBoardData.slice(
          0,
          room.allBoardData.length - 1
        );
        let data1 = room.allBoardData[room.allBoardData.length - 1];
        console.log(data1, "lallalalallalal");
        room.moveList = room.moveList.slice(0, room.moveList.length - 1);
        room = await room.save();
        let socketId1 = room.players[0].socketID;
        let socketId2 = room.players[1].socketID;
        let playerId1 = room.players[0].playerId;
        let playerId2 = room.players[1].playerId;
        let playerColour1 = room.players[0].colour;
        let playerColour2 = room.players[1].colour;
        io.to(socketId1).emit("receive_boardData", {
          playerId: playerId1,
          playerColour: playerColour1,
          data: data1,
        });
        let data2 = data1.newPosition.reverse();
        io.to(socketId2).emit("receive_boardData", {
          playerId: playerId2,
          playerColour: playerColour2,
          data: { newPosition: data2 },
        });

        room = await Room.findById(roomId);
        io.to(roomId).emit("nextPlayerTurn", {
          playerId: room.nextplayer,
          playerColour: room.nextPlayerColor,
        });
        console.log("bababababbaab", room.nextplayer, room.nextPlayerColor);
        // room = await room.save()
      }
      io.to(roomId).emit("moveList", room.moveList);
      // io.to(roomId).emit("nextPlayerTurn", { playerId: room.turnBackPlayer, playerColour: room.turnBackPlayerColor })
      // io.to(roomId).emit("allBoardData", room.allBoardData);
      const storeRoomData = await Room.findById(roomId);
      io.to(roomId).emit("allBoardData", storeRoomData);
      room = await Room.findById(roomId);
      console.log(room.moveList, "fffffffffffffffffffff");
      // Function to find all indices of a specific value in an array
      function checkOddPositions(array) {
        for (let i = 1; i < array.length; i++) {
          // Check if the index is odd (1-based odd positions)
          if (i % 2 === 0 && (array[i] === "O-O" || array[i] === "O-O-O")) {
            return true;
          }
        }
        return false;
      }

      function checkevenPositions(array) {
        for (let i = 1; i < array.length; i++) {
          // Check if the index is odd (1-based odd positions)
          if (i % 2 != 0 && (array[i] === "O-O" || array[i] === "O-O-O")) {
            return true;
          }
        }
        return false;
      }

      // Example usage of the function to find occurrences of "O-O"
      const oddPositionStatus = checkOddPositions(room.moveList);
      const evenPositionStatus = checkevenPositions(room.moveList);
      console.log(
        oddPositionStatus,
        evenPositionStatus,
        "jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj"
      );

      if (evenPositionStatus === false) {
        io.to(roomId).emit("castlingStatus", {
          status: "both",
          playerId: room.players[1].playerId,
          playerColour: "b",
        });
      }

      if (oddPositionStatus === true || evenPositionStatus === true) {
        if (oddPositionStatus === true) {
          io.to(roomId).emit("castlingStatus", {
            status: "none",
            playerId: room.players[0].playerId,
            playerColour: "w",
          });
        }

        if (evenPositionStatus === true) {
          io.to(roomId).emit("castlingStatus", {
            status: "none",
            playerId: room.players[1].playerId,
            playerColour: "b",
          });
        }
      } else {
        function whiteRight(array) {
          // Define the valid strings to check for
          const validMoves = ["Ri1", "Rh1", "Rg1"];
          // Check if any of the valid moves are present in the array
          return array.some((item) => validMoves.includes(item));
        }

        function whiteLeft(array) {
          // Define the valid strings to check for
          const validMoves = ["Rb1", "Rc1", "Rd1", "Re1"];
          // Check if any of the valid moves are present in the array
          return array.some((item) => validMoves.includes(item));
        }

        const whiteLeftStatus = whiteRight(room.moveList);
        const whiteRightStatus = whiteLeft(room.moveList);
        console.log(
          whiteLeftStatus,
          whiteRightStatus,
          "ppppppppppppppppppppppppppppppppp"
        );
        if (whiteLeftStatus == true) {
          io.to(roomId).emit("castlingStatus", {
            status: "left",
            playerId: room.players[0].playerId,
            playerColour: "w",
          });
        }
        if (whiteRightStatus == true) {
          io.to(roomId).emit("castlingStatus", {
            status: "right",
            playerId: room.players[0].playerId,
            playerColour: "w",
          });
        }

        if (whiteLeftStatus == false && whiteRightStatus == false) {
          io.to(roomId).emit("castlingStatus", {
            status: "both",
            playerId: room.players[0].playerId,
            playerColour: "w",
          });
        }
        if (whiteLeftStatus == false && whiteRightStatus == true) {
          io.to(roomId).emit("castlingStatus", {
            status: "right",
            playerId: room.players[0].playerId,
            playerColour: "w",
          });
        }
        if (whiteLeftStatus == true && whiteRightStatus == false) {
          io.to(roomId).emit("castlingStatus", {
            status: "left",
            playerId: room.players[0].playerId,
            playerColour: "w",
          });
        }

        function blackLeft(array) {
          // Define the valid strings to check for black left moves
          const validMoves = ["Rc10", "Rb10", "Rd10", "Re10"];
          // Check if any of the valid moves are present in the array
          return array.some((item) => validMoves.includes(item));
        }

        function blackRight(array) {
          // Define the valid strings to check for black right moves
          const validMoves = ["Ri10", "Rh10", "Rg10"];
          // Check if any of the valid moves are present in the array
          return array.some((item) => validMoves.includes(item));
        }

        const blackLeftStatus = blackLeft(room.moveList); // Output: true
        const blackRightStatus = blackRight(room.moveList);

        console.log(
          blackLeftStatus,
          blackRightStatus,
          "tttttttttttttttttttttttttttt"
        );

        if (blackLeftStatus == true) {
          io.to(roomId).emit("castlingStatus", {
            status: "right",
            playerId: room.players[1].playerId,
            playerColour: "b",
          });
        }
        if (blackRightStatus == true) {
          io.to(roomId).emit("castlingStatus", {
            status: "left",
            playerId: room.players[1].playerId,
            playerColour: "b",
          });
        }

        if (blackLeftStatus == false && blackRightStatus == false) {
          io.to(roomId).emit("castlingStatus", {
            status: "both",
            playerId: room.players[1].playerId,
            playerColour: "b",
          });
        }
        if (blackRightStatus == false && blackLeftStatus == true) {
          io.to(roomId).emit("castlingStatus", {
            status: "right",
            playerId: room.players[1].playerId,
            playerColour: "b",
          });
        }
        if (blackRightStatus == true && blackLeftStatus == false) {
          io.to(roomId).emit("castlingStatus", {
            status: "left",
            playerId: room.players[1].playerId,
            playerColour: "b",
          });
        }
      }
      // if (indices.length == 1) {
      //   indices.forEach((index) => {
      //     const isOdd = index % 2 !== 0;
      //     const even = index % 2 == 0;
      //     if (isOdd) {
      //       console.log("111111111oddd");
      //       io.to(roomId).emit("castlingStatus", {
      //         status: "true",
      //         playerId: room.players[1].playerId,
      //         playerColour: "b",
      //       });
      //       io.to(roomId).emit("castlingStatus", {
      //         status: "false",
      //         playerId: room.players[0].playerId,
      //         playerColour: "w",
      //       });
      //     }
      //     if (even) {
      //       console.log("111111111even");
      //       io.to(roomId).emit("castlingStatus", {
      //         status: "true",
      //         playerId: room.players[0].playerId,
      //         playerColour: "w",
      //       });
      //       io.to(roomId).emit("castlingStatus", {
      //         status: "false",
      //         playerId: room.players[1].playerId,
      //         playerColour: "b",
      //       });
      //     }
      //   });
      // }
      // if (indices.length == 2) {
      //   indices.forEach((index) => {
      //     const isOdd = index % 2 !== 0;
      //     if (isOdd) {
      //       console.log("22222222222");
      //       io.to(roomId).emit("castlingStatus", {
      //         status: "true",
      //         playerId: room.players[1].playerId,
      //         playerColour: "b",
      //       });
      //     } else {
      //       io.to(roomId).emit("castlingStatus", {
      //         status: "true",
      //         playerId: room.players[0].playerId,
      //         playerColour: "w",
      //       });
      //     }
      //   });
      // }
      // if (indices.length == 0) {
      //   console.log("000000000");
      //   io.to(roomId).emit("castlingStatus", {
      //     status: "false",
      //     playerId: room.players[0].playerId,
      //     playerColour: "w",
      //   });
      //   io.to(roomId).emit("castlingStatus", {
      //     status: "false",
      //     playerId: room.players[1].playerId,
      //     playerColour: "b",
      //   });
      // }
      // Emitting status based on the indices of "O-O"
    } else {
      console.log("++++++++++++++else mai ghus gayaaa++++++++++++");
      io.to(roomId).emit("turnBackStatus", { turnBackStatus: false });
      io.to(roomId).emit("nextPlayerTurn", {
        playerId: room.nextplayer,
        playerColour: room.nextPlayerColor,
      });
    }
  });

  socket.on("castling", async (body) => {
    const roomId = body.roomId;
    const playerId = body.playerId;
    const playerColour = body.playerColour;
    const castlingDirection = body.castlingDirection;
    let room = await Room.findById(roomId);
    console.log(roomId, playerId, playerColour, "jiiiiii");
    // if (playerId == room.players[0].playerId) {
    //   if (castlingDirection == "right") {
    //     room.players[0].castlingRight = "done";
    //   }
    //   if (castlingDirection == "left") {
    //     room.players[0].castlingLeft = "done";
    //   }
    //   if (castlingDirection == "both") {
    //     room.players[0].castlingLeft = "notDone";
    //     room.players[0].castlingRight = "notDone";
    //   }
    //   if (castlingDirection == "none") {
    //     room.players[0].castlingLeft = "Done";
    //     room.players[0].castlingRight = "Done";
    //   }
    // }

    // if (playerId == room.players[1].playerId) {
    //   if (castlingDirection == "right") {
    //     room.players[1].castlingRight = "done";
    //   }
    //   if (castlingDirection == "left") {
    //     room.players[1].castlingLeft = "done";
    //   }

    //   if (castlingDirection == "both") {
    //     room.players[1].castlingLeft = "notDone";
    //     room.players[1].castlingRight = "notDone";
    //   }
    //   if (castlingDirection == "none") {
    //     room.players[1].castlingLeft = "Done";
    //     room.players[1].castlingRight = "Done";
    //   }
    // }

    room = await room.save();

    io.to(roomId).emit("castlingStatus", {
      status: castlingDirection,
      playerId: playerId,
      playerColour: playerColour,
    });
  });
});
app.get("/flag/:countryName", async (req, res) => {
  const countryName = req.params.countryName;
  console.log(countryName);
  try {
    const response = await axios.get(
      `https://restcountries.com/v3.1/name/${countryName}`
    );
    console.log(response.data[0].flags.svg, "vvvv");
    if (response.data && response.data.length > 0) {
      const countryData = response.data[0].flags.svg;
      res.send(`<img src="${countryData}" alt="Flag of ${countryName}" />`); // Returns the URL of the SVG flag
    } else {
      throw new Error("Country not found");
    }
  } catch (error) {
    console.error("Error fetching country data:", error);
    throw error;
  }
});
//   server connection
server.listen(APP_PORT, () => {
  console.log("Server is running on port", DB_URL);
  console.log(`Server is running on port ${APP_PORT}`);
  console.log(`Server is running on port ${DB_URL}`);

});
//   databse connection

// mongoose
//   .connect(DB_URL, {})
//   .then(() => {
//     console.log("DB connected...");
//   })
//   .catch((err) => {
//     console.error("DB connection error:", err);
//   });
//anup code
//const dbConnect=()=>{
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(console.log('Db Connect'))
  .catch((err) => {

    console.log('Db connection Issue')
    console.log(err)
    process.exit(1)

  })
//}
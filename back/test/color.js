

const express = require("express");
const mongoose = require('mongoose');
const app = express();
const dotenv = require("dotenv");
dotenv.config();
connectDB = require("./config/db");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());
const { MONGO_URI } = process.env;
const db = connectDB();
const server = http.createServer(app);
app.use(express.json);
var io = require("socket.io")(server);
var colorPrediction = require("./model/room");
const room = require("./model/room");
// const { CLIENT_RENEG_LIMIT } = require("tls");


// sleep function
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function deleteRoom(thisRoomId) {
    await sleep(10000);

    let thisRoom = await colorPrediction.findById(thisRoomId);
    if (thisRoom == null) {
        return;
    }
    if (thisRoom.players == null || thisRoom.players.length == 0) {
        thisRoom = await colorPrediction.findByIdAndDelete(thisRoomId);
        return true;
    }
    return false;
}

io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("joinRoom", async (body) => {
        try {
            var playerId = body.playerId;
            var name = body.name;
            var totalCoin = body.totalCoin;
            var profileImageUrl = body.profileImageUrl;
            var playerStatus = body.playerStatus;

            var all = await colorPrediction.find();
            var roomId = " ";

            all.every(element => {
                if (element.isJoin == true) {
                    roomId = element._id.toString();
                    return false;
                }
                return true;
            });

            if (roomId == " ") {
                //CREATES A NEW ROOM IF NO EMPTY ROOM IS FOUND

                console.log(`${name}`);

                let roomJJ = new colorPrediction();

                let player = {
                    socketID: socket.id,
                    playerId: playerId,
                    name: name,
                    playerType: 'Real Player',
                    totalCoin: totalCoin,
                    profileImageUrl: profileImageUrl,
                    playerStatus: playerStatus
                };

                roomJJ.players.push(player);



                var roomId = roomJJ._id.toString();

                socket.join(roomId);

                socket.emit('createRoomSuccess', roomJJ);
                roomJJ.isJoin = false
                roomJJ = await roomJJ.save();
                io.to(roomId).emit("startGame", true)

                // await sleep(2000)
                // eventEmitter.emit("start", { roomId: roomId })
                console.log(roomJJ)
            }
            else {

                //JOINS A ROOM WHICH IS NOT FULL
                roomJJ = await colorPrediction.findById(roomId);

                if (roomJJ.isJoin) {
                    let player = {
                        socketID: socket.id,
                        playerId: playerId,
                        name: name,
                        playerType: 'Real Player',
                        totalCoin: totalCoin,
                        profileImageUrl: profileImageUrl,
                        playerStatus: playerStatus
                    };

                    var players = roomJJ.players;

                    let flagging = 0;
                    let index = 0;

                    players.every(element => {
                        if (element.playerId == playerId) {
                            // players.filter((element) => {
                            //     return element.playerId != playerId
                            // })
                            // players.remove(element);
                            flagging++;
                            return false;
                        }
                        index++;
                        return true;
                    });

                    if (flagging == 0) {
                        roomJJ.players.push(player);
                    }
                    else {
                        roomJJ.players[index] = player;
                    }

                    socket.join(roomId);



                    roomJJ = await roomJJ.save();

                    io.to(roomId).emit('updatedPlayers', roomJJ.players);
                    socket.emit('updatedPlayer', player);
                    io.to(roomId).emit('updatedRoom', roomJJ);
                    io.to(roomId).emit('roomMessage', `${name} has joined the room.`);

                }
                else {
                    socket.emit('errorOccured', 'Sorry! The Room is full. Please try again.');
                    return;
                }
            }

        } catch (error) {
            console.log(error)
        }



    })


    socket.on("start", async (body) => {
        try {
            console.log("game started")
            var roomId = body.roomId;
            var roomJJ = await colorPrediction.findById(roomId)
            socket.join(roomId)
            // var mediumCounter = 0
            do {

                io.to(roomId).emit('roomMessage', "Betting Time Starts. Place your bets now.");

             io.to(roomId).emit("GameId",roomJJ.gameId)
                for (var i = 0; i < 27; i++) {
                    io.to(roomId).emit('timer', (30 - i).toString());
                    await sleep(1000);
                    var roomJJ = await colorPrediction.findById(roomId)
                    if (roomJJ === null) {
                        break
                    }
                }


                roomJJ = await colorPrediction.findById(roomId)
                if (roomJJ == null) {
                    return;
                }
                io.to(roomId).emit('roomData', roomJJ);
                io.to(roomId).emit('timer', '3');
                await sleep(1000);
                io.to(roomId).emit('timer', '2');
                await sleep(1000);
                io.to(roomId).emit('timer', '1');
                await sleep(1000);
                io.to(roomId).emit('timer', '0');
                io.to(roomId).emit('roomMessage', "Betting Time Stops. Now the winner is being decided.");
                io.to(roomId).emit('betting', false);
                roomJJ = await colorPrediction.findById(roomId)
                roomJJ.cancelBet = true
roomJJ.gameId=roomJJ.gameId+1
                roomJJ = await roomJJ.save()
                await sleep(2000)
                roomJJ = await colorPrediction.findById(roomId)

                if (roomJJ.players[0].mode != "violet") {
                    if (roomJJ.redSum != 0 && roomJJ.greenSum != 0) {
                        console.log("kiiiiiiiiiiiiiiiiiiiiii")
                        roomJJ = await colorPrediction.findById(roomId)



                        var indicesToSumGreen = [0, 4, 6, 8, 10, 12];
                        var indicesToFindMinGren = [4, 6, 8, 10, 12];

                        var sumRed = 0;
                        var sumGreen = 0;
                        var minValueGreen = roomJJ.players[0].cardSetValue[indicesToFindMinGren[0]] ? roomJJ.players[0].cardSetValue[indicesToFindMinGren[0]].value : undefined;
                        var minIndexGreen = indicesToFindMinGren[0];

                        for (var i = 0; i < indicesToSumGreen.length; i++) {
                            if (roomJJ.players[0].cardSetValue[indicesToSumGreen[i]]) {
                                sumGreen += roomJJ.players[0].cardSetValue[indicesToSumGreen[i]].value;
                            }

                            if (roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]] && roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]].value < minValueGreen) {
                                minValueGreen = roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]].value;
                                minIndexGreen = indicesToFindMinGren[i];
                            }
                        }

                        console.log("Sum of values at specified indicesGreen:", roomJJ.greenSum);
                        console.log("Minimum value at specified indicesGreen:", minValueGreen);
                        console.log("Index of the minimum valueGreen:", minIndexGreen);


                        var indicesToSumRed = [2, 3, 5, 7, 9, 11];
                        var indicesToFindMinRed = [3, 5, 7, 9, 11];


                        var minValueRed = roomJJ.players[0].cardSetValue[indicesToFindMinRed[0]] ? roomJJ.players[0].cardSetValue[indicesToFindMinRed[0]].value : undefined;
                        var minIndexRed = indicesToFindMinRed[0];

                        for (var i = 0; i < indicesToSumRed.length; i++) {
                            if (roomJJ.players[0].cardSetValue[indicesToSumRed[i]]) {
                                sumRed += roomJJ.players[0].cardSetValue[indicesToSumRed[i]].value;
                            }

                            if (roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]] && roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]].value < minValueRed) {
                                minValueRed = roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]].value;
                                minIndexRed = indicesToFindMinRed[i];
                            }
                        }

                        console.log("Sum of values at specified indicesRed:", roomJJ.redSum);
                        console.log("Minimum value at specified indicesRed:", minValueRed);
                        console.log("Index of the minimum valueRed:", minIndexRed);

                        if (sumRed > sumGreen) {
                            console.log(minIndexGreen, "++++++++++hiiiiiiiiiii++++++++++")
                            console.log(roomJJ.players[0].cardSetValue[minIndexGreen].card, "+++++++++++card mil gya+++++++++++")
                            io.to(roomId).emit("slot", roomJJ.players[0].cardSetValue[minIndexGreen].card)
                        } else {
                            console.log(minIndexRed, "++++++++++hiiiiiiiiiii++++++++++")
                            console.log(roomJJ.players[0].cardSetValue[minIndexRed].card, "+++++++++++card mil gya+++++++++++")
                            io.to(roomId).emit("slot", roomJJ.players[0].cardSetValue[minIndexRed].card)

                        }
                    } else if (roomJJ.redSum == 0 && roomJJ.greenSum != 0) {
                        roomJJ = await colorPrediction.findById(roomId)



                        var indicesToSumGreen = [0, 4, 6, 8, 10, 12];
                        var indicesToFindMinGren = [4, 6, 8, 10, 12];


                        var sumGreen = 0;
                        var minValueGreen = roomJJ.players[0].cardSetValue[indicesToFindMinGren[0]] ? roomJJ.players[0].cardSetValue[indicesToFindMinGren[0]].value : undefined;
                        var minIndexGreen = indicesToFindMinGren[0];

                        for (var i = 0; i < indicesToSumGreen.length; i++) {
                            if (roomJJ.players[0].cardSetValue[indicesToSumGreen[i]]) {
                                sumGreen += roomJJ.players[0].cardSetValue[indicesToSumGreen[i]].value;
                            }

                            if (roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]] && roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]].value < minValueGreen) {
                                minValueGreen = roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]].value;
                                minIndexGreen = indicesToFindMinGren[i];
                            }
                        }

                        console.log("Sum of values at specified indicesGreen:", roomJJ.greenSum);
                        console.log("Minimum value at specified indicesGreen:", minValueGreen);
                        console.log("Index of the minimum valueGreen:", minIndexGreen);
                        console.log(minIndexGreen, "++++++++++hiiiiiiiiiii++++++++++")
                        console.log(roomJJ.players[0].cardSetValue[minIndexGreen].card, "+++++++++++card mil gya+++++++++++")
                        io.to(roomId).emit("slot", roomJJ.players[0].cardSetValue[minIndexGreen].card)
                    } else {
                        var indicesToSumRed = [2, 3, 5, 7, 9, 11];
                        var indicesToFindMinRed = [3, 5, 7, 9, 11];


                        var minValueRed = roomJJ.players[0].cardSetValue[indicesToFindMinRed[0]] ? roomJJ.players[0].cardSetValue[indicesToFindMinRed[0]].value : undefined;
                        var minIndexRed = indicesToFindMinRed[0];

                        for (var i = 0; i < indicesToSumRed.length; i++) {
                            if (roomJJ.players[0].cardSetValue[indicesToSumRed[i]]) {
                                sumRed += roomJJ.players[0].cardSetValue[indicesToSumRed[i]].value;
                            }

                            if (roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]] && roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]].value < minValueRed) {
                                minValueRed = roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]].value;
                                minIndexRed = indicesToFindMinRed[i];
                            }
                        }

                        console.log("Sum of values at specified indicesRed:", roomJJ.redSum);
                        console.log("Minimum value at specified indicesRed:", minValueRed);
                        console.log("Index of the minimum valueRed:", minIndexRed);
                        console.log(minIndexRed, "++++++++++hiiiiiiiiiii++++++++++")
                        console.log(roomJJ.players[0].cardSetValue[minIndexRed].card, "+++++++++++card mil gya+++++++++++")
                        io.to(roomId).emit("slot", roomJJ.players[0].cardSetValue[minIndexRed].card)
                    }


                } else {

                    var index1 = 3;
                    var index2 = 8;

                    var value1 = roomJJ.players[0].cardSetValue[index1].value;
                    var value2 = roomJJ.players[0].cardSetValue[index2].value;

                    var minValueValue, minIndexValue;

                    if (value1 === 0 && value2 === 0) {
                        var randomIndex = Math.random() < 0.5 ? index1 : index2;
                        minValueValue = roomJJ.players[0].cardSetValue[randomIndex].value;
                        minIndexValue = randomIndex;
                        console.log("Both values are zero. Random index chosen:", randomIndex);
                    } else {
                        if (value1 <= value2) {
                            minValueValue = value1;
                            minIndexValue = index1;
                        } else {
                            minValueValue = value2;
                            minIndexValue = index2;
                        }
                        console.log("Minimum value between index", index1, "and", index2, ":", minValueValue);
                        console.log("Index of the minimum value:", minIndexValue);
                        io.to(roomId).emit("slot", roomJJ.players[0].cardSetValue[minIndexValue].card)
                    }


                }


                roomJJ.totalBetSum = 0;
                roomJJ.mode = "none"
                roomJJ.players[0].betSum = 0
                roomJJ = await roomJJ.save()


                roomJJ.players[0].cardSetValue = []

                const cardValue = [{ "card": 11, "value": 0 }, { "card": 12, "value": 0 }, { "card": 13, "value": 0 }, { "card": 21, "value": 0 }, { "card": 22, "value": 0 }, { "card": 23, "value": 0 }, { "card": 24, "value": 0 }, { "card": 25, "value": 0 }, { "card": 31, "value": 0 }, { "card": 32, "value": 0 }, { "card": 33, "value": 0 }, { "card": 34, "value": 0 }, { "card": 35, "value": 0 }]
                roomJJ.players[0].cardSetValue = cardValue

                roomJJ = await roomJJ.save()

                console.log("Room Deleted")
                io.to(roomId).emit('roomMessage', "New Game Starting.");
                roomJJ = await roomJJ.save()
                await sleep(18000)
                roomJJ = await colorPrediction.findById(roomId)

            } while (roomJJ != null);



        } catch (error) {
            console.log(error)
        }
    })


    socket.on("bet", async (body) => {
        try {
            const { roomId, playerId, cardValueSet } = body;

            var roomJJ = await colorPrediction.findById(roomId);
            if (!roomJJ) {
                socket.emit('errorOccured', 'Wrong Room Id.');
                // Handle case where room is not found
                return;
            }
            // var player
            // var index = 0
            // for (let element of roomJJ.players) {
            //     if (element.playerId === playerId) {
            //         break;
            //     }
            //     index++;
            // }

            roomJJ.players[0].cardSetValue = []
            roomJJ.players[0].cardSetValue = cardValueSet

            var indicesToSumGreen = [0, 4, 6, 8, 10, 12];
            var indicesToFindMinGren = [4, 6, 8, 10, 12];

            var sumRed = 0;
            var sumGreen = 0;
            var minValueGreen = roomJJ.players[0].cardSetValue[indicesToFindMinGren[0]] ? roomJJ.players[0].cardSetValue[indicesToFindMinGren[0]].value : undefined;
            var minIndexGreen = indicesToFindMinGren[0];

            for (var i = 0; i < indicesToSumGreen.length; i++) {
                if (roomJJ.players[0].cardSetValue[indicesToSumGreen[i]]) {
                    sumGreen += roomJJ.players[0].cardSetValue[indicesToSumGreen[i]].value;
                }

                if (roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]] && roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]].value < minValueGreen) {
                    minValueGreen = roomJJ.players[0].cardSetValue[indicesToFindMinGren[i]].value;
                    minIndexGreen = indicesToFindMinGren[i];
                }
            }

            var indicesToSumRed = [2, 3, 5, 7, 9, 11];
            var indicesToFindMinRed = [3, 5, 7, 9, 11];


            var minValueRed = roomJJ.players[0].cardSetValue[indicesToFindMinRed[0]] ? roomJJ.players[0].cardSetValue[indicesToFindMinRed[0]].value : undefined;
            var minIndexRed = indicesToFindMinRed[0];

            for (var i = 0; i < indicesToSumRed.length; i++) {
                if (roomJJ.players[0].cardSetValue[indicesToSumRed[i]]) {
                    sumRed += roomJJ.players[0].cardSetValue[indicesToSumRed[i]].value;
                }

                if (roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]] && roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]].value < minValueRed) {
                    minValueRed = roomJJ.players[0].cardSetValue[indicesToFindMinRed[i]].value;
                    minIndexRed = indicesToFindMinRed[i];
                }
            }

            roomJJ.redSum = sumRed
            roomJJ.greenSum = sumGreen
            console.log(roomJJ.redSum, "++++++red+++++++")
            console.log(roomJJ.greenSum, "++++++Greeeeeeeen+++++++")

            roomJJ = await roomJJ.save()



            io.to(roomId).emit("betInfo", { playerId: playerId, cardValueSet: cardValueSet, redSum: sumRed, greenSum: sumGreen })
            // console.log(roomJJ.players, "++++++++++++++bet value+++++++++++++++++++++")





            let totalBetValue = 0; // Initialize totalBetSum variable


            for (let item of cardValueSet) {
                totalBetValue += item.value
            }
            roomJJ.players[0].betSum = totalBetValue

            roomJJ = await roomJJ.save()
            console.log("Sum of values:", roomJJ.players[0].betSum)

            roomJJ = await roomJJ.save();



            io.to(roomId).emit("roomData", roomJJ);
        } catch (error) {
            console.log(error);
        }
    });


    socket.on("setMode", async (body) => {
        try {
            var roomId = body.roomId;
            var playerId = body.playerId
            var roomJJ = await colorPrediction.findById(roomId)

            var mode = body.mode


            if (roomJJ == null) {
                socket.emit('errorOccured', 'Wrong Room Id.');
                return;
            }
            roomJJ.players[0].mode = mode

            console.log("===================>>>>>.", body)
            roomJJ = await roomJJ.save()
            io.to(roomId).emit("mode", { mode: mode, playerId: playerId })
        } catch (error) {
            console.log(error)
        }
    })

    socket.on("leave", async (body) => {
        try {
            var roomId = body.roomId;
            var playerId = body.playerId;
            var roomJJ = await colorPrediction.findById(roomId)
            await colorPrediction.findByIdAndDelete(roomId);

            // roomJJ.players = roomJJ.players.filter((item) => {
            //     return item.playerId != playerId
            // })
            // roomJJ = await roomJJ.save()


        } catch (error) {
            console.log(error)
        }
    })

    // socket.on("cancelBet", async (body) => {


    //     try {
    //         var roomId = body.roomId;
    //         var roomJJ = await colorPrediction.findById(roomId)
    //         const cardValue = [

    //             {
    //                 card: 11,
    //                 value: 0
    //             },
    //             {
    //                 card: 12,
    //                 value: 0
    //             },
    //             {
    //                 card: 13,
    //                 value: 0,
    //             },
    //             {
    //                 card: 14,
    //                 value: 0
    //             },
    //             {
    //                 card: 21,
    //                 value: 0,
    //             },
    //             {
    //                 card: 22,
    //                 value: 0,
    //             },
    //             {
    //                 card: 23,
    //                 value: 0,
    //             },
    //             {
    //                 card: 24,
    //                 value: 0,
    //             },
    //             {
    //                 card: 31,
    //                 value: 0,
    //             },
    //             {
    //                 card: 32,
    //                 value: 0,
    //             },
    //             {
    //                 card: 33,
    //                 value: 0,
    //             },
    //             {
    //                 card: 34,
    //                 value: 0,
    //             }
    //         ]
    //         roomJJ.players[0].cardSetValue = cardValue
    //         roomJJ = await roomJJ.save()
    //     } catch (error) {
    //         console.log(error)
    //     }

    // })

    // socket.on("clearAll", async (body) => {
    //     try {
    //         await colorPrediction.deleteMany({});
    //     } catch (e) {
    //         console.log(e);
    //     }
    // });

    socket.on("disconnect", async () => {
        try {
            var Socket = socket.id
            var allInOne = await colorPrediction.find()
            console.log("hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii")
            console.log(allInOne)
            for (let element of allInOne) {
                if (element.players[0].socketID === Socket.toString()) {
                    let roomId = element._id.toString()
                    console.log(roomId, "==========>aaagyaaaaaaaaaa roomId=============>")
                    await colorPrediction.findByIdAndDelete(roomId)
                }
            }


        } catch (error) {
            console.log(error)
        }
    })

})


server.listen(process.env.PORT, () => {
    console.log("SERVER RUNNING");
});

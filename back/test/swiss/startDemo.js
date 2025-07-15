

const cron = require("node-cron");
// This function is presumably defined elsewhere to handle starting the tournament
async function start(tournamentId, noOfRounds, delayTime) {
    console.log(`Starting tournament ${tournamentId} with ${noOfRounds} rounds and a delay of ${delayTime} minutes.`);
    // Additional logic to start the tournament
    return tournamentId;
  }
  
const data= [
        {
            "_id": "66d7f076fa8df817c150c9a3",
            "tournamentName": "abc",
            "status": "pending",
            "players": [],
            "rounds": [],
            "noOfRounds": 1,
            "upComingRound": 1,
            "noOfplayers": 2,
            "createdBy": "66bf1550696db144d5e49d58",
            "entryFees": "1",
            "time": "11:09",
            "topThreePlayer": [],
            "startDate": "2024-09-04",
            "JoinedPlayerList": [],
            "tournamentIsJoin": false,
            "gameTimeDuration": "60",
            "delayTime": 1
        },
        {
            "_id": "66d7f093fa8df817c150c9c4",
            "tournamentName": "abc2",
            "status": "pending",
            "players": [],
            "rounds": [],
            "noOfRounds": 1,
            "upComingRound": 1,
            "noOfplayers": 2,
            "createdBy": "66bf1550696db144d5e49d58",
            "entryFees": "12",
            "time": "11:09",
            "topThreePlayer": [],
            "startDate": "2024-09-04",
            "JoinedPlayerList": [],
            "tournamentIsJoin": false,
            "gameTimeDuration": "60",
            "delayTime": 1
        }
    ]
  

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
              await start(tournamentToStart._id, tournamentToStart.noOfRounds, tournamentToStart.delayTime);
            } else {
              console.log("No tournaments are scheduled to start at this time.");
            }
          } catch (error) {
            console.error("Error finding tournaments to start:", error);
          }



      })

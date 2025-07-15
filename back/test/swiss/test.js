// Function to find all indices of a specific value in an array
function findOccurrences(array, value) {
    const occurrences = [];
    array.forEach((element, index) => {
        if (element === value) {
            occurrences.push(index);
        }
    });
    return occurrences;
}

// Using the function to find occurrences of "0-0"
const indices = findOccurrences(room.moveList, "0-0");
console.log("Occurrences of '0-0':", indices.length);

if(indices.length>0){
    for(let element of moveList){
       if(element=="0-0"){
           if(moveList.indexOf("0-0")==odd){
               io.to(roomId).emit("castingStatus",{status:"false",payerId:room.players[1].playerId,playerColour:"b"})
           }
           if(moveList.indexOf("0-0")==even){
               io.to(roomId).emit("castingStatus",{status:"false",payerId:room.players[0].playerId,playerColour:"w"})
           }
       }
    }
}

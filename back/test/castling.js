function checkOddPositions(array) {
    for (let i = 0; i < array.length; i++) {
        // Check if the index is odd (1-based odd positions)
        if (i % 2 === 0 && (array[i] === "O-O" || array[i] === "O-O-O")) {
            return true;
        }
    }
    return false;
}

function checkevenPositions(array) {
    for (let i = 0; i < array.length; i++) {
        // Check if the index is odd (1-based odd positions)
        if (i % 2 === 0 && (array[i] === "O-O" || array[i] === "O-O-O")) {
            return true;
        }
    }
    return false;
}

// Example usage
let array = ["r1h", "rj1", "pq1", "Ri1", "ih", "pj", "O-O", "ig", "O-O-O"];

console.log(checkOddPositions(array)); // Output: true
console.log(checkevenPositions(array)); // Output: true

function whiteRight(array) {
    // Define the valid strings to check for
    const validMoves = ["Ri1", "Rh1", "Rg1"];
    // Check if any of the valid moves are present in the array
    return array.some(item => validMoves.includes(item));
}



// Example usage
let array1 = ["r1h", "rj1", "pq1", "Ri1", "ih", "pj", "O-O", "ig", "O-O-O"];
console.log(whiteRight(array1)); // Output: true


function whiteLeft(array) {
    // Define the valid strings to check for
    const validMoves = ["Rb1", "Rc1", "Rd1", "Re1"];
    // Check if any of the valid moves are present in the array
    return array.some(item => validMoves.includes(item));
}

// Example usage
let array2 = ["r1h", "rj1", "pq1", "Ri1", "ih", "pj", "O-O", "ig", "O-O-O"];
console.log(whiteLeft(array2)); // Output: true

function blackLeft(array) {
    // Define the valid strings to check for black left moves
    const validMoves = ["Rc10", "Rb10", "Rd10", "Re10"];
    // Check if any of the valid moves are present in the array
    return array.some(item => validMoves.includes(item));
}

function blackRight(array) {
    // Define the valid strings to check for black right moves
    const validMoves = ["Ri10", "Rh10", "Rg10"];
    // Check if any of the valid moves are present in the array
    return array.some(item => validMoves.includes(item));
}

// Example usage
let array3 = ["r1h", "rj1", "pq1", "Rc10", "ih", "pj", "O-O", "ig", "O-O-O"];
let array4 = ["r1h", "rj1", "pq1", "Ri10", "ih", "pj", "O-O", "ig", "O-O-O"];

console.log(blackLeft(array3)); // Output: true
console.log(blackRight(array4)); // Output: true




// "Ri1"  "Rh1"  "Rg1"

// "Rb1" "Rc1" "Rd1" "Re1"

// "Rc10" "Rb10" "Rd10" "Re10"
// "Ri10" "Rh10" "Rg10"


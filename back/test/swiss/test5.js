const sleep = (time) => {
    return new Promise(resolve => setTimeout(resolve, time));
}

let x = false;

async function loop() {
    for (let i = 0; i < 10; i++) {
        await sleep(1000);
        console.log(i);
        if (i == 5) {
            x = false;
            // Check if x is true and clear the timeout if it is
            if (x) {
                clearTimeout(timeoutId);
                immediateAction();  // Perform the action immediately
            }
            
        }
    }
}

// Function to be executed immediately when x becomes true
function immediateAction() {
    console.log('setTimeout 1');
}

// Set the timeout and store its ID
const timeoutId = setTimeout(() => {
    console.log('This message will not show if cleared before 10 seconds');
}, 10000);
console.log("jjjjj")

loop();

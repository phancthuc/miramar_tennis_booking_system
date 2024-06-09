// const sqlite3 = require('sqlite3').verbose();
// let sql;
// const db = new sqlite3.Database('./tennis_courts.db', sqlite3.OPEN_READWRITE, (err)=>{
//     if(err) return console.error(err.message);

// });

// sql = `CREATE TABLE bookings(id INTEGER PRIMARY KEY, name, check_in_time, check_out_time)`;
// db.run(sql);

var mykey = config.MY_KEY;

const firebaseConfig = {
    apiKey: mykey,
    authDomain: "tennis-court-bookings-8adc0.firebaseapp.com",
    databaseURL: "https://tennis-court-bookings-8adc0-default-rtdb.firebaseio.com",
    projectId: "tennis-court-bookings-8adc0",
    storageBucket: "tennis-court-bookings-8adc0.appspot.com",
    messagingSenderId: "203093046076",
    appId: "1:203093046076:web:f6d82739480e8f0eac2439",
    measurementId: "G-DPJXRJ3XKK"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the Firestore service
const db = firebase.firestore();

// Now you can perform Firestore operations using `db`
// db.collection("testCollection").add({
//     testField: "testValue"
// })
// .then((docRef) => {
//     console.log("Document written with ID: ", docRef.id);
// })
// .catch((error) => {
//     console.error("Error adding document: ", error);
// });
let bookings = [];
let courtStatus = new Array(8).fill("Available");

// Function to initialize court status table

function initializeStatusTable() {
    let statusTable = document.getElementById("statusTable");
    let statusRows = "";
    for (let i = 0; i < courtStatus.length; i++) {
        statusRows += `<tr><td>${i + 1}</td><td>${courtStatus[i]}</td><td id="elapsedTime-${i + 1}">0 mins</td></tr>`;
    }
    statusTable.innerHTML = `<tr><th>Court Number</th><th>Status</th><th>Elapsed Time</th></tr>` + statusRows;
}
function populateBookingsTable() {
    let bookingTable = document.getElementById("bookingTable");
    bookingTable.innerHTML = ""; // Clear existing table content
    
    // Add table headers
    bookingTable.innerHTML = `<tr><th>Check-in Date</th><th>Name</th><th>Court Number</th><th>Check-in Time</th><th>Check-out Time</th><th>Total Time</th><th>Action</th></tr>`;
    
    // Fetch bookings data from Firestore and populate the table
    db.collection("bookings").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            let booking = doc.data();
            let checkInTime = new Date(booking.checkInTime).toLocaleTimeString(); // Format check-in time
            let row = `<tr><td>${booking.checkInDate}</td><td>${booking.name}</td><td>${booking.courtNumber}</td><td>${checkInTime}</td><td id="checkout-${doc.id}"></td><td id="totalTime-${doc.id}"></td><td><button onclick="checkOut('${doc.id}', ${booking.courtNumber}, '${booking.name}')">Check Out</button></td></tr>`;
            bookingTable.innerHTML += row;
        });
    }).catch((error) => {
        console.error("Error getting bookings: ", error);
    });
}

// Function to start timer for a court
function startTimer(courtNumber) {
    let startTime = new Date().getTime();

    // Update elapsed time every second
    let timerInterval = setInterval(() => {
        let currentTime = new Date().getTime();
        let elapsedTime = Math.floor((currentTime - startTime) / 1000 / 60); // Elapsed time in minutes
        updateElapsedTime(courtNumber, elapsedTime);
    }, 1000);

    return timerInterval;
}



window.onload = function() {
    // Get the "Check In" button element
    const checkInButton = document.getElementById("checkInButton");

    initializeStatusTable();

    // Add an event listener to the "Check In" button
    checkInButton.addEventListener("click", checkIn);
};

function checkIn() {
    // Retrieve input values
    let name = document.getElementById("name").value;
    let courtNumber = parseInt(document.getElementById("courtNumber").value);

    // Get current date and time
    let checkInTime = new Date().toISOString();
    let checkInDate = new Date().toLocaleDateString();

    // Check court status in the database
    db.collection("bookings")
        .where("courtNumber", "==", courtNumber)
        .where("status", "==", "Occupied")
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                // Court is available, proceed with check-in
                let bookingData = {
                    name: name,
                    courtNumber: courtNumber,
                    checkInTime: checkInTime,
                    checkInDate: checkInDate,
                    checkOutTime: "", // Initialize check-out time as empty
                    status: "Occupied" // Set status to "Occupied"
                };

                // Write data to Firestore
                db.collection("bookings").add(bookingData)
                    .then((docRef) => {
                        console.log("Document written with ID: ", docRef.id);

                        // Update court status array to reflect court is occupied
                        courtStatus[courtNumber - 1] = "Occupied";

                        // Update court status table
                        updateCourtStatus();

                        // Populate bookings table
                        populateBookingsTable();

                        // Reset the form
                        document.getElementById("bookingForm").reset();
                    })
                    .catch((error) => {
                        console.error("Error adding document: ", error);
                    });
            } else {
                // Court is occupied, show an alert
                alert("Court " + courtNumber + " is already occupied.");
            }
        })
        .catch((error) => {
            console.error("Error checking court status: ", error);
        });
}


function checkOut(bookingId, courtNumber, name, timerInterval) {
    // Find the index of the booking
    let index = bookings.findIndex(booking => booking.id === bookingId);
    if (index !== -1) {
        let checkOutTime = new Date().toISOString(); // Use toISOString() to get standard format
        console.log("Check-out time:", checkOutTime); // Log check-out time
        console.log("Check-in time:", bookings[index].checkInTime); // Log check-out time

        courtStatus[courtNumber - 1] = "Available";
        bookings[index].checkOutTime = checkOutTime;
        document.getElementById(`checkout-${bookingId}`).textContent = new Date(checkOutTime).toLocaleTimeString(); // Display local time in HTML
        let statusRow = document.getElementById(`statusRow-${courtNumber}`);
        if (statusRow) {
            statusRow.cells[1].textContent = "Available";
            updateElapsedTime(courtNumber, 0); // Reset elapsed time
        }
        clearInterval(timerInterval); // Stop timer

        // Calculate total time
        let totalTime = calculateTotalTime(bookings[index].checkInTime, checkOutTime);
        if (totalTime !== null) { // Ensure totalTime is not null
            document.getElementById(`totalTime-${bookingId}`).textContent = totalTime + " mins";
        } else {
            document.getElementById(`totalTime-${bookingId}`).textContent = "N/A";
        }
    } else {
        alert("Booking not found.");
    }
}
// Function to update court status table
function updateCourtStatus() {
    let statusTable = document.getElementById("statusTable");
    let statusRows = "";
    for (let i = 0; i < courtStatus.length; i++) {
        statusRows += `<tr><td>${i + 1}</td><td>${courtStatus[i]}</td><td id="elapsedTime-${i + 1}">0 mins</td></tr>`;
    }
    statusTable.innerHTML = `<tr><th>Court Number</th><th>Status</th><th>Elapsed Time</th></tr>` + statusRows;
}


// Function to update elapsed time in court status table
function updateElapsedTime(courtNumber, elapsedTime) {
    const elapsedTimeCell = document.getElementById(`elapsedTime-${courtNumber}`);
    if (elapsedTimeCell) {
        elapsedTimeCell.textContent = elapsedTime + " mins";
    }
}

// Function to calculate total time in minutes
function calculateTotalTime(checkInTime, checkOutTime) {
    const startTime = new Date(checkInTime).getTime();
    const endTime = new Date(checkOutTime).getTime();
    
    if (!isNaN(startTime) && !isNaN(endTime)) { // Check if startTime and endTime are valid
        const totalTime = Math.round((endTime - startTime) / 1000 / 60); // Total time in minutes
        return totalTime;
    } else {
        console.error("Invalid timestamps:", checkInTime, checkOutTime);
        return null; // Return null if either startTime or endTime is invalid
    }
}
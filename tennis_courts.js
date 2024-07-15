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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Initialize court status
let courtStatus = new Array(8).fill("Available");
let timers = {}; // To store timer intervals for each court

// Function to initialize court status table
function initializeStatusTable() {
    let statusTable = document.getElementById("statusTable");
    let statusRows = "";
    for (let i = 0; i < courtStatus.length; i++) {
        statusRows += `<tr id="statusRow-${i + 1}"><td>${i + 1}</td><td>${courtStatus[i]}</td><td id="remainingTime-${i + 1}">45:00 mins</td></tr>`;
    }
    statusTable.innerHTML = `<tr><th>Court Number</th><th>Status</th><th>Time Remaining</th></tr>` + statusRows;
}

// Function to populate bookings table from Firestore
function populateBookingsTable() {
    let bookingTable = document.getElementById("bookingTable").getElementsByTagName('tbody')[0];
    bookingTable.innerHTML = ""; // Clear existing table content

    // Fetch bookings data from Firestore and populate the table, sorted by timestamp
    db.collection("bookings").orderBy("timestamp").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            let booking = doc.data();
            let checkInTime = new Date(booking.checkInTime).toLocaleTimeString(); // Format check-in time
            let checkOutTime = booking.checkOutTime ? new Date(booking.checkOutTime).toLocaleTimeString() : ""; // Format check-out time
            let row = `<tr><td>${booking.checkInDate}</td><td>${booking.name}</td><td>${booking.courtNumber}</td><td>${checkInTime}</td><td id="checkout-${doc.id}">${checkOutTime}</td></tr>`;
            bookingTable.innerHTML += row;
            // Update court status array
            if (booking.status === "Occupied") {
                courtStatus[booking.courtNumber - 1] = booking.status;
                startTimer(booking.courtNumber, new Date(booking.checkInTime), doc.id); // Start timer for court
            }
        });
        // Update court status table after fetching data
        updateCourtStatus();
    }).catch((error) => {
        console.error("Error getting bookings: ", error);
    });
}

// Function to update court status table
function updateCourtStatus() {
    for (let i = 0; i < courtStatus.length; i++) {
        let statusRow = document.getElementById(`statusRow-${i + 1}`);
        if (statusRow) {
            statusRow.cells[1].textContent = courtStatus[i];
        }
    }
}

// Function to start timer for a court
function startTimer(courtNumber, startTime, bookingId) {
    let endTime = new Date(startTime.getTime() + 45 * 60000); // 45 minutes from start time

    // Clear any existing timer for the court
    if (timers[courtNumber]) {
        clearInterval(timers[courtNumber]);
    }

    // Update remaining time every second
    timers[courtNumber] = setInterval(() => {
        let currentTime = new Date().getTime();
        let remainingTimeMs = Math.max(0, endTime - currentTime); // Remaining time in milliseconds
        let remainingMinutes = Math.floor(remainingTimeMs / 60000); // Remaining minutes
        let remainingSeconds = Math.floor((remainingTimeMs % 60000) / 1000); // Remaining seconds
        updateRemainingTime(courtNumber, remainingMinutes, remainingSeconds);

        if (remainingTimeMs <= 0) {
            clearInterval(timers[courtNumber]);
            timers[courtNumber] = null;
            courtStatus[courtNumber - 1] = "Available"; // Set court status to available
            updateCourtStatus();

            // Update Firestore to set court status to available and check-out time
            let checkOutTime = new Date().toISOString();
            db.collection("bookings").doc(bookingId).update({
                status: "Available",
                checkOutTime: checkOutTime
            }).then(() => {
                // Update check-out time in bookings table
                document.getElementById(`checkout-${bookingId}`).textContent = new Date(checkOutTime).toLocaleTimeString();
            }).catch((error) => {
                console.error("Error updating court status: ", error);
            });
        }
    }, 1000);
}

// Function to update remaining time in court status table
function updateRemainingTime(courtNumber, remainingMinutes, remainingSeconds) {
    const remainingTimeCell = document.getElementById(`remainingTime-${courtNumber}`);
    if (remainingTimeCell) {
        remainingTimeCell.textContent = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} mins`;
    }
}

// Check-in function
function checkIn() {
    let name = document.getElementById("name").value;
    let courtNumber = parseInt(document.getElementById("courtNumber").value);
    let checkInTime = new Date().toISOString();
    let checkInDate = new Date().toLocaleDateString();

    if (name === null || name === "") {
        alert("Name field cannot be blank.");
        return;
    }

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
                    status: "Occupied", // Set status to "Occupied"
                    timestamp: firebase.firestore.FieldValue.serverTimestamp() // Add timestamp field
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

                        // Start timer for court
                        startTimer(courtNumber, new Date(checkInTime), docRef.id);

                        // Reset the form
                        document.getElementById("bookingForm").reset();
                    })
                    .catch((error) => {
                        console.error("Error adding document: ", error);
                    });
            } else {
                // Court is occupied, show an alert
                alert("Court " + courtNumber + " is already occupied. Please choose another court.");
            }
        })
        .catch((error) => {
            console.error("Error checking court status: ", error);
        });
}

// Populate tables when the page loads
window.onload = function() {
    initializeStatusTable();
    populateBookingsTable();
};
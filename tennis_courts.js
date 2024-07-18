const firebaseConfig = {
    apiKey: config.MY_KEY,
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
const db = firebase.firestore();

// Initialize court status
let courtStatus = new Array(8).fill("Available");
let timers = {}; // To store timer intervals for each court

// Function to initialize court status table
function initializeStatusTable() {
    let statusTable = document.getElementById("statusTable");
    let statusRows = "";
    for (let i = 0; i < courtStatus.length; i++) {
        statusRows += `<tr id="statusRow-${i + 1}"><td>${i + 1}</td><td>${courtStatus[i]}</td><td id="remainingTime-${i + 1}">45:00</td></tr>`;
    }
    statusTable.innerHTML = `<tr><th>Court Number</th><th>Status</th><th>Time Remaining</th></tr>` + statusRows;
}

// Function to populate bookings table from Firestore
function populateBookingsTable(dateFilter = new Date().toLocaleDateString()) {
    let bookingTable = document.getElementById("bookingTable").getElementsByTagName('tbody')[0];
    bookingTable.innerHTML = ""; // Clear existing table content

    let query = db.collection("bookings");
    if (dateFilter) {
        query = query.where("checkInDate", "==", dateFilter);
    }
    query.orderBy("timestamp").get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            bookingTable.innerHTML = "<tr><td colspan='6'>No bookings for this date</td></tr>";
            return;
        }

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
        remainingTimeCell.textContent = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

// Function to load dates into the dropdown
function loadDates() {
    let dateDropdown = document.getElementById("dateDropdown");

    db.collection("bookings").orderBy("checkInDate").get().then((querySnapshot) => {
        let dates = new Set(); // Using a set to store unique dates

        querySnapshot.forEach((doc) => {
            let booking = doc.data();
            dates.add(booking.checkInDate);
        });

        // Populate the dropdown with unique dates
        dates.forEach(date => {
            let option = document.createElement("option");
            option.value = date;
            option.textContent = date;
            dateDropdown.appendChild(option);
        });
    }).catch((error) => {
        console.error("Error loading dates: ", error);
    });
}

// Function to load bookings for the selected date
function loadBookingsForSelectedDate() {
    let selectedDate = document.getElementById("dateDropdown").value;
    if (selectedDate) {
        window.location.href = `past_data.html?date=${selectedDate}`;
    } else {
        populateBookingsTable(); // Load current date bookings
    }
}

// Function to create PDF
function createPDF() {
    var sTable = document.getElementById('tableDiv').innerHTML;

    var style = "<style>";
    style = style + "table {width: 100%;font: 17px Calibri;}";
    style = style + "table, th, td {border: solid 1px #DDD; border-collapse: collapse;}";
    style = style + "padding: 2px 3px;text-align: center;}";
    style = style + "</style>";

    // CREATE A WINDOW OBJECT.
    var win = window.open('', '', 'height=700,width=700');

    win.document.write('<html><head>');
    win.document.write('<title>Profile</title>');   // <title> FOR PDF HEADER.
    win.document.write(style);          // ADD STYLE INSIDE THE HEAD TAG.
    win.document.write('</head>');
    win.document.write('<body>');
    win.document.write(sTable);         // THE TABLE CONTENTS INSIDE THE BODY TAG.
    win.document.write('</body></html>');

    win.document.close();   // CLOSE THE CURRENT WINDOW.

    win.print();    // PRINT THE CONTENTS.
}

// Function to create spreadsheet
function createSpreadsheet() {
    let bookingTable = document.getElementById("bookingTable");
    let wb = XLSX.utils.table_to_book(bookingTable, { sheet: "Bookings" });
    XLSX.writeFile(wb, "Bookings.xlsx");
}

// Populate tables and load dates when the page loads
window.onload = function () {
    initializeStatusTable();
    populateBookingsTable();
    loadDates();
};

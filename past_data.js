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

function getQueryParam(param) {
    let urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function loadBookingsForSpecificDay(date) {
    document.getElementById('selectedDate').textContent = date;
    let bookingTable = document.getElementById("bookingTable").getElementsByTagName('tbody')[0];
    bookingTable.innerHTML = ""; // Clear existing table content

    db.collection("bookings").where("checkInDate", "==", date).orderBy("timestamp").get().then((querySnapshot) => {
        if (querySnapshot.empty) {
            bookingTable.innerHTML = "<tr><td colspan='5'>No bookings for this date</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const booking = doc.data();
            const row = bookingTable.insertRow();
            row.insertCell(0).textContent = booking.checkInDate;
            row.insertCell(1).textContent = booking.name;
            row.insertCell(2).textContent = booking.courtNumber;
            row.insertCell(3).textContent = new Date(booking.checkInTime).toLocaleTimeString();
            row.insertCell(4).textContent = booking.checkOutTime ? new Date(booking.checkOutTime).toLocaleTimeString() : "N/A";
        });
    }).catch((error) => {
        console.error("Error fetching bookings: ", error);
    });
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
function goBack() {
    window.location.href = 'tennis_courts.html'; // Adjust the path as needed
}

window.onload = function() {
    let selectedDate = getQueryParam('date');
    if (selectedDate) {
        loadBookingsForSpecificDay(selectedDate);
    }
};

// hide Location input when Auto-Detect is checked
$('#location-checkbox-id').change(function() {
    if ($('#location-checkbox-id').is(":checked")) {
        $('#location-id').hide();
    } else {
        $('#location-id').show();
    }
}).change();

// ----------------------------------------------------------------------------------------

// submit button
$('#submit-btn').click(function(event) {
    event.preventDefault(); // prevent page refresh

    // allows preventDefault code and also 'Please fill out field dialog to pop up'
    $('#search-form')[0].checkValidity();
    $('#search-form')[0].reportValidity();

    $('#eventDetailsContainer').hide(); // hide event details container if present before showing results
    $('#venueDetailsContainer').hide(); // hide venue details container
    $('#venueDetailsDropdown').hide(); // hide venue details dropdown
    $('#venueDetails').hide(); // hide venue details
    
    // console.warn($("#keyword-id")[0])
    let keyword = $("#keyword-id").val().trim();
    let distance = !$("#distance-id").val().trim() ? 10 : $("#distance-id").val(); // default value is 10
    distance.toString(); // since type=number, it will default to 10 also if a random string is entered
    let category = $("#category-id").val(); // SegmentId

    // check if any inputs are empty
    if (keyword.length === 0) {
        console.log("no keyword");
        return;
    }
    if (!$('#location-checkbox-id').is(':checked')) {
        let location = $("#location-id").val();
        if (location.length === 0) {
            console.log("no location");
            return;
        }
    }

    var lat, lng;
    if ($('#location-checkbox-id').is(':checked')) {
        // $('#location-checkbox-id').prop('required', false); // location field no longer required

        // get geolocation
        let url = 'https://ipinfo.io/';
        let token = '0709684373d95e';
        
        $.ajax({
            url: url,
            data: {
                "token": token
            },
            method: 'GET',
            async: 'true' // asynchronous, no refreshing
        }).done(function(results) {
            console.log(results);
            let location = results.loc;
            let locArray = location.split(",");
            lat = locArray[0];
            lng = locArray[1];
            
            backend(keyword, distance, category, lat, lng);
        })
        .fail(function(error) {
            console.log(error);
            alert("ajax call failed");
        });
    } else {
        let url = 'https://maps.googleapis.com/maps/api/geocode/json';
        let key = 'AIzaSyCaZYaApVjAdeMfiZMbgdLtSAGCHJbghDY';
        let address = $("#location-id").val();

        $.ajax({
            url: url,
            data: {
                "address": address,
                "key": key
            },
            method: 'GET',
            async: 'true' // asynchronous, no refreshing
        }).done(function(results) {
            // console.log(results.results[0].geometry.location); // shows object lat and lng
            lat = "";
            lng = "";
            // try-catch blocks in case of invalid location
            try {
                lat = results.results[0].geometry.location.lat;
            } catch {}
            try {
                lng = results.results[0].geometry.location.lng;
            } catch {}

            backend(keyword, distance, category, lat, lng);
        })
        .fail(function(error) {
            console.log(error);
            console.warn("ajax call failed");

            $("#results-table-id").hide(); // in case of any previous search results
            $("#no-results-id").show(); // display 'no records found'
        });
    }
});

// python script using flask to extract form inputs
// use them to invoke the Ticketmaster API
function backend(keyword, distance, category, lat, lng) {
    // only invoked when location has value from either ajax calls
    $.ajax({
        // url: 'http://127.0.0.1:8080/search', // for testing
        url: 'https://instant-vent-376809.uw.r.appspot.com/search', // for deploying
        data: {
            "keyword": keyword,
            "radius": distance, // key-value key must be radius to make right api request
            "segmentId": category,
            "lat": lat,
            "lng": lng
        },
        method: 'GET',
        async: 'true' // asynchronous, no refreshing
    }).done(function(results) {
        console.log(results);

        var resultArray; // get results in an array
        try {
            resultArray = results._embedded.events;
        } catch {
            resultArray = [];
        }
        displayResults(resultArray);
    })
    .fail(function(error) {
        console.log(error);
        console.warn("ajax call failed");

        // unlikely to get here but just in case
        $("#results-table-id").hide(); // in case of any previous search results
        $("#no-results-id").show(); // display 'no records found'
    });
}

// ----------------------------------------------------------------------------------------

// clear button
$('#clear-btn').click(function(event) {
    event.preventDefault(); // prevent page refresh

    $('#keyword-id').val('');
    $('#distance-id').val('');
    $('#category-id').val('');
    $('#location-id').val('');
    if ($('#location-checkbox-id').is(':checked')) { // if auto-detect is checked
        $('#location-checkbox-id').prop('checked', false); // unchecks box
        $('#location-id').show(); // show location input again
    }
});

// ----------------------------------------------------------------------------------------

// results table
function displayResults(resultArray) {
    // empty, meaning there are no results
    if (resultArray.length === 0) {
        $("#results-table-id").hide();
        // need to display "No records found"
        $("#no-results-id").show();
        return;
    }

    $("#no-results-id").hide();
    $("#results-table-id").show();

    // make sure to clear tbody before appending results
    $("#results-table-id tbody").empty();
    resultArray.forEach((result) => { // each array element is an object

        // date, icon, event, genre, venue
        // check if undefined, if so, just assign empty string to variable
        let id = result.id ? result.id : '';
        let date = result.dates.start.localDate ? result.dates.start.localDate : '';
        let time = result.dates.start.localTime ? result.dates.start.localTime : '';
        let icon = result.images[0].url ? result.images[0].url : '';
        let event = result.name ? result.name : '';
        var genre = '';
        try { // genre sometimes not present
            genre = result.classifications[0].segment.name;
        } catch {}
        var venue = '';
        try { // genre sometimes not present
            venue = result._embedded.venues[0].name;
        } catch {}

        // append to table
        let row = `
        <tr>
            <td>${date}<br>${time}</td>
            <td><img src="${icon}" width="90"></td>
            <td class="event-name" id="${id}">${event}</td>
            <td>${genre}</td>
            <td>${venue}</td>
        </tr>
        `;

        $("#results-table-id ").append($(row));
    });
}

// sort table by thead column
// code from: https://stackoverflow.com/questions/3160277/jquery-table-sort
$('thead').on('click', '.th-item', function(event) {
    event.preventDefault();
    event.stopPropagation();

    let table = $(this).parents('table').eq(0);
    let rows = table.find('tr:gt(0)').toArray().sort(compare($(this).index()));
    this.asc = !this.asc; // reverse order of column
    if (!this.asc) { rows = rows.reverse(); }
    for (var i = 0; i < rows.length; i++) {
        table.append(rows[i]);
    }
});

function compare(index) {
    return function(a, b) {
        let valA = getCellValue(a, index), valB = getCellValue(b, index);
        return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB);
    }
}

function getCellValue(row, index) { 
    return $(row).children('td').eq(index).text();
}

// when specific event is clicked -> display event details
$('#results-table-id').on('click', '.event-name', function() {
    console.log("event name clicked");
    let eventId =  $(this).closest("td").attr("id"); // get closest event id - optional: .find('.event-name').attr('id')

    // call ajax for event details
    $.ajax({
        // url: 'http://127.0.0.1:8080/eventDetails', // for testing
        url: 'https://instant-vent-376809.uw.r.appspot.com/eventDetails', // for deploying
        data: {
            "eventId": eventId
        },
        method: 'GET',
        async: 'true' // asynchronous, no refreshing
    }).done(function(results) {
        console.log(results);

        // display event details div
        displayEventDetails(results);
    })
    .fail(function(error) {
        console.log(error);
        alert("ajax call failed");
    });
});

function displayEventDetails(results) {
    $("#eventDetailsContainer").empty(); // remove content inside event details
    $('#venueDetails').empty(); // remove content inside venue details
    $('#venueDetailsContainer').hide(); // hide venue details container
    $('#venueDetailsDropdown').hide(); // hide venue details dropdown
    $('#venueDetails').hide(); // hide venue details

    let name = results.name;

    // date, artist/team, venue, genres, price ranges, ticket ranges, buy ticket at
    let date = results.dates.start.localDate ? results.dates.start.localDate : '';
    let time = results.dates.start.localTime ? results.dates.start.localTime : '';
    let attractions = results._embedded.attractions; // for each attraction.name to get individual artist_team -> empty array?
    let venue = results._embedded.venues[0].name; 

    // genres
    let genres = parseGenres(results);

    // price ranges
    let priceMin = parsePriceRanges(results)[0];
    let priceMax = parsePriceRanges(results)[1];

    let status = results.dates.status.code;
    let url = results.url; // where to buy ticket at
    var seatmap;
    try {
        seatmap = results.seatmap.staticUrl;
    } catch {
        seatmap = "";
    }

    console.log('date: ' + date + ' ' + time);
    console.log('attractions: ');
    console.log(attractions);
    console.log('venue: ' + venue);
    console.log('genres: ' + genres);
    console.log('price ranges: ' + priceMin + '-' + priceMax);
    console.log('date: ' +  status);
    console.log('url: ' + url);
    console.log('seatmap url: ' + seatmap);

    let dateSection = `<h4>Date</h4> <p>${date} ${time}</p>`;

    // artist/team section
    var attractionsSection = "";
    if (typeof attractions !== 'undefined') { // check if attractions is not undefined
        let attractionNames = ""; // all attractions in hyperlink format
        attractions.forEach((attraction, i) => { // get all attraction names and add it to attractionNames string
            let attractionName = attraction.name;
            let attractionUrl = attraction.url; // page w artist's upcoming events
            attractionNames += `<a class="event-details-url" href="${attractionUrl}" target="_blank">${attractionName}</a>`;
            if (i != attractions.length - 1) {
                attractionNames += ' | '; // segment names with '|'
            }
        });
        attractionsSection = `<h4>Artist/Team</h4> <p>${attractionNames}</p>`;
    }

    let venueSection = `<h4>Venue</h4> <p id="venue-name">${venue}</p>`;

    // genres
    let genresSection = "";
    if (genres.length > 0) { // handle case where there are no genres listed
        console.log("genres.length: " + genres.length);
        let genreList = "";
        genres.forEach((genre, i) => {
            genreList += genre;
            if (i != genres.length - 1) {
                genreList += ' | '; // segment genres with '|'
            }
        });
        console.log("genre list: " + genreList);
        genresSection = `<h4>Genres</h4> <p>${genreList}</p>`;
    }

    // price range
    var priceRangeSection = "";
    // only display if these values are returned
    if (!Number.isNaN(priceMin) && !Number.isNaN(priceMax) && typeof priceMin !== 'undefined' && typeof priceMax !== 'undefined') {
        priceRangeSection = `<h4>Price Ranges</h4> <p>${priceMin} - ${priceMax} USD</p>`;
    }

    // ticket status
    var textBackgroundColor;// fix style
    if (status === "onsale") { // green #3a8726
        textBackgroundColor = "#3a8726";
        status = "On Sale";
    } else if (status === "rescheduled") { // yellow/orange #dfa439
        textBackgroundColor = "#dfa439";
        status = "Rescheduled";
    } else if (status === "offsale") { // red #d22e20
        textBackgroundColor = "#d22e20";
        status = "Off Sale";
    } else if (status === "cancelled") {
        textBackgroundColor = "black";
        status = "Cancelled";
    } else if (status === "postponed") {
        textBackgroundColor = "orange";
        status = "Postponed";
    }
    let ticketSection = `
    <h4>Ticket Status</h4> 
    <p style="margin-top:10px;"><span class="event-details-status" style="background-color:${textBackgroundColor};">${status}</span></p>
    `;

    // buy ticket at
    let ticketmaster = `<h4>Buy Ticket at</h4> <p><a class="event-details-url" href="${url}" target="_blank">Ticketmaster</a></p>`;

    let eventDetailText = dateSection + attractionsSection + venueSection + genresSection + priceRangeSection + ticketSection + ticketmaster;

    let eventDetails = `
    <h2 id="details-name-id">${name}</h2>
    <table>
        <tr>
            <td class="eventDetails">
                ${eventDetailText}
            </td>
            <td class="eventImage">
                <img src="${seatmap}" width="600">
            </td>
        </tr>
    </table>
    `;

    $("#eventDetailsContainer").html(eventDetails);
    $("#eventDetailsContainer").show(); // display event details
    $('#venueDetailsContainer').show(); // display venue details dropdown
    $('#venueDetailsDropdown').show(); // display venue details dropdown

    // smooth scroll to event details div
    $("html, body").animate({
        scrollTop: $("#eventDetailsContainer").offset().top
    }, 1000);
}

function parseGenres(results) {
    var segment, genre, subGenre, type, subType;
    var genres = [];
    
    try { // segment
        segment = results.classifications[0].segment.name;
        if (segment !== "Undefined") genres.push(segment); // check for undefined
    } catch {}
    try { // genre
        genre = results.classifications[0].genre.name;
        if (genre !== "Undefined") genres.push(genre);
    } catch {}
    try { // subGenre
        subGenre = results.classifications[0].subGenre.name;
        if (subGenre !== "Undefined") genres.push(subGenre);
    } catch {}
    try { // type
        type = results.classifications[0].type.name;
        if (type !== "Undefined") genres.push(type);
    } catch {}
    try { // subType
        subType = results.classifications[0].subType.name;
        if (subType !== "Undefined") genres.push(subType);
    } catch {}

    return genres; // put in a genres array
}

function parsePriceRanges(results) {
    var priceMin, priceMax;
    try { // priceMin
        priceMin = results.priceRanges[0].min;
    } catch {}
    try { // priceMax
        priceMax = results.priceRanges[0].max;
    } catch {}

    return [priceMin, priceMax];
}

// ----------------------------------------------------------------------------------------

// when show venue details is clicked
// call ajax for venue details
$('.fa-angle-down').click(function(event) {
    console.log("event details dropdown");
    let keyword = $("#venue-name").html();

    $.ajax({
        // url: 'http://127.0.0.1:8080/venueDetails', // for testing
        url: 'https://instant-vent-376809.uw.r.appspot.com/venueDetails', // for deploying
        data: {
            "keyword": keyword
        },
        method: 'GET',
        async: 'true' // asynchronous, no refreshing
    }).done(function(results) {
        console.log(results);

        // display venue details div
        venueDetailsArray = parseVenueDetails(results);
        console.log(venueDetailsArray)
        displayVenueDetails(venueDetailsArray);
    })
    .fail(function(error) {
        console.log(error);
        alert("ajax call failed");
    });
});

function displayVenueDetails(venueDetailsArray) {
    let image = venueDetailsArray[0];
    let name = venueDetailsArray[1];
    let address = venueDetailsArray[2];
    let city = venueDetailsArray[3];
    let stateCode = venueDetailsArray[4];
    let postalCode = venueDetailsArray[5];
    let url = venueDetailsArray[6]; // upcoming events
    let googleMaps = `https://www.google.com/maps/search/?api=1&query=${name}+${address}+${city}+${stateCode}+${postalCode}`;

    let city_state = city; // depends if state is a valid value
    if (stateCode !== "") {
        city_state = city + ", " + stateCode;
    }
    
    let venueDetails = `
    <div>
        <h2>${name}</h2>
        <img src="${image}" width="100">
        <div>
            <!-- left side for address and google maps -->
            <div>
                <div class="address">
                <p>
                    <!-- format for address: -->
                    <!-- Address: street name -->
                    <!--          city, state -->
                    <!--          postal code -->
                    <b>Address:</b> ${address} <br> 
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
                    ${city_state} <br> 
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    ${postalCode}
                </p>
                </div>
                <p><a href="${googleMaps}" target="_blank">Open in Google Maps</a></p>
            </div>
            <!-- right side for 'more events at this venue' -->
            <div>
                <p><a href="${url}" target="_blank">More events at this venue</a></p>
            </div>
        </div>
    </div>
    `;

    $("#venueDetails").html(venueDetails);
    $("#venueDetailsDropdown").hide();
    $('#venueDetails').show(); // display venue details dropdown

    // smooth scroll to venue details div
    $("html, body").animate({
        scrollTop: $("#venueDetails").offset().top
    }, 1000);
}

function parseVenueDetails(results) {
    // if results do not contain certain fields, the value will be set as "N/A"
    let image = "";
    try {
        image = results._embedded.venues[0].images[0].url;
    } catch {}
    let name = results._embedded.venues[0].name;
    let address = results._embedded.venues[0].address.line1;
    let city = results._embedded.venues[0].city.name;
    let stateCode = "";
    try {
        stateCode = results._embedded.venues[0].state.stateCode;
    } catch {}
    let postalCode = results._embedded.venues[0].postalCode;
    let url = results._embedded.venues[0].url; // upcoming events

    return [image, name, address, city, stateCode, postalCode, url]
}
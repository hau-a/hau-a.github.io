import { Component, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, tap, switchMap, finalize, distinctUntilChanged, filter } from 'rxjs/operators';

export interface EventDetails {
  name: string;
  date: string;
  attractions: any[];
  venue: string;
  segment: string;
  // genres: segment, genre, subGenre, type, subType
  genre: string;
  subGenre: string;
  type: string;
  subType: string;
  priceMin: string;
  priceMax: string;
  status: string;
  statusColor: string;
  url: string;
  seatmap: string;
}

export interface VenueDetails {
  name: string;
  address: string;
  city: string;
  state: string;
  phoneNumberDetail: string;
  openHoursDetail: string;
  generalRule: string;
  childRule: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  image: string;
  popularity: string;
  followers: string;
  spotify: string;
  albums: string[];
}

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})

export class SearchComponent {
  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
  ) {
    this.searchForm = this.formBuilder.group({
      keyword: ['', Validators.required],
      distance: [''],
      category: [''],
      location: [{ value: '', disabled: false }, Validators.required],
      locationChecked: [false]
    });
    this.keywordControl = this.formBuilder.control('', [Validators.required]);
    this.locationControl = this.formBuilder.control('', [Validators.required]);
    this.locationCheckedControl = this.formBuilder.control(false, [Validators.required]);
    this.locationChecked = false; // make sure location is not checked when page is loaded

    // Subscribe to keywordControl value changes
    this.keywordControl.valueChanges.pipe(
      filter(res => {
        return res.trim() !== null && res.trim().length >= this.minLengthTerm;
      }),
      distinctUntilChanged(),
      debounceTime(500),
      tap(() => this.isLoading = true),
      switchMap((value: string) => this.http.get<any>('https://ticketmaster-angular-node.wl.r.appspot.com/suggestAttractions', {
        params: {
          keyword: value
        }
      })
        .pipe(
          finalize(() => {
            this.isLoading = false
          }),
        )
      )
    ).subscribe(results => {
      console.log('results:', results);
      let keywordSuggestions = []; // initialize with an empty array
      try {
        keywordSuggestions = results._embedded.attractions.map((attraction: any) => attraction.name);
      } catch { }
      this.keywordSuggestions = keywordSuggestions;
    });
  }

  // form controls
  searchForm: FormGroup;
  keywordControl: FormControl;
  filteredKeywords: any;
  keywordSuggestions: string[] = [];
  minLengthTerm = 1;
  isLoading = false;

  locationControl: FormControl;
  locationCheckedControl: FormControl;

  // for clearing functionality
  keyword: string = '';
  distance: number = 10;
  category: string = '';
  location: string = '';
  locationChecked: boolean = true; // needs to be true or unchecking will leave field disabled

  resultArray: any[] = [];
  showResults: boolean = false; // whether to show results container or not

  favoriteOrder: number = 0; // order added to favorites list
  eventId: string = '';
  isFavorite: boolean = false;
  localStorageItems = { ...localStorage }; // local storage items
  event: EventDetails = { // initialize event
    name: "",
    date: "",
    attractions: [],
    venue: "",
    segment: "",
    genre: "",
    subGenre: "",
    type: "",
    subType: "",
    priceMin: "",
    priceMax: "",
    status: "",
    statusColor: "",
    url: "",
    seatmap: ""
  }; // results for event details
  attractionNames: string = '';
  attractionArtists: string[] = [];
  accessToken: string = '';
  spotifyArtists: SpotifyArtist[] = [];
  venue: VenueDetails = { // initialize venue
    name: "",
    address: "",
    city: "",
    state: "",
    phoneNumberDetail: "",
    openHoursDetail: "",
    generalRule: "",
    childRule: ""
  }; // results for venue details
  showOpenHours: boolean = false;
  showGeneralRule: boolean = false;
  showChildRule: boolean = false;
  showDetails: boolean = false; // whether to show details container or not

  // map modal
  mapModal: boolean = false;
  lat: number = 38.9987208; // placeholder numbers
  lng: number = -77.2538699;
  marker = { position: { lat: 38.9987208, lng: -77.2538699 } };
  innerWidth: number = window.innerWidth; // initialize the innerWidth with current window width
  @HostListener('window:resize', ['$event']) // listens when the window resizes
  onResize() {
    this.innerWidth = window.innerWidth;
  }
  

  disableLocation() { // disable location field if location is checked
    console.log("disable location");
    if (this.locationCheckedControl.value) { // disable by form control
      this.locationControl.disable();
    } else {
      this.locationControl.enable();
    }
  }

  onSubmit() { // form
    const formValues = this.searchForm.value;
    console.log(formValues);

    const xml = new XMLHttpRequest();

    // if locationChecked, then use ipinfo
    // else use google maps api
    var lat: number, lng: number;
    if (this.locationCheckedControl.value) {
      console.log("using ip address");
      let url = 'https://ipinfo.io/';
      let token = '0709684373d95e';
      xml.open('GET', `${url}?token=${token}`);
      xml.onload = () => {
        if (xml.status === 200) {
          let results = JSON.parse(xml.response);
          let location = results.loc;
          let locArray = location.split(",");
          lat = locArray[0];
          lng = locArray[1];
          console.log(lat + " " + lng);

          this.searchEvents(lat, lng);
        } else {
          console.log('Request failed, status: ' + xml.status);
        }
      };
      xml.send();
    } else {
      console.log("using google maps api");
      let url = 'https://maps.googleapis.com/maps/api/geocode/json';
      let key = 'AIzaSyCI5WO37tDxtDVRzsYVaZmF_qak850z2jw';
      let address = this.locationControl.value;
      xml.open('GET', `${url}?address=${address}&key=${key}`);
      xml.onload = () => {
        if (xml.status === 200) {
          let results = JSON.parse(xml.response);
          console.log(results);
          // try-catch blocks in case of invalid location
          try {
            lat = results.results[0].geometry.location.lat;
          } catch { }
          try {
            lng = results.results[0].geometry.location.lng;
          } catch { }
          console.log(lat + " " + lng);

          this.searchEvents(lat, lng);
        } else {
          console.log('Request failed - status: ' + xml.status);
        }
      }
      xml.send();
    }
  }

  searchEvents(lat: number, lng: number) { // calls searchEvent api in backend
    // this.http.get('http://localhost:3000/searchEvents', { // test
    this.http.get('https://ticketmaster-angular-node.wl.r.appspot.com/searchEvents', { // deployment
      params: {
        keyword: this.keywordControl.value,
        radius: this.distance,
        segmentId: this.searchForm.value.category,
        lat: lat,
        lng: lng
      }
    }).pipe(
      debounceTime(500) // implementing debouncing/throttling to avoid too many requests errors
    ).subscribe((results: any) => {
      console.log(results);

      let resultArray = []; // get results in an array
      try {
        resultArray = results._embedded.events;
      } catch { }
      resultArray.sort((a: any, b: any) => { 
        // makes sure data populated in table correctly sorted in ascending order of date/time
        const aDate = new Date(`${a.dates.start.localDate} ${a.dates.start.localTime}`);
        const bDate = new Date(`${b.dates.start.localDate} ${b.dates.start.localTime}`);
        return aDate.valueOf() - bDate.valueOf();
      });
      this.resultArray = resultArray;
      console.log("resultArray: " + this.resultArray);
      this.showResults = true;
      this.showDetails = false;
    });
  }

  clearFields() {
    console.log("clearing all fields");
    this.keyword = '';
    this.distance = 10;
    this.category = '';
    this.location = '';
    this.locationChecked = false;
    this.locationControl.enable(); // in case it was disable
    this.showResults = false;
    this.showDetails = false;
  }

  // go back to results
  backToResults() {
    this.showResults = true; // show details
    this.showDetails = false; // hide details container or not
    this.showOpenHours = false;
    this.showGeneralRule = false;
    this.showChildRule = false;
  }

  favoriteEvent() {
    const eventId = this.eventId;
    const segment = this.event.segment;
    const genre = this.event.genre;
    const subGenre = this.event.subGenre;
    const type = this.event.type;
    const subType = this.event.subType;
    console.log("in favorite event");

    // segment with |
    const genres = [segment, genre, subGenre, type, subType].filter(str => this.isNonEmptyString(str)).join(' | ');
    console.log("genres " + genres);
    if (this.isNonEmptyString(eventId)) {
      if (!this.isFavorite) {
        let largestOrder = 0; // get largest order to help with sorting favorites
        if (localStorage.length > 0) {
          this.localStorageItems = { ...localStorage }; // update in case new favorite items were added
          for (const key in this.localStorageItems) {
            let eventObject = { // create object using eventObject
              'order': 0,
              'date': '',
              'name': '',
              'category': '',
              'venue': ''
            }
            eventObject = JSON.parse(this.localStorageItems[key]);
            if (eventObject.order && eventObject.order > largestOrder) {
              largestOrder = eventObject.order;
            }
          }
          this.favoriteOrder = largestOrder + 1;
        }

        let eventObject = { // create object using eventObject
          'order': this.favoriteOrder,
          'date': this.event.date,
          'name': this.event.name,
          'category': genres,
          'venue': this.event.venue
        }
        localStorage.setItem(eventId, JSON.stringify(eventObject));

        this.isFavorite = true;
        console.log("favoriteOrder: " + this.favoriteOrder);
        alert("Event Added to Favorites!");
      } else if (this.isFavorite) {
        // remove from localStorage
        localStorage.removeItem(eventId);
        this.isFavorite = false;
        alert("Removed from Favorites!");
      }
    }
  }

  // retrieve event & venue details
  eventDetails(eventId: string, keyword: string) {
    this.eventId = eventId; // update event id

    // check if eventId is favorited - update favorite button accordingly
    if (localStorage.getItem(eventId)) {
      this.isFavorite = true;
    } else {
      this.isFavorite = false;
    }

    // remove everything from attractionArtists and spotifyArtists before searching a new batch of artists
    this.attractionArtists = []; // used for array of attractions, each entry in string
    this.spotifyArtists = []; // used for objects returned from spotify api

    console.log("eventId: " + eventId);
    // this.http.get('http://localhost:3000/eventDetails', { // test
    this.http.get('https://ticketmaster-angular-node.wl.r.appspot.com/eventDetails', { // deployment
      params: {
        eventId: eventId
      }
    }).pipe(
      debounceTime(500) // implementing debouncing/throttling to avoid too many requests errors
    ).subscribe((results: any) => {
      console.log(results);
      const event = results._embedded.events[0];
      console.log(event.name);
      console.log(event.dates.start.localDate);
      console.log(event._embedded?.venues[0].name)
      try {
        this.event = {
          name: event.name,
          date: event.dates?.start?.localDate ?? '',
          attractions: event._embedded?.attractions ?? '',
          venue: event._embedded?.venues[0]?.name ?? '',
          segment: event.classifications[0]?.segment?.name ?? '',
          genre: event.classifications[0]?.genre?.name ?? '',
          subGenre: event.classifications[0]?.subGenre?.name ?? '',
          type: event.classifications[0]?.type?.name ?? '',
          subType: event.classifications[0]?.subType?.name ?? '',
          // check if priceMin and priceMax property does not exist
          priceMin: typeof event.priceRanges !== 'undefined' ? event.priceRanges[0]?.min ?? '' : '',
          priceMax: typeof event.priceRanges !== 'undefined' ? event.priceRanges[0]?.max ?? '' : '',
          status: event.dates?.status?.code ?? '',
          statusColor: '',
          url: event.url ?? '',
          seatmap: event.seatmap?.staticUrl ?? ''
        };
      } catch { }
      console.log(this.event);

      // get string of all artists/teams
      // check if attractions has value
      this.attractionNames = ""; // remove any old values from attractionNames
      if (typeof this.event!.attractions !== 'undefined' && this.event!.attractions.length > 0) {
        let attractionsList = this.event!.attractions;
        let attractionNames = "";
        for (let i = 0; i < attractionsList.length; i++) {
          attractionNames += attractionsList[i].name;
          this.attractionArtists.push(attractionsList[i].name);
          if (i != attractionsList.length - 1) {
            attractionNames += ' | '; // segment names with '|'
          }
        }
        this.attractionNames = attractionNames;
      }

      // determine status color
      var status = this.event.status;
      if (status === "onsale") { // green #3a8726
        this.event.statusColor = "#3a8726";
        this.event.status = "On Sale";
      } else if (status === "rescheduled") { // yellow/orange #dfa439
        this.event.statusColor = "#dfa439";
        this.event.status = "Rescheduled";
      } else if (status === "offsale") { // red #d22e20
        this.event.statusColor = "#d22e20";
        this.event.status = "Off Sale";
      } else if (status === "cancelled") {
        this.event.statusColor = "black";
        this.event.status = "Cancelled";
      } else if (status === "postponed") {
        this.event.statusColor = "orange";
        this.event.status = "Postponed";
      }
      // only call spotify access token if it is music related
      if (this.event.segment == "Music") {
        this.spotifyAccessToken();
      }
      // call venue details for keyword
      this.venueDetails(keyword);
    });
  }

  // spotify
  spotifyAccessToken() { // makes a call to the backend to get spotify token
    console.log("getting access token...");
    // this.http.get('http://localhost:3000/spotifyAccessToken', { // test
    this.http.get('https://ticketmaster-angular-node.wl.r.appspot.com/spotifyAccessToken', { // deployment
      responseType: 'text'
    }).pipe(
      debounceTime(500) // implementing debouncing/throttling to avoid too many requests errors
    ).subscribe((results: any) => {
      console.log("access token: " + results);
      this.accessToken = results;

      for (let i = 0; i < this.attractionArtists.length; i++) {
        // call search artist for each attraction
        console.log(this.attractionArtists[i]);
        this.searchArtists(this.attractionArtists[i]);
      }
    });
  }

  searchArtists(keyword: string) {
    // this.http.get('http://localhost:3000/searchArtists', { // test
    this.http.get('https://ticketmaster-angular-node.wl.r.appspot.com/searchArtists', { // deployment
      params: {
        accessToken: this.accessToken,
        keyword: keyword
      }
    }).pipe(
      debounceTime(500) // implementing debouncing/throttling to avoid too many requests errors
    ).subscribe((results: any) => {
      // console.log("spotify artist " + results);
      const searchedArtist = JSON.parse(results); // return from string to array
      console.log(searchedArtist);

      let artist: SpotifyArtist = {
        id: '',
        name: '',
        image: '',
        popularity: '',
        followers: '',
        spotify: '',
        albums: ['', '', '']
      };

      try {
        artist = {
          id: searchedArtist[0].id,
          name: searchedArtist[0].name,
          image: searchedArtist[0].images[0]?.url,
          popularity: searchedArtist[0].popularity,
          followers: searchedArtist[0].followers?.total,
          spotify: searchedArtist[0].external_urls?.spotify,
          albums: ['', '', '']
        };
        console.log(artist);
        // need to search getArtistAlbums
        // then call spotifyArtists.push(artist)
        this.getArtistAlbums(artist.id, artist);
      } catch { }
    });
  }

  getArtistAlbums(id: string, artist: SpotifyArtist) {
    // this.http.get('http://localhost:3000/getArtistAlbums', { // test
    this.http.get('https://ticketmaster-angular-node.wl.r.appspot.com/getArtistAlbums', { // deployment
      params: {
        accessToken: this.accessToken,
        id: id
      }
    }).pipe(
      debounceTime(500) // implementing debouncing/throttling to avoid too many requests errors
    ).subscribe((results: any) => {
      // console.log("spotify artist " + results);
      const albums = JSON.parse(results); // return from string to array
      console.log(albums);

      try {
        // add the 3 albums
        artist.albums[0] = albums.items[0]?.images[0]?.url;
        artist.albums[1] = albums.items[1]?.images[0]?.url;
        artist.albums[2] = albums.items[2]?.images[0]?.url;
        console.log(artist.albums);
        console.log(".......");
        console.log("pushing spotify artist");
        this.spotifyArtists.push(artist);
      } catch { }

      try { // sort spotifyArtists according to attractionArtists
        const self = this;
        this.spotifyArtists.sort(function (a, b) {
          return self.attractionArtists.indexOf(a.name) - self.attractionArtists.indexOf(b.name);
        });
        console.log(this.spotifyArtists);
      } catch { }
    });
  }

  venueDetails(keyword: string) {
    console.log("keyword: " + keyword);
    // this.http.get('http://localhost:3000/venueDetails', { // test
    this.http.get('https://ticketmaster-angular-node.wl.r.appspot.com/venueDetails', { // deployment
      params: {
        keyword: keyword
      }
    }).pipe(
      debounceTime(500) // implementing debouncing/throttling to avoid too many requests errors
    ).subscribe((results: any) => {
      console.log(results);
      const venue = results._embedded.venues[0];
      try {
        this.venue = {
          name: venue.name,
          address: venue.address?.line1 ?? '',
          city: venue.city?.name ?? '',
          state: venue.state?.name ?? '',
          phoneNumberDetail: venue.boxOfficeInfo?.phoneNumberDetail ?? '',
          openHoursDetail: venue.boxOfficeInfo?.openHoursDetail ?? '',
          generalRule: venue.generalInfo?.generalRule ?? '',
          childRule: venue.generalInfo?.childRule ?? ''
        };

        this.markMap(this.venue.name, this.venue.address, this.venue.city, this.venue.state);

        // after venue details (last tab) are retrieved:
        this.showResults = false; // hide results
        this.showDetails = true; // show details 
      } catch { }
    }),
      (error: any) => {
        console.error(error);
      };
  }

  isNonEmptyString(str: string | undefined) { // check if empty string or undefined
    // check str is not undefined before calling the trim() method
    if (typeof str === 'undefined') return false;
    if (str === 'undefined') return false;
    return str.trim() && str.trim().length > 0 && (str.trim() !== "Undefined");
  }

  showMap() {
    this.mapModal = true;
  }

  hideMap() {
    this.mapModal = false;
  }

  markMap(name: string, address: string, city: string, state: string) { // call google api to get the lat,lng coordinates
    let url = 'https://maps.googleapis.com/maps/api/geocode/json';
    let key = 'AIzaSyCI5WO37tDxtDVRzsYVaZmF_qak850z2jw';
    let info = name + " " + address + " " + city + " " + state;
    const xml = new XMLHttpRequest();
    xml.open('GET', `${url}?address=${info}&key=${key}`);
    xml.onload = () => {
      if (xml.status === 200) {
        let results = JSON.parse(xml.response);
        console.log(results);

        // try-catch blocks in case of invalid location
        try {
          this.lat = results.results[0].geometry.location.lat;
          this.lng = results.results[0].geometry.location.lng;
          this.marker = { position: { lat: this.lat, lng: this.lng } }; // update map marker
          console.log(this.marker);
        } catch { }
      } else {
        console.log('Request failed - status: ' + xml.status);
      }
    }
    xml.send();

  }
}

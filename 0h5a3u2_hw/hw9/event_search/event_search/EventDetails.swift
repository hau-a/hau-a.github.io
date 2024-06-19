//
//  EventDetails.swift
//  event_search
//
//  Created by Ashley Hau on 5/3/23.
//

import Foundation
import SwiftUI

struct EventDetails: View {
    var eventId: String
    var venue: String
    
    @State private var id = ""
    @State private var eventName = ""
    @State private var segment = ""
    @State private var genre = ""
    @State private var subGenre = ""
    @State private var attractions: [Attractions] = []
    @State private var attraction_names: [String] = []
    @State private var music_event = false
    
    // check if each tab has loaded its data
    @State private var eventsDataLoaded = false
    @State private var artistTeamDataLoaded = false
    @State private var venueDataLoaded = false
    
    @State var eventData = EventData()
    @State var venueData = VenueData()

    var body: some View {
        // if data is not loaded
        // progress spinner
        // if data is loaded
        if (eventsDataLoaded && venueDataLoaded) {
            TabView {
                EventsTab(event: eventData, attraction_names: attraction_names, id: id, segment: segment, genre: genre, subGenre: subGenre)
                    .tabItem {
                        Label("Events", systemImage: "text.bubble")
                    }
                ArtistTeamTab(music_event: music_event)
                    .tabItem {
                        Label("Artist/Team", systemImage: "guitars.fill")
                    }
                VenueTab(eventName: eventName, venue: venueData) // venue: venueData
                    .tabItem {
                        Label("Venue", systemImage: "location.fill")
                    }
            }
        } else {
            PleaseWait()
                .onAppear {
                    // call to fetch event details
                    eventDetails()
                    venueDetails()
                }
        }
    }
    
    func eventDetails() {
        print("getting event details...")
        let urlString = "https://ticketmaster-angular-node.wl.r.appspot.com/eventDetails?eventId=\(eventId)"
        print(urlString)
        if let url = URL(string: urlString) {
            let task = URLSession.shared.dataTask(with: url) { data, response, error in
                guard let data = data, error == nil else {
                    return
                }
                
                do {
                    let eventInfo = try JSONDecoder().decode(EventInfo.self, from: data)
                    if let event = eventInfo._embedded.events.first {
                        eventData = event
                        print(eventData)
                        if let event_id = event.id {
                            id = event_id
                        }
                        if let event_name = event.name {
                            eventName = event_name
                        }
                        if let segment_name = event.classifications?.first?.segment?.name {
                            segment = segment_name
                        }
                        if let genre_name = event.classifications?.first?.genre?.name {
                            genre = genre_name
                        }
                        if let subGenre_name = event.classifications?.first?.subGenre?.name {
                            subGenre = subGenre_name
                        }
                        if let attractions_array = event._embedded?.attractions {
                            // list of attractions for artist detail
                            attractions = attractions_array
                        }
                        eventsDataLoaded = true
                    }  else {
                        print("No event data found")
                        eventsDataLoaded = true
                    }
                    artistTeamDetails() // call artist detail here
                } catch {
                    print("Error decoding JSON: \(error)")
                }
            }
            task.resume()
        }
    }
    
    func venueDetails() {
        print("getting venue details...")
        let urlString = "https://ticketmaster-angular-node.wl.r.appspot.com/venueDetails?keyword=\(venue.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"
        print(urlString)
        if let url = URL(string: urlString) {
            let task = URLSession.shared.dataTask(with: url) { data, response, error in
                guard let data = data, error == nil else {
                    return
                }
                
                do {
                    let venueInfo = try JSONDecoder().decode(VenueInfo.self, from: data)
                    if let venue_data = venueInfo._embedded.venues.first {
                        venueData = venue_data
                        print(venueData)
                        venueDataLoaded = true
                    }  else {
                        print("No event data found")
                        venueDataLoaded = true
                    }
                } catch {
                    print("Error decoding JSON: \(error)")
                }
            }
            task.resume()
        }
    }
    
    func artistTeamDetails() {
        print("getting artist details...")
        // loop thru attractions list
        attraction_names = attractions.map { $0.name }
        print(attraction_names)
        
        // if music... call spotify artist
        if (segment != "Music") {
            return; // do not need to get artist details
        }
        
        music_event = true
        print("call spotify artist")
        
        let urlString = "https://ticketmaster-angular-node.wl.r.appspot.com/spotifyAccessToken"
        print(urlString)
        if let url = URL(string: urlString) {
            let task = URLSession.shared.dataTask(with: url) { data, response, error in
                guard let data = data, error == nil else {
                    return
                }
                
                if let spotifyAccessToken = String(data: data, encoding: .utf8) {
                    print(spotifyAccessToken)
                    
                    for i in 0..<attraction_names.count {
                        //if i==0 {
                            searchArtist(accessToken: spotifyAccessToken, keyword: attraction_names[i])
                        //}
                    }
                }
            }
            task.resume()
        }
    }
    
    func searchArtist(accessToken: String, keyword: String) {
        let urlString = "https://ticketmaster-angular-node.wl.r.appspot.com/searchArtists?accessToken=\(accessToken)&keyword=\(keyword.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"
        print(urlString)
        if let url = URL(string: urlString) {
            let task = URLSession.shared.dataTask(with: url) { data, response, error in
                guard let data = data, error == nil else {
                    return
                }
                
                // do... catch
                do {
                    if let jsonString = String(data: data, encoding: .utf8) {
                        if let jsonData = jsonString.data(using: .utf8) {
                            do {
                                let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: .allowFragments)
                                if let jsonArray = jsonObject as? [[String:Any]] {
                                        // jsonArray is an array of dictionaries
                                        let firstDict = jsonArray.first
                                        // access values in the first dictionary
                                } else {
                                    print("kfljdsjklfdsalk")
                                }
                                
//                                let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options : .allowFragments)
//                                if let jsonArray = jsonObject as? [[String: Any]], let firstItem = jsonArray.first {
//                                    print(firstItem)
//                                } else {
//                                    print("Unable to get first item")
//                                }
                                
//                                if let artist_info_object = jsonObject?.first {
//                                    print(artist_info_object)
//                                } else {
//                                    print("unable to print artist info")
//                                }
//                                if let jsonArray = jsonObject as? [[String: Any]], let artistInfo = jsonArray.first {
//                                    let name = artistInfo["name"] as? String ?? ""
//                                    print("Name: \(name)")
//
//                                    let images = artistInfo["images"] as? [[String: Any]] ?? []
//                                    var imageUrl = ""
//                                    if let images = images.first, let image_url = images["url"] as? String {
//                                        imageUrl = image_url
//                                    }
//                                    print("Image URL: \(imageUrl)")
//
//                                    let popularity = artistInfo["popularity"] as? Int ?? 0
//                                    print("Popularity: \(popularity)")
//
//                                    let followers = artistInfo["followers"] as? [String: Any] ?? [:]
//                                    let totalFollowers = followers["total"] as? Int ?? 0
//                                    print("Total Followers: \(totalFollowers)")
//
//                                    let externalUrls = artistInfo["external_urls"] as? [String: Any] ?? [:]
//                                    let spotify = externalUrls["spotify"] as? String ?? ""
//                                    print("Spotify: \(spotify)")
//                                } else {
//                                    print("Bad JSON")
//                                }
                            } catch {
                                print("Error: \(error)")
                            }
                        }
                    }
                } catch {
                    print("Error: \(error)")
                }
                
            }
            task.resume()
        }
    }
}

/*
struct EventDetails_Previews: PreviewProvider {
    @State static var eventId = "1234"
    @State static var venue = "Sofi Stadium"
    static var previews: some View {
        EventDetails(eventId: eventId, venue: venue)
    }
}
*/

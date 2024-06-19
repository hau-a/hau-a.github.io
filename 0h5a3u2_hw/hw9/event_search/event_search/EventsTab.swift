//
//  EventsTab.swift
//  event_search
//
//  Created by Ashley Hau on 5/4/23.
//

import Foundation
import SwiftUI
import Kingfisher

//    name: event.name,
//    date: event.dates?.start?.localDate ?? '',
//    attractions: event._embedded?.attractions ?? '',
//    venue: event._embedded?.venues[0]?.name ?? '',
//    segment: event.classifications[0]?.segment?.name ?? '',
//    genre: event.classifications[0]?.genre?.name ?? '',
//    subGenre: event.classifications[0]?.subGenre?.name ?? '',
//    type: event.classifications[0]?.type?.name ?? '',
//    subType: event.classifications[0]?.subType?.name ?? '',
//        // check if priceMin and priceMax property does not exist
//    priceMin: typeof event.priceRanges !== 'undefined' ? event.priceRanges[0]?.min ?? '' : '',
//    priceMax: typeof event.priceRanges !== 'undefined' ? event.priceRanges[0]?.max ?? '' : '',
//    status: event.dates?.status?.code ?? '',
//    statusColor: '',
//    url: event.url ?? '',
//    seatmap: event.seatmap?.staticUrl ?? ''

// ex: event_name = results._embedded.events[0].name
struct EventInfo: Codable {
    var _embedded: EventInfoEmbedded
}

struct EventInfoEmbedded: Codable {
    var events: [EventData]
}

struct EventData: Codable {
    var id: String?
    var name: String?
    var dates: Dates? // in struct Dates from Events.swift
    var _embedded: EmbeddedVenueAttractions? // to get the venue name and attractions
    var classifications: [Classification]? // from Events.swift
    var priceRanges: [PriceRanges]?
    var url: String?
    var seatmap: Seatmap?
}

struct Classification: Codable {
    var segment: Segment?
    var genre: Genre?
    var subGenre: Subgenre?
}

struct Segment: Codable {
    var name: String
}

struct Genre: Codable {
    var name: String
}

struct Subgenre: Codable {
    var name: String
}

struct PriceRanges: Codable {
    var min: Double
    var max: Double
}

struct Seatmap: Codable {
    var staticUrl: String
}


struct EventsTab: View {
    @Environment(\.openURL) var openURL
    
    var event: EventData
    var attraction_names: [String] = []
    var id = ""
    var segment = ""
    var genre = ""
    var subGenre = ""
    
    // for favorited events
    //    var date = ""
    //    var name = ""
    //    var venue = ""
    @State private var showToast: Bool = false
    
    var body: some View {
        VStack {
            if let eventName = event.name {
                Text(eventName)
                    .font(.system(size: 20))
                    .fontWeight(.bold)
                    .padding(.bottom, 10)
            } else {
                Text("N/A")
                    .foregroundColor(.gray)
            }
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Date")
                        .fontWeight(.bold)
                    if let localDate = event.dates?.start.localDate {
                        Text(localDate)
                            .foregroundColor(.gray)
                    } else {
                        Text("N/A")
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("Artist | Team")
                        .fontWeight(.bold)
                    ScrollView {
                        Text(checkAttractionNames(attraction_names: attraction_names))
                            .foregroundColor(.gray)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    .padding(.top, -7)
                }
            }
            .padding(.bottom, 10)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Venue")
                        .fontWeight(.bold)
                    if let venue = event._embedded?.venues.first?.name {
                        Text(venue)
                            .foregroundColor(.gray)
                    } else {
                        Text("N/A")
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("Genre")
                        .fontWeight(.bold)
                    HStack {
                        Text(segment)
                            .foregroundColor(.gray)
                        if (!genre.isEmpty) {
                            Text("| \(genre)")
                                .foregroundColor(.gray)
                        }
                        if (!subGenre.isEmpty) {
                            Text("| \(subGenre)")
                                .foregroundColor(.gray)
                        }
                    }
                }
            }
            .padding(.bottom, 10)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Price Range")
                        .fontWeight(.bold)
                    if let min = event.priceRanges?.first?.min, let max = event.priceRanges?.first?.max {
                        let priceRangeString = "\(min)-\(max)"
                        Text(priceRangeString)
                            .foregroundColor(.gray)
                    } else {
                        Text("N/A")
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("Ticket Status")
                        .fontWeight(.bold)
                    if let status = event.dates?.status?.code {
                        ZStack {
                            RoundedRectangle(cornerRadius: 5)
                                .fill(statusColor(status: status))
                                .frame(width: 90, height: 30)
                            Text(statusText(status: status))
                                .foregroundColor(.white)
                        }
                    } else {
                        Text("N/A")
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(.bottom, 10)
            
            Button(action: {
                if (eventFavorited(id: id)) {
                    removeEvent(id: id)
                } else {
                    var date = ""
                    if let localDate = event.dates?.start.localDate {
                        date = localDate
                    }
                    var name = ""
                    if let event_name = event.name {
                        name = event_name
                    }
                    var venue = ""
                    if let venue_name = event._embedded?.venues.first?.name {
                        venue = venue_name
                    }
                    saveEvent(id: id, date: date, event: name, segment: segment, genre: genre, subGenre: subGenre, venue: venue)
                    // Show toast
                    showToast = true
                }
            }) {
                Text(eventFavorited(id: id) ? "Remove Favorite" : "Save Event")
                    .foregroundColor(.white)
                    .padding(.horizontal, 25)
                    .padding(.vertical, 12)
                    .background(eventFavorited(id: id) ? Color.red : Color.blue)
                    .cornerRadius(5)
            }
            .padding(.bottom, 10)
            
//            if (eventFavorited(id: id)) { // event favorited already
//                Button(action: {
//                    removeEvent(id: id)
//                }) {
//                    Text("Remove Favorited")
//                        .foregroundColor(.white)
//                        .padding(.horizontal, 25)
//                        .padding(.vertical, 12)
//                        .background(Color.red)
//                        .cornerRadius(5)
//                }
//                .padding(.bottom, 10)
//            } else { // not yet favorited
//                Button(action: {
//                    var date = ""
//                    if let localDate = event.dates?.start.localDate {
//                        date = localDate
//                    }
//                    var name = ""
//                    if let event_name = event.name {
//                        name = event_name
//                    }
//                    var venue = ""
//                    if let venue_name = event._embedded?.venues.first?.name {
//                        venue = venue_name
//                    }
//                    saveEvent(id: id, date: date, event: name, segment: segment, genre: genre, subGenre: subGenre, venue: venue)
//                }) {
//                    Text("Save Event")
//                        .foregroundColor(.white)
//                        .padding(.horizontal, 25)
//                        .padding(.vertical, 12)
//                        .background(Color.blue)
//                        .cornerRadius(5)
//                }
//                .padding(.bottom, 10)
//            }
            
            if let imageUrl = event.seatmap?.staticUrl {
                KFImage(URL(string: imageUrl)!)
                    .resizable()
                    .frame(width: 230, height: 230)
            } else {
                Text("No Venue Image")
            }
            
            HStack {
                Text("Buy Ticket At:")
                    .fontWeight(.bold)
                if let urlString = event.url {
                    Link("Ticketmaster", destination: URL(string: urlString)!)
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                }
            }
            
            HStack {
                Text("Share on: ")
                    .fontWeight(.bold)
                let facebookUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Facebook_logo_%28square%29.png/800px-Facebook_logo_%28square%29.png"
                let twitterUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Twitter2.svg/2048px-Twitter2.svg.png"
                Button(action: goToFacebook) {
                    KFImage(URL(string: facebookUrl)!)
                        .resizable()
                        .frame(width: 35, height: 35)
                        .cornerRadius(40)
                }
                Button(action: goToTwitter) {
                    KFImage(URL(string: twitterUrl)!)
                        .resizable()
                        .frame(width: 35, height: 35)
                        .cornerRadius(40)
                }

            }
        }
        .padding(.horizontal, 10)
        .toast(isShowing: $showToast, text: Text("Added to favorites"))
    }
    
    func checkAttractionNames(attraction_names: [String]) -> String {
        var displayedItems = ""
        if attraction_names.count > 0 {
            for i in 0..<attraction_names.count {
                if i > 0 {
                    displayedItems += " | "
                }
                displayedItems += attraction_names[i]
            }
        } else {
            displayedItems = "N/A"
        }
        print (displayedItems)
        return displayedItems
    }
    
    func statusText(status: String) -> String {
        if (status == "onsale") { // green #3a8726
            return "On Sale";
        } else if (status == "rescheduled") { // yellow/orange #dfa439
            return "Rescheduled";
        } else if (status == "offsale") { // red #d22e20
            return "Off Sale";
        } else if (status == "cancelled") {
            return "Cancelled";
        } else if (status == "postponed") {
            return "Postponed";
        }
        return "N/A"
    }
    
    func statusColor(status: String) -> Color {
        switch status {
        case "onsale":
            return .green // green
        case "rescheduled":
            return .yellow // yellow/orange
        case "offsale":
            return .red // red
        case "cancelled":
            return .black
        case "postponed":
            return .orange
        default:
            return .gray
        }
    }
    
    func goToTwitter() {
        if let eventName = event.name, let eventUrl = event.url {
            if let urlString = "https://twitter.com/intent/tweet?text=Check out \(eventName) on Ticketmaster \(eventUrl)!)".addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
                print(urlString)
                openURL(URL(string: urlString)!)
            }
        }
    }
    
    func goToFacebook() {
        if let eventUrl = event.url {
            let urlString = "https://www.facebook.com/sharer/sharer.php?u=\(eventUrl)&amp;src=sdkpreparse"
            openURL(URL(string: urlString)!)
        }
    }
    
    func saveEvent(id: String, date: String, event: String, segment: String, genre: String, subGenre: String, venue: String) {
        print("save event")
        let newFavoritedEvent = FavoritedEvent(id: id, date: date, event: event, segment: segment, genre: genre, subGenre: subGenre, venue: venue)
        GlobalVariables.favoritedEvents.append(newFavoritedEvent)
    }
    
    func removeEvent(id: String) {
        print("remove event")
        GlobalVariables.favoritedEvents.removeAll { $0.id == id }
    }
    
    func eventFavorited(id: String) -> Bool {
        for event in GlobalVariables.favoritedEvents {
            if event.id == id {
                return true
            }
        }
        return false;
    }
}

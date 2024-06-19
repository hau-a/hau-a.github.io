//
//  Events.swift
//  event_search
//
//  Created by Ashley Hau on 5/3/23.
//

import Foundation
import SwiftUI
import Kingfisher

struct EventsResult: Codable {
    var _embedded: Embedded
}

struct Embedded: Codable {
    var events: [Event]?
}

struct Event: Codable, Identifiable {
    var id: String
    var name: String
    var dates: Dates
    var images: [Image]
    var _embedded: EmbeddedVenueAttractions
}

// date and time
struct Dates: Codable {
    var start: Start
    var status: Status?
}

struct Status: Codable {
    var code: String
}

struct Start: Codable {
    var localDate: String
    var localTime: String
}

// image
struct Image: Codable {
    var url: String
}

// venue and attractions
struct EmbeddedVenueAttractions: Codable {
    var venues: [Venue]
    var attractions: [Attractions]? // some events do not have attractions
}

// venue struct in VenueTab.swift
struct Venue: Codable {
    var name: String
}

struct Attractions: Codable {
    var name: String
}

// a row in the results
struct EventRow: View {
    var event: Event
    
    var body: some View {
        HStack {
            Text("\(event.dates.start.localDate) | \(event.dates.start.localTime)")
                .font(.system(size: 12))
                .foregroundColor(.gray)
                .lineLimit(3)
                .lineSpacing(2)
                .truncationMode(.tail)

            let imageUrl = event.images.first?.url ?? ""
            KFImage(URL(string: imageUrl)!)
                .resizable()
                .frame(width: 50, height: 50)
                .cornerRadius(10)

            Text(event.name)
                .font(.system(size: 15))
                .fontWeight(.bold)
                .lineLimit(3)
                .lineSpacing(2)
                .truncationMode(.tail)

            Text(event._embedded.venues.first?.name ?? "")
                .font(.system(size: 15))
                .foregroundColor(.gray)
                .fontWeight(.bold)
                .lineLimit(3)
                .lineSpacing(2)
                .truncationMode(.tail)
        }
    }
}

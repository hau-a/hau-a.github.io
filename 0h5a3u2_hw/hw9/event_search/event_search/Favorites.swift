//
//  Favorites.swift
//  event_search
//
//  Created by Ashley Hau on 5/4/23.
//

import Foundation
import SwiftUI

struct GlobalVariables {
    static var favoritedEvents: [FavoritedEvent] = []
}

struct FavoritedEvent: Codable, Identifiable {
    var id: String
    var date: String
    var event: String
    var segment: String
    var genre: String
    var subGenre: String
    var venue: String
}

struct FavoritedRow: View {
    var favoritedEvent: FavoritedEvent
    
    var body: some View {
        HStack {
            Text(favoritedEvent.date)
                .font(.system(size: 15))
                .lineLimit(3)
                .lineSpacing(2)

            Text(favoritedEvent.event)
                .font(.system(size: 15))
                .lineLimit(3)
                .lineSpacing(2)
            
            HStack {
                Text(favoritedEvent.segment)
                    .font(.system(size: 15))
                if (!favoritedEvent.genre.isEmpty) {
                    Text("| \(favoritedEvent.genre)")
                        .font(.system(size: 15))
                }
                if (!favoritedEvent.subGenre.isEmpty) {
                    Text("| \(favoritedEvent.subGenre)")
                        .font(.system(size: 15))
                }
            }

            Text(favoritedEvent.venue)
                .font(.system(size: 15))
                .lineLimit(3)
                .lineSpacing(2)
        }
    }
}


struct Favorites: View {
    
    var body: some View {
        NavigationView {
            if (GlobalVariables.favoritedEvents.isEmpty) {
                Text("No favorites found")
                    .foregroundColor(.red)
            } else {
                List(GlobalVariables.favoritedEvents) { favoritedEvent in
                    FavoritedRow(favoritedEvent: favoritedEvent)
                }
            }
        }
        .navigationTitle("Favorites")
    }
    
    // func save()
    // func load()
}

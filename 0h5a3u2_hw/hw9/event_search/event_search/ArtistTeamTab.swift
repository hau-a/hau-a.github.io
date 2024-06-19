//
//  ArtistTeamTab.swift
//  event_search
//
//  Created by Ashley Hau on 5/4/23.
//

import Foundation
import SwiftUI
import Kingfisher

// search artists
//id: searchedArtist[0].id,
//name: searchedArtist[0].name,
//image: searchedArtist[0].images[0]?.url,
//popularity: searchedArtist[0].popularity,
//followers: searchedArtist[0].followers?.total,
//spotify: searchedArtist[0].external_urls?.spotify,
//albums: ['', '', '']

struct ArtistInfo {
    var id: String
    var name: String
    var image: String
    var popularity: String
    var followers: String
    var spotify: String
    var albums: [String] = []
}

struct SearchedArtist: Codable {
    var id: String?
    var name: String?
    var images: [Images]?
    var popularity: String?
    var followers: Followers?
    var spotify: ExternalUrls?
    // albums
}

struct Images: Codable {
    var url: String
}

struct Followers: Codable {
    var total: String
}

struct ExternalUrls: Codable {
    var spotify: String
}

struct ArtistTeamTab: View {
    var music_event: Bool
    
    var body: some View {
        VStack {
            if (music_event) {
                Section {
                    Text("Artist 1")
                }
                Section {
                    Text("Artist 2")
                }
            } else {
                Text("No music related artist details to shows")
                    .font(.system(size: 28))
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
            }
        }
    }
}


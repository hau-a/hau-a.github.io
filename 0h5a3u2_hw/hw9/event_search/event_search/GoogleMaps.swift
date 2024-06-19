//
//  GoogleMaps.swift
//  event_search
//
//  Created by Ashley Hau on 5/3/23.
//

import Foundation

// google maps api
struct GoogleMapsResult: Codable {
    let results: [GoogleMapsAddress]
}

struct GoogleMapsAddress: Codable {
    let geometry: GoogleMapsGeometry
}

struct GoogleMapsGeometry: Codable {
    let location: GoogleMapsLocation
}

struct GoogleMapsLocation: Codable {
    let lat: Double
    let lng: Double
}

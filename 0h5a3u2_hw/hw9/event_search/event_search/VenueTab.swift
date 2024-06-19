//
//  VenueTab.swift
//  event_search
//
//  Created by Ashley Hau on 5/4/23.
//

import Foundation
import SwiftUI

//const venue = results._embedded.venues[0];
//this.venue = {
//name: venue.name,
//address: venue.address?.line1 ?? '',
//city: venue.city?.name ?? '',
//state: venue.state?.name ?? '',
//phoneNumberDetail: venue.boxOfficeInfo?.phoneNumberDetail ?? '',
//openHoursDetail: venue.boxOfficeInfo?.openHoursDetail ?? '',
//generalRule: venue.generalInfo?.generalRule ?? '',
//childRule: venue.generalInfo?.childRule ?? ''

struct VenueInfo: Codable {
    var _embedded: VenueInfoEmbedded
}

struct VenueInfoEmbedded: Codable {
    var venues: [VenueData]
}

struct VenueData: Codable {
    var name: String?
    var address: Address?
    var city: City?
    var state: StateInfo?
    var boxOfficeInfo: BoxOfficeInfo? // not present when calling Event Details api
    var generalInfo: GeneralInfo?
}

struct Address: Codable {
    var line1: String?
}

struct City: Codable {
    var name: String
}

// cannot name it state since it has the same name as existing SwiftUI property
struct StateInfo: Codable {
    var name: String?
}

struct BoxOfficeInfo: Codable {
    var phoneNumberDetail: String?
    var openHoursDetail: String?
}

struct GeneralInfo: Codable {
    var generalRule: String?
    var childRule: String?
}
          
struct VenueTab: View {
    var eventName: String
    var venue: VenueData
    
    var body: some View {
        VStack {
            Text(eventName)
                .font(.system(size: 20))
                .fontWeight(.bold)
                .padding(.bottom, 15)
            
            Group {
                Text("Name")
                    .fontWeight(.bold)
                if let venueName = venue.name {
                    Text(venueName)
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                }
            }
            
            Group {
                Text("Address")
                    .fontWeight(.bold)
                if let address = venue.address?.line1 {
                    Text(address)
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                }
            }
            
            Group {
                Text("Phone Number")
                    .fontWeight(.bold)
                if let phoneNumber = venue.boxOfficeInfo?.phoneNumberDetail {
                    Text(phoneNumber)
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                }
            }
            
            Group {
                Text("Open Hours")
                    .fontWeight(.bold)
                if let openHours = venue.boxOfficeInfo?.openHoursDetail {
                    ScrollView {
                        Text(openHours)
                            .foregroundColor(.gray)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.bottom, 25)
                    }
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                        .padding(.bottom, 25)
                }
            }
            
            Group {
                Text("General Rule")
                    .fontWeight(.bold)
                if let generalRule = venue.generalInfo?.generalRule {
                    ScrollView {
                        Text(generalRule)
                            .foregroundColor(.gray)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                }
            }
            
            Group {
                Text("Child Rule")
                    .fontWeight(.bold)
                if let childRule = venue.generalInfo?.childRule {
                    ScrollView {
                        Text(childRule)
                            .foregroundColor(.gray)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    Text("N/A")
                        .foregroundColor(.gray)
                        .padding(.bottom, 5)
                }
            }
            
            Button(action: showVenueMap) {
                Text("Show Venue on Maps")
                    .foregroundColor(.white)
                    .padding(.horizontal, 25)
                    .padding(.vertical, 12)
                    .background(Color.red)
                    .cornerRadius(5)
            }
            .padding(10)
        }
        .padding(10)
    }
    
    func showVenueMap() {
        print("show venue map")
    }
}

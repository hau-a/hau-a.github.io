//
//  Search.swift
//  event_search
//
//  Created by Ashley Hau on 4/20/23.
//

import Foundation
import SwiftUI
import Kingfisher

class ViewModel: ObservableObject {
    @Published var suggestions: [String] = []
    
    func fetchSuggestions(keyword: String) {
        self.suggestions.removeAll() // make sure old suggestions are removed
        
        let urlString = "https://ticketmaster-angular-node.wl.r.appspot.com/suggestAttractions?keyword=\(keyword.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)" // allow space in keyword
        print(urlString)
        if let url = URL(string: urlString) {
            let task = URLSession.shared.dataTask(with: url) { data, response, error in
                guard let data = data, error == nil else {
                    return
                }
                
                // convert to JSON here
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let embedded = json["_embedded"] as? [String: Any],
                       let attractions = embedded["attractions"] as? [[String: Any]] {
                        
                        var suggestions = [String]()
                        for attraction in attractions {
                            if let name = attraction["name"] as? String {
                                suggestions.append(name)
                            }
                        }
                        
                        DispatchQueue.main.async {
                            self.suggestions = suggestions
                        }
                    }
                } catch {
                    print(error)
                }
            }
            task.resume()
        }
    }
}

struct Search: View {
    @ObservedObject var viewModel = ViewModel()
    
    @State var keyword = ""
    @State private var distance = "10"
    @State private var selectedCategory = "Default"
    let category = ["Default", "Music", "Sports", "Arts & Theatre", "Film", "Miscellaneous"]
    @State private var location = ""
    @State private var detectLocation = false
    
    // keyword suggestions
    @State var showSuggestions = false
    @State var suggestions: [String] = []
    
    // results table
    @State var waitingResults = false
    @State var showResults = false
    @State var resultArray: [Event] = []
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Text("Keyword: ")
                            .foregroundColor(.gray)
                        TextField("Required", text: $keyword)
                            .onSubmit {
                                // Call API to get suggestions based on keywordValue
                                // Update suggestions array with results
                                viewModel.fetchSuggestions(keyword: keyword)
                                showSuggestions = true
                            }
                            .disableAutocorrection(true)
                    }
                    HStack {
                        Text("Distance: ")
                            .foregroundColor(.gray)
                        TextField("", text: $distance)
                            .keyboardType(.numberPad)
                    }
                    HStack {
                        Text("Category: ")
                            .foregroundColor(.gray)
                        Picker("", selection: $selectedCategory) {
                            ForEach(category, id: \.self) {
                                Text($0)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    if (!detectLocation) {
                        HStack {
                            Text("Location: ")
                                .foregroundColor(.gray)
                            TextField("Required", text: $location)
                        }
                    }
                    Toggle("Auto-detect my location", isOn: $detectLocation)
                        .foregroundColor(.gray)
                        .toggleStyle(SwitchToggleStyle(tint: .green))
                    HStack {
                        Spacer()
                        Button(action: onSubmit) {
                            Text("Submit")
                                .foregroundColor(.white)
                                .padding(.horizontal, 25)
                                .padding(.vertical, 12)
                                .background(keyword.isEmpty || distance.isEmpty || (location.isEmpty && !detectLocation) ? Color.gray : Color.red)
                                .cornerRadius(5)
                        }
                        .disabled(keyword.isEmpty || distance.isEmpty || (location.isEmpty && !detectLocation))
                        .buttonStyle(BorderlessButtonStyle())
                        Spacer()
                        Button(action: onClear) {
                            Text("Clear")
                                .foregroundColor(.white)
                                .padding(.horizontal, 25)
                                .padding(.vertical, 12)
                                .background(Color.blue)
                                .cornerRadius(5)
                        }
                        .buttonStyle(BorderlessButtonStyle())
                        Spacer()
                    }
                    .padding(.top, 10) // Add some bottom padding to the buttons
                    .padding(.bottom, 10) // Add some bottom padding to the buttons
                }
                .navigationTitle("Event Search")
                .sheet(isPresented: Binding(
                    get: { showSuggestions && !keyword.isEmpty },
                    set: { showSuggestions = $0 }
                )) {
                    Suggestions(suggestions: viewModel.suggestions, keyword: $keyword, showSuggestions: $showSuggestions)
                }
                
                // results
                if (showResults) {
                    Section {
                        Text("Results")
                            .font(.system(size: 28))
                            .fontWeight(.bold)
                        if (waitingResults) { // fetching results
                            PleaseWait()
                        } else {
                            if (resultArray.isEmpty) {
                                Text("No result available")
                                    .foregroundColor(.red)
                            } else {
                                List(resultArray) { event in
                                    NavigationLink(destination: EventDetails(eventId: event.id, venue: event._embedded.venues.first?.name ?? "")) {
                                        EventRow(event: event)
                                    }.padding(.trailing, 10)
                                }
                            }
                        }
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    ZStack {
                        NavigationLink(destination: Favorites()) {
                            Label("", systemImage: "heart.circle")
                        }
                    }
                }
            }
        }
        
    }
    
    func favoritesPage() {
        print("favorite page")
    }
    
    func onClear() {
        keyword = ""
        distance = "10"
        selectedCategory = "Default"
        location = ""
        detectLocation = false
        showResults = false
    }
    
    func onSubmit() { // after form submits
        print("Keyword: \(keyword)")
        print("Distance: \(distance)")
        print("Selected category: \(selectedCategory)")
        print("Location: \(location)")
        print("Detect location: \(detectLocation)")
        
        showResults = true // show results section
        resultArray.removeAll() // make sure old event results are removed
        waitingResults = true
        
        var lat: Double = 0.0
        var lng: Double = 0.0
        // check if location has a value or detect location is on
        if (detectLocation) {
            let ipAPI = "https://ipinfo.io/"
            let token = "0709684373d95e"
            
            let urlString = "\(ipAPI)?token=\(token)"
            print(urlString)
            
            if let url = URL(string: urlString) {
                let task = URLSession.shared.dataTask(with: url) { data, response, error in
                    guard let data = data, error == nil else {
                        return
                    }
                    
                    // convert to JSON here
                    do {
                        let json = try JSONSerialization.jsonObject(with: data, options: [])
                        if let results = json as? [String: Any], let location = results["loc"] as? String {
                            let locArray = location.split(separator: ",") // split the string that has lat,lng format
                            if let lat = Double(locArray[0]), let lng = Double(locArray[1]) {
                                print("ip: \(lat) \(lng)")
                                searchEvents(lat: lat, lng: lng)
                            }
                        }
                    } catch {
                        print(error)
                    }
                }
                task.resume()
            }
        } else if (!location.isEmpty) {
            let googleMapsAPI = "https://maps.googleapis.com/maps/api/geocode/json"
            let key = "AIzaSyCI5WO37tDxtDVRzsYVaZmF_qak850z2jw";
            
            let urlString = "\(googleMapsAPI)?key=\(key)&address=\(location.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"
            print(urlString)
            if let url = URL(string: urlString) {
                let task = URLSession.shared.dataTask(with: url) { data, response, error in
                    guard let data = data, error == nil else {
                        return
                    }
                    
                    // convert to JSON here
                    guard let googleMapsResult = try? JSONDecoder().decode(GoogleMapsResult.self, from: data),
                          let location = googleMapsResult.results.first?.geometry.location else {
                        print("Failed to decode JSON or retrieve location")
                        return
                    }
                    print(location)
                    lat = location.lat
                    lng = location.lng
                    searchEvents(lat: lat, lng: lng)
                }
                task.resume()
            }
        }
    }
    
    func searchEvents(lat: Double, lng: Double) {
        print("lat: \(lat)")
        print("lng: \(lng)")
        
        // segment id
        var segmentId = ""
        // "Default", "Music", "Sports", "Arts & Theatre", "Film", "Miscellaneous"
        if (selectedCategory == "Default") {
            segmentId = ""
        } else if (selectedCategory == "Music") {
            segmentId = "KZFzniwnSyZfZ7v7nJ"
        } else if (selectedCategory == "Sports") {
            segmentId = "KZFzniwnSyZfZ7v7nE"
        } else if (selectedCategory == "Arts & Theatre") {
            segmentId = "KZFzniwnSyZfZ7v7na"
        } else if (selectedCategory == "Film") {
            segmentId = "KZFzniwnSyZfZ7v7nn"
        } else if (selectedCategory == "Miscellaneous") {
            segmentId = "KZFzniwnSyZfZ7v7n1"
        }
        
        let urlString = "https://ticketmaster-angular-node.wl.r.appspot.com/searchEvents?keyword=\(keyword.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)&radius=\(distance)&segmentId=\(segmentId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)&lat=\(lat)&lng=\(lng)"
        print(urlString)
        if let url = URL(string: urlString) {
            let task = URLSession.shared.dataTask(with: url) { data, response, error  in
                guard let data = data, error == nil else {
                    return
                }
                
                do {
                    let eventsResult = try JSONDecoder().decode(EventsResult.self, from: data)
                    if let events = eventsResult._embedded.events {
                        resultArray = events
                        waitingResults = false
                    } else {
                        // let resultArray = [Event]() // no results
                        waitingResults = false
                        print("No results or failed to get event results")
                        return
                        
                    }
                    
                    print("WAITING... \(waitingResults)")
                    if (!resultArray.isEmpty) {
                        // events array is not nil
                        print(resultArray)
                    } else {
                        // no events with search query
                        print("No events!")
                    }
                } catch {
                    print("Error decoding JSON: \(error)")
                }
                
                // convert to JSON here
                //guard let eventsResult = try? JSONDecoder().decode(EventsResult.self, from: data),
                      //let events = eventsResult._embedded.events else {
                    // let resultArray = [Event]() // no results
                    //waitingResults = false
                    //print("No results or failed to get event results")
                    //return
                //}
            }
            task.resume() // make API call
        }
    }
}

struct Search_Previews: PreviewProvider {
    static var previews: some View {
        Search()
    }
}

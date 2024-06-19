//
//  ProgressView.swift
//  event_search
//
//  Created by Ashley Hau on 5/4/23.
//

import Foundation
import SwiftUI

struct PleaseWait: View {
    var body: some View {
        HStack {
            Spacer()
            VStack {
                ProgressView().progressViewStyle(CircularProgressViewStyle())
                    .padding(.top, 3)
                    .padding(.bottom, 3)
                    .foregroundColor(.gray)
                Text("Please wait...")
                    .foregroundColor(.gray)
            }
            Spacer()
        }
    }
}

struct Loading: View {
    var body: some View {
        VStack {
            Spacer()
            ProgressView().progressViewStyle(CircularProgressViewStyle())
                .padding(.bottom, 5)
            Text("loading...")
            Spacer()
        }
    }
}


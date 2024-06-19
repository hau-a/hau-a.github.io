import { Component, OnInit } from '@angular/core';

export interface EventObject {
  order: number;
  id: string;
  date: string;
  name: string;
  category: string;
  venue: string;
}

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})

export class FavoritesComponent implements OnInit {
  ngOnInit(): void {
    this.getFavoritedEvents(); // call method when page is loaded
  }

  totalFavoriteEvents: number = 0;
  events: EventObject[] = [];
  localStorageItems = { ...localStorage };

  getFavoritedEvents() {
    let events = [];
    console.log(this.localStorageItems);
    for (const key in this.localStorageItems) {
      const eventObject: EventObject = JSON.parse(this.localStorageItems[key]);
      events.push({
        order: eventObject.order,
        id: key,
        date: eventObject.date,
        name: eventObject.name,
        category: eventObject.category,
        venue: eventObject.venue
      });
    }
    // sort the events array with the order number
    events.sort((a, b) => a.order - b.order);
    this.events = events;
    console.log(this.events);
    // check if there are any favorite events to display using length
    this.totalFavoriteEvents = this.events.length;
    console.log(this.totalFavoriteEvents);
  }

  removeFromFavorites(eventId: string) {
    localStorage.removeItem(eventId);
    // if event.id !== eventId, then it is not going to be in the new array
    this.events = this.events.filter(event => event.id !== eventId);
    this.totalFavoriteEvents = this.events.length;
    alert("Removed from Favorites!");
  }
}

import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, tap, switchMap, finalize, distinctUntilChanged, filter } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})

export class SearchComponent {
  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
  ) {}

  // details container -> selecting tab
  selectedTab: string = 'tab1';

  selectTab(tab: string): void { // when tab is selected, change the active tab
    this.selectedTab = tab;
  }
}

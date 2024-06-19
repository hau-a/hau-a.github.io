import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchComponent } from './search/search.component';
import { FavoritesComponent } from './favorites/favorites.component';

const routes: Routes = [
  // make the application navigate to the search page automatically
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  // add a parameterized route to the routes array that matches the path pattern
  { path: 'search', component: SearchComponent },
  { path: 'favorites', component: FavoritesComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

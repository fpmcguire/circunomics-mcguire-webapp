import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/ui/header/header.component';
import { FooterComponent } from './shared/ui/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    // app-root is a real DOM element sitting between body and the shell
    // children. It must participate in the flex chain so main can fill
    // the remaining height between the sticky header and the footer.
    class: 'app-root',
  },
})
export class App {}

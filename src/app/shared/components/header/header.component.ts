// Ahora es solo la barra superior de MOBILE (hamburguesa + marca). La
// navegación, notificaciones, modo oscuro y logout se movieron a SidebarComponent
// — en mobile el sidebar se abre como Drawer disparado por el botón de acá.
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiStateService } from '../../../core/ui-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  uiState = inject(UiStateService);
}

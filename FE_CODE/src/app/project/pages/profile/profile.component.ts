import { Component } from '@angular/core';
import { AuthQuery } from '@tungle/project/auth/auth.query';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  constructor(public authQuery: AuthQuery) {}

  /**
   * Get user role label in Vietnamese
   * @param role User role code
   * @returns Vietnamese label for the role
   */
  getRoleLabel(role?: string): string {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'manager':
        return 'Quản lý';
      case 'user':
        return 'Nhân viên';
      default:
        return 'Chưa xác định';
    }
  }
}

import { Component } from '@angular/core';
import { IUpdateAUserReq, UserService } from '@tungle/core/apis/user.service';
import { NotiService } from '@tungle/core/services/noti.service';
import { AuthQuery } from '@tungle/project/auth/auth.query';
import { AuthService } from '@tungle/project/auth/auth.service';
import { IUploadRes } from '@tungle/project/shared/upload/upload.component';
import { take } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  constructor(
    public authQuery: AuthQuery,
    private userService: UserService,
    private notiService: NotiService,
    private _authService: AuthService
  ) {}

  ngOnInit() {}

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

  /**
   * Handle user avatar upload
   * @param $event Upload event containing image URL
   */
  updateUser($event: IUploadRes) {
    // Only process when upload is complete (isLoading === false)
    if ($event.isLoading === false && $event.imgUrl) {
      this.authQuery.user$.pipe(take(1)).subscribe(async (user) => {
        const body: IUpdateAUserReq = {
          id: user.id,
          fullName: user.fullName,
          sex: user.sex!,
          dob: user.dob!,
          address: user.address!,
          position: user.position!,
          avatarUrl: $event.imgUrl!,
          role: user.role!
        };

        try {
          await this.userService.updateAUser(body);
          this._authService.getUser();
          this.notiService.success('Cập nhật ảnh đại diện thành công');
        } catch (err) {
          console.error('Update user error:', err);
          this.notiService.error('Lỗi khi cập nhật ảnh đại diện');
        }
      });
    }
  }
}

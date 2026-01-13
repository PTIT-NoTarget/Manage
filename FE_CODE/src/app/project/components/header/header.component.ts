import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@tungle/core/apis/auth.service';
import { IGetAllNotiReq, INoti, NotificationService } from '@tungle/core/apis/notification.service';
import { TaskService } from '@tungle/core/apis/task.service';
import { AuthQuery } from '@tungle/project/auth/auth.query';
import { NzModalService } from 'ng-zorro-antd/modal';
import { jwtDecode } from 'jwt-decode';
import { JwtPayloadWithId } from '@tungle/project/auth/auth.service';
import { IssueModalComponent } from '../issues/issue-modal/issue-modal.component';
import { ProjectService } from '@tungle/project/state/project/project.service';
import { ProjectQuery } from '@tungle/project/state/project/project.query';
import { firstValueFrom, from, of } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { JIssue } from '@tungle/interface/issue';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  totalCountNoti: number = 0;
  listNoti: INoti[] = [];
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authQuery: AuthQuery,
    private authService: AuthService,
    private notificationService: NotificationService,
    private modalService: NzModalService,
    private projectService: ProjectService,
    private projectQuery: ProjectQuery,
    private taskService: TaskService
  ) {}

  async ngOnInit() {
    await this.getAllNoti();
    // Lắng nghe thông báo
    const accessToken = localStorage.getItem('accessToken');
    this.notificationService.onTaskNotification((data: INoti) => {
      if (data.user_id === jwtDecode<JwtPayloadWithId>(accessToken!).id || data.user_id === 0) {
        this.listNoti.unshift(data);
        this.totalCountNoti += 1;
      }
    });
  }

  ngOnDestroy() {
    this.notificationService.disconnect();
  }

  async getAllNoti() {
    const accessToken = localStorage.getItem('accessToken');
    const body: IGetAllNotiReq = {
      page: 1,
      pageSize: 99999,
      user_id: jwtDecode<JwtPayloadWithId>(accessToken!).id
    };
    const res = await this.notificationService.getAllNoti(body);
    this.listNoti = res.notis.map((item) => {
      if (item.message === '') {
        const metadataTaskStatus = JSON.parse(item.metadata);

        item.message = `${metadataTaskStatus.nameUserUpdate} vừa đổi trạng thái công việc "${metadataTaskStatus?.taskName}" từ ${metadataTaskStatus.prevStatus} sang ${metadataTaskStatus.currentStatus}`;
        return item;
      }
      return item;
    });
    this.totalCountNoti = res.notis.filter((item) => item.seen === false).length;
  }

  sendNotification(data: INoti) {
    this.notificationService.sendTaskNotification(data);
  }

  async openNotiDetail(item: INoti) {
    // 1) mark as seen
    if (!item.seen) {
      item.seen = true;
      this.totalCountNoti = this.listNoti.filter((x) => x.seen === false).length;
      this.cdr.detectChanges();

      try {
        await this.notificationService.updateANoti({ id: item.id, seen: true });
      } catch {
        // ignore API errors (optimistic UI)
      }
    }

    // 2) open task modal if metadata includes ids
    let metadata: any = null;
    try {
      metadata = item.metadata ? JSON.parse(item.metadata) : null;
    } catch {
      metadata = null;
    }

    const taskId = Number(metadata?.taskId ?? metadata?.task_id);
    const projectId = Number(metadata?.projectId ?? metadata?.project_id);

    if (!taskId || !projectId) {
      return;
    }

    const issue$ = this.projectQuery.issueById$(taskId).pipe(
      take(1),
      switchMap((issue) => {
        if (issue) {
          return of(issue);
        }

        return from(this.taskService.findById(taskId)).pipe(
          map((task) => task as unknown as JIssue),
          tap((fetched) => {
            if (fetched) {
              this.projectService.upsertIssueToStore(fetched);
            }
          }),
          catchError(() => of(undefined))
        );
      })
    );

    const issue = await firstValueFrom(issue$);
    if (!issue) {
      return;
    }

    this.modalService.create({
      nzContent: IssueModalComponent,
      nzWidth: 1040,
      nzClosable: false,
      nzFooter: null,
      nzComponentParams: {
        issue$: of(issue)
      }
    });
  }

  logOut() {
    this.authService.logout();
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { JIssue } from '@tungle/interface/issue';
import { ProjectQuery } from '@tungle/project/state/project/project.query';
import { NzModalService } from 'ng-zorro-antd/modal';
import { IssueDeleteModalComponent } from '../issue-delete-modal/issue-delete-modal.component';
import { DeleteIssueModel } from '@tungle/interface/ui-model/delete-issue-model';
import { JTask } from '@tungle/interface/project';
import { IGetAllUserReq, UserService } from '@tungle/core/apis/user.service';
import { JUser } from '@tungle/interface/user';
import { Observable, from, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { AuthQuery } from '@tungle/project/auth/auth.query';
import { PermissionUtil } from '@tungle/project/utils/permission';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

@Component({
  selector: 'issue-detail',
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.scss']
})
@UntilDestroy()
export class IssueDetailComponent implements OnInit, OnChanges {
  @Input() issue: JIssue | null | undefined;
  /** If null, component auto-detects based on user role/id + issue ownership */
  @Input() readOnly: boolean | null = null;
  @Input() isShowFullScreenButton!: boolean;
  @Input() isShowCloseButton!: boolean;
  @Output() onClosed = new EventEmitter();
  @Output() onOpenIssue = new EventEmitter<number>();
  @Output() onDelete = new EventEmitter<DeleteIssueModel>();

  //by tung
  @Input() task: JTask | null | undefined;

  users$!: Observable<JUser[]>;

  isReadOnly: boolean = false;
  private currentUserId: number | null = null;
  private currentRole: string | null = null;

  constructor(
    public projectQuery: ProjectQuery,
    private _modalService: NzModalService,
    private userService: UserService,
    private authQuery: AuthQuery
  ) {}

  ngOnInit() {
    this.users$ = this.buildUsers$();

    this.authQuery.userId$.pipe(untilDestroyed(this)).subscribe((id) => {
      this.currentUserId = id ?? null;
      this.computeReadOnly();
    });

    this.authQuery.role$.pipe(untilDestroyed(this)).subscribe((role) => {
      this.currentRole = role ?? null;
      this.computeReadOnly();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.issue || changes.readOnly) {
      this.computeReadOnly();
    }
  }

  private computeReadOnly() {
    if (this.readOnly !== null) {
      this.isReadOnly = this.readOnly;
      return;
    }

    this.isReadOnly = !PermissionUtil.canEditIssue(
      this.issue ?? undefined,
      this.currentUserId,
      this.currentRole
    );
  }

  private buildUsers$(): Observable<JUser[]> {
    const allUsersBody: IGetAllUserReq = {
      page: 1,
      pageSize: 1000
    };

    const allUsers$ = from(this.userService.getAllUser(allUsersBody)).pipe(
      map((res) => res?.users ?? []),
      catchError(() => of([] as JUser[])),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.projectQuery.users$.pipe(
      switchMap((projectUsers) =>
        Array.isArray(projectUsers) && projectUsers.length > 0
          ? of(projectUsers as JUser[])
          : allUsers$
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  openDeleteIssueModal() {
    if (this.isReadOnly) {
      return;
    }

    this._modalService.create({
      nzContent: IssueDeleteModalComponent,
      nzClosable: false,
      nzFooter: null,
      nzStyle: {
        top: '140px'
      },
      nzComponentParams: {
        issueId: this.issue?.id,
        onDelete: this.onDelete
      }
    });
  }

  closeModal() {
    this.onClosed.emit();
  }

  openIssuePage() {
    this.onOpenIssue.emit(this.issue?.id);
  }

  // convertTaskToIssue(): JIssue {
  //   return {
  //     id: this.task?.id!,
  //     title: this.task?.name ?? '',
  //     type: this.task?.label as any,
  //     status: this.task?.status as any,
  //     priority: this.task?.priority as any,
  //     listPosition: 0,
  //     description: this.task?.description ?? '',
  //     estimate: this.task?.story_point ?? 0,
  //     timeSpent: this.task?.story_point ?? 0,
  //     timeRemaining: this.task?.story_point ?? 0,
  //     createdAt: this.task?.createdAt ?? '',
  //     updatedAt: this.task?.updatedAt ?? '',
  //     reporterId: this.task?.assigned_by! ?? '',
  //     userIds: [],
  //     comments: [],
  //     projectId: this.task?.project_id!
  //   };
  // }
}

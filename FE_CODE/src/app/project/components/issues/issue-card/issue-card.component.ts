import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { IssueStatus, JIssue } from '@tungle/interface/issue';
import { IssuePriorityIcon } from '@tungle/interface/issue-priority-icon';
import { JUser } from '@tungle/interface/user';
import { ProjectQuery } from '@tungle/project/state/project/project.query';
import { IssueUtil } from '@tungle/project/utils/issue';
import { NzModalService } from 'ng-zorro-antd/modal';
import { IssueModalComponent } from '../issue-modal/issue-modal.component';
import { NotiService } from '@tungle/core/services/noti.service';
import { ProjectService } from '@tungle/project/state/project/project.service';

@Component({
  selector: 'issue-card',
  templateUrl: './issue-card.component.html',
  styleUrls: ['./issue-card.component.scss']
})
@UntilDestroy()
export class IssueCardComponent implements OnChanges, OnInit {
  @Input() issue: JIssue | undefined;
  @Input() readOnly: boolean = false;
  assignees: (JUser | undefined)[] = [];
  issueTypeIcon: string = '';
  priorityIcon: IssuePriorityIcon | undefined;
  members: JUser[] = [];

  readonly IssueStatus = IssueStatus;

  constructor(
    private _projectQuery: ProjectQuery,
    private _modalService: NzModalService,
    private notiService: NotiService,
    private _projectService: ProjectService
  ) {}

  ngOnInit(): void {
    // this._projectQuery.users$.pipe(untilDestroyed(this)).subscribe((users) => {
    //   this.assignees = this.issue!.userIds?.map((userId) => users.find((x) => x.id === userId));
    // });
    this._projectQuery.users$.pipe(untilDestroyed(this)).subscribe((users) => {
      this.members = users;
      this.assignees = this.issue!.userIds?.map((userId) => users.find((x) => x.id === userId));
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const issueChange = changes.issue;
    if (issueChange?.currentValue !== issueChange.previousValue) {
      this.issueTypeIcon = IssueUtil.getIssueTypeIcon(this.issue!.type);
      this.priorityIcon = IssueUtil.getIssuePriorityIcon(this.issue!.priority);
    }
  }

  openIssueModal(issueId: number) {
    console.log('Opening issue modal for issue ID:', issueId);
    this._modalService.create({
      nzContent: IssueModalComponent,
      nzWidth: 1040,
      nzClosable: false,
      nzFooter: null,
      nzComponentParams: {
        issue$: this._projectQuery.issueById$(issueId),
        readOnly: this.readOnly
      }
    });
  }

  async deleteTask(id: number) {
    if (this.readOnly) {
      this.notiService.warning('Bạn không có quyền xóa công việc này');
      return;
    }

    this._projectService.deleteIssue(Number(id));
  }

  getUserDetail(userId: number | null): JUser | null {
    if (!userId) {
      return null;
    }
    const member = this.members.find((item) => item.id === userId)!;
    return member;
  }

  isOverdue(issue: JIssue | undefined): boolean {
    if (!issue?.endDate) {
      return false;
    }

    if (issue.status === IssueStatus.DONE) {
      return false;
    }

    const end = this.parseEndDate(issue.endDate);
    if (!end) {
      return false;
    }

    return end.getTime() < Date.now();
  }

  private parseEndDate(value: string): Date | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setHours(23, 59, 59, 999);
    }

    return date;
  }
}

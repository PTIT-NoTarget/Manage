import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { JIssue } from '@tungle/interface/issue';
import { JUser } from '@tungle/interface/user';
import { ProjectService } from '@tungle/project/state/project/project.service';

@Component({
  selector: 'issue-assignees',
  templateUrl: './issue-assignees.component.html',
  styleUrls: ['./issue-assignees.component.scss']
})
@UntilDestroy()
export class IssueAssigneesComponent implements OnInit, OnChanges {
  @Input() issue: JIssue | undefined;
  @Input() users: JUser[] | null = null;
  @Input() readOnly: boolean = false;
  assignees: (JUser | undefined)[] = [];

  constructor(private _projectService: ProjectService) {}

  ngOnInit(): void {
    this.recomputeAssignees();
  }

  ngOnChanges(changes: SimpleChanges) {
    const issueChange = changes.issue;
    const usersChange = changes.users;

    const didIssueChange = !!issueChange && issueChange.currentValue !== issueChange.previousValue;
    const didUsersChange = !!usersChange && usersChange.currentValue !== usersChange.previousValue;

    if (didIssueChange || didUsersChange) {
      this.recomputeAssignees();
    }
  }

  private recomputeAssignees(): void {
    if (!this.issue) {
      this.assignees = [];
      return;
    }

    const users = this.users ?? [];
    const userIds = this.issue.userIds ?? [];
    this.assignees = userIds.map((userId) => users.find((x) => x.id === userId));
  }

  removeUser(userId: number) {
    if (this.readOnly) {
      return;
    }
    if (!this.issue) {
      return;
    }

    const newUserIds = (this.issue.userIds ?? []).filter((x) => x !== userId);
    this._projectService.updateIssue({
      ...this.issue,
      userIds: newUserIds
    });
  }

  addUserToIssue(user: JUser) {
    if (this.readOnly) {
      return;
    }
    if (!this.issue) {
      return;
    }

    this._projectService.updateIssue({
      ...this.issue,
      userIds: [...(this.issue.userIds ?? []), user.id]
    });
  }

  isUserSelected(user: JUser): boolean {
    return (this.issue?.userIds ?? []).includes(user.id);
  }
}

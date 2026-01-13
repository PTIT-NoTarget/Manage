import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { JIssue } from '@tungle/interface/issue';
import { JUser } from '@tungle/interface/user';
import { ProjectService } from '@tungle/project/state/project/project.service';

@Component({
  selector: 'issue-reporter',
  templateUrl: './issue-reporter.component.html',
  styleUrls: ['./issue-reporter.component.scss']
})
@UntilDestroy()
export class IssueReporterComponent implements OnChanges {
  @Input() issue: JIssue | undefined;
  @Input() users: JUser[] | null = null;
  @Input() readOnly: boolean = false;
  reporter: JUser | undefined;

  constructor(private _projectService: ProjectService) {}

  ngOnChanges(changes: SimpleChanges) {
    const issueChange = changes.issue;
    const usersChange = changes.users;

    const didIssueChange = !!issueChange && issueChange.currentValue !== issueChange.previousValue;
    const didUsersChange = !!usersChange && usersChange.currentValue !== usersChange.previousValue;

    if (didIssueChange || didUsersChange) {
      const users = this.users ?? [];
      this.reporter = users.find((x) => x.id === this.issue?.reporterId);
    }
  }

  isUserSelected(user: JUser) {
    return user.id === this.issue?.reporterId;
  }

  updateIssue(user: JUser) {
    if (this.readOnly) {
      return;
    }
    if (!this.issue) {
      return;
    }

    this._projectService.updateIssue({
      ...this.issue,
      reporterId: user.id
    });
  }
}

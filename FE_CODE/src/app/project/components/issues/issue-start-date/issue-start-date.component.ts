import { Component, Input, OnChanges } from '@angular/core';
import { JIssue } from '@tungle/interface/issue';
import { ProjectService } from '@tungle/project/state/project/project.service';

@Component({
  selector: 'issue-start-date',
  templateUrl: './issue-start-date.component.html',
  styleUrls: ['./issue-start-date.component.scss']
})
export class IssueStartDateComponent implements OnChanges {
  @Input() issue: JIssue | undefined;
  @Input() readOnly: boolean = false;

  selectedDate: Date | null = null;

  get displayDate(): string {
    if (!this.selectedDate) {
      return 'Chưa có';
    }
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(this.selectedDate);
  }

  constructor(private _projectService: ProjectService) {}

  ngOnChanges(): void {
    if (this.issue?.startDate) {
      this.selectedDate = new Date(this.issue.startDate);
    } else {
      this.selectedDate = null;
    }
  }

  updateDate(date: Date | null) {
    if (this.readOnly) {
      return;
    }
    this.selectedDate = date;
    const startDate = date ? date.toISOString() : null;

    this._projectService.updateIssue({
      ...this.issue!,
      startDate
    });
  }
}

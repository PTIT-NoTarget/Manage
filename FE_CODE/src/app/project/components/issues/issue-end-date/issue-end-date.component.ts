import { Component, Input, OnChanges } from '@angular/core';
import { IssueStatus, JIssue } from '@tungle/interface/issue';
import { ProjectService } from '@tungle/project/state/project/project.service';
import { NotiService } from '@tungle/core/services/noti.service';

@Component({
  selector: 'issue-end-date',
  templateUrl: './issue-end-date.component.html',
  styleUrls: ['./issue-end-date.component.scss']
})
export class IssueEndDateComponent implements OnChanges {
  @Input() issue: JIssue | undefined;
  @Input() readOnly: boolean = false;

  selectedDate: Date | null = null;

  get displayDate(): string {
    if (!this.selectedDate) {
      return 'Chưa có';
    }
    const formatted = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(this.selectedDate);

    if (this.isOverdue()) {
      return `${formatted} (Trễ hạn)`;
    }
    return formatted;
  }

  get iconColor(): string {
    return this.isOverdue() ? '#CD1317' : '#5E6C84';
  }

  get textColor(): string {
    return this.isOverdue() ? '#CD1317' : 'inherit';
  }

  constructor(private _projectService: ProjectService, private _notiService: NotiService) {}

  disabledDate = (current: Date): boolean => {
    if (!this.issue?.startDate) {
      return false;
    }

    const start = new Date(this.issue.startDate);
    if (Number.isNaN(start.getTime())) {
      return false;
    }

    // Disable dates strictly before the start date (by day)
    const currentDate = new Date(current);
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    return currentDate.getTime() < startDate.getTime();
  };

  ngOnChanges(): void {
    if (this.issue?.endDate) {
      this.selectedDate = new Date(this.issue.endDate);
    } else {
      this.selectedDate = null;
    }
  }

  updateDate(date: Date | null) {
    if (this.readOnly) {
      return;
    }

    // Guard: deadline must be >= start date (if start date exists)
    if (date && this.issue?.startDate) {
      const start = new Date(this.issue.startDate);
      if (!Number.isNaN(start.getTime()) && date.getTime() < start.getTime()) {
        this._notiService.warning('Deadline không được nhỏ hơn ngày bắt đầu');
        this.selectedDate = this.issue?.endDate ? new Date(this.issue.endDate) : null;
        return;
      }
    }

    this.selectedDate = date;
    const endDate = date ? date.toISOString() : null;

    this._projectService.updateIssue({
      ...this.issue!,
      endDate
    });
  }

  isOverdue(): boolean {
    if (!this.selectedDate || !this.issue) {
      return false;
    }

    if (this.issue.status === IssueStatus.DONE) {
      return false;
    }

    const end = new Date(this.selectedDate);
    end.setHours(23, 59, 59, 999);

    return end.getTime() < Date.now();
  }
}

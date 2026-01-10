import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'issue-end-date-select',
  templateUrl: './issue-end-date-select.component.html',
  styleUrls: ['./issue-end-date-select.component.scss']
})
export class IssueEndDateSelectComponent {
  @Input() control: FormControl = new FormControl(null);
}

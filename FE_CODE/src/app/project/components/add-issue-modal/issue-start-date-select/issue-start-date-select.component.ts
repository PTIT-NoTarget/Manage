import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'issue-start-date-select',
  templateUrl: './issue-start-date-select.component.html',
  styleUrls: ['./issue-start-date-select.component.scss']
})
export class IssueStartDateSelectComponent {
  @Input() control: FormControl = new FormControl(null);
}

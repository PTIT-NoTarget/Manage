import { Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { JIssue } from '@tungle/interface/issue';
import { FormControl } from '@angular/forms';
import { quillConfiguration } from '@tungle/project/config/editor';
import { ProjectService } from '@tungle/project/state/project/project.service';

@Component({
  selector: 'issue-description',
  templateUrl: './issue-description.component.html',
  styleUrls: ['./issue-description.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class IssueDescriptionComponent implements OnChanges {
  @Input() issue: JIssue | undefined;
  @Input() readOnly: boolean = false;
  descriptionControl: FormControl = new FormControl('');
  editorOptions = quillConfiguration;
  isEditing: boolean = false;
  isWorking: boolean = false;

  constructor(private _projectService: ProjectService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const issueChange = changes.issue;
    if (issueChange.currentValue !== issueChange.previousValue) {
      this.descriptionControl = new FormControl(this.issue?.description ?? '');
    }
  }

  setEditMode(mode: boolean) {
    if (this.readOnly) {
      this.isEditing = false;
      return;
    }
    this.isEditing = mode;
  }

  editorCreated(editor: any) {
    if (editor && editor.focus) {
      editor.focus();
    }
  }

  save() {
    if (this.readOnly) {
      return;
    }
    this._projectService.updateIssue({
      ...this.issue!,
      description: this.descriptionControl.value
    });
    this.setEditMode(false);
  }

  cancel() {
    this.descriptionControl.patchValue(this.issue!.description);
    this.setEditMode(false);
  }
}

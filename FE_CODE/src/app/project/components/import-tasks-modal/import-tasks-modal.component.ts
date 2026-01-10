import { Component, Input } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NotiService } from '@tungle/core/services/noti.service';
import { IImportTasksRes, TaskService } from '@tungle/core/apis/task.service';
import { JwtPayloadWithId } from '@tungle/project/auth/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'import-tasks-modal',
  templateUrl: './import-tasks-modal.component.html',
  styleUrls: ['./import-tasks-modal.component.scss']
})
export class ImportTasksModalComponent {
  @Input() projectId: number | undefined;

  selectedFile: File | null = null;
  isSubmitting = false;
  lastResult: IImportTasksRes | null = null;

  constructor(
    private modalRef: NzModalRef,
    private taskService: TaskService,
    private notiService: NotiService
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
  }

  async submit() {
    if (!this.projectId) {
      this.notiService.error('Thiếu projectId');
      return;
    }
    if (!this.selectedFile) {
      this.notiService.warning('Vui lòng chọn file Excel (.xlsx)');
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    const userId = accessToken ? jwtDecode<JwtPayloadWithId>(accessToken).id : null;
    if (!userId) {
      this.notiService.error('Bạn chưa đăng nhập');
      return;
    }

    this.isSubmitting = true;
    this.lastResult = null;
    try {
      const res = await this.taskService.importTasksFromExcel({
        file: this.selectedFile,
        project_id: this.projectId,
        created_by: userId
      });

      this.lastResult = res;

      if (res.success) {
        if (res.errors?.length) {
          this.notiService.warning(`Import xong nhưng có ${res.errors.length} dòng lỗi`);
        } else {
          this.notiService.success(res.message);
        }
        this.modalRef.close(res);
      } else {
        this.notiService.error(res.message);
      }
    } catch (e: any) {
      this.notiService.error(e?.message);
    } finally {
      this.isSubmitting = false;
    }
  }

  async downloadTemplate() {
    if (!this.projectId) {
      this.notiService.error('Thiếu projectId');
      return;
    }
    try {
      const blob = await this.taskService.downloadImportTemplate(this.projectId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task_import_template_project_${this.projectId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      this.notiService.error(e?.message);
    }
  }

  close() {
    this.modalRef.close();
  }
}

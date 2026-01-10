import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { FormControl, FormGroup } from '@angular/forms';
import { IGetAllUserReq, UserService } from '@tungle/core/apis/user.service';
import { DEFAULT_AVATAR_URL } from '@tungle/project/config/icons';
import { JUser } from '@tungle/interface/user';
import { ExcelService, IExcelCol } from '@tungle/core/apis/excel.service';
import { NotiService } from '@tungle/core/services/noti.service';
import { TaskService } from '@tungle/core/apis/task.service';
import { AuthQuery } from '@tungle/project/auth/auth.query';
import { firstValueFrom, take } from 'rxjs';
import { IssueStatusDisplay } from '@tungle/interface/issue';
import {
  IGetAllProjectReq,
  IGetAllProjectRes,
  ProjectsService
} from '@tungle/core/apis/projects.service';
import { IssueModalComponent } from '@tungle/project/components/issues/issue-modal/issue-modal.component';
import { ProjectService } from '@tungle/project/state/project/project.service';
import { ProjectQuery } from '@tungle/project/state/project/project.query';

@Component({
  selector: 'my-works',
  templateUrl: './my-works.component.html',
  styleUrls: ['./my-works.component.scss']
})
export class MyWorksComponent implements OnInit {
  totalCount!: number;

  private currentUser: JUser | null = null;

  listOfColumn = [
    {
      title: 'ID',
      compare: (a: ItemData, b: ItemData) => a.id - b.id,
      priority: false
    },
    {
      title: 'Tên',
      compare: (a: ItemData, b: ItemData) => a.name.localeCompare(b.name),
      priority: false
    },
    {
      title: 'Trạng thái',
      compare: (a: ItemData, b: ItemData) => a.status.localeCompare(b.status),
      priority: false
    },
    {
      title: 'Dự án',
      compare: (a: ItemData, b: ItemData) => a.projectName.localeCompare(b.projectName),
      priority: false
    },
    {
      title: 'Ngày bắt đầu',
      compare: (a: ItemData, b: ItemData) => a.startDate.localeCompare(b.startDate),
      priority: false
    },
    {
      title: 'Deadline',
      compare: (a: ItemData, b: ItemData) => a.endDate.localeCompare(b.endDate),
      priority: false
    }
  ];

  listOfData: ItemData[] = [];

  form = new FormGroup({
    page: new FormControl(1),
    pageSize: new FormControl(10),
    id: new FormControl(),
    name: new FormControl(),
    createdAt: new FormControl(),
    status: new FormControl()
  });

  users: JUser[] = [];

  projects: IGetAllProjectRes | undefined;

  listStatus = Object.entries(IssueStatusDisplay).map(([value, label]) => ({
    value,
    label
  }));

  constructor(
    private nzModalService: NzModalService,
    private taskService: TaskService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private excelService: ExcelService,
    private notiService: NotiService,
    public authQuery: AuthQuery,
    private projectsService: ProjectsService,
    private _modalService: NzModalService,
    private _projectService: ProjectService,
    private _projectQuery: ProjectQuery
  ) {}

  async ngOnInit() {
    const user = await firstValueFrom(this.authQuery.user$);
    this.currentUser = user;
    await this.fetchAllProjects(user.id);
    await this.getAllTasks();
  }

  async getAllTasks() {
    const raw = this.form.getRawValue();
    const res = await this.taskService.getMyTasks({
      page: raw.page ?? 1,
      pageSize: raw.pageSize ?? 10,
      id: raw.id ?? null,
      name: raw.name ?? null,
      status: raw.status ?? null,
      createdAt: raw.createdAt ?? null
    });

    this.totalCount = res.totalItems;

    this.listOfData = res.issues.map((item) => {
      const rec: ItemData = {
        id: item.id,
        name: item.title,
        status: IssueStatusDisplay[item.status],
        reporterName: this.currentUser?.fullName ?? '',
        projectId: item.projectId,
        projectName:
          this.projects?.projects.find((project) => project.id === item.projectId)?.name ?? '',
        createdAt: item.createdAt ?? '',
        startDate: item.startDate ?? '',
        endDate: item.endDate ?? ''
      };

      return rec;
    });

    this.cdr.detectChanges();
  }

  cancel() {
    this.form.reset();
    this.form.patchValue({
      page: 1,
      pageSize: 10
    });
    this.getAllTasks();
  }

  search() {
    this.getAllTasks();
  }

  async changePage($event: number) {
    this.form.patchValue({ page: $event });
    await this.getAllTasks();
  }

  async changePageSize($event: number) {
    this.form.patchValue({ pageSize: $event });
    await this.getAllTasks();
  }

  async getAllUsers() {
    const body: IGetAllUserReq = {
      page: 1,
      pageSize: 9999
    };

    const res = await this.userService.getAllUser(body);
    const users = res.users ?? [];
    this.users = users.map((item) => {
      const rec: JUser = {
        id: item.id,
        fullName: item.fullName,
        email: item.email,
        avatarUrl: item.avatarUrl ?? DEFAULT_AVATAR_URL,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
        // issueIds: []
      };
      return rec;
    });
  }

  getMemberName(id: number): string {
    return this.users.find((item) => item.id === id)?.fullName ?? '';
  }

  async getAllProjects() {
    const user = this.currentUser ?? (await firstValueFrom(this.authQuery.user$));
    await this.fetchAllProjects(user.id);
  }

  private async fetchAllProjects(userId: number) {
    const body: IGetAllProjectReq = {
      page: 1,
      pageSize: 9999,
      userId
    };
    this.projects = await this.projectsService.getAllProject(body);
    this.cdr.detectChanges();
  }

  async openIssueModal(projectId: number, issueId: number) {
    await this.getGroupProjectDetail(projectId);
    this._modalService
      .create({
        nzContent: IssueModalComponent,
        nzWidth: 1040,
        nzClosable: false,
        nzFooter: null,
        nzComponentParams: {
          issue$: this._projectQuery.issueById$(issueId)
        }
      })
      .afterClose.subscribe((data) => {
        this.getAllTasks();
      });
  }

  async getGroupProjectDetail(projectId: number) {
    const user = this.currentUser ?? (await firstValueFrom(this.authQuery.user$));
    this._projectService.getProjectDetail(projectId, user.id);
  }
}

interface ItemData {
  id: number;
  name: string;
  status: string;
  reporterName: string;
  projectId?: number;
  projectName: string;
  createdAt: string;
  startDate: string;
  endDate: string;
}

export interface IDepartmentManagementEditModalData {
  mode: 0 | 1; // 0: create; 1: update
  departmentId: number | undefined;
}

export interface IDepartmentManagementMemberAddModalData {
  departmentId: number;
}

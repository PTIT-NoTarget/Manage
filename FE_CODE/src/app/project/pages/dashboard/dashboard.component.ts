import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IGetAllTaskReq,
  IGetDashboardWeeklyRes,
  TaskService
} from '@tungle/core/apis/task.service';
import { IssueStatus, IssueStatusColors } from '@tungle/interface/issue';
import { AuthQuery } from '@tungle/project/auth/auth.query';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { format } from 'date-fns';

Chart.register(...registerables);
Chart.register(ChartDataLabels);

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public chart1: any;
  public chart2: any;
  public listBox: IListBox[] = [];
  dashboardData!: IDashboardData;
  public weekOffset = 0;
  public weeklyRangeLabel = '';

  constructor(
    private taskService: TaskService,
    public authQuery: AuthQuery,
    private router: Router
  ) {}

  async ngOnInit() {
    this.authQuery.user$.subscribe((user) => {
      if (user.role === 'user') {
        this.router.navigate(['/main/projects/list']);
      }
    });
    // .unsubscribe();

    await this.getDashboardData();
    this.createPieChart();
    this.createLineChart();
  }

  private getWeeklyCountsForLineChart(): number[] {
    return [
      this.dashboardData.weeklyData.mondayTasksCount,
      this.dashboardData.weeklyData.tuesdayTasksCount,
      this.dashboardData.weeklyData.wednesdayTasksCount,
      this.dashboardData.weeklyData.thursdayTasksCount,
      this.dashboardData.weeklyData.fridayTasksCount,
      this.dashboardData.weeklyData.saturdayTasksCount
    ];
  }

  private getLineSuggestedMax(): number {
    const counts = this.getWeeklyCountsForLineChart();
    const max = Math.max(0, ...counts.map((x) => Number(x) || 0));
    return max + 3;
  }

  async prevWeek() {
    this.weekOffset -= 1;
    await this.loadWeeklyDashboardData();
    this.updateLineChart();
  }

  async nextWeek() {
    this.weekOffset += 1;
    await this.loadWeeklyDashboardData();
    this.updateLineChart();
  }

  createPieChart() {
    const pendingColor = IssueStatusColors[IssueStatus.NEW];
    const doneColor = IssueStatusColors[IssueStatus.DONE];
    const processColor = IssueStatusColors[IssueStatus.IN_PROGRESS];

    this.chart1 = new Chart('pieChart', {
      type: 'doughnut',
      data: {
        labels: ['Chưa xử lý', 'Đã hoàn thành', 'Đang thực hiện'],
        datasets: [
          {
            data: [
              this.dashboardData.pendingTasksCount,
              this.dashboardData.doneTasksCount,
              this.dashboardData.processTasksCount
            ],
            backgroundColor: [pendingColor, doneColor, processColor],
            hoverBackgroundColor: [pendingColor, doneColor, processColor]
          }
        ]
      },
      options: {
        responsive: true,
        cutout: '50%',
        plugins: {
          legend: {
            position: 'right',
            align: 'center'
          },
          datalabels: {
            color: '#ffffff',
            font: {
              weight: 'bold',
              size: 18
            },
            formatter: (value, context) => {
              const dataset = context.chart.data.datasets?.[0];
              const data = (dataset?.data ?? []) as number[];
              const total = data.reduce((sum, current) => sum + (Number(current) || 0), 0);
              const numericValue = Number(value) || 0;
              if (!total) return '0%';
              const percentage = Math.round((numericValue / total) * 100);
              return `${percentage}%`;
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const dataset = context.dataset;
                const value = Number(dataset.data[context.dataIndex]) || 0;
                const total = (dataset.data as any[]).reduce(
                  (sum, current) => sum + (Number(current) || 0),
                  0
                );
                const percentage = total ? Math.round((value / total) * 100) : 0;
                return `${label}: ${percentage}%`;
              }
            }
          }
        }
      }
    });
  }

  createLineChart() {
    const processColor = IssueStatusColors[IssueStatus.IN_PROGRESS];

    this.chart2 = new Chart('lineChart', {
      type: 'line',
      data: {
        labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
        datasets: [
          {
            data: this.getWeeklyCountsForLineChart(),
            borderColor: processColor,
            fill: false,
            pointBackgroundColor: processColor
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            suggestedMax: this.getLineSuggestedMax(),
            ticks: {
              precision: 0
            }
          }
        },
        plugins: {
          legend: {
            display: false // Ẩn bỏ chú thích
          }
        }
      }
    });
  }

  private updateLineChart() {
    if (!this.chart2) return;
    this.chart2.data.datasets[0].data = this.getWeeklyCountsForLineChart();

    const yScale = this.chart2.options?.scales?.y as any;
    if (yScale) {
      yScale.suggestedMax = this.getLineSuggestedMax();
    }
    this.chart2.update();
  }

  private setWeeklyRangeLabel(res: IGetDashboardWeeklyRes) {
    const start = new Date(res.weekStart);
    const end = new Date(res.weekEnd);
    this.weeklyRangeLabel = `T2 ${format(start, 'dd/MM/yyyy')} - T7 ${format(end, 'dd/MM/yyyy')}`;
  }

  private async loadWeeklyDashboardData() {
    const res = await this.taskService.getDashboardWeekly({
      weekOffset: this.weekOffset,
      project_id: null,
      assigned_by: null
    });

    this.setWeeklyRangeLabel(res);

    this.dashboardData.weeklyData = {
      mondayTasksCount: res.days.Monday.count,
      tuesdayTasksCount: res.days.Tuesday.count,
      wednesdayTasksCount: res.days.Wednesday.count,
      thursdayTasksCount: res.days.Thursday.count,
      fridayTasksCount: res.days.Friday.count,
      saturdayTasksCount: res.days.Saturday.count
    };
  }

  async getDashboardData() {
    const body: IGetAllTaskReq = {
      page: 1,
      pageSize: 99999,
      project_id: null,
      assigned_by: null
    };
    const res = await this.taskService.getAllTasks(body);
    const taskDatas = res.issues;

    // task count data
    const allTasksCount = taskDatas.length;
    const pendingTasksCount = taskDatas.filter(
      (item) => item.status === IssueStatus.BACKLOG || item.status === IssueStatus.NEW
    ).length;
    const processTasksCount = taskDatas.filter(
      (item) =>
        item.status === IssueStatus.IN_PROGRESS ||
        // item.status === IssueStatus.READY_TO_TEST ||
        item.status === IssueStatus.TESTING
    ).length;
    const doneTasksCount = taskDatas.filter((item) => item.status === IssueStatus.DONE).length;
    const rejectTasksCount = taskDatas.filter((item) => item.status === IssueStatus.REJECT).length;

    // dashboard data
    this.dashboardData = {
      allTasksCount: allTasksCount,
      pendingTasksCount: pendingTasksCount,
      processTasksCount: processTasksCount,
      doneTasksCount: doneTasksCount,
      rejectTasksCount: rejectTasksCount,
      weeklyData: {
        mondayTasksCount: 0,
        tuesdayTasksCount: 0,
        wednesdayTasksCount: 0,
        thursdayTasksCount: 0,
        fridayTasksCount: 0,
        saturdayTasksCount: 0
      }
    };

    await this.loadWeeklyDashboardData();

    this.listBox = [
      {
        title: 'Công việc',
        count: this.dashboardData.allTasksCount,
        percent: 10,
        status: 1,
        color: '#ffffff'
      },
      {
        title: 'Chưa xử lý',
        count: this.dashboardData.pendingTasksCount,
        percent: 15,
        status: 0,
        // BACKLOG + NEW: dùng màu NEW trong IssueStatusColors
        color: IssueStatusColors[IssueStatus.NEW]
      },
      {
        title: 'Đang xử lý',
        count: this.dashboardData.processTasksCount,
        percent: 10,
        status: 1,
        // IN_PROGRESS + TESTING: dùng màu IN_PROGRESS trong IssueStatusColors
        color: IssueStatusColors[IssueStatus.IN_PROGRESS]
      },
      {
        title: 'Đã xử lý',
        count: this.dashboardData.doneTasksCount,
        percent: 5,
        status: 1,
        color: IssueStatusColors[IssueStatus.DONE]
      },
      {
        title: 'Hủy bỏ',
        count: this.dashboardData.rejectTasksCount,
        percent: -2,
        status: 0,
        color: IssueStatusColors[IssueStatus.REJECT]
      }
    ];

    console.log(this.dashboardData);
  }
}

interface IDashboardData {
  allTasksCount: number; // số lượng tất cả công việc
  pendingTasksCount: number; // số lượng công việc chưa xử lý
  processTasksCount: number; // số lượng công việc đang xử lý
  doneTasksCount: number; // số lượng công việc đã xử lý
  rejectTasksCount: number; // số lượng công việc hủy bỏ
  weeklyData: {
    mondayTasksCount: number;
    tuesdayTasksCount: number;
    wednesdayTasksCount: number;
    thursdayTasksCount: number;
    fridayTasksCount: number;
    saturdayTasksCount: number;
  };
}

interface IListBox {
  title: string;
  count: number;
  percent: number;
  status: number;
  color?: string;
}

import { JIssue } from '@tungle/interface/issue';

export class PermissionUtil {
  static isAdmin(role: string | null | undefined): boolean {
    return String(role ?? '').toLowerCase() === 'admin';
  }

  static canEditIssue(
    issue: JIssue | null | undefined,
    userId: number | null | undefined,
    role: string | null | undefined
  ): boolean {
    if (!issue) {
      return false;
    }

    if (PermissionUtil.isAdmin(role)) {
      return true;
    }

    if (!userId) {
      return false;
    }

    // "Task của user" = task được assigned cho user đó
    return issue.reporterId === userId;
  }
}

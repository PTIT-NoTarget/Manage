import { IssuePriority, IssuePriorityColors } from './issue';

export class IssuePriorityIcon {
  icon: string;
  value: IssuePriority;
  color: string;

  constructor(issuePriority: IssuePriority) {
    this.value = issuePriority;
    if (issuePriority === IssuePriority.MEDIUM) {
      this.icon = 'minus';
    } else {
      const lowerPriorities = [IssuePriority.LOW, IssuePriority.LOWEST];
      this.icon = lowerPriorities.includes(issuePriority) ? 'arrow-down' : 'arrow-up';
    }
    this.color = IssuePriorityColors[issuePriority];
  }
}

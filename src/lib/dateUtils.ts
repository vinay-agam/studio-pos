export type DateRangeType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom' | 'all';

export function getDateRange(type: DateRangeType, customStart?: string, customEnd?: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    // Reset hours to start/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (type) {
        case 'all':
            start.setTime(0); // Epoch
            end.setFullYear(3000); // Far future
            break;
        case 'today':
            // start/end already set to today
            break;
        case 'yesterday':
            start.setDate(now.getDate() - 1);
            end.setDate(now.getDate() - 1);
            break;
        case 'thisWeek': {
            // Monday as start of week
            const day = now.getDay() || 7; // Get current day number, converting Sun (0) to 7
            if (day !== 1) start.setHours(-24 * (day - 1)); // Go back to Monday
            break;
        }
        case 'lastWeek': {
            const day = now.getDay() || 7;
            start.setDate(now.getDate() - day - 6);
            end.setDate(now.getDate() - day);
            break;
        }
        case 'last7days':
            start.setDate(now.getDate() - 6);
            break;
        case 'thisMonth':
            start.setDate(1);
            break;
        case 'lastMonth':
            start.setMonth(now.getMonth() - 1);
            start.setDate(1);
            end.setDate(0); // Last day of previous month
            break;
        case 'custom':
            if (customStart) {
                const [y, m, d] = customStart.split('-').map(Number);
                const s = new Date(y, m - 1, d);
                s.setHours(0, 0, 0, 0);
                // Check if valid
                if (!isNaN(s.getTime())) {
                    start.setTime(s.getTime());
                }
            }
            if (customEnd) {
                const [y, m, d] = customEnd.split('-').map(Number);
                const e = new Date(y, m - 1, d);
                e.setHours(23, 59, 59, 999);
                if (!isNaN(e.getTime())) {
                    end.setTime(e.getTime());
                }
            }
            break;
    }

    return { start, end };
}

export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

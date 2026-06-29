import { generateSnapshot } from '../services/admin/analytics.service';

export const startAnalyticsCron = (intervalMs: number = 60 * 60 * 1000) => {
    console.log('[AnalyticsCron] Analytics background snapshots compilation started.');

    generateSnapshot('hourly')
        .then(() => generateSnapshot('daily'))
        .then(() => generateSnapshot('monthly'))
        .then(() => console.log('[AnalyticsCron] Initial boot snapshots generated successfully.'))
        .catch(err => console.error('[AnalyticsCron] Boot snapshot error:', err));

    const timer = setInterval(async () => {
        try {
            console.log('[AnalyticsCron] Generating hourly snapshot...');
            await generateSnapshot('hourly');

            const now = new Date();
            if (now.getHours() === 0) {
                console.log('[AnalyticsCron] Generating daily and monthly snapshots...');
                await generateSnapshot('daily');
                if (now.getDate() === 1) {
                    await generateSnapshot('monthly');
                }
            }
        } catch (error) {
            console.error('[AnalyticsCron] Error in analytics background compilation loop:', error);
        }
    }, intervalMs);

    if (timer && typeof timer.unref === 'function') {
        timer.unref();
    }

    return timer;
};

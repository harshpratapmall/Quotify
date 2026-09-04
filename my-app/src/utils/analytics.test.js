import { track } from '@vercel/analytics';
import { ANALYTICS_EVENTS, trackRoute } from './analytics';

test('tracks a route with its route path only', () => {
  trackRoute('/quotation/new');

  expect(track).toHaveBeenCalledWith(ANALYTICS_EVENTS.routeViewed, {
    route: '/quotation/new',
  });
});

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  Widget, WidgetHeader, WidgetTitle, WidgetContent, WidgetFooter, WidgetValue, WidgetBadge,
  ClockWidget, CalendarWidget, MetricsWidget,
} from './widget';

describe('Wigggle UI Widget Components', () => {
  it('renders base Widget primitive with sizes and variants', () => {
    const html = renderToString(
      <Widget size="md" variant="glass" design="mumbai">
        <WidgetHeader>
          <WidgetTitle>Widget Header</WidgetTitle>
          <WidgetBadge variant="neon">NEW</WidgetBadge>
        </WidgetHeader>
        <WidgetContent>
          <WidgetValue>$1,234</WidgetValue>
        </WidgetContent>
        <WidgetFooter>Footer text</WidgetFooter>
      </Widget>
    );

    expect(html).toContain('sads-widget');
    expect(html).toContain('sads-widget-md');
    expect(html).toContain('sads-widget-glass');
    expect(html).toContain('sads-widget-mumbai');
    expect(html).toContain('Widget Header');
    expect(html).toContain('$1,234');
    expect(html).toContain('Footer text');
  });

  it('renders ClockWidget preset', () => {
    const html = renderToString(<ClockWidget />);
    expect(html).toContain('sads-widget');
    expect(html).toContain('Live Clock');
    expect(html).toContain('LOCAL');
  });

  it('renders CalendarWidget preset', () => {
    const html = renderToString(<CalendarWidget />);
    expect(html).toContain('sads-widget');
    expect(html).toContain('CALENDAR');
  });

  it('renders MetricsWidget preset', () => {
    const html = renderToString(<MetricsWidget focusRounds={4} completedTasks={12} energy={9} />);
    expect(html).toContain('Cognitive Stats');
    expect(html).toContain('Focus Rounds');
    expect(html).toContain('Tasks Done');
    expect(html).toContain('90%');
  });
});

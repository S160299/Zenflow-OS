import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Input } from './input';
import { Badge } from './badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
import { Switch } from './switch';
import { Progress } from './progress';
import { Slider } from './slider';

describe('shadcn UI Components', () => {
  it('renders Button with a stock shadcn variant/size', () => {
    const html = renderToString(<Button variant="outline" size="sm">Click me</Button>);
    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('Click me');
  });

  it('renders Button with the custom Zenflow neon/glass variants', () => {
    const html = renderToString(<Button variant="neon-cyan" glow>Focus</Button>);
    expect(html).toContain('sads-btn');
    expect(html).toContain('sads-btn-neon-cyan');
    expect(html).toContain('sads-btn-glow');
  });

  it('renders Card with header, content, and the glow/hover hooks', () => {
    const html = renderToString(
      <Card glow>
        <CardHeader>
          <CardTitle>Title Text</CardTitle>
        </CardHeader>
        <CardContent>Content Area</CardContent>
      </Card>
    );
    expect(html).toContain('sads-card');
    expect(html).toContain('sads-card-hover');
    expect(html).toContain('sads-card-glow');
    expect(html).toContain('Title Text');
    expect(html).toContain('Content Area');
  });

  it('renders Input with a placeholder', () => {
    const html = renderToString(<Input placeholder="Enter task..." />);
    expect(html).toContain('placeholder="Enter task..."');
  });

  it('renders Badge with stock and custom neon variants', () => {
    const html = renderToString(<Badge variant="secondary">Active</Badge>);
    expect(html).toContain('data-variant="secondary"');
    expect(html).toContain('Active');

    const neonHtml = renderToString(<Badge variant="neon">Live</Badge>);
    expect(neonHtml).toContain('sads-badge-neon');
  });

  it('renders the Radix-based Select with trigger and items', () => {
    const html = renderToString(
      <Select defaultValue="opt1">
        <SelectTrigger aria-label="Priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="opt1">Option 1</SelectItem>
          <SelectItem value="opt2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('data-slot="select-trigger"');
  });

  it('renders Switch in a checked state', () => {
    const html = renderToString(<Switch checked={true} />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('data-state="checked"');
  });

  it('renders Progress with a determinate value', () => {
    const html = renderToString(<Progress value={75} />);
    expect(html).toContain('data-slot="progress"');
    expect(html).toContain('aria-valuenow="75"');
  });

  it('renders Slider with an array value', () => {
    const html = renderToString(<Slider value={[50]} min={0} max={100} />);
    expect(html).toContain('data-slot="slider"');
    expect(html).toContain('role="slider"');
  });
});

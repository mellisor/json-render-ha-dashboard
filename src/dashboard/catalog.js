import { defineCatalog } from '@json-render/core';
import { schema } from '@json-render/vue/schema';
import { z } from 'zod';

const entityIdProp = z.object({ entityId: z.string(), label: z.string().optional() });

export const catalog = defineCatalog(schema, {
  components: {
    DashboardRoot: {
      props: z.object({}),
      description: 'Root container for the dashboard',
    },
    DashboardSection: {
      props: z.object({ title: z.string(), icon: z.string().optional() }),
      description: 'A labeled section grouping related entity cards',
    },
    DashboardGrid: {
      props: z.object({}),
      description: 'Responsive grid that holds entity cards',
    },
    SensorCard: {
      props: entityIdProp,
      description: 'Displays a numeric sensor reading with unit and device class',
    },
    ToggleCard: {
      props: entityIdProp,
      description: 'Displays and controls a light, switch, or input_boolean',
    },
    BinaryCard: {
      props: entityIdProp,
      description: 'Displays the on/off state of a binary sensor',
    },
    GenericCard: {
      props: entityIdProp,
      description: 'Fallback card for any entity type',
    },
    ChartCard: {
      props: z.object({
        entityId: z.string(),
        label: z.string().optional(),
        chartType: z.enum(['line', 'bar', 'gauge']).optional(),
        hours: z.number().optional(),
        aggregatePeriod: z.enum(['raw', '5min', '30min', '1h', '6h', '1d']).optional(),
      }),
      description: 'Renders a historical time-series chart for a numeric sensor. chartType: "line" (default), "bar", or "gauge". hours: 1, 6, 24 (default), or 72. aggregatePeriod: raw/5min for 1h, 30min for 6h, 1h for 24h, 6h for 72h.',
    },
  },
});

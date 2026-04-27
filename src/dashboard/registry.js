import { h } from 'vue';
import { defineRegistry } from '@json-render/vue';
import { catalog } from './catalog.js';
import DashboardRoot from '../components/layout/DashboardRoot.vue';
import DashboardSection from '../components/layout/DashboardSection.vue';
import DashboardGrid from '../components/layout/DashboardGrid.vue';
import SensorCard from '../components/cards/SensorCard.vue';
import ToggleCard from '../components/cards/ToggleCard.vue';
import BinaryCard from '../components/cards/BinaryCard.vue';
import GenericCard from '../components/cards/GenericCard.vue';
import ChartCard from '../components/cards/ChartCard.vue';

const { registry } = defineRegistry(catalog, {
  components: {
    DashboardRoot: ({ children }) => h(DashboardRoot, null, { default: () => children }),
    DashboardSection: ({ props, children }) =>
      h(DashboardSection, { title: props.title, icon: props.icon }, { default: () => children }),
    DashboardGrid: ({ children }) => h(DashboardGrid, null, { default: () => children }),
    SensorCard: ({ props }) => h(SensorCard, { entityId: props.entityId, label: props.label }),
    ToggleCard: ({ props }) => h(ToggleCard, { entityId: props.entityId, label: props.label }),
    BinaryCard: ({ props }) => h(BinaryCard, { entityId: props.entityId, label: props.label }),
    GenericCard: ({ props }) => h(GenericCard, { entityId: props.entityId, label: props.label }),
    ChartCard: ({ props }) =>
      h(ChartCard, {
        entityId: props.entityId,
        label: props.label,
        chartType: props.chartType,
        hours: props.hours,
        aggregatePeriod: props.aggregatePeriod,
      }),
  },
});

export { registry };

const DOMAIN_LABELS = {
  light:         'Lights',
  switch:        'Switches',
  sensor:        'Sensors',
  binary_sensor: 'Binary Sensors',
  climate:       'Climate',
  cover:         'Covers',
  fan:           'Fans',
  media_player:  'Media Players',
  input_boolean: 'Toggles',
};

const DOMAIN_CARD_TYPES = {
  light:         'ToggleCard',
  switch:        'ToggleCard',
  input_boolean: 'ToggleCard',
  cover:         'ToggleCard',
  fan:           'ToggleCard',
  sensor:        'SensorCard',
  binary_sensor: 'BinaryCard',
};

// historySummaries: { [entityId]: { min, max, avg, unit, count } }
export function buildGenerationPrompt(selectedEntityIds, allEntities, userPrompt = '', historySummaries = {}) {
  const groups = {};
  for (const entityId of selectedEntityIds) {
    const domain = entityId.split('.')[0];
    if (!groups[domain]) groups[domain] = [];
    const entity = allEntities[entityId];
    const attrs = entity?.attributes ?? {};
    const name = attrs.friendly_name || entityId;
    const state = entity?.state ?? 'unknown';
    const unit = attrs.unit_of_measurement ? ` ${attrs.unit_of_measurement}` : '';
    const cardType = DOMAIN_CARD_TYPES[domain] ?? 'GenericCard';
    groups[domain].push({ entityId, name, state: `${state}${unit}`, cardType, unit: attrs.unit_of_measurement ?? '' });
  }

  const lines = [
    'Generate a Home Assistant dashboard for the entities listed below.',
    'Use the EXACT entityId strings shown — they are passed directly to card props.',
    '',
  ];

  for (const [domain, items] of Object.entries(groups)) {
    const label = DOMAIN_LABELS[domain] ?? domain;
    lines.push(`${label.toUpperCase()} — use ${items[0].cardType}:`);
    for (const { entityId, name, state, unit } of items) {
      const summary = historySummaries[entityId];
      if (summary) {
        const u = unit ? ` ${unit}` : '';
        lines.push(
          `  entityId: "${entityId}"  name: "${name}"  now: ${state}` +
          `  6h → min: ${summary.min}${u}  max: ${summary.max}${u}  avg: ${summary.avg}${u}  samples: ${summary.count}`,
        );
      } else {
        lines.push(`  entityId: "${entityId}"  name: "${name}"  state: ${state}`);
      }
    }
    lines.push('');
  }

  lines.push(
    'Requirements:',
    '- Wrap everything in a single DashboardRoot.',
    '- Group entities into DashboardSection elements with a descriptive title and icon.',
    '- Each section contains one DashboardGrid holding the cards.',
    '- Use SensorCard for sensors, ToggleCard for lights/switches/covers/fans,',
    '  BinaryCard for binary sensors, GenericCard for anything else.',
    '- All card types accept an optional "label" prop to override the displayed name.',
    '  Use it to give cards clearer, friendlier names than the HA friendly_name.',
    '- For numeric sensors where historical trends are useful, use ChartCard instead of SensorCard.',
    '  ChartCard props: entityId (required), chartType ("line"|"bar"|"gauge"), hours (1|6|24|72),',
    '  aggregatePeriod ("raw"|"5min"|"30min"|"1h"|"6h"|"1d"),',
    '  aggregateType ("avg"|"min"|"max") — reduction applied per bucket, default "avg".',
    '  Use "gauge" for percentage or level sensors (battery, humidity, CO2, etc.).',
    '  Use "line" for continuously changing values (temperature, power, etc.).',
    '  Set aggregatePeriod based on hours: raw/5min for 1h, 30min for 6h, 1h for 24h, 6h for 72h.',
    '  Set aggregateType based on the metric: "max" for power peaks, "min" for temperature lows, "avg" otherwise.',
    '- Do NOT invent entityId values — only use the ones listed above.',
    '- Avoid using sensors that do not have provided recent data unless otherwise specified'
  );

  if (userPrompt.trim()) {
    lines.push('', 'Additional instructions from the user:', userPrompt.trim());
  }

  return lines.join('\n');
}

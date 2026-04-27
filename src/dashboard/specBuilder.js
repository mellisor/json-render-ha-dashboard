// Maps entity domains to card types and display priority
const DOMAIN_CONFIG = {
  light:           { card: 'ToggleCard',  icon: '💡', priority: 1, label: 'Lights' },
  switch:          { card: 'ToggleCard',  icon: '🔌', priority: 2, label: 'Switches' },
  input_boolean:   { card: 'ToggleCard',  icon: '🔘', priority: 3, label: 'Toggles' },
  sensor:          { card: 'SensorCard',  icon: '📊', priority: 4, label: 'Sensors' },
  binary_sensor:   { card: 'BinaryCard',  icon: '👁️', priority: 5, label: 'Binary Sensors' },
  climate:         { card: 'GenericCard', icon: '🌡️', priority: 6, label: 'Climate' },
  cover:           { card: 'ToggleCard',  icon: '🪟', priority: 7, label: 'Covers' },
  fan:             { card: 'ToggleCard',  icon: '🌀', priority: 8, label: 'Fans' },
  media_player:    { card: 'GenericCard', icon: '🎵', priority: 9, label: 'Media' },
};

const HIDDEN_DOMAINS = new Set([
  'automation', 'scene', 'script', 'zone', 'person', 'device_tracker',
  'sun', 'weather', 'update', 'number', 'select', 'text', 'button',
]);

export function buildSpec(entities) {
  const groups = {};

  for (const entityId of Object.keys(entities)) {
    const domain = entityId.split('.')[0];
    if (HIDDEN_DOMAINS.has(domain)) continue;
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(entityId);
  }

  const elements = {};
  const sectionIds = [];

  const sortedDomains = Object.keys(groups).sort((a, b) => {
    const pa = DOMAIN_CONFIG[a]?.priority ?? 99;
    const pb = DOMAIN_CONFIG[b]?.priority ?? 99;
    return pa - pb;
  });

  for (const domain of sortedDomains) {
    const config = DOMAIN_CONFIG[domain] ?? { card: 'GenericCard', icon: '📦', label: domain };
    const gridId = `grid-${domain}`;
    const sectionId = `section-${domain}`;
    const cardIds = [];

    for (const entityId of groups[domain]) {
      // Replace dots and underscores to create safe element IDs
      const cardId = `card-${entityId.replace(/\./g, '-')}`;
      elements[cardId] = {
        type: config.card,
        props: { entityId },
        children: [],
      };
      cardIds.push(cardId);
    }

    elements[gridId] = {
      type: 'DashboardGrid',
      props: {},
      children: cardIds,
    };

    elements[sectionId] = {
      type: 'DashboardSection',
      props: { title: config.label, icon: config.icon },
      children: [gridId],
    };

    sectionIds.push(sectionId);
  }

  elements['dashboard-root'] = {
    type: 'DashboardRoot',
    props: {},
    children: sectionIds,
  };

  return { root: 'dashboard-root', elements };
}

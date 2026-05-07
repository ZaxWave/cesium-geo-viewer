import { CONFIG } from '../config.js';

export function createLayerSwitcher(viewer, registry, activeId) {
  const container = document.createElement('div');
  container.className = 'layer-switcher glass-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'switcher-header';
  const dot = document.createElement('span');
  dot.className = 'dot';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Map';
  header.appendChild(dot);
  header.appendChild(label);
  container.appendChild(header);

  // Chips
  const chips = document.createElement('div');
  chips.className = 'chips';

  CONFIG.enabledBaseLayers.forEach((id) => {
    const entry = registry[id];
    if (!entry) return;
    const disabled = entry.requiresToken && !CONFIG[entry.tokenKey];

    const chip = document.createElement('div');
    chip.className = 'layer-chip' + (disabled ? ' disabled' : '') + (id === activeId ? ' active' : '');
    chip.dataset.layerId = id;

    const indicator = document.createElement('span');
    indicator.className = 'chip-indicator';
    chip.appendChild(indicator);

    const name = document.createElement('span');
    name.textContent = entry.name;
    chip.appendChild(name);

    if (disabled) {
      const hint = document.createElement('span');
      hint.className = 'token-hint';
      hint.textContent = 'Token';
      chip.appendChild(hint);
    } else {
      chip.addEventListener('click', () => {
        chips.querySelectorAll('.layer-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        viewer.imageryLayers.removeAll(false);
        viewer.imageryLayers.addImageryProvider(entry.factory(CONFIG));
      });
    }

    chips.appendChild(chip);
  });

  container.appendChild(chips);
  document.body.appendChild(container);

  return {
    element: container,
    destroy() { container.remove(); },
  };
}

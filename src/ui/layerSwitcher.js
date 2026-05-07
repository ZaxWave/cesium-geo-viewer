import { CONFIG } from '../config.js';

export function createLayerSwitcher(viewer, registry) {
  const container = document.createElement('div');
  container.className = 'cesium-layer-switcher';

  const title = document.createElement('h3');
  title.textContent = '底图切换';
  container.appendChild(title);

  Object.keys(registry).forEach((id) => {
    if (!CONFIG.enabledBaseLayers.includes(id)) return;
    const entry = registry[id];

    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'baseLayer';
    radio.value = id;

    const disabled = entry.requiresToken && !CONFIG[entry.tokenKey];
    radio.disabled = disabled;

    if (id === CONFIG.enabledBaseLayers[0] && !disabled) {
      radio.checked = true;
    }

    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      viewer.imageryLayers.removeAll(false);
      const provider = entry.factory(CONFIG);
      viewer.imageryLayers.addImageryProvider(provider);
    });

    label.appendChild(radio);
    label.appendChild(document.createTextNode(' ' + entry.name));
    if (disabled) {
      const warn = document.createElement('span');
      warn.className = 'token-warning';
      warn.textContent = ' (需Token)';
      label.appendChild(warn);
    }
    container.appendChild(label);
  });

  document.body.appendChild(container);

  // Fire initial layer
  const firstRadio = container.querySelector('input:not([disabled])');
  if (firstRadio) {
    firstRadio.checked = true;
    firstRadio.dispatchEvent(new Event('change'));
  }

  return {
    element: container,
    setActive(id) {
      const radio = container.querySelector(`input[value="${id}"]`);
      if (radio && !radio.disabled) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    },
    destroy() {
      container.remove();
    },
  };
}

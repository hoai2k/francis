// Settings screen: Graphics, Audio, Camera & Controls tabs.
import { h } from './ui.js';
import { settings, saveSettings } from '../settings.js';
import { QUALITY_LABEL } from '../gfx/renderer.js';

let tab = 'graphics';

export function openSettings(game, onClose) {
  const ui = game.ui;
  ui.open('settings', (el) => {
    const gr = game.gr;
    const row = (label, input) => h('div', { class: 'setting' }, h('label', {}, label), input);
    const check = (key, after) => { const i = h('input', { type: 'checkbox' }); i.checked = !!settings[key]; i.addEventListener('change', () => { settings[key] = i.checked; saveSettings(); after?.(i.checked); }); return i; };
    const range = (key, min, max, step, after) => { const i = h('input', { type: 'range', min, max, step, value: settings[key] }); i.addEventListener('input', () => { settings[key] = Number(i.value); saveSettings(); after?.(Number(i.value)); }); return i; };
    const select = (key, opts, after) => {
      const s = h('select', {}, ...opts.map(([v, t]) => { const o = h('option', { value: v }, t); if (String(settings[key]) === String(v)) o.selected = true; return o; }));
      s.addEventListener('change', () => { settings[key] = s.value; saveSettings(); after?.(s.value); }); return s;
    };
    const tabs = h('div', { class: 'tabs' }, ...[['graphics', 'Graphics'], ['audio', 'Audio'], ['camera', 'Camera'], ['controls', 'Controls']].map(([id, t]) =>
      h('button', { class: 'tab' + (tab === id ? ' on' : ''), onclick: () => { tab = id; ui.refresh('settings'); } }, t)));
    const body = h('div', {});
    if (tab === 'graphics') {
      const info = gr.info;
      body.append(
        h('div', { class: 'hint', style: 'margin:0 0 8px' }, `GPU: ${info.name} · Backend: ${gr.backend} · Detected tier: ${QUALITY_LABEL[info.tier]}`),
        row('Quality', select('quality', [['auto', `Auto (${QUALITY_LABEL[info.tier]})`], ['low', QUALITY_LABEL.low], ['medium', QUALITY_LABEL.medium], ['high', QUALITY_LABEL.high], ['ultra', QUALITY_LABEL.ultra + (gr.backend === 'WebGPU' ? '' : ' (WebGL2)')]], (v) => game.applyQuality(v))),
        row('Dynamic resolution', check('dynRes', (v) => { gr.dynRes = v; if (!v) { gr.scale = 1; gr.applyPixelRatio(); } })),
        row('Motion blur (Ultra)', check('motionBlur', (v) => { gr.motionBlur = v; gr.buildPipeline(); })),
        row('Show FPS / mode', check('showFps', (v) => game.hud?.setReadout(v))),
        row('Damage numbers', check('damageNumbers')),
        row('Force WebGL2 (reload)', check('forceWebGL', () => { })),
        h('div', { class: 'hint' }, 'Ultra uses WebGPU: SSGI light bounce, screen-space reflections, VSM soft shadows, TRAA + sharpen, depth of field. High: soft shadows, GTAO, bloom, water SSR, light shafts. Resolution drops automatically before effects if FPS falls below target.'),
        h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn small', onclick: () => game.openPhotoMode?.() }, '📷 Photo Mode (path traced)'), settings.forceWebGL !== game.startedWebGL ? h('button', { class: 'btn small primary', onclick: () => location.reload() }, 'Reload to apply') : null),
      );
    } else if (tab === 'audio') {
      body.append(
        row('Master', range('master', 0, 1, 0.05, () => game.audio?.applyVolumes())),
        row('Music', range('music', 0, 1, 0.05, () => game.audio?.applyVolumes())),
        row('Effects', range('sfx', 0, 1, 0.05, () => game.audio?.applyVolumes())),
      );
    } else if (tab === 'camera') {
      body.append(
        row('Screen shake', range('shake', 0, 1.5, 0.1, (v) => { game.rig.shakeScale = v; })),
        row('Hit-stop pauses', check('hitstop')),
        row('Slow-motion moments', check('slowmo')),
        row('Camera rotation (Z / C)', check('cameraRotate')),
        row('Default zoom', range('cameraZoom', 12, 42, 1, (v) => { game.rig.zoomTarget = v; })),
      );
    } else {
      body.append(h('div', { class: 'hint', style: 'font-size:14px;color:#ddd', html:
        `<h3>Keyboard + Mouse</h3>
        <span class="kbd">WASD</span> move · <span class="kbd">Mouse</span> aim · <span class="kbd">LMB</span> attack · <span class="kbd">RMB</span> ranged / technique ·
        <span class="kbd">Space</span> dodge · <span class="kbd">1</span><span class="kbd">2</span><span class="kbd">3</span> techniques · <span class="kbd">F</span> Domain Expansion ·
        <span class="kbd">Q</span> Reverse Cursed Technique (heal) · <span class="kbd">R</span><span class="kbd">T</span> cursed-tool artifacts · <span class="kbd">E</span> interact · <span class="kbd">Tab</span> map · <span class="kbd">I</span> inventory · <span class="kbd">Esc</span> pause · <span class="kbd">Wheel</span> zoom · <span class="kbd">F3</span> FPS readout
        <h3>Gamepad</h3>
        Left stick move · Right stick aim · <b>A</b> attack · <b>RT</b> ranged · <b>B</b> dodge · <b>LB / RB / Y</b> techniques · <b>LT</b> Domain · <b>X</b> interact · <b>D-pad ↑</b> heal · <b>D-pad ← →</b> artifacts · <b>D-pad ↓</b> inventory · <b>View</b> map · <b>Menu</b> pause
        <h3>Local co-op</h3>
        Up to 4 players on one screen: keyboard+mouse plus gamepads. Press <b>A</b> or <b>Start</b> on a controller at character select (or <b>Start</b> during a mission) to drop in.
        <h3>Touch</h3>
        Left thumb: virtual joystick · Right: attack, dodge, techniques, domain · Auto-aim targets the nearest curse · Pinch to zoom. Play in landscape.` }));
    }
    el.appendChild(h('div', { class: 'panel', style: 'width:min(640px,96vw)' }, h('h2', {}, 'Settings'), tabs, body,
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, h('button', { class: 'btn', 'data-autofocus': true, onclick: () => { ui.close('settings'); onClose?.(); } }, 'Back'))));
  }, { dim: true, onBack: () => { ui.close('settings'); onClose?.(); } });
}

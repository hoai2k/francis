// Minimap + full map: a top-down render of the voxel world (top block
// colours shaded by height), revealed room by room, with markers for
// players, curses, objectives, chests, the boss and the exit.
// Open-world regions: buildRegion(L) paints the whole region once (roads,
// rivers, buildings) and draw() shows a round, camera-aligned window around
// the leader with stations, gates, POIs, quest givers (!), quest targets (◆)
// and curses; draw(canvas, { full: true }) the whole region (world map tab).
import { BLOCKS } from '../world/blocks.js';
import { tileAvgColor } from '../gfx/textures.js';
import { B } from '../world/blocks.js';

const BARRIER = B.barrier;

export class Minimap {
  constructor(game) {
    this.game = game;
    this.base = document.createElement('canvas');
    this.fog = null;
  }
  // ------------------------------------------------------------ open-world regions
  buildRegion(L) {
    const w = L.world, W = w.sx, H = w.sz;
    this.level = L; this.region = true;
    this.base.width = W; this.base.height = H;
    const ctx = this.base.getContext('2d');
    const img = ctx.createImageData(W, H);
    const lin = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const gy = L.groundAt ? L.groundAt(x, z) : w.sy - 1;
      let top = -1, id = 0;
      for (let y = Math.min(w.sy - 1, gy + 26); y >= 0; y--) { const b = w.get(x, y, z); if (b && b !== BARRIER && BLOCKS[b].opaque !== false || (b && BLOCKS[b].liquid)) { top = y; id = b; break; } }
      const o = (z * W + x) * 4;
      if (top < 0) { img.data[o + 3] = 0; continue; }
      const c = tileAvgColor[BLOCKS[id].top] ?? { r: 0.5, g: 0.5, b: 0.5 };
      const shade = 0.62 + (top - 10) * 0.022;
      img.data[o] = lin(c.r * shade); img.data[o + 1] = lin(c.g * shade); img.data[o + 2] = lin(c.b * shade); img.data[o + 3] = 255;
      if (BLOCKS[id].liquid === 'water') { img.data[o] = 60; img.data[o + 1] = 120; img.data[o + 2] = 190; }
    }
    ctx.putImageData(img, 0, 0);
    // roads on top, a touch brighter
    ctx.strokeStyle = 'rgba(240,220,170,0.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const r of L.roads ?? []) { ctx.beginPath(); r.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z))); ctx.stroke(); }
    this.revealed = new Set();
    const g = this.game; if (g.hud?.mini) { g.hud.mini.width = 192; g.hud.mini.height = 192; }
  }
  drawRegion(canvas, full) {
    const g = this.game, L = this.level; if (!L) return;
    const ctx = canvas.getContext('2d'), cw = canvas.width, ch = canvas.height, w = L.world;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);
    const lead = g.players.find((p) => !p.dead) ?? g.players[0];
    const p0 = lead?.pos ?? L.spawn;
    let scale, ox, oy;
    ctx.save();
    if (full) { scale = Math.min(cw / w.sx, ch / w.sz); ox = (cw - w.sx * scale) / 2; oy = (ch - w.sz * scale) / 2; }
    else {
      scale = 1.5; ox = cw / 2 - p0.x * scale; oy = ch / 2 - p0.z * scale;
      ctx.beginPath(); ctx.arc(cw / 2, ch / 2, cw / 2 - 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(8,6,16,0.85)'; ctx.fillRect(0, 0, cw, ch);
      ctx.translate(cw / 2, ch / 2); ctx.rotate(g.rig.yaw); ctx.translate(-cw / 2, -ch / 2);
    }
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.base, ox, oy, w.sx * scale, w.sz * scale);
    ctx.globalAlpha = 1;
    const P = (v) => [ox + v.x * scale, oy + v.z * scale];
    const upright = (px, py, fn) => { ctx.save(); ctx.translate(px, py); if (!full) ctx.rotate(-g.rig.yaw); fn(); ctx.restore(); };
    const glyph = (v, text, color, size = 12) => { const [px, py] = P(v); upright(px, py, () => { ctx.font = `bold ${size}px "Pixelify Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#140c24'; ctx.strokeText(text, 0, 0); ctx.fillStyle = color; ctx.fillText(text, 0, 0); }); };
    const disc = new Set(Object.keys(g.save.data.world?.stations ?? {}));
    for (const s of L.stations ?? []) { if (!s.pos) continue; const [px, py] = P(s.pos); upright(px, py, () => { ctx.fillStyle = disc.has(s.id) ? '#6ad8ff' : '#456'; ctx.strokeStyle = '#0a1420'; ctx.lineWidth = 2; ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); }); }
    for (const gt of L.gates ?? []) if (gt.pos) glyph(gt.pos, '⇧', '#ffd27a', full ? 16 : 13);
    if (full) for (const p of L.pois ?? []) glyph(p.pos, p.icon ?? '◆', '#fff', 14);
    for (const e of g.enemies) if (!e.dead && !e.isDummy) { const [px, py] = P(e.pos); if (!full && Math.hypot(px - cw / 2, py - ch / 2) > cw / 2) continue; ctx.fillStyle = e.questTag ? '#ff3a3a' : '#d8406a'; ctx.beginPath(); ctx.arc(px, py, e.questTag ? 3.5 : 2, 0, Math.PI * 2); ctx.fill(); }
    const marks = g.quests?.mapMarks(L.regionId, { size: [w.sx, w.sz] }) ?? [];
    for (const m of marks) { if (!m.pos) continue; const v = { x: m.pos[0] * w.sx, z: m.pos[1] * w.sz }; glyph(v, m.kind === 'giver' ? '!' : '◆', m.kind === 'giver' ? '#ffd84a' : m.tracked ? '#ffd84a' : m.main ? '#ffb84a' : '#b8a0ff', m.kind === 'giver' ? 16 : 14); }
    for (const p of g.players) {
      const [px, py] = P(p.pos);
      ctx.save(); ctx.translate(px, py); ctx.rotate(-p.facing + Math.PI);
      ctx.fillStyle = p.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      const sz = full ? 7 : 6;
      ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * 0.7, sz * 0.7); ctx.lineTo(-sz * 0.7, sz * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (!full) {   // compass ring
      ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cw / 2, ch / 2, cw / 2 - 2, 0, Math.PI * 2); ctx.stroke();
      const a = g.rig.yaw - Math.PI / 2; ctx.fillStyle = '#ffd27a'; ctx.font = 'bold 13px "Pixelify Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('N', cw / 2 + Math.cos(a) * (cw / 2 - 11), ch / 2 + Math.sin(a) * (ch / 2 - 11));
    }
  }
  build(level) {
    const w = level.world;
    this.level = level; this.region = false;
    const gm = this.game; if (gm.hud?.mini && gm.hud.mini.width !== 128) { gm.hud.mini.width = 128; gm.hud.mini.height = 128; }
    const W = w.sx, H = w.sz;
    this.base.width = W; this.base.height = H;
    const ctx = this.base.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      let top = -1, id = 0;
      for (let y = w.sy - 1; y >= 0; y--) { const b = w.get(x, y, z); if (b && b !== 0 && !BLOCKS[b].name.includes('roof') && !level.world.inRoof(x, y, z)) { top = y; id = b; break; } }
      const o = (z * W + x) * 4;
      if (top < 0) { img.data[o + 3] = 0; continue; }
      const c = tileAvgColor[BLOCKS[id].top] ?? { r: 0.5, g: 0.5, b: 0.5 };
      const shade = 0.55 + (top - 8) * 0.05;
      const lin = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
      img.data[o] = lin(c.r * shade); img.data[o + 1] = lin(c.g * shade); img.data[o + 2] = lin(c.b * shade); img.data[o + 3] = 255;
      if (BLOCKS[id].liquid) { img.data[o] *= 0.8; img.data[o + 2] = Math.min(255, img.data[o + 2] * 1.3 + 30); }
    }
    ctx.putImageData(img, 0, 0);
    this.revealed = new Set();
  }
  reveal(room) { this.revealed.add(room); }
  draw(canvas, { full = false } = {}) {
    const g = this.game, L = this.level; if (!L) return;
    if (this.region) { this.drawRegion(canvas, full); return; }
    const ctx = canvas.getContext('2d');
    const cw = canvas.width, ch = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);
    const p0 = g.players[0]?.pos;
    let scale, ox, oy;
    // rotate so the camera's forward is always "up", like the in-game view
    ctx.save(); ctx.translate(cw / 2, ch / 2); ctx.rotate(g.rig.yaw); ctx.translate(-cw / 2, -ch / 2);
    if (full) { scale = Math.min(cw / L.world.sx, ch / L.world.sz) * 0.72; ox = (cw - L.world.sx * scale) / 2; oy = (ch - L.world.sz * scale) / 2; }
    else { scale = 2.2; ox = cw / 2 - (p0?.x ?? 0) * scale; oy = ch / 2 - (p0?.z ?? 0) * scale; }
    // revealed rooms only (fog of war); corridors are drawn when both rooms are known
    ctx.save();
    ctx.beginPath();
    for (const r of L.rooms) {
      if (!this.revealed.has(r) && !(full && r.type === 'boss' && g.objectiveDone)) continue;
      ctx.rect(ox + (r.x0 - 1) * scale, oy + (r.z0 - 1) * scale, (r.x1 - r.x0 + 3) * scale, (r.z1 - r.z0 + 3) * scale);
      for (const d of r.doors) {
        if (d.link.kind === 'secret' && !(this.revealed.has(d.link.a) && this.revealed.has(d.link.b))) continue;
        const other = d.link.a === r ? d.link.b : d.link.a;
        const x0 = Math.min(r.center.x, other.center.x), x1 = Math.max(r.center.x, other.center.x), z0 = Math.min(r.center.z, other.center.z), z1 = Math.max(r.center.z, other.center.z);
        if (d.side === 'e' || d.side === 'w') ctx.rect(ox + x0 * scale, oy + (d.at - 3) * scale, (x1 - x0) * scale, 7 * scale);
        else ctx.rect(ox + (d.at - 3) * scale, oy + z0 * scale, 7 * scale, (z1 - z0) * scale);
      }
    }
    ctx.clip();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.base, ox, oy, L.world.sx * scale, L.world.sz * scale);
    ctx.restore();
    const dot = (x, z, color, r = 2.5, shape = 'c') => {
      const px = ox + x * scale, py = oy + z * scale;
      if (!full && (px < -5 || py < -5 || px > cw + 5 || py > ch + 5)) return;
      ctx.fillStyle = color;
      if (shape === 's') ctx.fillRect(px - r, py - r, r * 2, r * 2);
      else { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); }
    };
    for (const it of L.objective.items) if (!it.done && this.revealed.has(it.room)) dot(it.pos.x, it.pos.z, '#ffd23a', full ? 5 : 3.5, 's');
    for (const c of L.chests) if (!c.opened && this.revealed.has(c.room)) dot(c.pos.x, c.pos.z, c.rarity === 'rare' ? '#4ad0ff' : '#c8a060', full ? 4 : 3, 's');
    for (const e of g.enemies) if (!e.dead && !e.isDummy) dot(e.pos.x, e.pos.z, e.isBoss ? '#ff3a3a' : e.elite ? '#ff9aff' : '#d8406a', e.isBoss ? 5 : 2);
    if (g.objectiveDone || full) { const b = L.bossRoom.center; if (g.objectiveDone) dot(b.x, b.z, '#ff3a3a', full ? 7 : 4, 's'); }
    if (g.exitPortal) dot(g.exitPortal.pos.x, g.exitPortal.pos.z, '#7affd8', full ? 7 : 4);
    for (const p of g.players) {
      const px = ox + p.pos.x * scale, py = oy + p.pos.z * scale;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-p.facing + Math.PI);
      ctx.fillStyle = p.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      const s = full ? 7 : 5;
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(-s * 0.7, s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

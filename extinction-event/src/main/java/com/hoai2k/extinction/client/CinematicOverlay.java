package com.hoai2k.extinction.client;

import com.hoai2k.extinction.Phase;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;
import net.minecraftforge.client.gui.overlay.ForgeGui;

/** Screen-space cinematics: the impact flash, dust, heat haze, letterbox bars, title cards and the phase HUD. */
final class CinematicOverlay {
    private CinematicOverlay() {}

    static void render(ForgeGui gui, GuiGraphics g, float pt, int w, int h) {
        Minecraft mc = Minecraft.getInstance();
        if (!ClientState.active() || mc.options.hideGui && ClientState.flash <= 0) return;
        float tint = Mth.lerp(pt, ClientState.tintPrev, ClientState.tint);

        if (ClientState.phase == Phase.FIRESTORM) g.fill(0, 0, w, h, argb(0.10F * tint, 1F, 0.25F, 0.05F));
        if (tint > 0.05F) {
            int edge = argb(0.55F * tint, ClientState.tintR * 0.3F, ClientState.tintG * 0.3F, ClientState.tintB * 0.3F);
            g.fillGradient(0, 0, w, h / 3, edge, 0);
            g.fillGradient(0, h - h / 3, w, h, 0, edge);
        }

        float dust = Mth.lerp(pt, ClientState.dustPrev, ClientState.dust);
        if (dust > 0) g.fill(0, 0, w, h, argb(Math.min(0.85F, dust), 0.55F, 0.45F, 0.33F));

        float bolt = Mth.lerp(pt, ClientState.lightningPrev, ClientState.lightning);
        if (bolt > 0.01F) g.fill(0, 0, w, h, argb(bolt * 0.28F, 1F, 0.92F, 0.85F));

        float flash = Mth.lerp(pt, ClientState.flashPrev, ClientState.flash);
        if (flash > 0) {
            float hot = Mth.clamp((flash - 0.5F) * 2, 0, 1);
            g.fill(0, 0, w, h, argb(Math.min(1F, flash * 1.2F), 1F, 0.75F + 0.25F * hot, 0.45F + 0.55F * hot));
        }

        // The fireball's afterimage, burned into your eyes for a long while.
        float burn = Mth.lerp(pt, ClientState.burnPrev, ClientState.burn);
        if (burn > 0.01F && flash < 0.5F) {
            int glow = argb(0.45F * burn, 1F, 0.45F, 0.1F);
            g.fillGradient(0, 0, w, h / 2, glow, argb(0.12F * burn, 1F, 0.6F, 0.2F));
            g.fillGradient(0, h / 2, w, h, argb(0.12F * burn, 1F, 0.6F, 0.2F), glow);
        }

        float bars = Mth.lerp(pt, ClientState.letterboxPrev, ClientState.letterbox);
        if (bars > 0.01F) {
            int bh = (int) (h * 0.12F * bars);
            g.fill(0, 0, w, bh, 0xFF000000);
            g.fill(0, h - bh, w, h, 0xFF000000);
        }

        Font font = mc.font;
        float left = ClientState.secondsToImpact();
        if (left > 0 && left <= 10F) countdown(g, font, w, h, left);
        if (ClientState.title != null) titleCard(g, font, w, h, pt);
        if (!mc.options.hideGui && (ClientState.phase.running() || ClientState.catastrophe()) && ClientState.title == null) hud(g, font, w);
    }

    private static void titleCard(GuiGraphics g, Font font, int w, int h, float pt) {
        float age = ClientState.titleAge + pt, len = ClientState.titleLength;
        float a = Mth.clamp(Math.min(age / 25F, (len - age) / 30F), 0, 1);
        if (a <= 0.02F) return;
        int alpha = (int) (a * 255) << 24;
        g.pose().pushPose();
        float scale = Math.min(3.2F, w * 0.85F / Math.max(1, font.width(ClientState.title)));
        g.pose().translate(w / 2F, h * 0.38F, 0);
        g.pose().scale(scale, scale, 1);
        Component title = ClientState.title;
        g.drawString(font, title, -font.width(title) / 2, -font.lineHeight / 2, 0xF4D08A | alpha, true);
        g.pose().popPose();
        if (ClientState.subtitle != null) {
            g.pose().pushPose();
            float sub = Math.min(1.25F, w * 0.9F / Math.max(1, font.width(ClientState.subtitle)));
            g.pose().translate(w / 2F, h * 0.38F + 26, 0);
            g.pose().scale(sub, sub, 1);
            g.drawString(font, ClientState.subtitle, -font.width(ClientState.subtitle) / 2, 0, 0xE6E0D6 | alpha, true);
            g.pose().popPose();
        }
        int lineW = (int) (Math.min(1, age / 40F) * Math.min(w * 0.4F, 260));
        g.fill(w / 2 - lineW / 2, (int) (h * 0.38F) + 18, w / 2 + lineW / 2, (int) (h * 0.38F) + 19, 0xC9A45C | alpha);
    }

    /** Huge red numbers for the last ten seconds. */
    private static void countdown(GuiGraphics g, Font font, int w, int h, float left) {
        String n = String.valueOf((int) Math.ceil(left));
        float frac = left - (float) Math.floor(left);
        float scale = 6 + 4 * frac;
        int alpha = (int) (Mth.clamp(0.35F + frac, 0, 1) * 255) << 24;
        g.pose().pushPose();
        g.pose().translate(w / 2F, h * 0.62F, 0);
        g.pose().scale(scale, scale, 1);
        g.drawString(font, n, -font.width(n) / 2, -font.lineHeight / 2, 0xFF3B1E | alpha, true);
        g.pose().popPose();
    }

    private static void hud(GuiGraphics g, Font font, int w) {
        Component label;
        if (ClientState.catastrophe()) {
            label = Component.translatable("extinction.hud.act", Component.translatable("extinction.event." + ClientState.event), ClientState.act + 1);
        } else if (ClientState.phase == Phase.WARNING) {
            int secs = Math.max(0, (int) ((ClientState.phaseLength - ClientState.phaseTick) / 20) + Phase.DESCENT_TICKS / 20);
            label = Component.translatable("extinction.hud.countdown", secs / 60, String.format("%02d", secs % 60));
        } else {
            label = Component.translatable("extinction.phase." + ClientState.phase.id());
        }
        int x = 8, y = 8, bw = 90;
        g.drawString(font, label, x, y, 0xF0C070, true);
        g.fill(x, y + 11, x + bw, y + 13, 0x80000000);
        g.fill(x, y + 11, x + (int) (bw * ClientState.progress()), y + 13, 0xFFD4572A);
    }

    private static int argb(float a, float r, float g, float b) {
        return ((int) (Mth.clamp(a, 0, 1) * 255) << 24) | ((int) (r * 255) << 16) | ((int) (g * 255) << 8) | (int) (b * 255);
    }
}

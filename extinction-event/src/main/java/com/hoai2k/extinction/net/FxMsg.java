package com.hoai2k.extinction.net;

import net.minecraft.network.FriendlyByteBuf;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

/** A one-off cinematic moment: flash, shockwave hit, title card, eruption, tremor. */
public record FxMsg(int type, double x, double y, double z, float strength, String title, String subtitle) {
    public static final int FLASH = 0;
    public static final int SHOCK_HIT = 1;
    public static final int TITLE = 2;
    public static final int ERUPTION = 3;
    public static final int QUAKE = 4;
    public static final int TSUNAMI = 5;
    public static final int PYRO_HIT = 6;
    public static final int METEOR_STRIKE = 7;

    public static FxMsg at(int type, double x, double y, double z, float strength) {
        return new FxMsg(type, x, y, z, strength, "", "");
    }

    public static FxMsg title(String title, String subtitle, float seconds) {
        return new FxMsg(TITLE, 0, 0, 0, seconds, title, subtitle);
    }

    public void encode(FriendlyByteBuf buf) {
        buf.writeVarInt(type);
        buf.writeDouble(x);
        buf.writeDouble(y);
        buf.writeDouble(z);
        buf.writeFloat(strength);
        buf.writeUtf(title);
        buf.writeUtf(subtitle);
    }

    public static FxMsg decode(FriendlyByteBuf buf) {
        return new FxMsg(buf.readVarInt(), buf.readDouble(), buf.readDouble(), buf.readDouble(), buf.readFloat(),
                buf.readUtf(), buf.readUtf());
    }

    public void handle(Supplier<NetworkEvent.Context> ctx) {
        ctx.get().enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT,
                () -> () -> com.hoai2k.extinction.client.ClientState.onFx(this)));
        ctx.get().setPacketHandled(true);
    }
}

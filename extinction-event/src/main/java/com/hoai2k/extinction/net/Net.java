package com.hoai2k.extinction.net;

import com.hoai2k.extinction.ExtinctionMod;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkDirection;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

import java.util.Optional;

public final class Net {
    private static final String VERSION = "1";
    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
            new ResourceLocation(ExtinctionMod.MODID, "main"), () -> VERSION,
            // Clients without the mod can still join a server that has it (they just miss the visuals).
            v -> VERSION.equals(v) || NetworkRegistry.ABSENT.version().equals(v) || NetworkRegistry.ACCEPTVANILLA.equals(v),
            v -> VERSION.equals(v) || NetworkRegistry.ABSENT.version().equals(v) || NetworkRegistry.ACCEPTVANILLA.equals(v));

    public static void register() {
        CHANNEL.registerMessage(0, StateMsg.class, StateMsg::encode, StateMsg::decode, StateMsg::handle,
                Optional.of(NetworkDirection.PLAY_TO_CLIENT));
        CHANNEL.registerMessage(1, FxMsg.class, FxMsg::encode, FxMsg::decode, FxMsg::handle,
                Optional.of(NetworkDirection.PLAY_TO_CLIENT));
    }


    public static void to(ServerPlayer p, Object msg) {
        if (CHANNEL.isRemotePresent(p.connection.connection)) CHANNEL.send(PacketDistributor.PLAYER.with(() -> p), msg);
    }

    private Net() {}
}

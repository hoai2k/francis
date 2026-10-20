package com.hoai2k.extinction.net;

import net.minecraft.core.BlockPos;
import net.minecraft.network.FriendlyByteBuf;

import java.util.List;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

/** Where the event is on its timeline (and where the volcanoes are); sent every second and on every phase change. */
public record StateMsg(int phase, int phaseTick, int phaseLength, BlockPos impact, int groundY, float approachYaw,
                       boolean detonated, int detonatedAgo, int craterRadius, int shockRadius, List<BlockPos> vents) {

    public void encode(FriendlyByteBuf buf) {
        buf.writeVarInt(phase);
        buf.writeVarInt(phaseTick);
        buf.writeVarInt(phaseLength);
        buf.writeBlockPos(impact);
        buf.writeInt(groundY);
        buf.writeFloat(approachYaw);
        buf.writeBoolean(detonated);
        buf.writeVarInt(detonatedAgo);
        buf.writeVarInt(craterRadius);
        buf.writeVarInt(shockRadius);
        buf.writeCollection(vents, FriendlyByteBuf::writeBlockPos);
    }

    public static StateMsg decode(FriendlyByteBuf buf) {
        return new StateMsg(buf.readVarInt(), buf.readVarInt(), buf.readVarInt(), buf.readBlockPos(), buf.readInt(),
                buf.readFloat(), buf.readBoolean(), buf.readVarInt(), buf.readVarInt(), buf.readVarInt(),
                buf.readList(FriendlyByteBuf::readBlockPos));
    }

    public void handle(Supplier<NetworkEvent.Context> ctx) {
        ctx.get().enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT,
                () -> () -> com.hoai2k.extinction.client.ClientState.onState(this)));
        ctx.get().setPacketHandled(true);
    }
}

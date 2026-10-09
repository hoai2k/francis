package com.francis.starfall.net;

import com.francis.starfall.Starfall;
import net.minecraft.network.RegistryByteBuf;
import net.minecraft.network.codec.PacketCodec;
import net.minecraft.network.packet.CustomPayload;
import net.minecraft.util.math.Vec3d;

/** Server -> caster: "roll the film". The client rebuilds the strike plan from this. */
public record CutscenePayload(int type, Vec3d origin, Vec3d target) implements CustomPayload {
    public static final CustomPayload.Id<CutscenePayload> ID = new CustomPayload.Id<>(Starfall.id("cutscene"));
    public static final PacketCodec<RegistryByteBuf, CutscenePayload> CODEC = PacketCodec.of(CutscenePayload::write, CutscenePayload::read);

    private void write(RegistryByteBuf buf) {
        buf.writeVarInt(type);
        writeVec(buf, origin);
        writeVec(buf, target);
    }

    private static CutscenePayload read(RegistryByteBuf buf) {
        return new CutscenePayload(buf.readVarInt(), readVec(buf), readVec(buf));
    }

    private static void writeVec(RegistryByteBuf buf, Vec3d v) {
        buf.writeDouble(v.x);
        buf.writeDouble(v.y);
        buf.writeDouble(v.z);
    }

    private static Vec3d readVec(RegistryByteBuf buf) {
        return new Vec3d(buf.readDouble(), buf.readDouble(), buf.readDouble());
    }

    @Override
    public Id<? extends CustomPayload> getId() {
        return ID;
    }
}

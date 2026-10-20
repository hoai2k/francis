package com.hoai2k.extinction;

import com.hoai2k.extinction.event.Catastrophes;
import com.hoai2k.extinction.spawn.SpawnRules;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.SharedSuggestionProvider;
import net.minecraft.commands.arguments.coordinates.ColumnPosArgument;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ColumnPos;

import java.util.Arrays;

/** /extinction start [x z] | event <name> [x z] | events | random | stop | skip | phase <name> | status | reload */
public final class ExtinctionCommand {
    private ExtinctionCommand() {}

    public static void register(CommandDispatcher<CommandSourceStack> d) {
        d.register(Commands.literal("extinction").requires(s -> s.hasPermission(2))
                .then(Commands.literal("start")
                        .executes(ctx -> startNear(ctx))
                        .then(Commands.argument("impact", ColumnPosArgument.columnPos()).executes(ctx -> {
                            ColumnPos col = ColumnPosArgument.getColumnPos(ctx, "impact");
                            ExtinctionManager m = mgr(ctx);
                            if (m == null) return 0;
                            m.start(ctx.getSource().getServer(), new BlockPos(col.x(), 0, col.z()));
                            ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.started", col.x(), col.z()), true);
                            return 1;
                        })))
                .then(Commands.literal("event").then(Commands.argument("name", StringArgumentType.word())
                        .suggests((ctx, b) -> SharedSuggestionProvider.suggest(Catastrophes.ids(), b))
                        .executes(ctx -> startEvent(ctx, StringArgumentType.getString(ctx, "name"), null))
                        .then(Commands.argument("at", ColumnPosArgument.columnPos())
                                .executes(ctx -> startEvent(ctx, StringArgumentType.getString(ctx, "name"), ColumnPosArgument.getColumnPos(ctx, "at"))))))
                .then(Commands.literal("events").executes(ctx -> {
                    ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.events", "asteroid, " + String.join(", ", Catastrophes.ids())), false);
                    return 1;
                }))
                .then(Commands.literal("random").executes(ctx -> {
                    ExtinctionManager m = mgr(ctx);
                    if (m == null) return 0;
                    String id = m.randomEvent();
                    return id.equals("asteroid") ? startNear(ctx) : startEvent(ctx, id, null);
                }))
                .then(Commands.literal("stop").executes(ctx -> {
                    ExtinctionManager m = mgr(ctx);
                    if (m == null) return 0;
                    m.stop();
                    ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.stopped"), true);
                    return 1;
                }))
                .then(Commands.literal("skip").executes(ctx -> {
                    ExtinctionManager m = mgr(ctx);
                    if (m == null) return 0;
                    if (!m.data().busy()) {
                        ctx.getSource().sendFailure(Component.translatable("extinction.command.not_running"));
                        return 0;
                    }
                    m.skip();
                    String now = m.data().catastrophe() ? m.data().event + " act " + (m.data().act + 1) : m.data().phase.id();
                    ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.phase", now), true);
                    return 1;
                }))
                .then(Commands.literal("phase").then(Commands.argument("name", StringArgumentType.word())
                        .suggests((ctx, b) -> SharedSuggestionProvider.suggest(
                                Arrays.stream(Phase.values()).filter(Phase::running).map(Phase::id), b))
                        .executes(ctx -> {
                            ExtinctionManager m = mgr(ctx);
                            if (m == null) return 0;
                            Phase p = Phase.byId(StringArgumentType.getString(ctx, "name"));
                            if (p == null || !p.running()) {
                                ctx.getSource().sendFailure(Component.translatable("extinction.command.bad_phase"));
                                return 0;
                            }
                            m.jumpTo(p);
                            ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.phase", p.id()), true);
                            return 1;
                        })))
                .then(Commands.literal("status").executes(ctx -> {
                    ExtinctionManager m = mgr(ctx);
                    if (m == null) return 0;
                    String s = m.status();
                    ctx.getSource().sendSuccess(() -> Component.literal(s), false);
                    return 1;
                }))
                .then(Commands.literal("reload").executes(ctx -> {
                    ExtinctionManager m = mgr(ctx);
                    if (m == null) return 0;
                    SpawnRules r = m.reloadRules();
                    ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.reloaded", r.summary()), true);
                    for (String problem : r.problems) ctx.getSource().sendFailure(Component.literal(problem));
                    return 1;
                })));
    }

    private static int startEvent(CommandContext<CommandSourceStack> ctx, String id, ColumnPos at) {
        ExtinctionManager m = mgr(ctx);
        if (m == null) return 0;
        if (id.equals("asteroid")) {
            if (at == null) return startNear(ctx);
            m.start(ctx.getSource().getServer(), new BlockPos(at.x(), 0, at.z()));
            return 1;
        }
        if (Catastrophes.get(id) == null) {
            ctx.getSource().sendFailure(Component.translatable("extinction.command.unknown_event", id));
            return 0;
        }
        boolean ok = at == null ? m.startEventNearPlayers(id) : m.startEvent(id, new BlockPos(at.x(), 0, at.z()));
        if (!ok) {
            ctx.getSource().sendFailure(Component.translatable("extinction.command.no_players"));
            return 0;
        }
        ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.event_started", Component.translatable("extinction.event." + id)), true);
        return 1;
    }

    private static int startNear(CommandContext<CommandSourceStack> ctx) {
        ExtinctionManager m = mgr(ctx);
        if (m == null) return 0;
        if (!m.startNearPlayers()) {
            ctx.getSource().sendFailure(Component.translatable("extinction.command.no_players"));
            return 0;
        }
        BlockPos at = m.data().impact;
        ctx.getSource().sendSuccess(() -> Component.translatable("extinction.command.started", at.getX(), at.getZ()), true);
        return 1;
    }

    private static ExtinctionManager mgr(CommandContext<CommandSourceStack> ctx) {
        ExtinctionManager m = ExtinctionManager.get();
        if (m == null) ctx.getSource().sendFailure(Component.literal("Extinction Event is not ready yet"));
        return m;
    }
}

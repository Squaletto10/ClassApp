// Duck Jump minigame - Skia-free, using RN + Reanimated timers for simplicity
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

const GRAVITY = 0.9;
const JUMP = -13;
const WATER_Y = 380;
const DUCK_X = 60;
const LOG_W = 80;
const LOG_H = 20;
const GAME_H = 420;

export default function DuckJump() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const W = Math.min(Dimensions.get("window").width - spacing.lg * 2, 400);

  const [running, setRunning] = useState(false);
  const [duckY, setDuckY] = useState(200);
  const vyRef = useRef(0);
  const duckYRef = useRef(200);
  const logsRef = useRef<{ x: number; y: number }[]>([]);
  const [logs, setLogs] = useState<{ x: number; y: number }[]>([]);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [gameOver, setGameOver] = useState(false);
  const [best, setBest] = useState(0);
  const [board, setBoard] = useState<any[]>([]);

  const loadBoard = useCallback(async () => {
    try {
      const r = await apiFetch("/scores");
      setBoard(r.leaderboard || []);
      const mine = (r.leaderboard || []).find((s: any) => s.user_id === user?.id);
      if (mine) setBest(mine.score);
    } catch {}
  }, [user?.id]);
  useFocusEffect(useCallback(() => { loadBoard(); }, [loadBoard]));

  const start = () => {
    duckYRef.current = 200; setDuckY(200); vyRef.current = 0;
    logsRef.current = [
      { x: W - 100, y: 300 }, { x: W + 100, y: 260 }, { x: W + 260, y: 320 },
    ];
    setLogs([...logsRef.current]);
    scoreRef.current = 0; setScore(0); setGameOver(false); setRunning(true);
  };

  const submitScore = useCallback(async (final: number) => {
    if (final <= 0) return;
    try {
      const r = await apiFetch("/scores", { method: "POST", body: JSON.stringify({ score: final }) });
      setBest(r.personal_best); loadBoard();
    } catch {}
  }, [loadBoard]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      // physics
      vyRef.current += GRAVITY;
      duckYRef.current += vyRef.current;
      // move logs
      logsRef.current = logsRef.current.map((l) => ({ ...l, x: l.x - 3 }));
      // recycle
      logsRef.current = logsRef.current.map((l) => {
        if (l.x < -LOG_W) {
          scoreRef.current += 10;
          return { x: W + Math.random() * 60, y: 220 + Math.random() * 130 };
        }
        return l;
      });
      // land on log?
      const dY = duckYRef.current;
      const onLog = logsRef.current.some((l) =>
        DUCK_X + 30 > l.x && DUCK_X < l.x + LOG_W &&
        dY + 30 >= l.y && dY + 30 <= l.y + LOG_H + 6 && vyRef.current >= 0
      );
      if (onLog) {
        const l = logsRef.current.find((l) => DUCK_X + 30 > l.x && DUCK_X < l.x + LOG_W)!;
        duckYRef.current = l.y - 30;
        vyRef.current = 0;
      }
      // fall in water
      if (dY > WATER_Y) {
        setRunning(false); setGameOver(true);
        submitScore(scoreRef.current);
      }
      setDuckY(duckYRef.current);
      setLogs([...logsRef.current]);
      setScore(scoreRef.current);
    }, 33);
    return () => clearInterval(id);
  }, [running, W, submitScore]);

  const jump = () => { if (!running) return; vyRef.current = JUMP; };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.onSurface, fontSize: 24, fontWeight: "900" }}>🦆 {t("duckJump")}</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text testID="score-display" style={{ color: colors.onSurface, fontSize: 16, fontWeight: "700" }}>{t("score")}: {score}</Text>
          <Text style={{ color: colors.brandPrimary, fontSize: 16, fontWeight: "700" }}>{t("best")}: {best}</Text>
        </View>
      </View>

      <Pressable testID="duck-canvas" onPress={jump} style={{ marginHorizontal: spacing.lg, height: GAME_H, backgroundColor: "#87CEEB", borderRadius: radius.lg, overflow: "hidden" }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: WATER_Y, height: GAME_H - WATER_Y, backgroundColor: "#3B82F6" }} />
        {logs.map((l, i) => (
          <View key={i} style={{ position: "absolute", left: l.x, top: l.y, width: LOG_W, height: LOG_H, backgroundColor: "#8B4513", borderRadius: 4 }} />
        ))}
        <Text style={{ position: "absolute", left: DUCK_X, top: duckY, fontSize: 36 }}>🦆</Text>
        {!running && !gameOver && (
          <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
            <Pressable testID="duck-start" onPress={start} style={{ backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill }}>
              <Text style={{ color: colors.onBrandPrimary, fontWeight: "800", fontSize: 16 }}>{t("tapToStart")}</Text>
            </Pressable>
          </View>
        )}
        {gameOver && (
          <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900" }}>{t("gameOver")}</Text>
            <Text style={{ color: "#fff", fontSize: 20, marginBottom: spacing.lg }}>{score}</Text>
            <Pressable testID="duck-retry" onPress={start} style={{ backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill }}>
              <Text style={{ color: colors.onBrandPrimary, fontWeight: "800" }}>{t("tryAgain")}</Text>
            </Pressable>
          </View>
        )}
      </Pressable>

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "800" }}>🏆 {t("leaderboard")}</Text>
        <FlatList
          data={board.slice(0, 10)}
          keyExtractor={(x) => x.user_id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item, index }) => (
            <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.sm, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md }}>
              <Text style={{ color: colors.brandPrimary, fontWeight: "900", width: 32 }}>#{index + 1}</Text>
              <Text style={{ color: colors.onSurface, flex: 1, fontWeight: "700" }}>{item.name}</Text>
              <Text style={{ color: colors.onSurface, fontWeight: "900" }}>{item.score}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

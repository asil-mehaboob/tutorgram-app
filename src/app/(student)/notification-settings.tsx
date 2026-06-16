import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/api/identity';
import type { NotificationPreferences } from '@/lib/api/identity';

type PrefKey = keyof NotificationPreferences;

const PREF_LABELS: { key: PrefKey; label: string; desc: string }[] = [
  { key: 'courseUpdates', label: 'Course updates', desc: 'New lessons, announcements and changes to enrolled courses' },
  { key: 'certificates', label: 'Certificates', desc: 'When you earn a certificate of completion' },
  { key: 'messages', label: 'Messages', desc: 'New messages from instructors' },
  { key: 'reviewReplies', label: 'Review replies', desc: 'When an instructor replies to your review' },
  { key: 'promotions', label: 'Promotions', desc: 'Discounts, sales, and special offers' },
  { key: 'weeklyDigest', label: 'Weekly digest', desc: 'A weekly summary of your learning activity' },
];

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  });

  const { mutate } = useMutation({
    mutationFn: (body: Partial<NotificationPreferences>) => updateNotificationPreferences(body),
    onSuccess: (res) => {
      queryClient.setQueryData(['notification-preferences'], res);
    },
  });

  const prefs = data?.preferences;

  function toggle(key: PrefKey) {
    if (!prefs) return;
    mutate({ [key]: !prefs[key] });
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={theme.text} weight="regular" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
            Choose which notifications you'd like to receive.
          </Text>

          <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {PREF_LABELS.map((item, i) => (
              <View
                key={item.key}
                style={[
                  styles.row,
                  i < PREF_LABELS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{item.label}</Text>
                  <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={prefs?.[item.key] ?? false}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontFamily: Fonts.bold, letterSpacing: -0.2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  sectionHint: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
  group: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontFamily: Fonts.medium },
  rowDesc: { fontSize: 12, fontFamily: Fonts.regular, lineHeight: 17 },
});
